-- supabase/migrations/002_hardening.sql
-- Jamabook: Database Hardening, Idempotency, Constraints, India Timezone & Auditing
-- Based on LAUNCH_PLAN.md Prompt 2 & DEPLOYMENT.md

-- 1. Add Tally & Onboarding Metadata Columns to Businesses
alter table public.businesses
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_branch text,
  add column if not exists state text default 'Gujarat',
  add column if not exists state_code text default '24',
  add column if not exists email text,
  add column if not exists logo_url text,
  add column if not exists is_onboarded boolean not null default false;

-- 2. Add State & Code to Parties
alter table public.parties
  add column if not exists state text,
  add column if not exists state_code text;

-- 3. Add HSN & Commodity Code to Items
alter table public.items
  add column if not exists code text,
  add column if not exists hsn text default '0909';

-- 4. Idempotency Support on Invoices
alter table public.invoices
  add column if not exists client_request_id uuid;

create unique index if not exists idx_invoices_idempotency
  on public.invoices (business_id, client_request_id)
  where client_request_id is not null;

-- 5. India Dates (Asia/Kolkata) Defaults
alter table public.invoices
  alter column bill_date set default (now() at time zone 'Asia/Kolkata')::date;

alter table public.stock_movements
  alter column moved_on set default (now() at time zone 'Asia/Kolkata')::date;

-- 6. Stock Movements Table Constraints
alter table public.stock_movements
  drop constraint if exists chk_stock_movement_rules;

alter table public.stock_movements
  add constraint chk_stock_movement_rules check (
    (movement_type = 'purchase' and pieces > 0 and pieces <= 100000) or
    (movement_type = 'sale' and pieces < 0) or
    (movement_type = 'sale_cancel' and pieces > 0) or
    (movement_type = 'adjustment' and note is not null and length(trim(note)) > 0)
  );

-- 7. Health Check Ping Function for Uptime Monitoring
create or replace function public.health_ping()
returns boolean
language sql
security definer
set search_path = public
as $$
  select true;
$$;

revoke all on function public.health_ping() from public;
grant execute on function public.health_ping() to authenticated, anon;

