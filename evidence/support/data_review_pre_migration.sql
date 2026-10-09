-- READ-ONLY, AGGREGATE-ONLY pre-migration review of support_tickets. Run on a production COPY / staging.
-- Emits counts and ids only — never subject, description, message or note text.
BEGIN READ ONLY;
\pset tuples_only on
\pset format unaligned
select 'pre.rows', count(*) from support_tickets;
select 'pre.rated', count(*) from support_tickets where satisfaction_rating is not null;
select 'pre.rated_with_resolution_notes (will move to satisfaction_comment, original kept in legacy_resolution_notes)', count(*) from support_tickets where satisfaction_rating is not null and resolution_notes is not null;
select 'pre.unrated_with_resolution_notes (stay untouched)', count(*) from support_tickets where satisfaction_rating is null and resolution_notes is not null;
select 'pre.ambiguous: rated AND status not in (resolved,closed) AND notes present (review by a human)', count(*) from support_tickets where satisfaction_rating is not null and resolution_notes is not null and status not in ('resolved','closed');
select 'pre.ticket_number null', count(*) from support_tickets where ticket_number is null;
select 'pre.ticket_number duplicates', count(*) from (select ticket_number from support_tickets group by 1 having count(*)>1) d;
select 'pre.ticket_number already in new format SUP-YYYYMMDD-dddddd', count(*) from support_tickets where ticket_number ~ '^SUP-[0-9]{8}-[0-9]{6}$';
select 'pre.unknown category (kept, still updatable)', count(*) from support_tickets where category is not null and category not in ('marketplace','seller','auction','inspection','service_provider','escrow','financing','transfer','account','technical','general');
select 'pre.subject>200 or description>5000 (kept, still updatable)', count(*) from support_tickets where char_length(subject)>200 or char_length(description)>5000;
select 'pre.status values', status, count(*) from support_tickets group by status order by 2;
select 'pre.messages entries without senderKind (projected by sender==owner fallback)', coalesce(sum(jsonb_array_length(coalesce(messages,'[]'::jsonb)) - (select count(*) from jsonb_array_elements(coalesce(messages,'[]'::jsonb)) e where e ? 'senderKind')),0) from support_tickets;
select 'pre.internal notes present (tickets)', count(*) from support_tickets where exists (select 1 from jsonb_array_elements(coalesce(messages,'[]'::jsonb)) e where (e->>'isInternal')='true');
select 'pre.user_id null (orphans, not visible to any customer)', count(*) from support_tickets where user_id is null;
select 'pre.audit_logs rows', count(*) from audit_logs;
ROLLBACK;
