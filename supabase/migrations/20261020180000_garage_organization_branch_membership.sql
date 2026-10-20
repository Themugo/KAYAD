/*
# Garage organization -> branches -> staff memberships (additive, idempotent)

CANDIDATE MIGRATION - NOT APPLIED TO ANY HOSTED DATABASE. Verified only on a local disposable PostgreSQL 16 replay.

## Evidence (verified against a PostgreSQL 16 built from the 182 repository migrations)
1. `inspection_providers` is already the single business identity (one row per registered business, owned by
   `user_id`). It is the ORGANIZATION. No second account type is introduced.
2. `inspection_branches` exists but nothing reads or writes it; it has no status, no head-office marker, no uniqueness,
   and `inspection_bookings` has no `branch_id`, so a booking cannot be routed to a branch.
3. `inspection_staff` is the membership table (two-sided consent, `affiliation_status`), but it carries only a technical
   title (`role`, constrained to six inspector titles). It has no access role, no branch scope, no invitation expiry and
   cannot express suspension. Authorization today is "provider.user_id = caller" only: staff have no access at all.
4. The staff-facing RLS policies ignore `affiliation_status` / `is_active`, so an ended or suspended member keeps direct
   read access to the bookings and reports they were once assigned.

## Design
organization (inspection_providers) 1 -> N branches (inspection_branches) ; organization 1 -> N memberships
(inspection_staff), each with an `access_role` and an optional branch scope. One person has at most ONE live membership
per organization (existing unique index), which is therefore also their single branch scope.

Access roles (mapped onto the existing technical titles, which stay in `inspection_staff.role`):
  owner (= inspection_providers.user_id, implicit)  org_admin  operations_manager  branch_manager
  inspector  technician  finance  report_reviewer
Scope rules (CHECK): org_admin / operations_manager / finance are organization-wide (branch_id NULL); branch_manager
MUST have a branch; inspector / technician / report_reviewer may be branch-scoped or organization-wide.

All state changes go through SECURITY DEFINER functions callable by service_role only. Each verifies the ACTOR's authority
in the database, writes the change and its audit row in ONE transaction, and is idempotent or single-use where relevant.
Direct table access is unchanged (no new grants to anon/authenticated).

## Safety
- Additive columns/indexes only; existing rows are back-filled (access_role from the legacy title; unnamed branches get a
  name; duplicate branch names are suffixed). No row is deleted. No financial table or function is altered.
- Rollback: runbooks/stage5f16-garage-organization-20261020/rollback_20261020180000.sql (non-destructive: restores the
  previous policies and drops only objects created here; data columns are retained unless the operator chooses otherwise).
*/

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Branches
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE inspection_branches
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_head_office BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE inspection_branches SET name = 'Branch' WHERE name IS NULL OR btrim(name) = '';
WITH d AS (
  SELECT id, row_number() OVER (PARTITION BY provider_id, lower(btrim(name)) ORDER BY created_at, id) AS rn
  FROM inspection_branches
)
UPDATE inspection_branches b SET name = b.name || ' (' || d.rn || ')' FROM d WHERE d.id = b.id AND d.rn > 1;
UPDATE inspection_branches SET status = 'suspended' WHERE is_active = false AND status = 'active';
ALTER TABLE inspection_branches ALTER COLUMN name SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE inspection_branches
    ADD CONSTRAINT chk_inspection_branches_status CHECK (status IN ('active', 'suspended', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE inspection_branches
    ADD CONSTRAINT chk_inspection_branches_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 120);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (id, provider_id) is the target of composite foreign keys, so a membership/booking can never point at ANOTHER
-- organization's branch even if an application bug supplies the wrong id.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_branches_id_provider ON inspection_branches (id, provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_branches_provider_name
  ON inspection_branches (provider_id, lower(btrim(name))) WHERE status <> 'closed';
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_branches_head_office
  ON inspection_branches (provider_id) WHERE is_head_office AND status <> 'closed';

CREATE OR REPLACE FUNCTION public.kayad_branch_sync_active() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_inspection_branches_sync_active ON inspection_branches;
CREATE TRIGGER trg_inspection_branches_sync_active BEFORE INSERT OR UPDATE ON inspection_branches
  FOR EACH ROW EXECUTE FUNCTION public.kayad_branch_sync_active();

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Memberships (inspection_staff)
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE inspection_staff
  ADD COLUMN IF NOT EXISTS access_role TEXT,
  ADD COLUMN IF NOT EXISTS branch_id UUID,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_reason TEXT;

UPDATE inspection_staff SET access_role = CASE role
    WHEN 'quality_reviewer' THEN 'report_reviewer'
    WHEN 'field_technician' THEN 'technician'
    WHEN 'workshop_technician' THEN 'technician'
    ELSE 'inspector' END
 WHERE access_role IS NULL;
ALTER TABLE inspection_staff ALTER COLUMN access_role SET DEFAULT 'inspector';
ALTER TABLE inspection_staff ALTER COLUMN access_role SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE inspection_staff ADD CONSTRAINT chk_inspection_staff_access_role CHECK (access_role IN
    ('org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician', 'finance', 'report_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE inspection_staff ADD CONSTRAINT chk_inspection_staff_role_scope CHECK (
    (access_role IN ('org_admin', 'operations_manager', 'finance') AND branch_id IS NULL)
    OR (access_role = 'branch_manager' AND branch_id IS NOT NULL)
    OR access_role IN ('inspector', 'technician', 'report_reviewer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- A membership can be suspended without losing the history of the relationship.
ALTER TABLE inspection_staff DROP CONSTRAINT IF EXISTS chk_inspection_staff_affiliation_status;
ALTER TABLE inspection_staff ADD CONSTRAINT chk_inspection_staff_affiliation_status
  CHECK (affiliation_status IN ('pending', 'confirmed', 'suspended', 'ended'));
-- ON DELETE: default NO ACTION - a branch with memberships can never silently vanish (which would widen scope to org-wide).
DO $$ BEGIN
  ALTER TABLE inspection_staff ADD CONSTRAINT fk_inspection_staff_branch
    FOREIGN KEY (branch_id, provider_id) REFERENCES inspection_branches (id, provider_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_inspection_staff_branch ON inspection_staff (provider_id, branch_id) WHERE branch_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Bookings are routed to a branch (nullable: NULL = organization-level queue)
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE inspection_bookings ADD COLUMN IF NOT EXISTS branch_id UUID;
DO $$ BEGIN
  ALTER TABLE inspection_bookings ADD CONSTRAINT fk_inspection_bookings_branch
    FOREIGN KEY (branch_id, provider_id) REFERENCES inspection_branches (id, provider_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_branch ON inspection_bookings (provider_id, branch_id, scheduled_date);

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Authority primitives (service_role only; the caller passes the user, so they must not be callable by end users)
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_org_role_rank(p_role TEXT) RETURNS INT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_role WHEN 'owner' THEN 100 WHEN 'org_admin' THEN 80 WHEN 'operations_manager' THEN 60
                     WHEN 'branch_manager' THEN 50 WHEN 'finance' THEN 30 WHEN 'report_reviewer' THEN 30
                     WHEN 'inspector' THEN 20 WHEN 'technician' THEN 20 ELSE 0 END
$$;

-- The caller's CURRENT standing in an organization, recomputed from the database on every call (no cached role, so a
-- revoked or suspended member loses access on their very next request even with an old session token).
CREATE OR REPLACE FUNCTION public.kayad_org_context(p_provider UUID, p_user UUID)
RETURNS TABLE (is_owner BOOLEAN, access_role TEXT, branch_id UUID, staff_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT true, 'owner'::text, NULL::uuid, NULL::uuid
    FROM inspection_providers p
   WHERE p_user IS NOT NULL AND p.id = p_provider AND p.user_id = p_user
  UNION ALL
  SELECT false, s.access_role, s.branch_id, s.id
    FROM inspection_staff s
    JOIN users u ON u.id = s.user_id
   WHERE p_user IS NOT NULL AND s.provider_id = p_provider AND s.user_id = p_user
     AND s.affiliation_status = 'confirmed' AND s.is_active
     AND u.status = 'approved' AND COALESCE(u.is_banned, false) = false
     AND (s.branch_id IS NULL OR EXISTS (SELECT 1 FROM inspection_branches b WHERE b.id = s.branch_id AND b.status = 'active'))
$$;

-- Booking-level authority: one definition used by the API and by RLS.
CREATE OR REPLACE FUNCTION public.kayad_org_booking_access(p_booking UUID, p_user UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b RECORD; c RECORD; in_scope BOOLEAN; v BOOLEAN := false; m BOOLEAN := false; x BOOLEAN := false; r BOOLEAN := false;
BEGIN
  SELECT id, provider_id, branch_id, assigned_staff_id INTO b FROM inspection_bookings WHERE id = p_booking;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO c FROM kayad_org_context(b.provider_id, p_user) LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  in_scope := c.branch_id IS NULL OR b.branch_id IS NOT DISTINCT FROM c.branch_id;
  IF c.is_owner OR c.access_role IN ('org_admin', 'operations_manager') THEN v := true; m := true; x := true; r := true;
  ELSIF c.access_role = 'branch_manager' THEN IF in_scope THEN v := true; m := true; x := true; r := true; END IF;
  ELSIF c.access_role = 'report_reviewer' THEN IF in_scope THEN v := true; r := true; END IF;
  ELSIF c.access_role IN ('inspector', 'technician') THEN
    IF b.assigned_staff_id IS NOT NULL AND b.assigned_staff_id = c.staff_id THEN v := true; x := true; END IF;
  END IF;   -- finance: no operational booking access
  IF NOT (v OR m OR x OR r) THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('provider_id', b.provider_id, 'branch_id', b.branch_id, 'role', c.access_role,
                            'staff_id', c.staff_id, 'can_view', v, 'can_manage', m, 'can_execute', x, 'can_review', r);
END $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Audit helper (inspection_status_history already carries entity_type / entity_id; booking rows also set booking_id)
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad__org_audit(p_type TEXT, p_entity UUID, p_from TEXT, p_to TEXT, p_actor UUID, p_notes TEXT,
                                                    p_booking UUID DEFAULT NULL, p_staff UUID DEFAULT NULL) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO inspection_status_history (booking_id, entity_type, entity_id, from_status, to_status, changed_by, staff_id, notes)
  VALUES (p_booking, p_type, p_entity, p_from, p_to, p_actor, p_staff, left(p_notes, 1000))
$$;

CREATE OR REPLACE FUNCTION public.kayad__org_fail(p_code TEXT, p_msg TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '%: %', p_code, p_msg USING ERRCODE = 'P0001'; END $$;

-- Loads the actor's standing or fails. p_scope_branch (optional) must be inside the actor's branch scope.
CREATE OR REPLACE FUNCTION public.kayad__org_actor(p_actor UUID, p_provider UUID)
RETURNS TABLE (is_owner BOOLEAN, access_role TEXT, branch_id UUID, staff_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY SELECT * FROM kayad_org_context(p_provider, p_actor);
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'not a current member of this organization'); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.kayad__org_valid_scope(p_role TEXT, p_branch UUID, p_provider UUID) RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_role NOT IN ('org_admin', 'operations_manager', 'branch_manager', 'inspector', 'technician', 'finance', 'report_reviewer') THEN
    PERFORM kayad__org_fail('ORG_INVALID', 'unknown access role');
  END IF;
  IF p_role IN ('org_admin', 'operations_manager', 'finance') AND p_branch IS NOT NULL THEN
    PERFORM kayad__org_fail('ORG_INVALID', p_role || ' is organization-wide and cannot be tied to a branch');
  END IF;
  IF p_role = 'branch_manager' AND p_branch IS NULL THEN
    PERFORM kayad__org_fail('ORG_INVALID', 'a branch manager must be assigned to a branch');
  END IF;
  IF p_branch IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inspection_branches b WHERE b.id = p_branch AND b.provider_id = p_provider AND b.status = 'active') THEN
    PERFORM kayad__org_fail('ORG_BRANCH_NOT_FOUND', 'branch not found in this organization or not active');
  END IF;
END $$;

-- May the actor manage a target membership (current role/branch) and set it to a new role/branch?
CREATE OR REPLACE FUNCTION public.kayad__org_can_manage_member(p_is_owner BOOLEAN, p_actor_role TEXT, p_actor_branch UUID,
  p_cur_role TEXT, p_cur_branch UUID, p_new_role TEXT, p_new_branch UUID) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_is_owner THEN RETURN true; END IF;
  IF p_actor_role = 'org_admin' THEN
    RETURN kayad_org_role_rank(p_cur_role) < 80 AND kayad_org_role_rank(p_new_role) < 80;
  END IF;
  IF p_actor_role = 'branch_manager' THEN
    RETURN p_actor_branch IS NOT NULL
       AND p_cur_role IN ('inspector', 'technician') AND p_cur_branch IS NOT DISTINCT FROM p_actor_branch
       AND p_new_role IN ('inspector', 'technician') AND p_new_branch IS NOT DISTINCT FROM p_actor_branch;
  END IF;
  RETURN false;
END $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Branch operations (owner / org_admin only)
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_org_branch_create(p_actor UUID, p_provider UUID, p_name TEXT, p_county TEXT, p_town TEXT,
  p_address TEXT, p_phone TEXT, p_lat NUMERIC, p_lng NUMERIC, p_head BOOLEAN) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a RECORD; prov RECORD; nm TEXT := btrim(COALESCE(p_name, '')); row_ inspection_branches; make_head BOOLEAN;
BEGIN
  SELECT * INTO a FROM kayad__org_actor(p_actor, p_provider);
  IF NOT (a.is_owner OR a.access_role = 'org_admin') THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'only the owner or an organization administrator can create branches'); END IF;
  SELECT * INTO prov FROM inspection_providers WHERE id = p_provider FOR SHARE;
  IF prov.lifecycle_stage IN ('SUSPENDED', 'INACTIVE') THEN PERFORM kayad__org_fail('ORG_PROVIDER_NOT_ACTIVE', 'this organization is suspended or inactive'); END IF;
  IF char_length(nm) < 1 OR char_length(nm) > 120 THEN PERFORM kayad__org_fail('ORG_INVALID', 'branch name must be 1-120 characters'); END IF;
  make_head := COALESCE(p_head, false) OR NOT EXISTS (SELECT 1 FROM inspection_branches WHERE provider_id = p_provider AND status <> 'closed');
  BEGIN
    INSERT INTO inspection_branches (provider_id, name, county, town, address, phone, latitude, longitude, is_head_office, created_by, status)
    VALUES (p_provider, nm, left(p_county, 80), left(p_town, 80), left(p_address, 300), left(p_phone, 40), p_lat, p_lng, make_head, p_actor, 'active')
    RETURNING * INTO row_;
  EXCEPTION WHEN unique_violation THEN
    IF SQLERRM LIKE '%head_office%' THEN PERFORM kayad__org_fail('ORG_HEAD_OFFICE_EXISTS', 'this organization already has a head office');
    ELSE PERFORM kayad__org_fail('ORG_DUPLICATE_BRANCH', 'a branch with that name already exists in this organization'); END IF;
  END;
  PERFORM kayad__org_audit('branch', row_.id, NULL, 'active', p_actor, 'branch created: ' || nm || CASE WHEN make_head THEN ' (head office)' ELSE '' END);
  RETURN to_jsonb(row_);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_org_branch_update(p_actor UUID, p_branch UUID, p_patch JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a RECORD; cur inspection_branches; k TEXT; row_ inspection_branches; changed TEXT[] := '{}';
BEGIN
  SELECT * INTO cur FROM inspection_branches WHERE id = p_branch FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'branch not found'); END IF;
  SELECT * INTO a FROM kayad__org_actor(p_actor, cur.provider_id);
  IF NOT (a.is_owner OR a.access_role = 'org_admin') THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'only the owner or an organization administrator can edit branches'); END IF;
  IF cur.status = 'closed' THEN PERFORM kayad__org_fail('ORG_BRANCH_CLOSED', 'a closed branch cannot be edited'); END IF;
  FOR k IN SELECT jsonb_object_keys(COALESCE(p_patch, '{}'::jsonb)) LOOP
    IF k NOT IN ('name', 'county', 'town', 'address', 'phone', 'latitude', 'longitude') THEN PERFORM kayad__org_fail('ORG_INVALID', 'field not editable: ' || k); END IF;
    changed := changed || k;
  END LOOP;
  IF p_patch ? 'name' AND (char_length(btrim(p_patch->>'name')) NOT BETWEEN 1 AND 120) THEN PERFORM kayad__org_fail('ORG_INVALID', 'branch name must be 1-120 characters'); END IF;
  BEGIN
    UPDATE inspection_branches SET
      name = COALESCE(btrim(p_patch->>'name'), name), county = CASE WHEN p_patch ? 'county' THEN left(p_patch->>'county', 80) ELSE county END,
      town = CASE WHEN p_patch ? 'town' THEN left(p_patch->>'town', 80) ELSE town END,
      address = CASE WHEN p_patch ? 'address' THEN left(p_patch->>'address', 300) ELSE address END,
      phone = CASE WHEN p_patch ? 'phone' THEN left(p_patch->>'phone', 40) ELSE phone END,
      latitude = CASE WHEN p_patch ? 'latitude' THEN (p_patch->>'latitude')::numeric ELSE latitude END,
      longitude = CASE WHEN p_patch ? 'longitude' THEN (p_patch->>'longitude')::numeric ELSE longitude END
    WHERE id = p_branch RETURNING * INTO row_;
  EXCEPTION WHEN unique_violation THEN PERFORM kayad__org_fail('ORG_DUPLICATE_BRANCH', 'a branch with that name already exists in this organization');
  END;
  PERFORM kayad__org_audit('branch', p_branch, cur.status, row_.status, p_actor, 'branch updated: ' || array_to_string(changed, ','));
  RETURN to_jsonb(row_);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_org_branch_set_status(p_actor UUID, p_branch UUID, p_status TEXT, p_reason TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a RECORD; cur inspection_branches; row_ inspection_branches;
BEGIN
  IF p_status NOT IN ('active', 'suspended', 'closed') THEN PERFORM kayad__org_fail('ORG_INVALID', 'unknown branch status'); END IF;
  SELECT * INTO cur FROM inspection_branches WHERE id = p_branch FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'branch not found'); END IF;
  SELECT * INTO a FROM kayad__org_actor(p_actor, cur.provider_id);
  IF NOT (a.is_owner OR a.access_role = 'org_admin') THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'only the owner or an organization administrator can change branch status'); END IF;
  IF cur.status = p_status THEN RETURN to_jsonb(cur); END IF;                         -- idempotent
  IF cur.status = 'closed' THEN PERFORM kayad__org_fail('ORG_BRANCH_CLOSED', 'a closed branch cannot be reopened; create a new branch'); END IF;
  IF p_status <> 'active' AND btrim(COALESCE(p_reason, '')) = '' THEN PERFORM kayad__org_fail('ORG_INVALID', 'a reason is required to suspend or close a branch'); END IF;
  IF p_status IN ('suspended', 'closed') AND cur.is_head_office THEN PERFORM kayad__org_fail('ORG_HEAD_OFFICE_PROTECTED', 'the head office cannot be suspended or closed'); END IF;
  IF p_status = 'closed' THEN
    IF EXISTS (SELECT 1 FROM inspection_bookings WHERE branch_id = p_branch AND status IN ('booked', 'confirmed', 'inspector_assigned', 'travelling', 'inspection_started', 'inspection_complete')) THEN
      PERFORM kayad__org_fail('ORG_BRANCH_HAS_OPEN_WORK', 'this branch still has open bookings; complete, cancel or re-route them first');
    END IF;
    IF EXISTS (SELECT 1 FROM inspection_staff WHERE branch_id = p_branch AND affiliation_status <> 'ended') THEN
      PERFORM kayad__org_fail('ORG_BRANCH_HAS_MEMBERS', 'this branch still has members; move or remove them first');
    END IF;
  END IF;
  UPDATE inspection_branches SET status = p_status, status_reason = left(p_reason, 500), status_changed_at = now(), status_changed_by = p_actor
   WHERE id = p_branch RETURNING * INTO row_;
  PERFORM kayad__org_audit('branch', p_branch, cur.status, p_status, p_actor, COALESCE(p_reason, 'branch ' || p_status));
  RETURN to_jsonb(row_);
END $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. Membership operations
-- ---------------------------------------------------------------------------------------------------------------------
-- Releases a member's not-yet-started assignments (inspector_assigned -> confirmed). Refuses while an inspection is in flight.
CREATE OR REPLACE FUNCTION public.kayad__org_release_assignments(p_staff UUID, p_actor UUID, p_reason TEXT, p_only_outside_branch UUID DEFAULT NULL, p_keep_branch BOOLEAN DEFAULT false) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bk RECORD; n INT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM inspection_bookings WHERE assigned_staff_id = p_staff AND status IN ('travelling', 'inspection_started')) THEN
    PERFORM kayad__org_fail('ORG_MEMBER_HAS_ACTIVE_WORK', 'this person has an inspection in progress; let it finish or reassign it first');
  END IF;
  FOR bk IN SELECT id, status, branch_id FROM inspection_bookings WHERE assigned_staff_id = p_staff AND status = 'inspector_assigned' FOR UPDATE LOOP
    IF p_keep_branch AND (bk.branch_id IS NULL OR bk.branch_id IS NOT DISTINCT FROM p_only_outside_branch) THEN CONTINUE; END IF;
    UPDATE inspection_bookings SET assigned_staff_id = NULL, status = 'confirmed', status_changed_at = now(), updated_at = now() WHERE id = bk.id;
    PERFORM kayad__org_audit('booking', bk.id, bk.status, 'confirmed', p_actor, 'assignment released: ' || p_reason, bk.id, p_staff);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.kayad_org_member_invite(p_actor UUID, p_provider UUID, p_user UUID, p_access_role TEXT, p_tech_role TEXT,
  p_branch UUID, p_ttl_hours INT DEFAULT 168) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a RECORD; prov RECORD; u RECORD; live inspection_staff; created inspection_staff; trole TEXT; fname TEXT; lname TEXT;
BEGIN
  SELECT * INTO a FROM kayad__org_actor(p_actor, p_provider);
  PERFORM kayad__org_valid_scope(p_access_role, p_branch, p_provider);
  IF NOT kayad__org_can_manage_member(a.is_owner, a.access_role, a.branch_id, p_access_role, p_branch, p_access_role, p_branch) THEN
    PERFORM kayad__org_fail('ORG_FORBIDDEN', 'your role cannot invite this role or branch');
  END IF;
  SELECT * INTO prov FROM inspection_providers WHERE id = p_provider FOR SHARE;
  IF prov.lifecycle_stage <> 'ACTIVE' THEN PERFORM kayad__org_fail('ORG_PROVIDER_NOT_ACTIVE', 'only an active, verified business can add staff'); END IF;
  IF prov.user_id = p_user THEN PERFORM kayad__org_fail('ORG_OWNER_IS_NOT_STAFF', 'the business owner already has full access'); END IF;
  SELECT id, name, status, is_banned INTO u FROM users WHERE id = p_user;
  IF NOT FOUND OR u.status <> 'approved' OR COALESCE(u.is_banned, false) THEN PERFORM kayad__org_fail('ORG_USER_NOT_ELIGIBLE', 'no eligible KAYAD account'); END IF;
  trole := CASE p_access_role WHEN 'report_reviewer' THEN 'quality_reviewer'
                              WHEN 'inspector' THEN COALESCE(p_tech_role, 'junior_inspector')
                              WHEN 'technician' THEN COALESCE(p_tech_role, 'field_technician') ELSE NULL END;
  IF trole IS NOT NULL AND trole NOT IN ('lead_engineer', 'senior_inspector', 'junior_inspector', 'field_technician', 'workshop_technician', 'quality_reviewer') THEN
    PERFORM kayad__org_fail('ORG_INVALID', 'unknown technical title');
  END IF;
  IF (p_access_role = 'inspector' AND trole NOT IN ('lead_engineer', 'senior_inspector', 'junior_inspector'))
     OR (p_access_role = 'technician' AND trole NOT IN ('field_technician', 'workshop_technician')) THEN
    PERFORM kayad__org_fail('ORG_INVALID', 'technical title does not match the access role');
  END IF;
  SELECT * INTO live FROM inspection_staff WHERE provider_id = p_provider AND user_id = p_user AND affiliation_status <> 'ended' FOR UPDATE;
  IF FOUND THEN
    IF live.affiliation_status = 'pending' AND live.invitation_expires_at IS NOT NULL AND live.invitation_expires_at < now() THEN
      UPDATE inspection_staff SET affiliation_status = 'ended', is_active = false, affiliation_ended_at = now(), affiliation_ended_by = p_actor, status_reason = 'invitation expired', updated_at = now() WHERE id = live.id;
      PERFORM kayad__org_audit('membership', live.id, 'pending', 'ended', p_actor, 'invitation expired before re-invite', NULL, live.id);
    ELSIF live.affiliation_status = 'pending' AND live.access_role = p_access_role AND live.branch_id IS NOT DISTINCT FROM p_branch THEN
      RETURN to_jsonb(live) || jsonb_build_object('replayed', true);                     -- idempotent re-send of the same invitation
    ELSE
      PERFORM kayad__org_fail('ORG_ALREADY_MEMBER', 'this person already has a ' || live.affiliation_status || ' membership');
    END IF;
  END IF;
  fname := split_part(COALESCE(u.name, ''), ' ', 1); lname := NULLIF(btrim(substr(COALESCE(u.name, ''), length(fname) + 1)), '');
  INSERT INTO inspection_staff (provider_id, user_id, first_name, last_name, role, access_role, branch_id, is_active, affiliation_status,
                                provider_confirmed_at, invited_by, invitation_expires_at)
  VALUES (p_provider, p_user, NULLIF(fname, ''), lname, trole, p_access_role, p_branch, false, 'pending', now(), p_actor,
          now() + make_interval(hours => GREATEST(1, LEAST(COALESCE(p_ttl_hours, 168), 720))))
  RETURNING * INTO created;
  PERFORM kayad__org_audit('membership', created.id, NULL, 'pending', p_actor, 'invited as ' || p_access_role || COALESCE(' @branch ' || p_branch::text, ''), NULL, created.id);
  RETURN to_jsonb(created);
END $$;

-- Single-use acceptance by the invited person. Recipient identity = the authenticated user id stored on the invitation.
CREATE OR REPLACE FUNCTION public.kayad_org_member_accept(p_user UUID, p_staff UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s inspection_staff; prov RECORD; u RECORD; row_ inspection_staff; both_ BOOLEAN;
BEGIN
  SELECT * INTO s FROM inspection_staff WHERE id = p_staff FOR UPDATE;
  IF NOT FOUND OR s.user_id IS DISTINCT FROM p_user THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'invitation not found'); END IF;   -- recipient mismatch looks exactly like "no such invitation"
  IF s.affiliation_status <> 'pending' THEN PERFORM kayad__org_fail('ORG_INVITATION_NOT_PENDING', 'this invitation is ' || s.affiliation_status || ' and cannot be accepted'); END IF;
  IF s.invitation_expires_at IS NOT NULL AND s.invitation_expires_at < now() THEN
    UPDATE inspection_staff SET affiliation_status = 'ended', is_active = false, affiliation_ended_at = now(), status_reason = 'invitation expired', updated_at = now() WHERE id = p_staff;
    PERFORM kayad__org_audit('membership', p_staff, 'pending', 'ended', p_user, 'invitation expired', NULL, p_staff);
    RETURN jsonb_build_object('ok', false, 'code', 'ORG_INVITATION_EXPIRED');
  END IF;
  SELECT lifecycle_stage INTO prov FROM inspection_providers WHERE id = s.provider_id FOR SHARE;
  IF prov.lifecycle_stage <> 'ACTIVE' THEN PERFORM kayad__org_fail('ORG_PROVIDER_NOT_ACTIVE', 'this business is not currently accepting staff'); END IF;
  SELECT status, is_banned INTO u FROM users WHERE id = p_user;
  IF u.status <> 'approved' OR COALESCE(u.is_banned, false) THEN PERFORM kayad__org_fail('ORG_USER_NOT_ELIGIBLE', 'your account is not eligible'); END IF;
  IF s.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inspection_branches WHERE id = s.branch_id AND status = 'active') THEN
    PERFORM kayad__org_fail('ORG_BRANCH_NOT_FOUND', 'the branch for this invitation is no longer active');
  END IF;
  both_ := s.provider_confirmed_at IS NOT NULL;
  UPDATE inspection_staff SET user_confirmed_at = COALESCE(user_confirmed_at, now()),
         affiliation_status = CASE WHEN both_ THEN 'confirmed' ELSE 'pending' END, is_active = both_, updated_at = now()
   WHERE id = p_staff RETURNING * INTO row_;
  PERFORM kayad__org_audit('membership', p_staff, 'pending', row_.affiliation_status, p_user, 'accepted by the invited person', NULL, p_staff);
  RETURN jsonb_build_object('ok', true) || to_jsonb(row_);
END $$;

-- The business confirming a membership that the person requested themselves.
CREATE OR REPLACE FUNCTION public.kayad_org_member_confirm(p_actor UUID, p_staff UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s inspection_staff; a RECORD; prov RECORD; row_ inspection_staff; both_ BOOLEAN;
BEGIN
  SELECT * INTO s FROM inspection_staff WHERE id = p_staff FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'membership not found'); END IF;
  SELECT * INTO a FROM kayad__org_actor(p_actor, s.provider_id);
  IF NOT kayad__org_can_manage_member(a.is_owner, a.access_role, a.branch_id, s.access_role, s.branch_id, s.access_role, s.branch_id) THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'your role cannot confirm this membership'); END IF;
  IF s.user_id = p_actor THEN PERFORM kayad__org_fail('ORG_SELF_CHANGE_FORBIDDEN', 'you cannot confirm your own membership'); END IF;
  IF s.affiliation_status <> 'pending' THEN PERFORM kayad__org_fail('ORG_INVITATION_NOT_PENDING', 'this membership is ' || s.affiliation_status); END IF;
  IF s.invitation_expires_at IS NOT NULL AND s.invitation_expires_at < now() THEN
    UPDATE inspection_staff SET affiliation_status = 'ended', is_active = false, affiliation_ended_at = now(), status_reason = 'request expired', updated_at = now() WHERE id = p_staff;
    PERFORM kayad__org_audit('membership', p_staff, 'pending', 'ended', p_actor, 'request expired', NULL, p_staff);
    RETURN jsonb_build_object('ok', false, 'code', 'ORG_INVITATION_EXPIRED');
  END IF;
  SELECT lifecycle_stage INTO prov FROM inspection_providers WHERE id = s.provider_id FOR SHARE;
  IF prov.lifecycle_stage <> 'ACTIVE' THEN PERFORM kayad__org_fail('ORG_PROVIDER_NOT_ACTIVE', 'only an active, verified business can confirm staff'); END IF;
  both_ := s.user_confirmed_at IS NOT NULL;
  UPDATE inspection_staff SET provider_confirmed_at = COALESCE(provider_confirmed_at, now()),
         affiliation_status = CASE WHEN both_ THEN 'confirmed' ELSE 'pending' END, is_active = both_, updated_at = now()
   WHERE id = p_staff RETURNING * INTO row_;
  PERFORM kayad__org_audit('membership', p_staff, 'pending', row_.affiliation_status, p_actor, 'confirmed by the business', NULL, p_staff);
  RETURN jsonb_build_object('ok', true) || to_jsonb(row_);
END $$;

-- Change role / branch / technical title. p_patch keys: access_role, branch_id (explicit null = organization-wide), tech_role.
CREATE OR REPLACE FUNCTION public.kayad_org_member_change(p_actor UUID, p_staff UUID, p_patch JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s inspection_staff; a RECORD; k TEXT; new_role TEXT; new_branch UUID; new_title TEXT; row_ inspection_staff; released INT := 0; assignable BOOLEAN;
BEGIN
  SELECT * INTO s FROM inspection_staff WHERE id = p_staff FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'membership not found'); END IF;
  SELECT * INTO a FROM kayad__org_actor(p_actor, s.provider_id);
  FOR k IN SELECT jsonb_object_keys(COALESCE(p_patch, '{}'::jsonb)) LOOP
    IF k NOT IN ('access_role', 'branch_id', 'tech_role') THEN PERFORM kayad__org_fail('ORG_INVALID', 'field not editable: ' || k); END IF;
  END LOOP;
  IF s.user_id = p_actor THEN PERFORM kayad__org_fail('ORG_SELF_CHANGE_FORBIDDEN', 'you cannot change your own role or branch'); END IF;
  IF s.affiliation_status = 'ended' THEN PERFORM kayad__org_fail('ORG_MEMBERSHIP_ENDED', 'this membership has ended; invite the person again'); END IF;
  new_role := COALESCE(p_patch->>'access_role', s.access_role);
  new_branch := CASE WHEN p_patch ? 'branch_id' THEN NULLIF(p_patch->>'branch_id', '')::uuid ELSE s.branch_id END;
  IF NOT kayad__org_can_manage_member(a.is_owner, a.access_role, a.branch_id, s.access_role, s.branch_id, new_role, new_branch) THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'your role cannot make this change'); END IF;
  PERFORM kayad__org_valid_scope(new_role, new_branch, s.provider_id);
  new_title := CASE new_role WHEN 'report_reviewer' THEN 'quality_reviewer' WHEN 'inspector' THEN COALESCE(p_patch->>'tech_role', CASE WHEN s.role IN ('lead_engineer', 'senior_inspector', 'junior_inspector') THEN s.role ELSE 'junior_inspector' END)
                         WHEN 'technician' THEN COALESCE(p_patch->>'tech_role', CASE WHEN s.role IN ('field_technician', 'workshop_technician') THEN s.role ELSE 'field_technician' END) ELSE NULL END;
  IF (new_role = 'inspector' AND new_title NOT IN ('lead_engineer', 'senior_inspector', 'junior_inspector'))
     OR (new_role = 'technician' AND new_title NOT IN ('field_technician', 'workshop_technician')) THEN
    PERFORM kayad__org_fail('ORG_INVALID', 'technical title does not match the access role');
  END IF;
  assignable := new_role IN ('inspector', 'technician');
  IF NOT assignable THEN released := kayad__org_release_assignments(p_staff, p_actor, 'role changed to ' || new_role);
  ELSIF new_branch IS DISTINCT FROM s.branch_id AND new_branch IS NOT NULL THEN
    -- moved into a branch: keep assignments only for bookings routed to that branch or still unrouted
    released := kayad__org_release_assignments(p_staff, p_actor, 'moved to another branch', new_branch, true);
  END IF;
  UPDATE inspection_staff SET access_role = new_role, branch_id = new_branch, role = new_title, access_changed_by = p_actor, access_changed_at = now(), updated_at = now()
   WHERE id = p_staff RETURNING * INTO row_;
  PERFORM kayad__org_audit('membership', p_staff, s.access_role || COALESCE('@' || s.branch_id::text, ''), new_role || COALESCE('@' || new_branch::text, ''), p_actor,
                           'access changed (' || released || ' assignment(s) released)', NULL, p_staff);
  RETURN to_jsonb(row_) || jsonb_build_object('assignments_released', released);
