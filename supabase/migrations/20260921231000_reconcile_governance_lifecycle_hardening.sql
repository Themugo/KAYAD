-- KAYAD forward-only reconciliation of governance lifecycle integrity.
-- Restores the active configuration uniqueness and updated_at guarantees
-- without resurrecting any historical governance schema.

CREATE INDEX IF NOT EXISTS governance_changes_submitted_idx
  ON public.change_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS governance_changes_reviewer_idx
  ON public.change_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS governance_risks_severity_status_idx
  ON public.risk_assessments(severity, status);
CREATE INDEX IF NOT EXISTS governance_features_stage_idx
  ON public.feature_lifecycles(stage);
CREATE INDEX IF NOT EXISTS governance_releases_planned_idx
  ON public.releases(planned_at);
CREATE INDEX IF NOT EXISTS governance_decisions_decided_idx
  ON public.decision_registers(decided_at DESC);
CREATE INDEX IF NOT EXISTS governance_standards_status_idx
  ON public.enterprise_standards(status);
CREATE INDEX IF NOT EXISTS governance_partners_type_status_idx
  ON public.partner_requirements(partner_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS governance_country_rules_active_unique_idx
  ON public.country_rules(country_code, name) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS governance_partner_requirements_active_unique_idx
  ON public.partner_requirements(partner_type, name) WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.governance_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS governance_policies_touch_updated_at ON public.governance_policies;
CREATE TRIGGER governance_policies_touch_updated_at
BEFORE UPDATE ON public.governance_policies
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS change_requests_touch_updated_at ON public.change_requests;
CREATE TRIGGER change_requests_touch_updated_at
BEFORE UPDATE ON public.change_requests
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS approval_rules_touch_updated_at ON public.approval_rules;
CREATE TRIGGER approval_rules_touch_updated_at
BEFORE UPDATE ON public.approval_rules
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS feature_lifecycles_touch_updated_at ON public.feature_lifecycles;
CREATE TRIGGER feature_lifecycles_touch_updated_at
BEFORE UPDATE ON public.feature_lifecycles
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS risk_assessments_touch_updated_at ON public.risk_assessments;
CREATE TRIGGER risk_assessments_touch_updated_at
BEFORE UPDATE ON public.risk_assessments
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS enterprise_standards_touch_updated_at ON public.enterprise_standards;
CREATE TRIGGER enterprise_standards_touch_updated_at
BEFORE UPDATE ON public.enterprise_standards
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS country_rules_touch_updated_at ON public.country_rules;
CREATE TRIGGER country_rules_touch_updated_at
BEFORE UPDATE ON public.country_rules
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS partner_requirements_touch_updated_at ON public.partner_requirements;
CREATE TRIGGER partner_requirements_touch_updated_at
BEFORE UPDATE ON public.partner_requirements
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS releases_touch_updated_at ON public.releases;
CREATE TRIGGER releases_touch_updated_at
BEFORE UPDATE ON public.releases
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

DROP TRIGGER IF EXISTS decision_registers_touch_updated_at ON public.decision_registers;
CREATE TRIGGER decision_registers_touch_updated_at
BEFORE UPDATE ON public.decision_registers
FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();
