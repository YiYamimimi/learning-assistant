import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoFilename } = await request.json();

    if (!videoFilename) {
      return NextResponse.json({ error: 'No video filename provided' }, { status: 400 });
    }

    // TODO: Integrate with Alibaba Cloud / Tencent Cloud ASR service
    // For now, return a mock response

    console.log('Generating subtitle for video:', videoFilename);

    // Simulate ASR processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock subtitle data
    const mockSubtitles = [
      { from: 0, to: 5, content: '大家好，欢迎来到这个视频' },
      { from: 5, to: 10, content: '今天我们要讨论的主题非常重要' },
      { from: 10, to: 15, content: '让我们开始吧' },
      { from: 15, to: 20, content: '首先，让我们看看这个概念' },
      { from: 20, to: 25, content: '这个概念在实际应用中很有用' },
      { from: 25, to: 30, content: '接下来，我们来详细讲解' },
      { from: 30, to: 35, content: '请注意这些关键点' },
      { from: 35, to: 40, content: '这些内容会帮助你更好地理解' },
      { from: 40, to: 45, content: '现在，让我们进入下一个部分' },
      { from: 45, to: 50, content: '感谢大家的观看' },
    ];

    return NextResponse.json({
      success: true,
      subtitles: mockSubtitles,
      message: '字幕生成成功',
    });
  } catch (error) {
    console.error('Subtitle generation error:', error);
    return NextResponse.json({ error: '字幕生成失败' }, { status: 500 });
  }
}
