// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  let dbOk = false;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('businesses').select('id').limit(1);
      if (!error) {
        dbOk = true;
      }
    }
  } catch {
    dbOk = false;
  }

  return NextResponse.json({
    ok: true,
    db: dbOk,
  });
}
