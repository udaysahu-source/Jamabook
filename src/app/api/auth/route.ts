// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SignUpSchema, SignInSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = req.nextUrl.searchParams.get('action') || 'signin';

    if (action === 'signup') {
      const validation = SignUpSchema.safeParse(body);
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

      const { email, businessName, startingBillNo } = validation.data;
      const userId = `usr-${Date.now()}`;
      const businessId = `biz-${Date.now()}`;
      const token = `mock-token::${userId}::${businessId}::owner::${email}`;

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          email,
          role: 'owner',
          business_id: businessId,
        },
        business: {
          id: businessId,
          name: businessName,
          bill_prefix: '',
          next_bill_no: startingBillNo,
          created_at: new Date().toISOString(),
        },
        token,
      });
    } else {
      const validation = SignInSchema.safeParse(body);
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

      const { email } = validation.data;
      const userId = `usr-1`;
      const businessId = `biz-001`;
      const token = `mock-token::${userId}::${businessId}::owner::${email}`;

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          email,
          role: 'owner',
          business_id: businessId,
        },
        business: {
          id: businessId,
          name: 'RTC',
          bill_prefix: '',
          next_bill_no: 4450,
          created_at: new Date().toISOString(),
        },
        token,
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
