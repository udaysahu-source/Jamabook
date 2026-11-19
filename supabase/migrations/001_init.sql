-- Migration 001_init.sql
-- Jamabook - RTC Billing, Stock and Follow-up App
-- Based on SPEC.md section 8

create extension if not exists pgcrypto;

-- ---------- Tenancy ----------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  gstin text,
  bill_prefix text not null default '',
  next_bill_no integer not null default 4450 check (next_bill_no > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create or replace function public.my_business_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select business_id from public.business_members where user_id = auth.uid()
$$;

-- ---------- Master data ----------
create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  town text,
  phone text,
  address text,
  gstin text,
  is_buyer boolean not null default false,
  is_transporter boolean not null default false,
  is_broker boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  kg_per_piece numeric(10,3) not null check (kg_per_piece > 0),
  default_rate numeric(12,2) check (default_rate >= 0),
  rate_unit text not null default 'per_quintal'
    check (rate_unit in ('per_quintal','per_kg','per_piece')),
  low_stock_pieces integer check (low_stock_pieces >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

-- ---------- Bills (immutable; written by functions only) ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bill_no integer not null,
  bill_date date not null default current_date,
  buyer_id uuid,
  buyer_name text not null,
  buyer_town text,
  transporter_id uuid,
  transporter_name text,
  broker_id uuid,
  broker_name text,
  vehicle_no text,
  notes text,
  subtotal numeric(14,2) not null default 0,
  extra_charges numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'active' check (status in ('active','cancelled')),
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (business_id, bill_no),
  unique (id, business_id),
  foreign key (buyer_id, business_id) references public.parties (id, business_id),
  foreign key (transporter_id, business_id) references public.parties (id, business_id),
  foreign key (broker_id, business_id) references public.parties (id, business_id)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  invoice_id uuid not null,
  item_id uuid not null,
  item_name text not null,
  pieces integer not null check (pieces > 0),
  kg_per_piece numeric(10,3) not null check (kg_per_piece > 0),
  total_kg numeric(14,3) generated always as (pieces * kg_per_piece) stored,
  rate numeric(12,2) not null check (rate >= 0),
  rate_unit text not null check (rate_unit in ('per_quintal','per_kg','per_piece')),
  amount numeric(14,2) not null,
  foreign key (invoice_id, business_id) references public.invoices (id, business_id),
  foreign key (item_id, business_id) references public.items (id, business_id)
);

create table if not exists public.invoice_charges (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  invoice_id uuid not null,
  label text not null,
  amount numeric(12,2) not null,
  foreign key (invoice_id, business_id) references public.invoices (id, business_id)
);

-- ---------- Stock ledger ----------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  item_id uuid not null,
  pieces integer not null check (pieces <> 0),  -- + in, - out
  movement_type text not null
    check (movement_type in ('purchase','sale','sale_cancel','adjustment')),
  invoice_id uuid,
  moved_on date not null default current_date,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (item_id, business_id) references public.items (id, business_id),
  foreign key (invoice_id, business_id) references public.invoices (id, business_id)
);

create or replace view public.stock_levels with (security_invoker = true) as
select i.business_id, i.id as item_id, i.name,
       coalesce(sum(m.pieces), 0)::integer as pieces_in_stock,
       i.low_stock_pieces
from public.items i
left join public.stock_movements m
  on m.item_id = i.id and m.business_id = i.business_id
where i.is_active
group by i.business_id, i.id, i.name, i.low_stock_pieces;

-- ---------- Follow-ups ----------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  party_id uuid,
  contact_name text not null,
  phone text,
  item_id uuid,
  pieces_wanted integer check (pieces_wanted > 0),
  status text not null default 'open' check (status in ('open','quoted','won','lost')),
  next_follow_up date,
  last_contacted_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  foreign key (party_id, business_id) references public.parties (id, business_id),
  foreign key (item_id, business_id) references public.items (id, business_id)
);

-- ---------- Audit log ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  user_id uuid,
  action text not null,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_biz_date on public.invoices (business_id, bill_date desc);
create index if not exists idx_stock_movements_biz_item on public.stock_movements (business_id, item_id);
create index if not exists idx_enquiries_biz_status on public.enquiries (business_id, status, next_follow_up);