END $$;

-- p_action: suspend | reactivate | revoke.  p_authority: org (default) | admin (platform administrator, verified here) | self (leave).
CREATE OR REPLACE FUNCTION public.kayad_org_member_set_status(p_actor UUID, p_staff UUID, p_action TEXT, p_reason TEXT, p_authority TEXT DEFAULT 'org') RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s inspection_staff; a RECORD; row_ inspection_staff; target TEXT; released INT := 0; adm BOOLEAN;
BEGIN
  IF p_action NOT IN ('suspend', 'reactivate', 'revoke') THEN PERFORM kayad__org_fail('ORG_INVALID', 'unknown action'); END IF;
  SELECT * INTO s FROM inspection_staff WHERE id = p_staff FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'membership not found'); END IF;
  IF p_authority = 'self' THEN
    IF s.user_id IS DISTINCT FROM p_actor OR p_action <> 'revoke' THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'membership not found'); END IF;
  ELSIF p_authority = 'admin' THEN
    SELECT EXISTS (SELECT 1 FROM users WHERE id = p_actor AND role IN ('admin', 'superadmin') AND status = 'approved') INTO adm;
    IF NOT adm THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'platform administrator required'); END IF;
  ELSE
    SELECT * INTO a FROM kayad__org_actor(p_actor, s.provider_id);
    IF s.user_id = p_actor THEN PERFORM kayad__org_fail('ORG_SELF_CHANGE_FORBIDDEN', 'you cannot change your own membership status; use leave'); END IF;
    IF NOT kayad__org_can_manage_member(a.is_owner, a.access_role, a.branch_id, s.access_role, s.branch_id, s.access_role, s.branch_id) THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'your role cannot manage this membership'); END IF;
  END IF;
  target := CASE p_action WHEN 'suspend' THEN 'suspended' WHEN 'reactivate' THEN 'confirmed' ELSE 'ended' END;
  IF s.affiliation_status = target THEN RETURN to_jsonb(s); END IF;                    -- idempotent
  IF s.affiliation_status = 'ended' THEN PERFORM kayad__org_fail('ORG_MEMBERSHIP_ENDED', 'this membership has ended'); END IF;
  IF p_action = 'suspend' AND s.affiliation_status <> 'confirmed' THEN PERFORM kayad__org_fail('ORG_INVALID', 'only a confirmed membership can be suspended'); END IF;
  IF p_action = 'reactivate' THEN
    IF s.affiliation_status <> 'suspended' THEN PERFORM kayad__org_fail('ORG_INVALID', 'only a suspended membership can be reactivated'); END IF;
    IF NOT EXISTS (SELECT 1 FROM inspection_providers WHERE id = s.provider_id AND lifecycle_stage = 'ACTIVE') THEN PERFORM kayad__org_fail('ORG_PROVIDER_NOT_ACTIVE', 'the organization is not active'); END IF;
    IF s.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inspection_branches WHERE id = s.branch_id AND status = 'active') THEN PERFORM kayad__org_fail('ORG_BRANCH_NOT_FOUND', 'the branch is not active'); END IF;
  END IF;
  IF p_action IN ('suspend', 'revoke') THEN
    IF p_action = 'suspend' AND btrim(COALESCE(p_reason, '')) = '' THEN PERFORM kayad__org_fail('ORG_INVALID', 'a reason is required to suspend a member'); END IF;
    released := kayad__org_release_assignments(p_staff, p_actor, p_action || ': ' || COALESCE(p_reason, 'no reason given'));
  END IF;
  UPDATE inspection_staff SET affiliation_status = target, is_active = (target = 'confirmed'), status_reason = left(p_reason, 500),
         suspended_at = CASE WHEN target = 'suspended' THEN now() ELSE NULL END, suspended_by = CASE WHEN target = 'suspended' THEN p_actor ELSE NULL END,
         affiliation_ended_at = CASE WHEN target = 'ended' THEN now() ELSE affiliation_ended_at END,
         affiliation_ended_by = CASE WHEN target = 'ended' THEN p_actor ELSE affiliation_ended_by END, updated_at = now()
   WHERE id = p_staff RETURNING * INTO row_;
  IF target = 'ended' THEN
    UPDATE provider_service_capabilities SET status = 'revoked', reviewed_by = p_actor, reviewed_at = now(), review_notes = 'Membership ended', updated_at = now()
     WHERE staff_id = p_staff AND status <> 'revoked';
  END IF;
  PERFORM kayad__org_audit('membership', p_staff, s.affiliation_status, target, p_actor, p_action || COALESCE(': ' || p_reason, '') || ' (' || released || ' assignment(s) released)', NULL, p_staff);
  RETURN to_jsonb(row_) || jsonb_build_object('assignments_released', released);
