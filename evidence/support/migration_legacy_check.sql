\pset tuples_only on
\pset format unaligned
select 'rows', count(*) from support_tickets;
select 'T1', satisfaction_rating, satisfaction_comment, resolution_notes, legacy_resolution_notes from support_tickets where ticket_number='T-1';
select 'T2', satisfaction_rating, satisfaction_comment is null, resolution_notes is null from support_tickets where ticket_number='T-2';
select 'T3 staff note preserved', resolution_notes, satisfaction_comment is null from support_tickets where ticket_number='T-3';
select 'T4/T5 legacy rows updatable', (select count(*) from support_tickets where ticket_number in ('T-4','T-5'));
update support_tickets set priority='high' where ticket_number in ('T-4','T-5');
select 'T4/T5 update ok';
select 'audit rows moved', details from audit_logs where action='support.migration_rating_comment_moved';
select 'legacy_notes populated', count(*) from support_tickets where legacy_resolution_notes is not null;
