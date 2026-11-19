-- supabase/seed.sql
-- Seed data for RTC Trader App based on SPEC.md and design screens

do $$
declare
  v_biz_id uuid;
  v_buyer1 uuid;
  v_buyer2 uuid;
  v_buyer3 uuid;
  v_buyer4 uuid;
  v_trans1 uuid;
  v_item1 uuid;
  v_item2 uuid;
  v_inv1 uuid;
  v_inv2 uuid;
begin
  -- 1. Business RTC
  insert into public.businesses (id, name, address, phone, gstin, bill_prefix, next_bill_no)
  values (
    '00000000-0000-0000-0000-000000000001',
    'RTC',
    'Main Market Yard, Shop No. 14, Grain Market',
    '+91 98765 43210',
    '36AABCR1234F1Z5',
    '',
    4450
  )
  on conflict (id) do update set next_bill_no = 4450
  returning id into v_biz_id;

  -- 2. Parties
  insert into public.parties (business_id, name, town, phone, is_buyer, is_transporter, is_broker, is_active)
  values
    (v_biz_id, 'Boina Vardharaju and Co.', 'Naraspeta', '+91 94401 23456', true, false, false, true)
  returning id into v_buyer1;

  insert into public.parties (business_id, name, town, phone, is_buyer, is_transporter, is_broker, is_active)
  values
    (v_biz_id, 'K. Ramesh & Sons', 'Warangal', '+91 98480 11223', true, false, false, true)
  returning id into v_buyer2;

  insert into public.parties (business_id, name, town, phone, is_buyer, is_transporter, is_broker, is_active)
  values
    (v_biz_id, 'Sri Lakshmi Traders', 'Khammam', '+91 99890 33445', true, false, false, true)
  returning id into v_buyer3;

  insert into public.parties (business_id, name, town, phone, is_buyer, is_transporter, is_broker, is_active)
  values
    (v_biz_id, 'Venkat Agencies', 'Suryapet', '+91 91234 56789', true, false, false, true)
  returning id into v_buyer4;

  insert into public.parties (business_id, name, town, phone, is_buyer, is_transporter, is_broker, is_active)
  values
    (v_biz_id, 'Nav. Transport', 'Guntur', '+91 98765 00001', false, true, false, true)
  returning id into v_trans1;

  -- 3. Items
  insert into public.items (business_id, name, kg_per_piece, default_rate, rate_unit, low_stock_pieces, is_active)
  values
    (v_biz_id, 'Mung Prestige Pro', 30.000, 11050.00, 'per_quintal', 20, true)
  returning id into v_item1;

  insert into public.items (business_id, name, kg_per_piece, default_rate, rate_unit, low_stock_pieces, is_active)
  values
    (v_biz_id, 'Mung Super', 30.000, 9800.00, 'per_quintal', 15, true)
  returning id into v_item2;

  -- 4. Initial Stock Movements
  -- Stock movements for Mung Prestige Pro: +190 purchase, -40 bill 4448, -50 bill 4449 => 100 in hand
  insert into public.stock_movements (business_id, item_id, pieces, movement_type, moved_on, note)
  values
    (v_biz_id, v_item1, 190, 'purchase', '2026-11-12', 'Purchase (stock in)'),
    (v_biz_id, v_item1, -50, 'sale', '2026-11-17', 'Bill 4449 · Boina Vardharaju and Co.'),
    (v_biz_id, v_item1, -40, 'sale', '2026-11-16', 'Bill 4448 · Sri Lakshmi Traders');

  -- Stock movements for Mung Super: 8 in hand
  insert into public.stock_movements (business_id, item_id, pieces, movement_type, moved_on, note)
  values
    (v_biz_id, v_item2, 8, 'purchase', '2026-11-10', 'Opening stock');

  -- 5. Recent Invoices
  insert into public.invoices (business_id, bill_no, bill_date, buyer_id, buyer_name, buyer_town, transporter_id, transporter_name, subtotal, extra_charges, total, status)
  values
    (v_biz_id, 4448, '2026-11-16', v_buyer3, 'Sri Lakshmi Traders', 'Khammam', v_trans1, 'Nav. Transport', 132600.00, 0.00, 132600.00, 'active')
  returning id into v_inv1;

  insert into public.invoices (business_id, bill_no, bill_date, buyer_id, buyer_name, buyer_town, transporter_id, transporter_name, subtotal, extra_charges, total, status)
  values
    (v_biz_id, 4449, '2026-11-17', v_buyer1, 'Boina Vardharaju and Co.', 'Naraspeta', v_trans1, 'Nav. Transport', 165750.00, 50.00, 165800.00, 'active')
  returning id into v_inv2;

  -- 6. Enquiries (Follow-ups)
  insert into public.enquiries (business_id, party_id, contact_name, phone, item_id, pieces_wanted, status, next_follow_up, note)
  values
    (v_biz_id, v_buyer2, 'K. Ramesh & Sons', '+91 98480 11223', v_item1, 40, 'open', current_date - interval '1 day', 'Asked 2 days ago for urgent rate'),
    (v_biz_id, v_buyer3, 'Sri Lakshmi Traders', '+91 99890 33445', v_item2, 20, 'open', current_date, 'Asked yesterday'),
    (v_biz_id, v_buyer4, 'Venkat Agencies', '+91 91234 56789', v_item1, 60, 'open', current_date, 'Asked today morning');
end $$;