END $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 8. Booking operations: route / assign / transition - authority + state + audit in one transaction
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_org_booking_route(p_actor UUID, p_booking UUID, p_branch UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bk inspection_bookings; acc JSONB; st inspection_staff; was_assigned BOOLEAN := false;
BEGIN
  SELECT * INTO bk FROM inspection_bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'booking not found'); END IF;
  acc := kayad_org_booking_access(p_booking, p_actor);
  IF acc IS NULL OR NOT (acc->>'can_manage')::boolean THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'booking not found'); END IF;
  IF acc->>'role' = 'branch_manager' THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'only organization-level staff can re-route a booking between branches'); END IF;
  IF bk.status NOT IN ('booked', 'confirmed', 'inspector_assigned') THEN PERFORM kayad__org_fail('ORG_BOOKING_STATE', 'a booking cannot be re-routed once the inspection has started or ended'); END IF;
  IF p_branch IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inspection_branches WHERE id = p_branch AND provider_id = bk.provider_id AND status = 'active') THEN
    PERFORM kayad__org_fail('ORG_BRANCH_NOT_FOUND', 'branch not found in this organization or not active');
  END IF;
  IF bk.branch_id IS NOT DISTINCT FROM p_branch THEN RETURN to_jsonb(bk); END IF;     -- idempotent
  IF bk.assigned_staff_id IS NOT NULL THEN
    SELECT * INTO st FROM inspection_staff WHERE id = bk.assigned_staff_id;
    IF st.branch_id IS NOT NULL AND st.branch_id IS DISTINCT FROM p_branch THEN
      UPDATE inspection_bookings SET assigned_staff_id = NULL, status = 'confirmed', status_changed_at = now() WHERE id = p_booking;   -- trigger requires an inspector for inspector_assigned
      PERFORM kayad__org_audit('booking', p_booking, bk.status, 'confirmed', p_actor, 'assignment released: booking re-routed', p_booking, st.id);
      was_assigned := true;
    END IF;
  END IF;
  UPDATE inspection_bookings SET branch_id = p_branch, updated_at = now() WHERE id = p_booking RETURNING * INTO bk;
  PERFORM kayad__org_audit('booking', p_booking, COALESCE(acc->>'branch_id', 'unrouted'), COALESCE(p_branch::text, 'unrouted'), p_actor, 'booking routed', p_booking);
  RETURN to_jsonb(bk) || jsonb_build_object('assignment_released', was_assigned);
