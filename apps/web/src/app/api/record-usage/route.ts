import { NextRequest, NextResponse } from 'next/server';
import {
  getGuestAccessState,
  recordGuestUsage,
  setGuestCookies,
  updateUsageCount,
} from '@/lib/guest-usage';

export async function POST(_request: NextRequest) {
  try {
    console.log('=== 开始记录使用情况 ===');
    const state = await getGuestAccessState();
    console.log('当前状态:', {
      used: state.used,
      usageCount: state.usageCount,
      identifiers: state.identifiers,
    });

    await recordGuestUsage(state);

    const newUsageCount = state.usageCount + 1;
    const isLimitReached = newUsageCount >= 2;

    console.log('记录完成，新的使用次数:', newUsageCount);

    const response = NextResponse.json({
      success: true,
      message: 'Usage recorded',
      usageCount: newUsageCount,
      maxUsage: 2,
      used: isLimitReached,
    });

    setGuestCookies(response, state, { markUsed: isLimitReached });

    console.log('=== 记录使用情况完成 ===');
    return response;
  } catch (error) {
    console.error('Failed to record usage:', error);
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const state = await getGuestAccessState();

    const response = NextResponse.json({
      used: state.used,
      usageCount: state.usageCount,
      maxUsage: 2,
      token: state.token,
    });

    if (state.tokenNeedsSet) {
      setGuestCookies(response, state);
    }

    return response;
  } catch (error) {
    console.error('Failed to check usage status:', error);
    return NextResponse.json({ error: 'Failed to check usage status' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, newCount } = body;

    console.log('=== 开始更新 usage_count ===');
    console.log('请求参数:', { identifier, newCount });

    if (!identifier || typeof newCount !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const result = await updateUsageCount(identifier, newCount);

    if (result.success) {
      console.log('=== 更新 usage_count 成功 ===');
      return NextResponse.json({
        success: true,
        message: 'Usage count updated',
        usageCount: newCount,
      });
    } else {
      console.error('=== 更新 usage_count 失败 ===', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to update usage count' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to update usage count:', error);
    return NextResponse.json({ error: 'Failed to update usage count' }, { status: 500 });
  }
}
