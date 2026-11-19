# SPEC.md - Billing, Stock and Follow-up App

## 1. Goal

A phone-friendly app for one trader that does three things:
1. Billing: digital version of his handwritten kacha bill, shareable on WhatsApp.
2. Stock: know instantly how many pieces are left, per item.
3. Follow-ups: never forget a buyer who messaged on WhatsApp.

Single user now. Built so more businesses can be added later without a rewrite.

## 2. Users

- Owner (the trader). Only user for now.
- Later (not now): staff, accountant.

## 3. The kacha bill (from his slip)

Header: business name (RTC).
Left: T.P. / Bill No, Transport name.
Right: Date, Party name, Details (items), Sign.

On the sample slip: Nav. Transport, 17/11/26, Boina Vardharaju and Co., Naraspeta,
item "Prestige Pro", 50 pieces of 30 kg, rate 11,050, extra Rs 50, total Rs 1,65,800,
bill no 4449.

Rate check: 50 x 30 kg = 1500 kg = 15 quintal. 15 x 11,050 = 1,65,750. + 50 = 1,65,800.
So the rate is most likely per quintal, not per piece. TO CONFIRM with the owner.

## 4. Screens

1. Home: three big buttons (New Bill, Stock, Follow-ups) and today's follow-up count.
2. New Bill: pick buyer, transporter, broker (one tap each, recent first), add item rows
   (item, pieces, kg per piece, rate, rate unit), extra charges, date, vehicle no.
   Total calculates live. Bill number shown (auto). Save gives a bill image/PDF to share.
3. Stock: one row per item, big number of pieces in stock, low-stock highlight.
   Buttons: Stock In (purchase), Adjust.
4. Follow-ups: today's list. Each row shows buyer, material wanted, quantity, live stock
   for that material, and a "Message on WhatsApp" button (pre-filled `wa.me` link).
   Mark done, snooze, or set the next date.
5. Parties and Items: add/edit buyers, transporters, brokers, materials.
6. Bills: list, search, view, cancel (with reason), reshare.
7. Settings: business details, bill number prefix, language, export to Excel.

## 5. Phases

1. Database, login, parties, items.
2. Bill form + PDF/image.
3. Stock (in/out/adjust, stock screen).
4. Enquiries + reminders (app + Telegram morning message).
5. Telegram bot: message to draft bill with a Confirm button.
6. Excel export and reports.

## 6. Telegram bot (phase 5)

Flow: owner sends text or voice, e.g. "Boina Vardharaju, Nav Transport, Prestige Pro 50 x 30kg @11050".
Server checks the sender's Telegram ID against the owner's ID (else ignore).
AI parses the message into a draft (buyer, transporter, items, rate).
Server matches names against saved parties and items, validates everything,
replies with a summary and a Confirm button. Only after Confirm does it call `create_invoice`.
The AI never writes to the database directly.

WhatsApp Business API is NOT used at first (paid, approval needed). Use Telegram.

## 7. Reminders

Daily scheduled job (Supabase pg_cron or Vercel Cron) sends the owner a Telegram message
each morning: today's follow-ups with live stock. In-app list is the fallback.

## 8. Database (Supabase / Postgres)

Run as migration `001_init.sql`. Bills and stock sales/cancels are written only by the
functions at the bottom (`create_invoice`, `cancel_invoice`). Users get read-only access to
invoices and can only add purchase/adjustment stock rows directly.

