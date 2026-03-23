# 本地向量存储 RAG 聊天功能

## 功能概述

已移除 Supabase + PGVector，改用浏览器本地 IndexedDB 存储向量数据，实现基于字幕的 RAG 聊天功能。

## 架构说明

```
字幕数据 → 文本分块 → 生成 Embedding → 存储到 IndexedDB
                                                    ↓
用户提问 → 生成查询向量 → 本地相似度搜索 → 构建上下文 → OpenAI Chat API
```

## 核心文件

### 1. 向量存储服务

- **文件**: `apps/frontend/src/services/vectorStore.ts`
- **功能**:
  - 使用 IndexedDB 存储向量数据
  - 提供 `storeVectors()`、`getAllVectors()`、`clearVectors()` 方法

### 2. Embedding 服务

- **文件**: `apps/frontend/src/services/embedding.ts`
- **功能**:
  - 调用 OpenAI Embedding API 生成向量
  - 批量处理（每批 100 条）
  - 提供余弦相似度计算

### 3. RAG 查询服务

- **文件**: `apps/frontend/src/services/rag.ts`
- **功能**:
  - 字幕分块（目标长度 200 字符，重叠 50 字符）
  - 索引字幕到本地数据库
  - 查询相关字幕片段（Top 5，相似度阈值 0.7）

### 4. 聊天服务

- **文件**: `apps/frontend/src/services/chat.ts`
- **功能**:
  - RAG 查询 + 流式聊天
  - 构建包含时间戳引用的上下文
  - SSE 流式响应

### 5. AI 聊天组件

- **文件**: `apps/frontend/src/components/AIChat.tsx`
- **功能**:
  - 用户界面
  - 消息显示
  - 流式响应渲染

## 使用方法

### 1. 配置环境变量

在 `apps/frontend/.env.development` 中设置：

```env
VITE_API_URL=http://localhost:3000
VITE_OPENAI_API_KEY=your-actual-openai-api-key
```

### 2. 启动开发环境

```bash
# 启动前端
pnpm --filter frontend dev

# 启动后端（如果需要）
pnpm --filter backend dev
```

### 3. 使用流程

1. 打开视频页面
2. 扩展自动加载字幕
3. 字幕自动分块并生成向量（存储到 IndexedDB）
4. 切换到"AI 聊天"标签
5. 输入问题，AI 基于字幕内容回答

## 数据流详解

### 索引阶段

```
字幕数组 → createChunks() → 文本块数组
    ↓
generateEmbeddings() → 向量数组
    ↓
构建 VectorRecord[] → storeVectors() → IndexedDB
```

### 查询阶段

```
用户问题 → generateEmbeddings() → 查询向量
    ↓
getAllVectors() → 获取所有向量
    ↓
cosineSimilarity() → 计算相似度
    ↓
过滤 & 排序 → Top K 相关片段
    ↓
构建上下文 → OpenAI Chat API → 流式回答
```

## 技术细节

### IndexedDB 配置

- **数据库名**: `LearningAssistantDB`
- **版本**: 1
- **存储对象**: `subtitleVectors`
- **索引**: `embedding`（用于未来优化）

### Embedding 模型

- **模型**: `text-embedding-3-small`
- **维度**: 1536
- **成本**: 约 $0.02 / 1M tokens

### 相似度计算

- **算法**: 余弦相似度
- **阈值**: 0.7
- **返回数量**: Top 5

### 文本分块策略

- **目标长度**: 200 字符
- **重叠长度**: 50 字符
- **目的**: 保持上下文连续性

## 优势

1. **完全本地化**: 不依赖外部向量数据库
2. **隐私保护**: 数据存储在浏览器本地
3. **成本低**: 只需支付 OpenAI API 费用
4. **快速响应**: 本地相似度搜索
5. **离线可用**: 向量数据持久化存储

## 注意事项

1. **API Key 安全**: 不要将 API Key 提交到代码仓库
2. **IndexedDB 限制**: 浏览器存储空间有限（通常 50MB+）
3. **速率限制**: Embedding API 有速率限制，已添加延迟处理
4. **跨域问题**: 确保 OpenAI API 调用不被浏览器阻止

## 下一步优化

- [ ] 添加向量索引加速查询
- [ ] 支持多语言字幕
- [ ] 添加主题生成功能
- [ ] 支持视频跳转（点击时间戳）
- [ ] 添加对话历史持久化
