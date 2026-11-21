-- The immutability guard is invoked by a table trigger and does not need
-- elevated privileges or public RPC exposure.
create or replace function public.kayad_inspection_report_immutability_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  if old.is_locked then
    if new.booking_id<>old.booking_id or new.report_number<>old.report_number or new.overall_score is distinct from old.overall_score
       or new.overall_condition is distinct from old.overall_condition or new.findings is distinct from old.findings
       or new.critical_issues is distinct from old.critical_issues or new.recommendations is distinct from old.recommendations
       or new.executive_summary is distinct from old.executive_summary or new.detailed_findings is distinct from old.detailed_findings
       or new.technician_notes is distinct from old.technician_notes or new.diagnostic_codes is distinct from old.diagnostic_codes
       or new.photos is distinct from old.photos or new.quality_score is distinct from old.quality_score
       or new.pdf_url is distinct from old.pdf_url or new.version is distinct from old.version then
      raise exception 'Locked inspection evidence is immutable; create a new report version instead';
    end if;
  end if;
  return new;
end; $function$;

revoke execute on function public.kayad_inspection_report_immutability_guard() from public, anon, authenticated;
grant execute on function public.kayad_inspection_report_immutability_guard() to postgres, service_role;
