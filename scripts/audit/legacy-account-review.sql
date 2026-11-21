-- READ-ONLY review queries for G-20 / G-25. Run by the owner on a read replica or a restored copy first.
-- Contains only SELECTs. It changes nothing and returns counts/ids, no personal details.

-- G-20: legacy private-seller rows still holding the retired role value
select status, count(*) as accounts from public.users where role = 'individual_seller' group by status order by status;

-- G-20: legacy private sellers that still have live listings (must keep working after any conversion)
select count(distinct c.dealer) as legacy_sellers_with_listings
from public.cars c join public.users u on u.id = c.dealer
where u.role = 'individual_seller' and c.deleted_at is null;

-- G-25: dealers with no usable business name
select count(*) as dealers_missing_business_name from public.dealers_missing_business_name;

-- G-25: dealers whose business name equals the owner's personal name (violates the company-name rule)
select count(*) as dealers_named_after_owner
from public.dealers d join public.users u on u.id = d."user"
where public.kayad_normalize_business_name(d.business_name) = public.kayad_normalize_business_name(u.name);

-- G-25: dealer rows whose user is a personal account (old in-place applications)
select d.approved, count(*) as drafts
from public.dealers d join public.users u on u.id = d."user"
where u.role <> 'dealer' group by d.approved;

-- G-24: duplicate company names (must be empty before the unique index can exist)
select * from public.dealer_business_name_conflicts;
