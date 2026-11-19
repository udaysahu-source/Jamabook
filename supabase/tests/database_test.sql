-- supabase/tests/database_test.sql
-- Automated database tests for migration 002 hardening & SPEC section 9 cases.

begin;

-- Create throwaway test business and owner user
do $$
declare
  v_test_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_other_user_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_biz_id uuid;
  v_other_biz_id uuid;
  v_buyer_id uuid;
  v_item_id uuid;
  v_req_id uuid := gen_random_uuid();
  v_inv_res jsonb;
  v_inv_res2 jsonb;
begin
  -- Mock user 1
  insert into auth.users (id, email)
  values (v_test_user_id, 'test_owner@test.com')
  on conflict (id) do nothing;

  insert into public.businesses (id, name, next_bill_no)
  values (gen_random_uuid(), 'Test Mandi Firm', 5000)
  returning id into v_biz_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_biz_id, v_test_user_id, 'owner');

  -- Add active party and item
  insert into public.parties (id, business_id, name, is_buyer, is_active)
  values (gen_random_uuid(), v_biz_id, 'Test Buyer Co', true, true)
  returning id into v_buyer_id;

  insert into public.items (id, business_id, name, kg_per_piece, default_rate, rate_unit, is_active)
  values (gen_random_uuid(), v_biz_id, 'Test Jeera', 30, 10000, 'per_quintal', true)
  returning id into v_item_id;

  -- Test 1: Purchase with negative pieces must fail check constraint
  begin
    insert into public.stock_movements (business_id, item_id, pieces, movement_type)
    values (v_biz_id, v_item_id, -50, 'purchase');
    raise exception 'TEST FAILED: Negative purchase was allowed';
  exception when check_violation then
    raise notice 'TEST PASSED: Negative purchase correctly rejected';
  end;

  -- Test 2: Adjustment without note must fail
  begin
    insert into public.stock_movements (business_id, item_id, pieces, movement_type, note)
    values (v_biz_id, v_item_id, 10, 'adjustment', '');
    raise exception 'TEST FAILED: Adjustment without note was allowed';
  exception when check_violation then
    raise notice 'TEST PASSED: Adjustment without note correctly rejected';
  end;

  -- Test 3: Valid initial purchase succeeds
  insert into public.stock_movements (business_id, item_id, pieces, movement_type, note)
  values (v_biz_id, v_item_id, 100, 'purchase', 'Opening stock arrival');
  raise notice 'TEST PASSED: Valid stock purchase succeeded';

  raise notice 'ALL DATABASE TESTS PASSED SUCCESSFULLY';
end $$;

rollback;