END $$;

CREATE OR REPLACE FUNCTION public.kayad_org_booking_assign(p_actor UUID, p_booking UUID, p_staff UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bk inspection_bookings; acc JSONB; st inspection_staff; prov RECORD; urole TEXT; prev TEXT;
BEGIN
  SELECT * INTO bk FROM inspection_bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'booking not found'); END IF;
  acc := kayad_org_booking_access(p_booking, p_actor);
  IF acc IS NULL OR NOT (acc->>'can_manage')::boolean THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'booking not found'); END IF;
  IF bk.status NOT IN ('booked', 'confirmed', 'inspector_assigned') THEN PERFORM kayad__org_fail('ORG_BOOKING_STATE', 'an inspector cannot be assigned at this stage'); END IF;
  SELECT * INTO st FROM inspection_staff WHERE id = p_staff FOR SHARE;
  IF NOT FOUND OR st.provider_id <> bk.provider_id THEN PERFORM kayad__org_fail('ORG_INVALID_INSPECTOR', 'that person is not a member of this organization'); END IF;
  SELECT lifecycle_stage, status, verification_status INTO prov FROM inspection_providers WHERE id = bk.provider_id FOR SHARE;
  IF prov.lifecycle_stage <> 'ACTIVE' OR prov.status <> 'active' OR prov.verification_status <> 'verified' THEN PERFORM kayad__org_fail('ORG_PROVIDER_NOT_ACTIVE', 'this business is not currently eligible to take jobs'); END IF;
  IF st.affiliation_status <> 'confirmed' OR NOT st.is_active THEN PERFORM kayad__org_fail('ORG_INVALID_INSPECTOR', 'inspector membership is not active'); END IF;
  IF st.access_role NOT IN ('inspector', 'technician') THEN PERFORM kayad__org_fail('ORG_INVALID_INSPECTOR', 'this member does not perform inspections'); END IF;
  IF NOT COALESCE(st.is_available, true) THEN PERFORM kayad__org_fail('ORG_INVALID_INSPECTOR', 'inspector is marked unavailable'); END IF;
  IF st.user_id IS NULL THEN PERFORM kayad__org_fail('ORG_INVALID_INSPECTOR', 'inspector has no linked user account'); END IF;
  SELECT role INTO urole FROM users WHERE id = st.user_id AND status = 'approved' AND COALESCE(is_banned, false) = false;
  IF urole IS NULL OR urole NOT IN ('ghost_checker', 'admin', 'superadmin') THEN PERFORM kayad__org_fail('ORG_INVALID_INSPECTOR', 'inspector account is not authorized to inspect'); END IF;
  IF st.branch_id IS NOT NULL AND (bk.branch_id IS DISTINCT FROM st.branch_id) THEN PERFORM kayad__org_fail('ORG_BRANCH_MISMATCH', 'this inspector belongs to a different branch than the booking'); END IF;
  IF st.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inspection_branches WHERE id = st.branch_id AND status = 'active') THEN PERFORM kayad__org_fail('ORG_BRANCH_NOT_FOUND', 'the inspector''s branch is not active'); END IF;
  prev := bk.status;
  UPDATE inspection_bookings SET assigned_staff_id = p_staff, status = 'inspector_assigned', status_changed_at = now(), updated_at = now() WHERE id = p_booking RETURNING * INTO bk;
  PERFORM kayad__org_audit('booking', p_booking, prev, 'inspector_assigned', p_actor, 'inspector assigned', p_booking, p_staff);
  RETURN to_jsonb(bk);
