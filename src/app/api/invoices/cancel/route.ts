// src/app/api/invoices/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { CancelInvoiceSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.auth) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    const { businessId, userId } = authResult.auth;

    const body = await req.json();
    const validation = CancelInvoiceSchema.safeParse(body);

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

    const { invoice_id, reason } = validation.data;

    return NextResponse.json({
      success: true,
      data: {
        invoice_id,
        business_id: businessId,
        cancelled_by: userId,
        reason,
        cancelled_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected server error occurred while cancelling the invoice.' },
      { status: 500 }
    );
  }
}
