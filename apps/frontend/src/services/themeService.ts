import { SubtitleItem } from '../components/subtitleUtils';

export interface VideoTheme {
  title: string;
  startTime: number;
  endTime: number;
  description: string;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_API_URL = import.meta.env.VITE_OPENAI_URL || 'https://open.bigmodel.cn/api/paas/v4/';

export async function generateVideoThemes(subtitles: SubtitleItem[]): Promise<VideoTheme[]> {
  if (!subtitles || subtitles.length === 0) {
    throw new Error('字幕数据为空');
  }

  const totalDuration = subtitles[subtitles.length - 1].to;
  console.log(subtitles, 'subtitles');

  const subtitleText = subtitles
    .map((s) => `[${s.from.toFixed(2)}s-${s.to.toFixed(2)}s] ${s.content}`)
    .join('\n');

  const prompt = `
# Role
您是一位专业的视频内容分析师，擅长从字幕中提取核心主题并生成精确的时间轴章节。

# Task
分析提供的【带时间戳的字幕内容】，出找并提取其核心概念，生成一个包含 4 到 6 个关键词或简短关键短语的列表。
这些关键词或短语能够准确地涵盖所讨论的主要主题，且彼此之间不重叠。
这些关键词将有助于潜在观众快速了解视频的具体重点。
每个关键词的标题（2-4 个字），撰写一句简短描述，并标记准确的开始和结束时间。


# Input Data Format
输入数据包含时间戳和文本，格式如："[0.00s-3.50s] 第一条字幕内容"。
请严格依据输入中的时间戳来确定 startTime 和 endTime。

# Constraints
1. **数量**：必须生成 4 到 6 个主题,绝对不能超出6个。
2. **标题**：每个标题严格限制在 2 到 4 个汉字（或 1-3 个英文单词）之间，必须具体且名词化。
3. **时间准确性**：startTime 和 endTime 必须来源于输入的字幕信息，严禁编造。如果无法确定确切结束时间，可使用下一个章节的开始时间减 1 秒。
4. **覆盖度**：章节应均匀分布，覆盖视频的开头、中间和结尾。
5. **输出格式**：仅输出标准的 JSON 数组，不要包含 markdown 标记（如 \`\`\`json），不要有任何前言后语。

# Output JSON Schema
[
  {
    "title": "字符串 (短标题)",
    "startTime": 数字 (秒),
    "endTime": 数字 (秒),
    "description": "字符串 (一句话描述该章节核心内容)"
  }
]

# Subtitle Content
${subtitleText}
`;
  console.log(subtitleText, 'subtitleText');
  try {
    const response = await fetch(`${OPENAI_API_URL}chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的视频内容分析师，擅长从字幕中提取主题和关键内容点。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(data, 'ai主题');

    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('API返回内容为空');
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('无法从返回内容中提取JSON');
    }

    const themes: VideoTheme[] = JSON.parse(jsonMatch[0]);

    return themes.map((theme) => ({
      ...theme,
      startTime: Math.max(0, Math.min(theme.startTime, totalDuration)),
      endTime: Math.max(theme.startTime, Math.min(theme.endTime, totalDuration)),
    }));
  } catch (error) {
    console.error('生成视频主题失败:', error);
    throw error;
  }
}

export function formatThemeTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