-- ---------- Row Level Security ----------
alter table public.businesses        enable row level security;
alter table public.business_members  enable row level security;
alter table public.parties           enable row level security;
alter table public.items             enable row level security;
alter table public.invoices          enable row level security;
alter table public.invoice_items     enable row level security;
alter table public.invoice_charges   enable row level security;
alter table public.stock_movements   enable row level security;
alter table public.enquiries         enable row level security;
alter table public.audit_log         enable row level security;

-- Policies
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select to authenticated
  using (id in (select public.my_business_ids()));

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses for update to authenticated
  using (id in (select public.my_business_ids()))
  with check (id in (select public.my_business_ids()));

drop policy if exists members_select on public.business_members;
create policy members_select on public.business_members for select to authenticated
  using (user_id = auth.uid());

-- master data and enquiries
drop policy if exists parties_rw on public.parties;
create policy parties_rw on public.parties for all to authenticated
  using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));

drop policy if exists items_rw on public.items;
create policy items_rw on public.items for all to authenticated
  using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));

drop policy if exists enquiries_rw on public.enquiries;
create policy enquiries_rw on public.enquiries for all to authenticated
  using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));

-- read-only for bills and audit log
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (business_id in (select public.my_business_ids()));

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items for select to authenticated
  using (business_id in (select public.my_business_ids()));

drop policy if exists invoice_charges_select on public.invoice_charges;
create policy invoice_charges_select on public.invoice_charges for select to authenticated
  using (business_id in (select public.my_business_ids()));

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (business_id in (select public.my_business_ids()));

-- stock: read all; insert only purchases/adjustments directly
drop policy if exists stock_select on public.stock_movements;
create policy stock_select on public.stock_movements for select to authenticated
  using (business_id in (select public.my_business_ids()));

drop policy if exists stock_insert on public.stock_movements;
create policy stock_insert on public.stock_movements for insert to authenticated
  with check (business_id in (select public.my_business_ids())
              and movement_type in ('purchase','adjustment')
              and invoice_id is null);

-- ---------- Least-privilege grants ----------
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.businesses, public.business_members, public.invoices,
  public.invoice_items, public.invoice_charges, public.audit_log,
  public.stock_movements, public.stock_levels to authenticated;
grant update (name, address, phone, gstin, bill_prefix) on public.businesses to authenticated;
grant select, insert, update, delete on public.parties, public.items,
  public.enquiries to authenticated;
grant insert on public.stock_movements to authenticated;