-- 8. Hardened Atomic Create Invoice Function
create or replace function public.create_invoice(
  p_buyer_id uuid,
  p_transporter_id uuid,
  p_broker_id uuid,
  p_bill_date date,
  p_vehicle_no text,
  p_notes text,
  p_lines jsonb,
  p_charges jsonb,
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz_id uuid;
  v_bill_no integer;
  v_inv_id uuid;
  v_buyer record;
  v_transporter record;
  v_broker record;
  v_subtotal numeric(14,2) := 0;
  v_extra numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
  v_line jsonb;
  v_charge jsonb;
  v_line_pieces integer;
  v_line_kg numeric(10,3);
  v_line_total_kg numeric(12,3);
  v_line_rate numeric(12,2);
  v_line_unit text;
  v_line_amount numeric(14,2);
  v_item record;
  v_line_count integer := 0;
  v_now_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- Tenancy & Owner Authorization Check: Must be an owner
  select business_id into v_biz_id
  from public.business_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_biz_id is null then
    raise exception 'Unauthorized: Only business owners can create invoices';
  end if;

  -- Idempotency Check: If client_request_id is provided and already exists, return existing invoice
  if p_client_request_id is not null then
    select id, bill_no into v_inv_id, v_bill_no
    from public.invoices
    where business_id = v_biz_id and client_request_id = p_client_request_id;

    if v_inv_id is not null then
      return jsonb_build_object(
        'invoice_id', v_inv_id,
        'bill_no', v_bill_no,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- Validate Bill Date (between 1 year in past and 1 day in future)
  if p_bill_date is null then
    p_bill_date := v_now_ist;
  elsif p_bill_date > (v_now_ist + interval '1 day')::date then
    raise exception 'Invalid bill date: Date cannot be more than 1 day in the future';
  elsif p_bill_date < (v_now_ist - interval '1 year')::date then
    raise exception 'Invalid bill date: Date cannot be older than 1 year';
  end if;

  -- Validate Buyer (must exist, belong to business, and be active)
  select id, name, town, phone into v_buyer
  from public.parties
  where id = p_buyer_id and business_id = v_biz_id and is_buyer = true and is_active = true;

  if v_buyer.id is null then
    raise exception 'Invalid or inactive buyer specified';
  end if;

  -- Validate Transporter if provided
  if p_transporter_id is not null then
    select id, name into v_transporter
    from public.parties
    where id = p_transporter_id and business_id = v_biz_id and is_transporter = true and is_active = true;

    if v_transporter.id is null then
      raise exception 'Invalid or inactive transporter specified';
    end if;
  end if;

  -- Validate Broker if provided
  if p_broker_id is not null then
    select id, name into v_broker
    from public.parties
    where id = p_broker_id and business_id = v_biz_id and is_broker = true and is_active = true;

    if v_broker.id is null then
      raise exception 'Invalid or inactive broker specified';
    end if;
  end if;

  -- Validate line item bounds
  v_line_count := jsonb_array_length(p_lines);
  if v_line_count is null or v_line_count = 0 then
    raise exception 'Invoice must have at least one line item';
  elsif v_line_count > 50 then
    raise exception 'Invoice cannot exceed 50 line items';
  end if;

  -- Atomic Bill Number Increment with Row Locking
  update public.businesses
  set next_bill_no = next_bill_no + 1
  where id = v_biz_id
  returning next_bill_no - 1 into v_bill_no;

  -- Create Parent Invoice Shell
  insert into public.invoices (
    business_id, bill_no, bill_date, buyer_id, buyer_name, buyer_town,
    transporter_id, transporter_name, broker_id, broker_name,
    vehicle_no, notes, subtotal, extra_charges, total, status,
    client_request_id, created_by
  ) values (
    v_biz_id, v_bill_no, p_bill_date, v_buyer.id, v_buyer.name, v_buyer.town,
    v_transporter.id, v_transporter.name, v_broker.id, v_broker.name,
    p_vehicle_no, p_notes, 0, 0, 0, 'active',
    p_client_request_id, auth.uid()
  ) returning id into v_inv_id;

  -- Process Lines and Update Stock Ledger
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select id, name into v_item
    from public.items
    where id = (v_line->>'item_id')::uuid and business_id = v_biz_id and is_active = true;

    if v_item.id is null then
      raise exception 'Invalid or inactive item in invoice lines: %', (v_line->>'item_id');
    end if;

    v_line_pieces := (v_line->>'pieces')::integer;
    v_line_kg := (v_line->>'kg_per_piece')::numeric;
    v_line_rate := (v_line->>'rate')::numeric;
    v_line_unit := v_line->>'rate_unit';

    -- Constraints validation
    if v_line_pieces <= 0 or v_line_pieces > 100000 then
      raise exception 'Pieces must be between 1 and 100,000';
    end if;
    if v_line_kg <= 0 or v_line_kg > 1000 then
      raise exception 'Kg per piece must be between 0.001 and 1000';
    end if;
    if v_line_rate < 0 or v_line_rate > 10000000 then
      raise exception 'Rate must be between 0 and 1,00,00,000';
    end if;
    if v_line_unit not in ('per_quintal', 'per_kg', 'per_piece') then
      raise exception 'Invalid rate unit: %', v_line_unit;
    end if;

    v_line_total_kg := v_line_pieces * v_line_kg;

    -- Calculate line amount accurately
    if v_line_unit = 'per_quintal' then
      v_line_amount := round((v_line_pieces * v_line_kg * v_line_rate) / 100.0, 2);
    elsif v_line_unit = 'per_kg' then
      v_line_amount := round(v_line_pieces * v_line_kg * v_line_rate, 2);
    elsif v_line_unit = 'per_piece' then
      v_line_amount := round(v_line_pieces * v_line_rate, 2);
    end if;

    v_subtotal := v_subtotal + v_line_amount;

    -- Insert line item snapshot
    insert into public.invoice_items (
      business_id, invoice_id, item_id, item_name,
      pieces, kg_per_piece, total_kg, rate, rate_unit, amount
    ) values (
      v_biz_id, v_inv_id, v_item.id, v_item.name,
      v_line_pieces, v_line_kg, v_line_total_kg, v_line_rate, v_line_unit, v_line_amount
    );

    -- Record stock deduction in ledger (negative pieces for sale)
    insert into public.stock_movements (
      business_id, item_id, pieces, movement_type,
      invoice_id, moved_on, created_by
    ) values (
      v_biz_id, v_item.id, -v_line_pieces, 'sale',
      v_inv_id, p_bill_date, auth.uid()
    );
  end loop;

  -- Process Extra Charges
  if p_charges is not null then
    for v_charge in select * from jsonb_array_elements(p_charges) loop
      if (v_charge->>'amount')::numeric < 0 or (v_charge->>'amount')::numeric > 10000000 then
        raise exception 'Charge amount must be between 0 and 1,00,00,000';
      end if;

      v_extra := v_extra + (v_charge->>'amount')::numeric;

      insert into public.invoice_charges (
        business_id, invoice_id, label, amount
      ) values (
        v_biz_id, v_inv_id, v_charge->>'label', (v_charge->>'amount')::numeric
      );
    end loop;
  end if;

  v_total := v_subtotal + v_extra;

  -- Update Final Invoice Totals
  update public.invoices
  set subtotal = v_subtotal, extra_charges = v_extra, total = v_total
  where id = v_inv_id;

  -- Write Audit Log Entry
  insert into public.audit_log (business_id, user_id, action, entity, entity_id, details)
  values (
    v_biz_id, auth.uid(), 'create_invoice', 'invoices', v_inv_id,
    jsonb_build_object(
      'bill_no', v_bill_no,
      'buyer', v_buyer.name,
      'total', v_total,
      'client_request_id', p_client_request_id
    )
  );

  return jsonb_build_object(
    'invoice_id', v_inv_id,
    'bill_no', v_bill_no,
    'subtotal', v_subtotal,
    'extra_charges', v_extra,
    'total', v_total
  );
end;
$$;

-- 9. Hardened Atomic Cancel Invoice Function
create or replace function public.cancel_invoice(
  p_invoice_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz_id uuid;
  v_inv record;
  v_item record;
begin
  -- Tenancy & Owner Authorization Check
  select business_id into v_biz_id
  from public.business_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_biz_id is null then
    raise exception 'Unauthorized: Only business owners can cancel invoices';
  end if;

  -- Reason Validation: 3 to 200 characters
  if p_reason is null or length(trim(p_reason)) < 3 or length(trim(p_reason)) > 200 then
    raise exception 'Cancellation reason required between 3 and 200 characters';
  end if;

  select id, bill_no, status into v_inv
  from public.invoices
  where id = p_invoice_id and business_id = v_biz_id;

  if v_inv.id is null then
    raise exception 'Invoice not found';
  end if;

  if v_inv.status = 'cancelled' then
    raise exception 'Invoice is already cancelled';
  end if;

  -- Update Invoice Status
  update public.invoices
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = trim(p_reason)
  where id = p_invoice_id;

  -- Reverse Stock in Ledger via sale_cancel movement
  for v_item in
    select item_id, pieces
    from public.invoice_items
    where invoice_id = p_invoice_id
  loop
    insert into public.stock_movements (
      business_id, item_id, pieces, movement_type,
      invoice_id, moved_on, created_by, note
    ) values (
      v_biz_id, v_item.item_id, v_item.pieces, 'sale_cancel',
      p_invoice_id, (now() at time zone 'Asia/Kolkata')::date, auth.uid(),
      'Cancelled: ' || trim(p_reason)
    );
  end loop;

  -- Audit Log
  insert into public.audit_log (business_id, user_id, action, entity, entity_id, details)
  values (
    v_biz_id, auth.uid(), 'cancel_invoice', 'invoices', p_invoice_id,
    jsonb_build_object('bill_no', v_inv.bill_no, 'reason', trim(p_reason))
  );
end;
$$;
