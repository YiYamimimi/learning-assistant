import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const GUEST_TOKEN_COOKIE = 'learning_assistant_guest_token';
const GUEST_USED_COOKIE = 'learning_assistant_analysis_used';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;
const GUEST_RATE_KEY = 'guest-analysis';

const MAX_USAGE_COUNT = 2;

export type GuestAccessState = {
  tokenNeedsSet: boolean;
  used: boolean;
  usageCount: number;
  identifiers: string[];
  token: string;
};

async function getIpHash(): Promise<string | null> {
  const headerList = await headers();

  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const rawIp = forwardedFor?.split(',')[0]?.trim() || realIp || null;

  if (!rawIp) return null;

  return crypto.createHash('sha256').update(rawIp).digest('hex').slice(0, 32);
}

export async function getGuestAccessState(options?: {
  supabase?: ReturnType<typeof createClient>;
  key?: string;
  maxUsage?: number;
}): Promise<GuestAccessState> {
  const supabase =
    options?.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  const cookieStore = await cookies();

  const existingToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
  const token = existingToken || crypto.randomUUID();
  const tokenNeedsSet = !existingToken;

  const ipHash = await getIpHash();
  const identifiers = [token];
  if (ipHash) {
    identifiers.push(`ip:${ipHash}`);
  }

  const usedCookie = cookieStore.get(GUEST_USED_COOKIE)?.value === '1';
  let used = usedCookie;
  let usageCount = 0;

  const rateKey = options?.key || GUEST_RATE_KEY;
  const maxUsage = options?.maxUsage || MAX_USAGE_COUNT;

  const { data, error } = await supabase
    .from('rate_limits')
    .select('usage_count')
    .eq('key', rateKey)
    .in('identifier', identifiers)
    .returns<{ usage_count: number }[]>();

  if (error) {
    console.error('Failed to read guest usage:', error);
  }

  if (data && data.length > 0) {
    usageCount = Math.max(...data.map((item) => item.usage_count || 0));
    if (!used) {
      used = usageCount >= maxUsage;
    }
  }

  return {
    token,
    tokenNeedsSet,
    used,
    usageCount,
    identifiers,
  };
}

export function setGuestCookies(
  response: NextResponse,
  state: GuestAccessState,
  options?: { markUsed?: boolean }
): void {
  const cookieConfig = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };

  if (state.tokenNeedsSet) {
    response.cookies.set(GUEST_TOKEN_COOKIE, state.token, cookieConfig);
  }

  if (options?.markUsed) {
    response.cookies.set(GUEST_USED_COOKIE, '1', cookieConfig);
  }
}

export async function recordGuestUsage(
  state: GuestAccessState,
  options?: { supabase?: ReturnType<typeof createClient>; key?: string }
): Promise<void> {
  const supabase =
    options?.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

  const uniqueIdentifiers = Array.from(new Set(state.identifiers));
  console.log(`开始记录使用情况，唯一标识符:`, uniqueIdentifiers);

  for (const identifier of uniqueIdentifiers) {
    console.log(`处理标识符: ${identifier}`);

    const { data, error } = await (supabase as any).rpc('increment_usage_count', {
      p_key: options?.key || GUEST_RATE_KEY,
      p_identifier: identifier,
    });

    console.log(`更新结果:`, { data, error });

    if (error) {
      console.error('Failed to increment usage count:', error);
    } else {
      console.log(`成功更新记录 ${identifier}, 新的 usage_count: ${data}`);
    }
  }
}

export async function updateUsageCount(
  identifier: string,
  newCount: number,
  options?: { supabase?: ReturnType<typeof createClient> }
): Promise<{ success: boolean; error?: string }> {
  const supabase =
    options?.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

  console.log(`准备更新 usage_count: ${identifier} -> ${newCount}`);

  // 查询所有相关记录（token 和可能的 IP hash）
  const { data: allRecords, error: checkError } = await supabase
    .from('rate_limits')
    .select('id, identifier, usage_count')
    .eq('key', GUEST_RATE_KEY)
    .in('identifier', [
      identifier,
      identifier.startsWith('ip:') ? identifier.replace('ip:', '') : `ip:${identifier}`,
    ])
    .returns<{ id: number; identifier: string; usage_count: number }[]>();

  console.log(`查询结果:`, { allRecords, checkError });

  if (checkError) {
    console.error('Failed to check existing records:', checkError);
    return { success: false, error: 'Failed to check existing records' };
  }

  if (!allRecords || allRecords.length === 0) {
    console.error('No records found');
    return { success: false, error: 'No records found' };
  }

  // 更新所有相关记录
  const updatePromises = allRecords.map(async (record) => {
    console.log(
      `更新记录: ${record.identifier}, usage_count: ${record.usage_count} -> ${newCount}`
    );

    const { error: updateError } = await (supabase as any)
      .from('rate_limits')
      .update({
        usage_count: newCount,
        timestamp: new Date().toISOString(),
      })
      .eq('id', record.id);

    console.log(`更新结果:`, { updateError });

    if (updateError) {
      console.error(`Failed to update record ${record.identifier}:`, updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`成功更新记录 ${record.identifier}, 新的 usage_count: ${newCount}`);
    return { success: true };
  });

  // 等待所有更新完成
  const results = await Promise.all(updatePromises);
  const hasError = results.some((result) => !result.success);

  if (hasError) {
    return { success: false, error: 'Some updates failed' };
  }

  console.log(`成功更新所有记录，新的 usage_count: ${newCount}`);
  return { success: true };
}

export async function getAiUsageCount(
  identifiers: string[],
  options?: { supabase?: ReturnType<typeof createClient> }
): Promise<number> {
  const supabase =
    options?.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

  const { data, error } = await supabase
    .from('rate_limits')
    .select('use_ai')
    .eq('key', GUEST_RATE_KEY)
    .in('identifier', identifiers)
    .returns<{ use_ai: number }[]>();

  if (error) {
    console.error('Failed to read AI usage:', error);
    return 0;
  }

  if (data && data.length > 0) {
    return Math.max(...data.map((item) => item.use_ai || 0));
  }

  return 0;
}

export async function recordAiUsage(
  identifiers: string[],
  options?: { supabase?: ReturnType<typeof createClient> }
): Promise<number> {
  const supabase =
    options?.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

  const uniqueIdentifiers = Array.from(new Set(identifiers));
  let maxNewCount = 0;

  for (const identifier of uniqueIdentifiers) {
    const { data: existing, error: queryError } = await supabase
      .from('rate_limits')
      .select('use_ai')
      .eq('key', GUEST_RATE_KEY)
      .eq('identifier', identifier)
      .returns<{ use_ai: number }[]>()
      .maybeSingle();

    if (queryError) {
      console.error('Failed to query use_ai:', queryError);
      continue;
    }

    let newCount: number;

    if (existing) {
      newCount = (existing.use_ai || 0) + 1;
      const { error: updateError } = await (supabase as any)
        .from('rate_limits')
        .update({ use_ai: newCount, timestamp: new Date().toISOString() })
        .eq('key', GUEST_RATE_KEY)
        .eq('identifier', identifier);

      if (updateError) {
        console.error('Failed to update use_ai:', updateError);
        continue;
      }
    } else {
      newCount = 1;
      const { error: insertError } = await (supabase as any).from('rate_limits').insert({
        key: GUEST_RATE_KEY,
        identifier,
        usage_count: 0,
        use_ai: 1,
        timestamp: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Failed to insert use_ai:', insertError);
        continue;
      }
    }

    if (newCount > maxNewCount) {
      maxNewCount = newCount;
    }
  }

  return maxNewCount;
}