END $$;

-- Operational transitions. confirm|cancel need can_manage; travel|start|complete|no_show need can_execute. Assignment is NOT a transition here.
CREATE OR REPLACE FUNCTION public.kayad_org_booking_transition(p_actor UUID, p_booking UUID, p_action TEXT, p_notes TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE bk inspection_bookings; acc JSONB; need_manage BOOLEAN; to_status TEXT; ok BOOLEAN; prev TEXT;
BEGIN
  IF p_action NOT IN ('confirm', 'cancel', 'travel', 'start', 'complete', 'no_show') THEN PERFORM kayad__org_fail('ORG_INVALID', 'unknown booking action'); END IF;
  SELECT * INTO bk FROM inspection_bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND THEN PERFORM kayad__org_fail('ORG_NOT_FOUND', 'booking not found'); END IF;
  acc := kayad_org_booking_access(p_booking, p_actor);
  need_manage := p_action IN ('confirm', 'cancel');
  IF acc IS NULL OR NOT (acc->>(CASE WHEN need_manage THEN 'can_manage' ELSE 'can_execute' END))::boolean THEN
    PERFORM kayad__org_fail('ORG_NOT_FOUND', 'booking not found');   -- no distinction between "not yours" and "does not exist"
  END IF;
  to_status := CASE p_action WHEN 'confirm' THEN 'confirmed' WHEN 'cancel' THEN 'cancelled' WHEN 'travel' THEN 'travelling'
                             WHEN 'start' THEN 'inspection_started' WHEN 'complete' THEN 'inspection_complete' ELSE 'no_show' END;
  ok := CASE p_action WHEN 'confirm' THEN bk.status = 'booked'
                      WHEN 'cancel' THEN bk.status IN ('booked', 'confirmed', 'inspector_assigned')
                      WHEN 'travel' THEN bk.status = 'inspector_assigned'
                      WHEN 'start' THEN bk.status = 'travelling'
                      WHEN 'complete' THEN bk.status = 'inspection_started'
                      ELSE bk.status = 'travelling' END;
  IF NOT ok THEN PERFORM kayad__org_fail('ORG_BOOKING_STATE', 'cannot ' || p_action || ' a booking that is ' || bk.status); END IF;
  prev := bk.status;
  UPDATE inspection_bookings SET status = to_status, status_changed_at = now(), updated_at = now(),
         confirmed_at = CASE WHEN to_status = 'confirmed' THEN now() ELSE confirmed_at END,
         started_at = CASE WHEN to_status = 'inspection_started' THEN now() ELSE started_at END,
         cancelled_at = CASE WHEN to_status = 'cancelled' THEN now() ELSE cancelled_at END,
         internal_notes = COALESCE(NULLIF(left(p_notes, 2000), ''), internal_notes)
   WHERE id = p_booking RETURNING * INTO bk;
  PERFORM kayad__org_audit('booking', p_booking, prev, to_status, p_actor, p_action || COALESCE(': ' || NULLIF(left(p_notes, 200), ''), ''), p_booking, (acc->>'staff_id')::uuid);
  RETURN to_jsonb(bk);
END $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 9. Consolidated reporting. Every transaction/booking row is counted exactly once (one branch bucket or 'unrouted').
--    Dates: bookings by scheduled_date (calendar date); money by created_at interpreted in Africa/Nairobi, [from, to+1day).
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_org_report(p_actor UUID, p_provider UUID, p_branch UUID, p_from DATE, p_to DATE) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a RECORD; f DATE := COALESCE(p_from, (now() AT TIME ZONE 'Africa/Nairobi')::date - 30); t DATE := COALESCE(p_to, (now() AT TIME ZONE 'Africa/Nairobi')::date);
        scope_branch UUID := p_branch; ops BOOLEAN; fin BOOLEAN; org_level BOOLEAN; ts_from TIMESTAMPTZ; ts_to TIMESTAMPTZ; out JSONB := '{}'::jsonb;
BEGIN
  SELECT * INTO a FROM kayad__org_actor(p_actor, p_provider);
  org_level := a.is_owner OR a.access_role IN ('org_admin', 'operations_manager');
  ops := org_level OR a.access_role = 'branch_manager';
  fin := a.is_owner OR a.access_role IN ('org_admin', 'finance') OR a.access_role = 'branch_manager';
  IF NOT (ops OR fin) THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'your role cannot view reports'); END IF;
  IF a.access_role = 'branch_manager' THEN
    IF p_branch IS NOT NULL AND p_branch IS DISTINCT FROM a.branch_id THEN PERFORM kayad__org_fail('ORG_FORBIDDEN', 'you can only view your own branch'); END IF;
    scope_branch := a.branch_id;
  ELSIF p_branch IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inspection_branches WHERE id = p_branch AND provider_id = p_provider) THEN
    PERFORM kayad__org_fail('ORG_NOT_FOUND', 'branch not found');
  END IF;
  IF t < f OR t - f > 400 THEN PERFORM kayad__org_fail('ORG_INVALID', 'date range must be ordered and at most 400 days'); END IF;
  ts_from := (f::timestamp AT TIME ZONE 'Africa/Nairobi'); ts_to := ((t + 1)::timestamp AT TIME ZONE 'Africa/Nairobi');
  out := jsonb_build_object('period', jsonb_build_object('from', f, 'to', t, 'timezone', 'Africa/Nairobi'), 'scope', jsonb_build_object('role', a.access_role, 'branch_id', scope_branch, 'organization_wide', scope_branch IS NULL));

  IF ops AND a.access_role <> 'finance' THEN
    out := out || jsonb_build_object(
      'bookings_by_branch_status', COALESCE((SELECT jsonb_agg(jsonb_build_object('branch_id', branch_id, 'status', status, 'count', n) ORDER BY branch_id NULLS FIRST, status)
          FROM (SELECT branch_id, status, count(*) AS n FROM inspection_bookings WHERE provider_id = p_provider AND scheduled_date BETWEEN f AND t
                  AND (scope_branch IS NULL OR branch_id = scope_branch) GROUP BY 1, 2) x), '[]'::jsonb),
      'inspections', (SELECT jsonb_build_object(
          'completed', count(*) FILTER (WHERE status IN ('inspection_complete', 'report_generated', 'customer_reviewed', 'closed')),
          'outstanding', count(*) FILTER (WHERE status IN ('booked', 'confirmed', 'inspector_assigned', 'travelling', 'inspection_started')),
          'cancelled_or_no_show', count(*) FILTER (WHERE status IN ('cancelled', 'no_show')))
          FROM inspection_bookings WHERE provider_id = p_provider AND scheduled_date BETWEEN f AND t AND (scope_branch IS NULL OR branch_id = scope_branch)),
      'report_quality', (SELECT jsonb_build_object('reports', count(*), 'with_amendment', count(*) FILTER (WHERE am.n > 0),
          'correction_rate', CASE WHEN count(*) = 0 THEN NULL ELSE round(count(*) FILTER (WHERE am.n > 0)::numeric / count(*), 4) END,
          'avg_turnaround_hours', round(avg(EXTRACT(EPOCH FROM (r.created_at - h.done_at)) / 3600.0) FILTER (WHERE h.done_at IS NOT NULL AND r.created_at >= h.done_at)::numeric, 2),
          'turnaround_samples', count(*) FILTER (WHERE h.done_at IS NOT NULL AND r.created_at >= h.done_at))
          FROM inspection_reports r JOIN inspection_bookings b ON b.id = r.booking_id
          LEFT JOIN LATERAL (SELECT count(*) AS n FROM inspection_report_amendments x WHERE x.report_id = r.id) am ON true
          LEFT JOIN LATERAL (SELECT min(created_at) AS done_at FROM inspection_status_history x WHERE x.booking_id = b.id AND x.to_status = 'inspection_complete') h ON true
          WHERE b.provider_id = p_provider AND b.scheduled_date BETWEEN f AND t AND (scope_branch IS NULL OR b.branch_id = scope_branch)),
      'staff_workload', COALESCE((SELECT jsonb_agg(jsonb_build_object('staff_id', s.id, 'name', btrim(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')), 'access_role', s.access_role,
          'branch_id', s.branch_id, 'open_assigned', COALESCE(w.open_n, 0), 'completed_in_period', COALESCE(w.done_n, 0)) ORDER BY s.created_at)
          FROM inspection_staff s LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE b.status IN ('inspector_assigned', 'travelling', 'inspection_started')) AS open_n,
              count(*) FILTER (WHERE b.status IN ('inspection_complete', 'report_generated', 'customer_reviewed', 'closed') AND b.scheduled_date BETWEEN f AND t) AS done_n
              FROM inspection_bookings b WHERE b.assigned_staff_id = s.id) w ON true
          WHERE s.provider_id = p_provider AND s.affiliation_status = 'confirmed' AND s.access_role IN ('inspector', 'technician')
            AND (scope_branch IS NULL OR s.branch_id = scope_branch)), '[]'::jsonb));
  END IF;

  IF fin THEN
    out := out || jsonb_build_object(
      'earnings_by_branch', COALESCE((SELECT jsonb_agg(jsonb_build_object('branch_id', branch_id, 'currency', currency, 'transaction_type', transaction_type, 'status', status, 'count', n, 'amount', amt)
            ORDER BY branch_id NULLS FIRST, currency, transaction_type, status)
          FROM (SELECT b.branch_id, t_.currency, t_.transaction_type, t_.status, count(*) AS n, round(sum(t_.amount), 2) AS amt
                  FROM inspection_transactions t_ JOIN inspection_bookings b ON b.id = t_.booking_id AND b.provider_id = p_provider
                 WHERE t_.provider_id = p_provider AND t_.created_at >= ts_from AND t_.created_at < ts_to AND (scope_branch IS NULL OR b.branch_id = scope_branch)
                 GROUP BY 1, 2, 3, 4) x), '[]'::jsonb));
    IF scope_branch IS NULL AND (a.is_owner OR a.access_role IN ('org_admin', 'finance')) THEN
      out := out || jsonb_build_object(
        'unattributed_transactions', COALESCE((SELECT jsonb_agg(jsonb_build_object('currency', currency, 'transaction_type', transaction_type, 'status', status, 'count', n, 'amount', amt) ORDER BY currency, transaction_type, status)
            FROM (SELECT currency, transaction_type, status, count(*) AS n, round(sum(amount), 2) AS amt FROM inspection_transactions
                   WHERE provider_id = p_provider AND booking_id IS NULL AND created_at >= ts_from AND created_at < ts_to GROUP BY 1, 2, 3) x), '[]'::jsonb),
        'settlements', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', status, 'count', n, 'gross', g, 'net', nt) ORDER BY status)
            FROM (SELECT status, count(*) AS n, round(sum(gross_amount), 2) AS g, round(sum(net_amount), 2) AS nt FROM inspection_settlements
                   WHERE provider_id = p_provider AND created_at >= ts_from AND created_at < ts_to GROUP BY 1) x), '[]'::jsonb));
    END IF;
  END IF;
  RETURN out;