```sql
create extension if not exists pgcrypto;

-- ---------- Tenancy ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  gstin text,
  bill_prefix text not null default '',
  next_bill_no integer not null default 1 check (next_bill_no > 0),
  created_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create function public.my_business_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select business_id from public.business_members where user_id = auth.uid()
$$;

-- ---------- Master data ----------
create table public.parties (
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

create table public.items (
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
create table public.invoices (
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

create table public.invoice_items (
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

create table public.invoice_charges (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  invoice_id uuid not null,
  label text not null,
  amount numeric(12,2) not null,
  foreign key (invoice_id, business_id) references public.invoices (id, business_id)
);

-- ---------- Stock ledger ----------
create table public.stock_movements (
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

create view public.stock_levels with (security_invoker = true) as
select i.business_id, i.id as item_id, i.name,
       coalesce(sum(m.pieces), 0)::integer as pieces_in_stock,
       i.low_stock_pieces
from public.items i
left join public.stock_movements m
  on m.item_id = i.id and m.business_id = i.business_id
where i.is_active
group by i.business_id, i.id, i.name, i.low_stock_pieces;

-- ---------- Follow-ups ----------
create table public.enquiries (
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
create table public.audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  user_id uuid,
  action text not null,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index on public.invoices (business_id, bill_date desc);
create index on public.stock_movements (business_id, item_id);
create index on public.enquiries (business_id, status, next_follow_up);

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

create policy businesses_select on public.businesses for select to authenticated
  using (id in (select public.my_business_ids()));
create policy businesses_update on public.businesses for update to authenticated
  using (id in (select public.my_business_ids()))
  with check (id in (select public.my_business_ids()));

create policy members_select on public.business_members for select to authenticated
  using (user_id = auth.uid());

-- full read/write for master data and enquiries (own business only)
create policy parties_rw on public.parties for all to authenticated
  using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));
create policy items_rw on public.items for all to authenticated
  using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));
create policy enquiries_rw on public.enquiries for all to authenticated
  using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));

-- read-only for bills and audit log
create policy invoices_select on public.invoices for select to authenticated
  using (business_id in (select public.my_business_ids()));
create policy invoice_items_select on public.invoice_items for select to authenticated
  using (business_id in (select public.my_business_ids()));
create policy invoice_charges_select on public.invoice_charges for select to authenticated
  using (business_id in (select public.my_business_ids()));
create policy audit_select on public.audit_log for select to authenticated
  using (business_id in (select public.my_business_ids()));

-- stock: read all; insert only purchases/adjustments directly
create policy stock_select on public.stock_movements for select to authenticated
  using (business_id in (select public.my_business_ids()));
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
create function public.log_audit(p_business uuid, p_action text, p_table text,
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

create function public.create_invoice(p jsonb)
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
  -- business comes from the logged-in user, never from the payload
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

create function public.cancel_invoice(p_invoice uuid, p_reason text)
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
```

First-time setup (run once in the Supabase SQL editor with the owner's account created):
insert one row in `businesses`, then one row in `business_members` linking his user id.
There is deliberately no client-side policy to create businesses.

## 9. Security test plan (run on the dev project with two dummy accounts)

1. User B cannot SELECT any row of user A's parties, items, invoices, stock, enquiries.
2. User B cannot INSERT or UPDATE a row with user A's business_id (RLS rejects it).
3. A logged-out request (anon key only) returns nothing and cannot write.
4. `create_invoice` called with a buyer, item or transporter id from another business fails.
5. A client cannot UPDATE or DELETE invoices, invoice_items or audit_log.
6. A client cannot INSERT stock rows of type `sale` or `sale_cancel`.
7. A client cannot change `next_bill_no` directly.
8. Two bills created at the same moment get different bill numbers.
9. Cancelling a bill restores stock exactly once; cancelling twice fails.
10. The Telegram webhook ignores any sender other than the owner.
11. Search the repo and the built frontend for the service key and bot token.

Unresolved by design (document, do not hide): negative stock is allowed (a sale can be
saved before a purchase is entered, the UI should warn); only one business per user is
supported by the functions (`limit 1`); no MFA yet.

## 10. Open questions for the owner

- Is the rate per quintal on every bill, or does it vary by material?
- Is "T.P." the same number as the bill number?
- Is the extra Rs 50 always the same kind of charge (loading, packing)?
- Does he ever need a GST invoice? (Skipped for now.)
- Which materials and typical kg per piece does he deal in?
- Does he buy stock (purchases) in the same pieces and kg format?
