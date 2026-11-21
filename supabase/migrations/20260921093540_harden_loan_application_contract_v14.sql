-- V14 finance activation: align the canonical loan_applications table with
-- the existing buyer finance API without introducing a second finance table.
alter table public.loan_applications
  alter column dealer drop not null;

alter table public.loan_applications
  add column if not exists vehicle_price numeric(14,2),
  add column if not exists deposit_amount numeric(14,2) default 0,
  add column if not exists loan_amount numeric(14,2),
  add column if not exists term_months integer,
  add column if not exists monthly_income numeric(14,2),
  add column if not exists employment_status text,
  add column if not exists reviewer_notes text,
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.loan_applications drop constraint if exists loan_applications_status_check;
alter table public.loan_applications add constraint loan_applications_status_check
  check (status in ('submitted','under_review','approved','declined','withdrawn','disbursed'));

alter table public.loan_applications drop constraint if exists loan_applications_finance_amounts_check;
alter table public.loan_applications add constraint loan_applications_finance_amounts_check
  check (
    (vehicle_price is null or vehicle_price > 0)
    and (deposit_amount is null or deposit_amount >= 0)
    and (loan_amount is null or loan_amount > 0)
    and (vehicle_price is null or deposit_amount is null or deposit_amount < vehicle_price)
    and (vehicle_price is null or deposit_amount is null or loan_amount is null or loan_amount <= vehicle_price - deposit_amount)
  );

create index if not exists loan_applications_status_created_idx
  on public.loan_applications(status, created_at desc);

comment on table public.loan_applications is 'Canonical KAYAD finance application contract for buyer and dealer workflows. Buyer applications may omit dealer until lender/dealer routing is assigned.';
