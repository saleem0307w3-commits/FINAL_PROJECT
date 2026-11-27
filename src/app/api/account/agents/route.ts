import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  generateAgentPassword,
  isChildAgentRole,
  normalizeAgentEmail,
  normalizeAgentName,
} from '@/lib/auth/child-agents';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

const DOMAIN_TABLES = [
  'contacts',
  'conversations',
  'broadcasts',
  'automations',
  'flows',
  'pipelines',
  'message_templates',
  'tags',
  'custom_fields',
  'contact_notes',
  'whatsapp_config',
] as const;

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');

    const limit = checkRateLimit(
      `admin:agentCreate:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      email?: unknown;
      role?: unknown;
    } | null;

    const name = normalizeAgentName(body?.name);
    const email = normalizeAgentEmail(body?.email);
    const role = isChildAgentRole(body?.role) ? body.role : null;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Name, email, and a valid role are required' },
        { status: 400 },
      );
    }

    const password = generateAgentPassword();
    const admin = supabaseAdmin();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError || !created.user) {
      console.error('[POST /api/account/agents] createUser error:', createError);
      const message = createError?.message ?? '';
      const alreadyExists = /already registered|already exists|duplicate/i.test(
        message,
      );
      return NextResponse.json(
        {
          error: alreadyExists
            ? 'That email already has an account. Use Invite member instead.'
            : 'Failed to create agent account',
        },
        { status: alreadyExists ? 409 : 500 },
      );
    }

    const userId = created.user.id;

    try {
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('account_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('New user has no profile');
      }

      const { data: personalAccount, error: accountError } = await admin
        .from('accounts')
        .select('id, owner_user_id')
        .eq('id', profile.account_id)
        .maybeSingle();

      if (accountError || !personalAccount) {
        throw new Error('New user has no personal account');
      }
      if (personalAccount.owner_user_id !== userId) {
        throw new Error('User already belongs to a shared account');
      }

      for (const table of DOMAIN_TABLES) {
        const { data: rows, error: dataError } = await admin
          .from(table)
          .select('id')
          .eq('account_id', personalAccount.id)
          .limit(1);

        if (dataError) throw new Error(`Could not check ${table}`);
        if (rows && rows.length > 0) {
          throw new Error('New personal account already contains data');
        }
      }

      const { error: moveError } = await admin
        .from('profiles')
        .update({
          account_id: ctx.accountId,
          account_role: role,
          full_name: name,
        })
        .eq('user_id', userId);

      if (moveError) throw moveError;

      const { error: deleteError } = await admin
        .from('accounts')
        .delete()
        .eq('id', personalAccount.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('[POST /api/account/agents] provisioning error:', err);
      await admin.auth.admin.deleteUser(userId).catch((cleanupError) => {
        console.error('[POST /api/account/agents] cleanup error:', cleanupError);
      });
      return NextResponse.json(
        { error: 'Failed to attach agent to this account' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        user_id: userId,
        email,
        name,
        role,
        password,
      },
      { status: 201 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
