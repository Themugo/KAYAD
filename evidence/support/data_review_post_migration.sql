-- READ-ONLY, AGGREGATE-ONLY post-migration review (staging / production copy). Expected value is stated per line.
BEGIN READ ONLY;
\pset tuples_only on
\pset format unaligned
select 'post.rows', count(*) from support_tickets;
select 'post.backup rows == pre.rated_with_resolution_notes', count(*) from support_tickets where legacy_resolution_notes is not null;
select 'post.comment preserved byte-for-byte (expect 0 mismatches)', count(*) from support_tickets where legacy_resolution_notes is not null and satisfaction_comment is distinct from legacy_resolution_notes;
select 'post.rated rows still holding customer text in resolution_notes (expect 0)', count(*) from support_tickets where satisfaction_rating is not null and resolution_notes is not null and legacy_resolution_notes is not null;
select 'post.unrated staff notes untouched (== pre.unrated_with_resolution_notes)', count(*) from support_tickets where satisfaction_rating is null and resolution_notes is not null;
select 'post.ticket_number null (expect 0)', count(*) from support_tickets where ticket_number is null;
select 'post.ticket_number duplicates (expect 0)', count(*) from (select ticket_number from support_tickets group by 1 having count(*)>1) d;
select 'post.unique index present (expect 1)', count(*) from pg_indexes where indexname='uq_support_tickets_ticket_number';
select 'post.audit rows for the move (expect 1 if anything moved, 1 after re-run)', count(*), coalesce(max((details->>'rows')::int),0) from audit_logs where action='support.migration_rating_comment_moved';
select 'post.pre-existing audit rows preserved (expect >= pre.audit_logs rows)', count(*) from audit_logs;
select 'post.no table CHECK named support_ticket_category/length (expect 0)', count(*) from pg_constraint where conname in ('support_ticket_category_check','support_ticket_length_check');
select 'post.function EXECUTE for anon/authenticated (expect 0 rows true)', p.proname, r.rolname from pg_proc p cross join (select rolname from pg_roles where rolname in ('anon','authenticated')) r where (p.proname like 'kayad%support%') and has_function_privilege(r.rolname,p.oid,'EXECUTE');
select 'post.service_role EXECUTE count (expect 9)', count(*) from pg_proc p where p.proname like 'kayad%support%' and has_function_privilege('service_role',p.oid,'EXECUTE');
select 'post.authenticated column SELECT on messages/resolution_notes/legacy/assigned_to/sla (expect all f)', c, has_column_privilege('authenticated','support_tickets',c,'SELECT') from unnest(array['messages','resolution_notes','legacy_resolution_notes','assigned_to','escalated_to','sla']) c;
select 'post.anon/authenticated INSERT,UPDATE,DELETE (expect all f)', r, has_table_privilege(r,'support_tickets','INSERT'), has_table_privilege(r,'support_tickets','UPDATE'), has_table_privilege(r,'support_tickets','DELETE') from unnest(array['anon','authenticated']) r;
select 'post.policies on support_tickets (expect only owner read)', policyname, cmd from pg_policies where tablename='support_tickets';
ROLLBACK;
