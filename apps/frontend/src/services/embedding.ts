const STOP_WORDS = new Set([
  'the',
  'is',
  'at',
  'which',
  'on',
  'a',
  'an',
  'and',
  'or',
  'but',
  'if',
  'because',
  'as',
  'what',
  'when',
  'where',
  'how',
  'all',
  'any',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'can',
  'will',
  'just',
  'should',
  'now',
  'he',
  'she',
  'you',
  'they',
  'we',
  'are',
  'this',
  'that',
  'these',
  'those',
  'am',
  'be',
  'do',
  'has',
  'had',
  'have',
  'it',
  'of',
  'to',
  'with',
  'for',
  'in',
  'by',
  'from',
  'up',
  'about',
  'into',
  'over',
  'after',
  '的',
  '了',
  '是',
  '在',
  '和',
  '与',
  '这',
  '那',
  '有',
  '个',
  '为',
  '就',
  '都',
  '而',
  '及',
  '其',
  '让',
  '把',
  '被',
  '从',
  '到',
  '把',
  '对',
  '等',
  '很',
  '也',
  '会',
  '能',
  '要',
  '我',
  '你',
  '他',
  '她',
  '它',
  '们',
  '吗',
  '呢',
  '吧',
  '啊',
  '哦',
  '嗯',
  '哈',
  '啦',
  '嘛',
  '呗',
  '呗',
  '嘛',
]);

const SYNONYMS: Record<string, string[]> = {
  视频: ['影片', '录像', '视频内容', '视频讲解', '视频介绍'],
  讲: ['说', '谈', '讨论', '介绍', '讲解', '阐述', '说明', '解释', '描述', '讲述', '叙述'],
  什么: ['哪些', '哪些内容', '什么内容', '主要内容', '核心内容', '重点', '关键点'],
  ai: ['人工智能', 'artificial intelligence', '机器学习', '深度学习', 'ai', '人工智能'],
  编程: ['写代码', 'coding', '开发', '程序设计', '软件开发', 'code', 'programming'],
  agent: ['代理', '智能体', '助手', 'ai助手', '智能助手'],
  工具: ['tool', 'utility', '软件', '应用', 'app', 'application'],
  模型: ['model', '神经网络', 'neural network', '算法', 'algorithm'],
  学习: ['learn', 'study', 'study', '学习', '掌握', '了解', '理解'],
  使用: ['use', 'utilize', 'employ', '应用', 'apply', '用'],
  方法: ['method', 'way', 'approach', '技巧', 'technique', '策略', 'strategy'],
  问题: ['problem', 'issue', 'challenge', '疑问', 'question', '难点'],
  解决: ['solve', 'resolve', 'fix', '处理', 'handle', 'address'],
  功能: ['feature', 'function', 'capability', '能力', '特性'],
  实现: ['implement', 'realize', 'achieve', '完成', '达成'],
  设计: ['design', 'architecture', '结构', '架构'],
  代码: ['code', 'programming', 'source code', '源码'],
  数据: ['data', 'information', '信息'],
  系统: ['system', 'platform', 'framework', '框架', '平台'],
  接口: ['api', 'interface', 'endpoint', '调用'],
  服务: ['service', 'server', 'backend', '后端'],
  前端: ['frontend', 'ui', 'interface', '界面'],
  后端: ['backend', 'server', 'service'],
  优化: ['optimize', 'improve', 'enhance', '改进', '提升'],
  性能: ['performance', 'speed', 'efficiency', '效率'],
  安全: ['security', 'safe', 'protection', '保护'],
  测试: ['test', 'testing', 'verify', '验证'],
  部署: ['deploy', 'release', 'publish', '发布'],
  配置: ['config', 'configuration', 'setup', '设置'],
  文档: ['document', 'doc', 'documentation', '说明'],
  示例: ['example', 'demo', 'sample', 'sample'],
  教程: ['tutorial', 'guide', 'lesson', '课程'],
  技巧: ['tip', 'trick', 'hack', '窍门'],
  最佳实践: ['best practice', '最佳方式', '推荐做法'],
  常见问题: ['faq', '常见错误', '常见问题'],
  核心: ['core', 'key', 'main', '主要', '重要'],
  基础: ['basic', 'fundamental', 'elementary', '入门'],
  高级: ['advanced', 'senior', 'expert', '进阶'],
  简单: ['simple', 'easy', 'basic', '基础'],
  复杂: ['complex', 'complicated', 'difficult', '困难'],
  快速: ['fast', 'quick', 'rapid', 'speedy'],
  高效: ['efficient', 'effective', 'productive'],
  自动: ['auto', 'automatic', 'automated'],
  手动: ['manual', 'hand-operated'],
  在线: ['online', 'web-based'],
  离线: ['offline', 'local'],
  云端: ['cloud', 'remote'],
  本地: ['local', 'on-premise'],
  实时: ['real-time', 'live', 'instant'],
  异步: ['async'],
  同步: ['sync'],
};

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

