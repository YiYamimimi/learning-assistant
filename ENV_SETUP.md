# 环境配置说明

## 前端环境变量 (Vite)

前端使用 Vite 的环境变量系统，环境变量必须以 `VITE_` 开头才能在客户端代码中访问。

### 环境文件

- `.env.development` - 开发环境（运行 `pnpm dev` 时使用）
- `.env.production` - 生产环境（运行 `pnpm build` 时使用）
- `.env.example` - 环境变量模板（提交到 Git）

### 配置示例

**开发环境** (`.env.development`):

```env
VITE_API_URL=http://localhost:3000
```

**生产环境** (`.env.production`):

```env
VITE_API_URL=https://your-production-api.com
```

### 使用方式

```typescript
// 在组件中访问环境变量
const apiUrl = import.meta.env.VITE_API_URL;
```

## 后端环境变量 (Next.js)

后端使用 Next.js 的环境变量系统。

### 环境文件

- `.env.local` - 本地开发环境（不提交到 Git）
- `.env.development` - 开发环境
- `.env.production` - 生产环境
- `.env.example` - 环境变量模板（提交到 Git）

### 配置示例

**本地开发** (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 使用方式

```typescript
// 在服务端代码中访问
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const openaiKey = process.env.OPENAI_API_KEY;

// 在客户端代码中访问（需要 NEXT_PUBLIC_ 前缀）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

## 环境切换说明

### 开发环境

```bash
# 启动所有应用（使用 .env.development）
pnpm dev

# 单独启动前端
pnpm dev:frontend

# 单独启动后端
pnpm dev:backend
```

### 生产构建

```bash
# 构建所有应用（使用 .env.production）
pnpm build

# 单独构建前端
pnpm build:frontend

# 单独构建后端
pnpm build:backend
```

### 预览生产构建

```bash
# 预览前端构建
pnpm preview

# 启动后端生产服务器
pnpm start
```

## 环境变量优先级

### 前端 (Vite)

1. `.env.local` (最高优先级)
2. `.env.development` / `.env.production` (根据 NODE_ENV)
3. `.env`

### 后端 (Next.js)

1. `.env.local` (最高优先级，不提交到 Git)
2. `.env.development` / `.env.production` (根据 NODE_ENV)
3. `.env`

## 注意事项

1. **前端环境变量**: 必须以 `VITE_` 开头才能在客户端代码中访问
2. **后端环境变量**:
   - 服务端代码可以访问所有环境变量
   - 客户端代码只能访问以 `NEXT_PUBLIC_` 开头的变量
3. **敏感信息**: 永远不要将 `.env.local` 提交到 Git
4. **模板文件**: `.env.example` 应该提交到 Git，供其他开发者参考

## 常见问题

### Q: 如何区分开发环境和生产环境？

**前端**:

```typescript
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```

**后端**:

```typescript
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
```

### Q: 为什么前端需要调用后端 API？

Chrome 扩展运行在浏览器环境中，需要通过 HTTP 请求与后端 API 通信。前端配置的 `VITE_API_URL` 指定了后端 API 的地址。

### Q: 如何配置不同的 API 地址？

根据环境修改对应的环境文件：

- 开发环境使用本地后端: `http://localhost:3000`
- 生产环境使用部署的后端: `https://your-api.com`
