// src/app/api/stock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { StockMovementSchema } from '@/lib/validations';

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
    const validation = StockMovementSchema.safeParse(body);

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

    return NextResponse.json({
      success: true,
      data: {
        business_id: businessId,
        created_by: userId,
        item_id: validData.item_id,
        pieces: validData.pieces,
        movement_type: validData.movement_type,
        note: validData.note,
        moved_on: validData.moved_on,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected server error occurred while recording stock movement.' },
      { status: 500 }
    );
  }
}