function expandWithSynonyms(text: string): string {
  const words = text.toLowerCase().split(/\s+/);
  const expandedWords: string[] = [];

  for (const word of words) {
    expandedWords.push(word);

    const synonyms = SYNONYMS[word];
    if (synonyms) {
      expandedWords.push(...synonyms);
    }
  }

  return expandedWords.join(' ');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length;

  for (const token of tokens) {
    const count = (tf.get(token) || 0) + 1;
    tf.set(token, count);
  }

  for (const [token, count] of tf.entries()) {
    tf.set(token, count / total);
  }

  return tf;
}

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = documents.length;
  const tokenDocCount = new Map<string, number>();

  for (const doc of documents) {
    const uniqueTokens = new Set(doc);
    for (const token of uniqueTokens) {
      tokenDocCount.set(token, (tokenDocCount.get(token) || 0) + 1);
    }
  }

  for (const [token, count] of tokenDocCount.entries()) {
    idf.set(token, Math.log(N / count));
  }

  return idf;
}

function tfidfToVector(
  tf: Map<string, number>,
  idf: Map<string, number>,
  allTokens: string[]
): Float32Array {
  const tokens = Array.from(tf.keys());
  const vector = new Float32Array(allTokens.length);

  const tokenIndex = new Map<string, number>();
  allTokens.forEach((token, i) => {
    tokenIndex.set(token, i);
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tfValue = tf.get(token) || 0;
    const idfValue = idf.get(token) || 0;
    const idx = tokenIndex.get(token);
    if (idx !== undefined) {
      vector[idx] = tfValue * idfValue;
    }
  }

  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const minLen = Math.min(a.length, b.length);

  for (let i = 0; i < minLen; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

export async function findSimilarMessages(
  query: string,
  messages: Message[],
  topK: number = 5
): Promise<{ message: Message; similarity: number }[]> {
  console.log('\n=== 开始查找相似消息 ===');
  console.log(`查询内容: ${query}`);
  console.log(`历史消息数量: ${messages.length}`);

  if (messages.length === 0) {
    console.log('没有历史消息');
    return [];
  }

  const expandedQuery = expandWithSynonyms(query);
  const queryTokens = tokenize(expandedQuery);
  const queryTF = computeTF(queryTokens);

  const messageTexts = messages.map((m) => m.content);
  const expandedMessageTexts = messageTexts.map((text) => expandWithSynonyms(text));
  const messageTokensList = expandedMessageTexts.map((text) => tokenize(text));

  console.log(`语义增强完成`);

  const allTokens = new Set<string>();
  messageTokensList.forEach((tokens) => tokens.forEach((token) => allTokens.add(token)));
  queryTokens.forEach((token) => allTokens.add(token));

  const idf = computeIDF([queryTokens, ...messageTokensList]);
  const allTokensArray = Array.from(allTokens);

  console.log(`唯一词数: ${allTokensArray.length}`);

  const queryVector = tfidfToVector(queryTF, idf, allTokensArray);

  const similarities = messages.map((message, i) => {
    const messageTF = computeTF(messageTokensList[i]);
    const messageVector = tfidfToVector(messageTF, idf, allTokensArray);
    const similarity = cosineSimilarity(Array.from(queryVector), Array.from(messageVector));

    return {
      message,
      similarity,
    };
  });

  similarities.sort((a, b) => b.similarity - a.similarity);

  console.log(`\n相似度计算完成:`);
  console.log(`  最高相似度: ${(similarities[0]?.similarity * 100).toFixed(2)}%`);
  console.log(
    `  最低相似度: ${(similarities[similarities.length - 1]?.similarity * 100).toFixed(2)}%`
  );

  const topKResults = similarities.slice(0, topK);

  console.log(`\nTop ${topK} 相似消息:`);
  topKResults.forEach((item, i) => {
    console.log(
      `  ${i + 1}. 相似度: ${(item.similarity * 100).toFixed(2)}% | ${item.message.role}: ${item.message.content.substring(0, 50)}...`
    );
  });
  console.log('=== 查找完成 ===\n');

  return topKResults;
}

export async function preloadModel(): Promise<void> {
  console.log('TF-IDF + 语义增强模型已就绪');
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log('生成 embeddings...');

  const allTokens = new Set<string>();
  const tokensList = texts.map((text) => {
    const expandedText = expandWithSynonyms(text);
    const tokens = tokenize(expandedText);
    tokens.forEach((token) => allTokens.add(token));
    return tokens;
  });

  const idf = computeIDF(tokensList);
  const allTokensArray = Array.from(allTokens);

  const embeddings = tokensList.map((tokens) => {
    const tf = computeTF(tokens);
    return Array.from(tfidfToVector(tf, idf, allTokensArray));
  });

  console.log(`✅ 成功生成 ${embeddings.length} 个 embeddings`);
  return embeddings;
}
