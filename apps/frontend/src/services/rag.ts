import { generateEmbeddings, cosineSimilarity } from './embedding';
import { storeVectors, getAllVectors, clearVectors, VectorRecord } from './vectorStore';
import { SubtitleItem } from '../components/subtitleUtils';

const SIMILARITY_THRESHOLD = 0.2;
const TOP_K = 5;

interface Chunk {
  content: string;
  startTime: number;
  endTime: number;
}

export interface RelevantChunk {
  content: string;
  startTime: number;
  endTime: number;
  similarity: number;
}

export interface RAGQueryResult {
  context: string;
  relevantChunks: RelevantChunk[];
}

export async function indexSubtitles(subtitles: SubtitleItem[]): Promise<void> {
  console.log('=== 字幕索引过程 ===');
  console.log(`输入字幕数量: ${subtitles.length}`);

  const chunks = createChunks(subtitles);
  console.log(`创建的 chunk 数量: ${chunks.length}`);

  if (chunks.length > 0) {
    console.log('前 3 个 chunk 示例:');
    chunks.slice(0, 3).forEach((chunk, i) => {
      console.log(
        `  ${i + 1}. [${chunk.startTime}s-${chunk.endTime}s] ${chunk.content.substring(0, 80)}...`
      );
    });
  }

  const texts = chunks.map((c) => c.content);
  console.log('开始生成 embeddings...');
  const embeddings = await generateEmbeddings(texts);
  console.log(`✅ 成功生成 ${embeddings.length} 个 embeddings`);

  const records: VectorRecord[] = chunks.map((chunk, i) => ({
    id: `chunk-${i}`,
    content: chunk.content,
    embedding: embeddings[i],
    metadata: {
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      index: i,
    },
  }));

  console.log('开始存储向量到 IndexedDB...');
  await storeVectors(records);
  console.log(`✅ 已索引 ${records.length} 个字幕块到 IndexedDB`);
  console.log('==================\n');
}

function createChunks(subtitles: SubtitleItem[]): Chunk[] {
  const chunks: Chunk[] = [];
  const targetLength = 200;
  const overlap = 50;

  let currentChunk = '';
  let currentStart = 0;
  let currentEnd = 0;

  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];

    if (currentChunk.length === 0) {
      currentStart = sub.from;
      currentChunk = sub.content;
    } else {
      currentChunk += ' ' + sub.content;
    }

    currentEnd = sub.to;

    if (currentChunk.length >= targetLength) {
      chunks.push({
        content: currentChunk,
        startTime: currentStart,
        endTime: currentEnd,
      });

      const words = currentChunk.split(' ');
      let overlapText = '';
      for (let j = words.length - 1; j >= 0; j--) {
        if ((overlapText + words[j]).length > overlap) break;
        overlapText = words[j] + ' ' + overlapText;
      }

      currentChunk = overlapText.trim();
      currentStart = sub.from;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      startTime: currentStart,
      endTime: currentEnd,
    });
  }

  return chunks;
}

export async function queryRAG(question: string): Promise<RAGQueryResult> {
  console.log('=== 开始 RAG 查询 ===');
  console.log('用户问题:', question);

  console.log('\n[步骤 1] 生成问题的 embedding...');
  const [queryEmbedding] = await generateEmbeddings([question]);
  console.log('问题 embedding 生成完成');

  console.log('\n[步骤 2] 从 IndexedDB 获取所有向量...');
  const allVectors = await getAllVectors();
  console.log(`获取到 ${allVectors.length} 个向量记录`);

  console.log('\n[步骤 3] 计算相似度...');
  if (!queryEmbedding) {
    console.error('❌ 问题 embedding 生成失败，queryEmbedding 为 undefined');
    return { context: '', relevantChunks: [] };
  }
  console.log(`查询向量维度: ${queryEmbedding.length}`);
  console.log(`第一个字幕向量维度: ${allVectors[0]?.embedding?.length || 'N/A'}`);

  if (queryEmbedding.length !== allVectors[0]?.embedding?.length) {
    console.error('❌ 向量维度不匹配！需要重新索引字幕。');
    console.error(`查询向量: ${queryEmbedding.length}维`);
    console.error(`字幕向量: ${allVectors[0]?.embedding?.length}维`);
    console.error('请删除 IndexedDB 中的旧数据，让 popup 重新索引。');

    const { clearVectors } = await import('./vectorStore');
    await clearVectors();
    console.log('✅ 已清除旧的向量数据，请刷新页面重新索引。');

    return { context: '', relevantChunks: [] };
  }

  const similarities = allVectors.map((record) => ({
    ...record,
    similarity: cosineSimilarity(queryEmbedding, record.embedding),
  }));

  console.log(`计算了 ${similarities.length} 个相似度`);

  console.log('\n[步骤 4] 按相似度排序...');
  similarities.sort((a, b) => b.similarity - a.similarity);

  console.log('排序后的前 10 个相似度:');
  similarities.slice(0, 10).forEach((s, i) => {
    console.log(
      `  ${i + 1}. 相似度: ${(s.similarity * 100).toFixed(2)}% | 内容: ${s.content.substring(0, 50)}...`
    );
  });

  console.log('\n相似度统计:');
  console.log(`  最高相似度: ${(similarities[0]?.similarity * 100).toFixed(2)}%`);
  console.log(
    `  最低相似度: ${(similarities[similarities.length - 1]?.similarity * 100).toFixed(2)}%`
  );
  console.log(
    `  平均相似度: ${((similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length) * 100).toFixed(2)}%`
  );
  console.log(`  当前阈值: ${(SIMILARITY_THRESHOLD * 100).toFixed(0)}%`);

  console.log('\n[步骤 5] 过滤和选择 Top K...');
  const relevantChunks = similarities
    .filter((s) => s.similarity > SIMILARITY_THRESHOLD)
    .slice(0, TOP_K)
    .map((s) => ({
      content: s.content,
      startTime: s.metadata.startTime,
      endTime: s.metadata.endTime,
      similarity: s.similarity,
    }));

  console.log(
    `过滤后剩余 ${relevantChunks.length} 个相关片段（阈值: ${(SIMILARITY_THRESHOLD * 100).toFixed(0)}%）`
  );

  console.log('\n[步骤 6] 构建上下文...');
  const context = relevantChunks
    .map(
      (chunk, i) =>
        `[片段 ${i + 1}] 时间: ${formatTime(chunk.startTime)}-${formatTime(chunk.endTime)}\n内容: ${chunk.content}`
    )
    .join('\n\n');

  console.log('上下文构建完成，长度:', context.length);
  console.log('=== RAG 查询完成 ===\n');

  return { context, relevantChunks };
}

export async function clearIndex(): Promise<void> {
  await clearVectors();
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60);
  const seconds = Math.floor(ms % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
