// src/app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { CreateInvoiceSchema } from '@/lib/validations';
import { calculateLineAmount } from '@/lib/formatters';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user & derive business_id on the server
    const authResult = await authenticateRequest(req);
    if (!authResult.auth) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    const { businessId, userId } = authResult.auth;

    // 2. Validate input payload strictly with Zod
    const body = await req.json();
    const validation = CreateInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const validData = validation.data;

    // 3. Process lines and amounts server-side (never trust client total)
    let subtotal = 0;
    const processedLines = validData.lines.map((line, idx) => {
      const amount = calculateLineAmount(
        line.pieces,
        line.kg_per_piece,
        line.rate,
        line.rate_unit
      );
      subtotal += amount;
      return {
        ...line,
        total_kg: Math.round(line.pieces * line.kg_per_piece * 1000) / 1000,
        amount,
      };
    });

    const extraCharges = (validData.charges || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const grandTotal = subtotal + extraCharges;

    // Note: When connected to Supabase in production, call:
    // supabaseServer.rpc('create_invoice', { p: { ... } })
    // For now, return the verified payload response
    return NextResponse.json({
      success: true,
      data: {
        business_id: businessId,
        created_by: userId,
        bill_date: validData.bill_date,
        buyer_id: validData.buyer_id,
        buyer_name: validData.buyer_name,
        buyer_town: validData.buyer_town,
        transporter_name: validData.transporter_name,
        broker_name: validData.broker_name,
        vehicle_no: validData.vehicle_no,
        lines: processedLines,
        charges: validData.charges,
        subtotal,
        extra_charges: extraCharges,
        total: grandTotal,
        status: 'active',
      },
    });
  } catch (error) {
    // Safe error message: no stack traces or database internals returned
    return NextResponse.json(
      { error: 'An unexpected server error occurred while processing the invoice.' },
      { status: 500 }
    );
  }
}
