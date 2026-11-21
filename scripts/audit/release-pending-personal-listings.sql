-- OWNER-RUN. Releases listings that are stuck in "pending" for personal accounts now that listing needs no approval.
-- Nothing here runs automatically. Run STEP 1 (read-only) first, check the rows, then run STEP 2 inside the transaction.
-- Preferred alternative with no SQL: Admin > Cars > Pending > Approve (one click per vehicle).

-- STEP 0 (read-only): the saved listing-approval policy. "hold_for_review" means every new listing is held; switch it to
-- "auto_publish" in Admin > Settings > Onboarding so future listings go live by themselves.
select key, value->>'listingModeration' as listing_moderation, updated_at
from public.system_settings where key = 'onboarding_policy';   -- adjust the key if your row uses another name

-- STEP 1 (read-only): pending listings owned by personal accounts that would be released.
select c.id, c.title, c.created_at, u.role as owner_role, u.status as owner_status, u.email_verified
from public.cars c join public.users u on u.id = c.dealer
where c.status = 'pending' and c.deleted_at is null
  and u.role in ('user', 'individual_seller')
  and u.status not in ('suspended', 'revoked', 'deactivated', 'banned')
  and u.email_verified is true
order by c.created_at;

-- STEP 2 (writes): release exactly the rows you checked. Put the vehicle ids from STEP 1 in the list.
begin;
update public.cars
   set status = 'available', updated_at = now()
 where status = 'pending' and deleted_at is null
   and id in ('<vehicle-id-1>' /* , '<vehicle-id-2>' */);
-- Expect "UPDATE n" with n equal to the number of ids you listed. Then:
commit;   -- or: rollback;