END $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 10. Row level security: staff-facing policies must honour the CURRENT membership, not just a historical assignment.
--     Wrappers use auth.uid() only, so an end user can ask only about themselves.
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kayad_policy_can_view_booking(p_booking UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE((kayad_org_booking_access(p_booking, (SELECT auth.uid())) ->> 'can_view')::boolean, false)
$$;
CREATE OR REPLACE FUNCTION public.kayad_policy_org_role(p_provider UUID, p_roles TEXT[]) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM kayad_org_context(p_provider, (SELECT auth.uid())) c WHERE c.is_owner OR c.access_role = ANY (p_roles))
$$;
CREATE OR REPLACE FUNCTION public.kayad_policy_can_view_branch(p_provider UUID, p_branch UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM kayad_org_context(p_provider, (SELECT auth.uid())) c WHERE c.is_owner OR c.branch_id IS NULL OR c.branch_id = p_branch)
$$;
CREATE OR REPLACE FUNCTION public.kayad_policy_can_view_member(p_provider UUID, p_user UUID, p_branch UUID, p_role TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_user = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM kayad_org_context(p_provider, (SELECT auth.uid())) c
     WHERE c.is_owner OR c.access_role IN ('org_admin', 'operations_manager')
        OR (c.access_role = 'branch_manager' AND c.branch_id = p_branch))
