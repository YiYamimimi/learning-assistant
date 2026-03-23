/* eslint-disable no-undef */
import { SubtitleItem } from '../components/subtitleUtils';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_API_URL = import.meta.env.VITE_OPENAI_URL || 'https://open.bigmodel.cn/api/paas/v4/';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamps?: string[];
}

export interface ChatResponse {
  answer: string;
  timestamps: string[];
}

export function parseAIResponse(raw: string, isFinal: boolean = false): ChatResponse {
  console.log(raw, '原始响应');

  // 首先检查是否是JSON格式
  try {
    const parsed = JSON.parse(raw);
    if (parsed.answer) {
      if (!isFinal) {
        // 流式输出过程中，只返回answer，不处理时间戳
        return {
          answer: parsed.answer || '',
          timestamps: [],
        };
      } else {
        // 最终回答，处理时间戳
        const answer = parsed.answer || '';
        const rawTimestamps = parsed.timestamps || [];

        const normalizeTimestamp = (ts: any): string | null => {
          if (typeof ts !== 'string') return null;
          const trimmed = ts.trim();
          if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
            return trimmed;
          }
          const match = trimmed.match(/(\d{1,2}):(\d{2})/);
          if (match && match[1] && match[2]) {
            const minutes = parseInt(match[1], 10).toString().padStart(2, '0');
            const seconds = parseInt(match[2], 10).toString().padStart(2, '0');
            return `${minutes}:${seconds}`;
          }
          return null;
        };

        const timestamps = rawTimestamps
          .map((ts: any) => normalizeTimestamp(ts))
          .filter((ts: string | null): ts is string => ts !== null)
          .filter((ts: string, index: number, arr: string[]) => arr.indexOf(ts) === index)
          .sort((a: string, b: string) => {
            const [aMinStr, aSecStr] = a.split(':');
            const [bMinStr, bSecStr] = b.split(':');
            const aMin = Number(aMinStr);
            const aSec = Number(aSecStr);
            const bMin = Number(bMinStr);
            const bSec = Number(bSecStr);
            if (isNaN(aMin) || isNaN(aSec) || isNaN(bMin) || isNaN(bSec)) return 0;
            return aMin * 60 + aSec - (bMin * 60 + bSec);
          });

        return {
          answer,
          timestamps,
        };
      }
    }
  } catch {
    // 不是JSON格式，按纯字符串处理
  }

  // 处理纯字符串格式
  const trimmed = raw.trim();

  // 检查是否在代码块中
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const content = fenceMatch && fenceMatch[1] ? fenceMatch[1].trim() : trimmed;

  if (!isFinal) {
    // 流式输出过程中，只返回内容，不处理时间戳
    return {
      answer: content,
      timestamps: [],
    };
  } else {
    // 最终回答，从内容中提取时间戳
    const answer = content;
    const timestamps: string[] = [];

    // 从文本中提取时间戳格式 (参考时间: 00:00, 01:30)
    const timestampRegex = /参考时间:\s*((?:\d{1,2}:\d{2}(?:,\s*)?)+)/g;
    let match;
    while ((match = timestampRegex.exec(content)) !== null) {
      const timestampsStr = match[1];
      if (timestampsStr) {
        const tsList = timestampsStr.split(',').map((t) => t.trim());
        timestamps.push(...tsList);
      }
    }

    // 规范化时间戳
    const normalizeTimestamp = (ts: string): string | null => {
      const trimmed = ts.trim();
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const match = trimmed.match(/(\d{1,2}):(\d{2})/);
      if (match && match[1] && match[2]) {
        const minutes = parseInt(match[1], 10).toString().padStart(2, '0');
        const seconds = parseInt(match[2], 10).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
      }
      return null;
    };

    const normalizedTimestamps = timestamps
      .map((ts) => normalizeTimestamp(ts))
      .filter((ts: string | null): ts is string => ts !== null)
      .filter((ts: string, index: number, arr: string[]) => arr.indexOf(ts) === index)
      .sort((a: string, b: string) => {
        const [aMinStr, aSecStr] = a.split(':');
        const [bMinStr, bSecStr] = b.split(':');
        const aMin = Number(aMinStr);
        const aSec = Number(aSecStr);
        const bMin = Number(bMinStr);
        const bSec = Number(bSecStr);
        if (isNaN(aMin) || isNaN(aSec) || isNaN(bMin) || isNaN(bSec)) return 0;
        return aMin * 60 + aSec - (bMin * 60 + bSec);
      });

    return {
      answer,
      timestamps: normalizedTimestamps,
    };
  }
}

export async function* streamChat(
  question: string,
  history: Message[],
  subtitles: SubtitleItem[]
): AsyncGenerator<ChatResponse, void, unknown> {
  const subtitleText = subtitles
    .map((s) => `[${formatTime(s.from)}-${formatTime(s.to)}] ${s.content}`)
    .join('\n');
  // let themeInfo = '';
  // if (themes && themes.length > 0) {
  //   themeInfo = '\n\n视频关键字：\n' + themes.map((theme, index) =>
  //     `${index + 1}. ${theme.title} (${formatTime(theme.startTime)} - ${formatTime(theme.endTime)})\n   ${theme.description}`
  //   ).join('\n');
  // }

  const systemPrompt = `<task>
  <role>
    你是一个专业的视频转录分析 AI 助手。
    核心职责：
    1. 当用户问题涉及视频具体内容时，严格基于提供的 <&lt;>videoTopics&gt; 转录文本回答。
    2. 当用户问题是通用知识或与视频无关时，利用你的内部知识库回答，并在回答开头明确标注“（非视频内容）”。
    3. 所有输出必须是结构清晰的字符串，**必须使用 Markdown 格式进行排版**（如标题、列表），不得返回纯文本段落。
  </role>

  <context>
    <videoTopics>
      ${subtitleText || '未提供'}
    </videoTopics>

    <conversationHistory>
      <![CDATA[
      ${history.map((msg) => `${msg.role}: ${msg.content}`).join('\n') || '无历史对话'}
      ]]>
    </conversationHistory>
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
      <item>若 <&lt;>videoTopics&gt; 为“未提供”或内容为空，则禁止推测或编造视频信息。</item>
      <item>若用户输入无效（如纯数字、乱码），应返回提示而非强行解析。</item>
    </step>

    <step name="4. 语言与格式">
      <item>使用专业、简练的总结性语言。</item>
      <item>必须使用 Markdown 列表（-）和二级标题（###）组织答案。</item>
      <item>非视频内容回答无需时间戳，但需以“（非视频内容）”开头，并保持 Markdown 结构。</item>
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
    未能理解您的问题 '${question}'，这似乎不是完整的句子或与视频内容无关。请提供更多细节。
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

  <userQuestion><![CDATA[
  ${question}
  ]]></userQuestion>
</task>`;
  console.log('AI聊天', systemPrompt);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];

  const response = await fetch(`${OPENAI_API_URL}chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API error: ${response.status} - ${error}`);
  }
  //———————————————读取流式响应—————————————————————————
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          //————————————实时解析（规范化）————————————————
          const parsedResponse = parseAIResponse(fullContent, true);
          yield parsedResponse;
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            console.log('AI聊天', content);

            fullContent += content;
            const parsedResponse = parseAIResponse(fullContent, false);
            yield parsedResponse;
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          continue;
        }
      }
    }
  }
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
