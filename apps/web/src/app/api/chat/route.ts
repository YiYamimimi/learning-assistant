import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getGuestAccessState,
  getAiUsageCount,
  recordAiUsage,
} from '@/lib/guest-usage';

const AI_USAGE_LIMIT = 3;

/* global TextEncoder, ReadableStream */

const client = new OpenAI({
  apiKey: process.env.ZHIPUAI_API_KEY || '',
  baseURL: process.env.ZHIPUAI_API_URL || '',
});

export async function POST(request: NextRequest) {
  try {
    const guestState = await getGuestAccessState();
    const aiUsageCount = await getAiUsageCount(guestState.identifiers);

    if (aiUsageCount >= AI_USAGE_LIMIT) {
      return NextResponse.json({ error: 'AI聊天次数已使用完毕，请登录' }, { status: 429 });
    }

    const { messages, subtitleData, currentQuestion } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const subtitleText =
      subtitleData && Array.isArray(subtitleData)
        ? subtitleData
            .map((item: any) => `[${formatTime(item.from)}-${formatTime(item.to)}] ${item.content}`)
            .join('\n')
        : '未提供';

    const historyText =
      messages.length > 0
        ? messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
        : '无历史对话';

    const systemPrompt = `<task>
  <role>
    你是一个专业的视频转录分析 AI 助手。
    核心职责：
    1. 当用户问题涉及视频具体内容时，严格基于提供的 <videoTopics> 转录文本回答。
    2. 当用户问题是通用知识或与视频无关时，利用你的内部知识库回答，并在回答开头明确标注"（非视频内容）"。
    3. 所有输出必须是结构清晰的字符串，**必须使用 Markdown 格式进行排版**（如标题、列表），不得返回纯文本段落。
  </role>

  <context>
    <videoTopics>
      ${subtitleText}
    </videoTopics>

    <conversationHistory>
      <![CDATA[
      ${historyText}
      ]]>
    </conversationHistory>

    <currentQuestion>
      <![CDATA[
      ${currentQuestion || ''}
      ]]>
    </currentQuestion>
  </context>

  <goal>
    - 提供简洁、事实性的回答。
    - 最多关联5个最相关的时间戳。
  </goal>

  <instructions>
    <step name="1. 内容分析与重组">
      <item>不要按时间顺序流水账式地复述。</item>
      <item>将转录内容归纳为几个逻辑类别，例如：[核心主题], [关键技术/概念], [架构/流程], [未来趋势/挑战]。</item>
      <item>对于每个类别，提炼出1-2个核心观点。</item>
    </step>

    <step name="2. 时间戳精确计算与挂载">
      <item>提取相关片段的时间区间 [Start-End]。</item>
      <item>【关键规则】将 Start 秒数严格转换为 MM:SS 格式。
        - 公式：Minutes = floor(Seconds / 60), Seconds = Seconds % 60。
        - 示例：65秒 → 01:05；100秒 → 01:40；695秒 → 11:35（严禁出现 10:95 等错误）。
      </item>
      <item>将计算后的时间戳放在对应观点末尾，格式为 (参考时间: MM:SS)。</item>
      <item>最多关联5个最相关的时间戳。</item>
    </step>

    <step name="3. 安全与兜底逻辑">
      <item>若 <videoTopics> 为"未提供"或内容为空，则禁止推测或编造视频信息。</item>
      <item>若用户输入无效（如纯数字、乱码），应返回提示而非强行解析。</item>
    </step>

    <step name="4. 语言与格式">
      <item>使用专业、简练的总结性语言。</item>
      <item>必须使用 Markdown 列表（-）和二级标题（###）组织答案。</item>
      <item>非视频内容回答无需时间戳，但需以"（非视频内容）"开头，并保持 Markdown 结构。</item>
    </step>
  </instructions>

  <outputFormat>
    返回字符串，必须为以下 Markdown 结构之一：

    情况一：视频内容存在且相关
    ### 📌 核心主题
    - 观点描述 (参考时间: MM:SS)

    ### 🛠️ 关键技术
    - 观点描述 (参考时间: MM:SS)

    ### 🚀 未来展望
    - 观点描述 (参考时间: MM:SS)

    情况二：通用知识或无关问题
    （非视频内容）直接回答，但仍建议使用列表或段落保持可读性。

    情况三：无效输入
    未能理解您的问题，这似乎不是完整的句子或与视频内容无关。请提供更多细节。
  </outputFormat>

  <examples>
    <example>
      <input>这个视频讲了什么？</input>
      <output>### 📌 核心主题
- 视频主要讲述如何构建智能体（Agent）来利用大模型完成任务，从简单的文字接龙进阶到复杂功能 (参考时间: 00:00)。

### 🛠️ 关键技术
- 介绍了 Prompt、Context、Memory 等基础概念，以及 RAG 和 Function Calling 技术 (参考时间: 00:43)。
- 提到了通过 LangChain 等框架和工作流编排复杂任务 (参考时间: 02:49)。

### 🚀 未来展望
- 强调易用性和降低成本（如 Token 价格优化）是未来发展的关键 (参考时间: 08:43)。</output>
    </example>

    <example>
      <input>地球是圆的吗？</input>
      <output>（非视频内容）是的，地球是一个近似球体的行星。</output>
    </example>

    <example>
      <input>2222</input>
      <output>未能理解您的问题 '2222'，这似乎不是完整的句子或与视频内容无关。请提供更多细节。</output>
    </example>
  </examples>
</task>`;
    console.log(systemPrompt, 'systemPrompt', process.env.ZHIPUAI_API_URL);

    const completion = await client.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentQuestion || '' },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
          // 记录AI聊天使用次数
           try {
             await recordAiUsage(guestState.identifiers);
           } catch (error) {
             console.error('记录AI聊天使用次数失败:', error);
           }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('智谱AI调用失败:', error);
    return NextResponse.json(
      { error: '智谱AI调用失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