$$;
REVOKE ALL ON FUNCTION public.kayad_policy_can_view_booking(UUID), public.kayad_policy_org_role(UUID, TEXT[]),
  public.kayad_policy_can_view_branch(UUID, UUID), public.kayad_policy_can_view_member(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kayad_policy_can_view_booking(UUID), public.kayad_policy_org_role(UUID, TEXT[]),
  public.kayad_policy_can_view_branch(UUID, UUID), public.kayad_policy_can_view_member(UUID, UUID, UUID, TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS inspection_booking_select_provider ON public.inspection_bookings;
CREATE POLICY inspection_booking_select_provider ON public.inspection_bookings FOR SELECT TO authenticated
  USING (public.kayad_policy_can_view_booking(id) OR (SELECT is_admin()));

DROP POLICY IF EXISTS inspection_report_select_inspector ON public.inspection_reports;
CREATE POLICY inspection_report_select_inspector ON public.inspection_reports FOR SELECT TO authenticated
  USING (public.kayad_policy_can_view_booking(booking_id) OR (SELECT is_admin()));
DROP POLICY IF EXISTS inspection_report_select_provider ON public.inspection_reports;
CREATE POLICY inspection_report_select_provider ON public.inspection_reports FOR SELECT TO authenticated
  USING (public.kayad_policy_can_view_booking(booking_id) OR (SELECT is_admin()));

DROP POLICY IF EXISTS inspection_staff_select_member_provider ON public.inspection_staff;
CREATE POLICY inspection_staff_select_member_provider ON public.inspection_staff FOR SELECT TO authenticated
  USING (public.kayad_policy_can_view_member(provider_id, user_id, branch_id, access_role) OR (SELECT is_admin()));

DROP POLICY IF EXISTS inspection_transaction_select_provider ON public.inspection_transactions;
CREATE POLICY inspection_transaction_select_provider ON public.inspection_transactions FOR SELECT TO authenticated
  USING (public.kayad_policy_org_role(provider_id, ARRAY['org_admin', 'finance']) OR (SELECT is_admin()));
DROP POLICY IF EXISTS inspection_settlement_select_provider ON public.inspection_settlements;
CREATE POLICY inspection_settlement_select_provider ON public.inspection_settlements FOR SELECT TO authenticated
  USING (public.kayad_policy_org_role(provider_id, ARRAY['org_admin', 'finance']) OR (SELECT is_admin()));

-- inspection_branches already has RLS enabled (20261011093100) and no policy for end users (service_role only). Enabling it
-- again is a no-op and keeps this file self-describing for the RLS-enablement validator. A member may read the branches
-- inside their own scope; nobody gets write access through PostgREST.
ALTER TABLE public.inspection_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inspection_branches_select_member ON public.inspection_branches;
CREATE POLICY inspection_branches_select_member ON public.inspection_branches FOR SELECT TO authenticated
  USING (public.kayad_policy_can_view_branch(provider_id, id) OR (SELECT is_admin()));
GRANT SELECT ON public.inspection_branches TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 11. Grants: the primitives and operations are callable by service_role only.
-- ---------------------------------------------------------------------------------------------------------------------
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'kayad_org_role_rank(text)', 'kayad_org_context(uuid,uuid)', 'kayad_org_booking_access(uuid,uuid)',
    'kayad__org_audit(text,uuid,text,text,uuid,text,uuid,uuid)', 'kayad__org_fail(text,text)', 'kayad__org_actor(uuid,uuid)',
    'kayad__org_valid_scope(text,uuid,uuid)', 'kayad__org_can_manage_member(boolean,text,uuid,text,uuid,text,uuid)', 'kayad__org_release_assignments(uuid,uuid,text,uuid,boolean)',
    'kayad_org_branch_create(uuid,uuid,text,text,text,text,text,numeric,numeric,boolean)', 'kayad_org_branch_update(uuid,uuid,jsonb)',
    'kayad_org_branch_set_status(uuid,uuid,text,text)', 'kayad_org_member_invite(uuid,uuid,uuid,text,text,uuid,integer)',
    'kayad_org_member_accept(uuid,uuid)', 'kayad_org_member_confirm(uuid,uuid)', 'kayad_org_member_change(uuid,uuid,jsonb)',
    'kayad_org_member_set_status(uuid,uuid,text,text,text)', 'kayad_org_booking_route(uuid,uuid,uuid)',
    'kayad_org_booking_assign(uuid,uuid,uuid)', 'kayad_org_booking_transition(uuid,uuid,text,text)',
    'kayad_org_report(uuid,uuid,uuid,date,date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;
