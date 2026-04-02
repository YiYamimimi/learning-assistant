import { NextRequest, NextResponse } from 'next/server';
import {
  getGuestAccessState,
  getAiUsageCount,
  recordAiUsage,
  setGuestCookies,
} from '@/lib/guest-usage';

const AI_USAGE_LIMIT = 3;

export async function POST(_request: NextRequest) {
  try {
    const state = await getGuestAccessState();
    const aiUsageCount = await getAiUsageCount(state.identifiers);

    if (aiUsageCount >= AI_USAGE_LIMIT) {
      return NextResponse.json({
        success: false,
        message: 'AI聊天次数已使用完毕',
        used: true,
        usageCount: aiUsageCount,
        maxUsage: AI_USAGE_LIMIT,
      });
    }

    const newCount = await recordAiUsage(state.identifiers);
    const isLimitReached = newCount >= AI_USAGE_LIMIT;

    const response = NextResponse.json({
      success: true,
      message: 'AI usage recorded',
      usageCount: newCount,
      maxUsage: AI_USAGE_LIMIT,
      used: isLimitReached,
    });

    setGuestCookies(response, state, { markUsed: isLimitReached });

    return response;
  } catch (error) {
    console.error('记录AI聊天使用情况失败:', error);
    return NextResponse.json({ error: 'Failed to record AI usage' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const state = await getGuestAccessState();
    const aiUsageCount = await getAiUsageCount(state.identifiers);

    const response = NextResponse.json({
      used: aiUsageCount >= AI_USAGE_LIMIT,
      usageCount: aiUsageCount,
      maxUsage: AI_USAGE_LIMIT,
      token: state.token,
    });

    if (state.tokenNeedsSet) {
      setGuestCookies(response, state);
    }

    return response;
  } catch (error) {
    console.error('检查AI聊天使用状态失败:', error);
    return NextResponse.json({ error: 'Failed to check AI usage status' }, { status: 500 });
  }
}