-- ---------- Functions (the only way to create/cancel bills) ----------
create or replace function public.log_audit(p_business uuid, p_action text, p_table text,
                                            p_record uuid, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = public
as $$
  insert into public.audit_log (business_id, user_id, action, table_name, record_id, details)
  select p_business, auth.uid(), p_action, p_table, p_record, p_details
  where p_business in (select business_id from public.business_members
                       where user_id = auth.uid());
$$;
revoke all on function public.log_audit(uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;

create or replace function public.create_invoice(p jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_biz uuid;
  v_bill_no integer;
  v_date date;
  v_inv uuid;
  v_buyer public.parties%rowtype;
  v_trans_name text;
  v_broker_name text;
  v_line jsonb;
  v_charge jsonb;
  v_item public.items%rowtype;
  v_pieces integer;
  v_kg numeric;
  v_rate numeric;
  v_unit text;
  v_amount numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_extra numeric(14,2) := 0;
begin
  select business_id into v_biz from public.business_members
   where user_id = auth.uid() limit 1;
  if v_biz is null then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  if jsonb_typeof(p->'lines') is distinct from 'array'
     or jsonb_array_length(p->'lines') = 0 then
    raise exception 'at least one item line is required';
  end if;

  select * into v_buyer from public.parties
   where id = (p->>'buyer_id')::uuid and business_id = v_biz and is_buyer and is_active;
  if not found then raise exception 'buyer not found'; end if;

  if nullif(p->>'transporter_id','') is not null then
    select name into v_trans_name from public.parties
     where id = (p->>'transporter_id')::uuid and business_id = v_biz and is_transporter;
    if not found then raise exception 'transporter not found'; end if;
  end if;

  if nullif(p->>'broker_id','') is not null then
    select name into v_broker_name from public.parties
     where id = (p->>'broker_id')::uuid and business_id = v_biz and is_broker;
    if not found then raise exception 'broker not found'; end if;
  end if;

  v_date := coalesce(nullif(p->>'bill_date','')::date, current_date);

  update public.businesses set next_bill_no = next_bill_no + 1
   where id = v_biz
  returning next_bill_no - 1 into v_bill_no;

  insert into public.invoices (business_id, bill_no, bill_date, buyer_id, buyer_name,
      buyer_town, transporter_id, transporter_name, broker_id, broker_name,
      vehicle_no, notes, created_by)
  values (v_biz, v_bill_no, v_date, v_buyer.id, v_buyer.name, v_buyer.town,
      nullif(p->>'transporter_id','')::uuid, v_trans_name,
      nullif(p->>'broker_id','')::uuid, v_broker_name,
      p->>'vehicle_no', p->>'notes', auth.uid())
  returning id into v_inv;

  for v_line in select value from jsonb_array_elements(p->'lines') loop
    select * into v_item from public.items
     where id = (v_line->>'item_id')::uuid and business_id = v_biz and is_active;
    if not found then raise exception 'item not found'; end if;

    v_pieces := (v_line->>'pieces')::integer;
    v_kg     := coalesce((v_line->>'kg_per_piece')::numeric, v_item.kg_per_piece);
    v_rate   := (v_line->>'rate')::numeric;
    v_unit   := coalesce(v_line->>'rate_unit', v_item.rate_unit);

    if v_pieces is null or v_pieces <= 0 or v_rate is null or v_rate < 0 or v_kg <= 0 then
      raise exception 'invalid item line';
    end if;

    v_amount := round(case v_unit
      when 'per_quintal' then v_pieces * v_kg * v_rate / 100
      when 'per_kg'      then v_pieces * v_kg * v_rate
      when 'per_piece'   then v_pieces * v_rate
      else null end, 2);
    if v_amount is null then raise exception 'invalid rate unit'; end if;

    insert into public.invoice_items (business_id, invoice_id, item_id, item_name,
        pieces, kg_per_piece, rate, rate_unit, amount)
    values (v_biz, v_inv, v_item.id, v_item.name, v_pieces, v_kg, v_rate, v_unit, v_amount);

    insert into public.stock_movements (business_id, item_id, pieces, movement_type,
        invoice_id, moved_on, created_by)
    values (v_biz, v_item.id, -v_pieces, 'sale', v_inv, v_date, auth.uid());

    v_subtotal := v_subtotal + v_amount;
  end loop;

  if jsonb_typeof(p->'charges') = 'array' then
    for v_charge in select value from jsonb_array_elements(p->'charges') loop
      insert into public.invoice_charges (business_id, invoice_id, label, amount)
      values (v_biz, v_inv, coalesce(nullif(v_charge->>'label',''), 'Extra'),
              round((v_charge->>'amount')::numeric, 2));
      v_extra := v_extra + round((v_charge->>'amount')::numeric, 2);
    end loop;
  end if;

  update public.invoices
     set subtotal = v_subtotal, extra_charges = v_extra, total = v_subtotal + v_extra
   where id = v_inv;

  perform public.log_audit(v_biz, 'invoice_created', 'invoices', v_inv,
          jsonb_build_object('bill_no', v_bill_no, 'total', v_subtotal + v_extra));
  return v_inv;
end;
$$;

create or replace function public.cancel_invoice(p_invoice uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_biz uuid;
  v_inv public.invoices%rowtype;
begin
  select business_id into v_biz from public.business_members
   where user_id = auth.uid() limit 1;
  if v_biz is null then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select * into v_inv from public.invoices
   where id = p_invoice and business_id = v_biz for update;
  if not found then raise exception 'invoice not found'; end if;
  if v_inv.status = 'cancelled' then raise exception 'already cancelled'; end if;

  update public.invoices
     set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason
   where id = v_inv.id;

  insert into public.stock_movements (business_id, item_id, pieces, movement_type,
      invoice_id, note, created_by)
  select business_id, item_id, pieces, 'sale_cancel', invoice_id,
         'Bill ' || v_inv.bill_no || ' cancelled', auth.uid()
    from public.invoice_items where invoice_id = v_inv.id;

  perform public.log_audit(v_biz, 'invoice_cancelled', 'invoices', v_inv.id,
          jsonb_build_object('bill_no', v_inv.bill_no, 'reason', p_reason));
end;
$$;

revoke all on function public.create_invoice(jsonb) from public, anon;
revoke all on function public.cancel_invoice(uuid, text) from public, anon;
grant execute on function public.create_invoice(jsonb) to authenticated;
grant execute on function public.cancel_invoice(uuid, text) to authenticated;
