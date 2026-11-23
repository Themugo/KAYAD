CREATE OR REPLACE FUNCTION public.kayad_apply_dealer_verification_atomic(p_user uuid, p_action text, p_admin uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor public.users%rowtype;
  v_target public.users%rowtype;
  v_dealer uuid;
  v_state public.admin_control_state%rowtype;
  v_status text;
  v_reason text := nullif(trim(coalesce(p_reason,'')),'');
begin
  if p_action not in ('approve','reject','suspend') then raise exception 'Invalid verification action'; end if;
  if v_reason is null then raise exception 'A reason is required'; end if;

  select * into v_actor from public.users where id=p_admin for update;
  if not found or v_actor.status<>'approved' or coalesce(v_actor.is_banned,false)
     or v_actor.role not in ('admin','superadmin') then
    raise exception 'Admin authorization required';
  end if;

  select * into v_state from public.admin_control_state where id=true for update;
  if coalesce(v_state.changes_locked,false) then raise exception 'Administrative changes are locked'; end if;

  perform public.kayad_admin_authorize_capability(p_admin,'dealers.manage',v_reason);

  select * into v_target from public.users where id=p_user for update;
  if not found then raise exception 'User not found'; end if;
  if v_target.role='superadmin' and p_action='approve' then
    raise exception 'A superadmin cannot be converted into a dealer through verification';
  end if;

  select id into v_dealer from public.dealers where "user"=p_user for update;
  if v_dealer is null then raise exception 'Dealer record not found for user'; end if;

  if p_action='approve' then
    v_status := 'approved';
    update public.users
      set role='dealer', super_admin=false, status='approved', is_banned=false, updated_at=now()
      where id=p_user;
    update public.dealers
      set approved=true,is_suspended=false,suspension_reason=null,verified_at=now(),updated_at=now()
      where id=v_dealer;
  elsif p_action='reject' then
    v_status := 'rejected';
    update public.dealers
      set approved=false,updated_at=now()
      where id=v_dealer;
  else
    v_status := 'pending';
    update public.dealers
      set is_suspended=true,suspension_reason=v_reason,updated_at=now()
      where id=v_dealer;
  end if;

  update public.dealer_verifications
    set verification_status=v_status,
        reviewed_at=now(),reviewed_by=p_admin,
        rejection_reason=case when p_action='reject' then v_reason else rejection_reason end,
        suspension_reason=case when p_action='suspend' then v_reason else suspension_reason end,
        updated_at=now()
  where "user"=p_user;

  if not found then raise exception 'Dealer verification record not found'; end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details,actor_role,actor_name,created_at)
  values(
    p_admin,
    'admin_dealers_manage_'||p_action,
    'dealer',
    v_dealer,
    jsonb_build_object('userId',p_user,'dealerId',v_dealer,'action',p_action,'reason',v_reason,'outcome','executed'),
    v_actor.role,v_actor.name,now()
  );

  return jsonb_build_object('userId',p_user,'dealerId',v_dealer,'action',p_action,'status',v_status);
end;
$function$

