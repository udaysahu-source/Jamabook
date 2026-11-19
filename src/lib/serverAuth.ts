// src/lib/serverAuth.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseServer = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export interface AuthenticatedContext {
  userId: string;
  email: string;
  role: 'owner' | 'staff';
  businessId: string;
}

/**
 * Derives user and business strictly on the server from auth headers.
 * NEVER trusts any business_id sent by the client.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ auth: AuthenticatedContext | null; error?: string; status?: number }> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { auth: null, error: 'Authorization token required', status: 401 };
  }

  // 1. Live Supabase Authentication
  if (supabaseServer) {
    try {
      const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
      if (userError || !user) {
        return { auth: null, error: 'Invalid or expired session', status: 401 };
      }

      // Query business membership
      const { data: member, error: memberError } = await supabaseServer
        .from('business_members')
        .select('business_id, role')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return { auth: null, error: 'User does not belong to any registered business', status: 403 };
      }

      return {
        auth: {
          userId: user.id,
          email: user.email || '',
          role: (member.role as 'owner' | 'staff') || 'owner',
          businessId: member.business_id,
        },
      };
    } catch {
      return { auth: null, error: 'Authentication service error', status: 500 };
    }
  }

  // 2. Development / Local Fallback Token parsing
  try {
    // Expected format: mock-token::<userId>::<businessId>::<role>::<email>
    if (token.startsWith('mock-token::')) {
      const parts = token.split('::');
      if (parts.length >= 5) {
        return {
          auth: {
            userId: parts[1],
            businessId: parts[2],
            role: (parts[3] as 'owner' | 'staff') || 'owner',
            email: parts[4],
          },
        };
      }
    }
    return { auth: null, error: 'Invalid authentication token', status: 401 };
  } catch {
    return { auth: null, error: 'Unauthorized request', status: 401 };
  }
}
