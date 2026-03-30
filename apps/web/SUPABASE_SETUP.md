# Supabase 配置指南

本指南将帮助你完成 Supabase 的配置，以启用用户使用情况追踪功能。

## 目录

- [1. 创建 Supabase 项目](#1-创建-supabase-项目)
- [2. 获取环境变量](#2-获取环境变量)
- [3. 配置环境变量](#3-配置环境变量)
- [4. 设置数据库表](#4-设置数据库表)
- [5. 验证配置](#5-验证配置)
- [6. 常见问题](#6-常见问题)

## 功能说明

配置完成后，系统会自动：

1. **用户识别**：基于 Token + IP 的双重标识
2. **使用次数限制**：每个用户最多使用 2 次
3. **次数累加**：每次使用后自动累加使用次数
4. **Cookie 管理**：自动管理用户 Cookie
5. **UI 反馈**：显示使用次数和限制信息
6. **隐私保护**：IP 地址经过 SHA256 哈希处理

### 使用次数逻辑

- **第 1 次使用**：正常使用，显示"已使用 1/2 次"
- **第 2 次使用**：正常使用，显示"已使用 2/2 次"
- **第 3 次尝试**：显示"已超出使用次数，请登录"，功能被禁用

### 数据记录

每次使用会更新 `rate_limits` 表中的记录：

| 字段          | 值                                   | 说明               |
| ------------- | ------------------------------------ | ------------------ |
| `key`         | `'guest-analysis'`                   | 固定的使用限制键值 |
| `identifier`  | `uuid-string` 或 `ip:hash-string`    | 用户标识符         |
| `usage_count` | `1`, `2`, `3`, ...                   | 使用次数（累加）   |
| `timestamp`   | `'2026-03-29T04:56:36.201+00:00'`    | 最后使用时间       |
| `created_at`  | `'2026-03-29T04:56:36.836911+00:00'` | 记录创建时间       |
| `updated_at`  | `'2026-03-29T05:00:00.000+00:00'`    | 记录更新时间       |

## 1. 创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com)
2. 点击 "Start your project" 或 "Sign in" 登录
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - **Name**: 输入项目名称（如：learning-assistant）
   - **Database Password**: 设置强密码并保存
   - **Region**: 选择离你最近的区域
   - **Pricing Plan**: 选择 Free 计划（免费）
5. 点击 "Create new project" 等待项目创建完成（通常需要 1-2 分钟）

## 2. 获取环境变量

### 获取 Project URL

1. 进入项目 Dashboard
2. 左侧菜单点击 **Settings** → **API**
3. 在 "Project API keys" 部分找到 **Project URL**
4. 复制该 URL（格式：`https://xxxxxxxxxxxxx.supabase.co`）

### 获取 Anon Key

1. 在同一页面找到 **anon public** key
2. 复制该密钥（格式：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`）

⚠️ **重要安全提示**：

- `anon public` key 是安全的，可以在前端使用
- 不要分享 `service_role` key，它具有完全访问权限

## 3. 配置环境变量

### 方法一：使用 .env.local 文件（推荐用于开发）

1. 打开 `apps/web/.env.local` 文件
2. 替换以下内容：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. 保存文件
4. 重启开发服务器：`pnpm dev`

### 方法二：使用 Vercel 环境变量（推荐用于生产）

1. 进入 Vercel 项目设置
2. 点击 **Settings** → **Environment Variables**
3. 添加以下变量：
   - `NEXT_PUBLIC_SUPABASE_URL`: 你的 Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 你的 Supabase Anon Key
4. 点击保存并重新部署项目

## 4. 设置数据库表

### 方法一：全新安装（推荐）

1. 进入 Supabase Dashboard
2. 左侧菜单点击 **SQL Editor**
3. 点击 "New query"
4. 复制 `supabase/setup.sql` 文件中的 SQL 脚本
5. 粘贴到编辑器中
6. 点击 "Run" 执行脚本

### 方法二：从旧版本迁移

如果你之前已经设置过数据库，需要执行迁移脚本：

1. 进入 Supabase Dashboard
2. 左侧菜单点击 **SQL Editor**
3. 点击 "New query"
4. 复制 `supabase/migration.sql` 文件中的 SQL 脚本
5. 粘贴到编辑器中
6. 点击 "Run" 执行脚本

### 方法三：添加更新策略（重要）

如果你发现 `usage_count` 没有更新，说明缺少更新策略。执行以下步骤：

1. 进入 Supabase Dashboard
2. 左侧菜单点击 **SQL Editor**
3. 点击 "New query"
4. 复制 `supabase/add-update-policy.sql` 文件中的 SQL 脚本
5. 粘贴到编辑器中
6. 点击 "Run" 执行脚本

或者直接执行以下 SQL：

```sql
-- 允许匿名用户更新记录
CREATE POLICY IF NOT EXISTS "Allow anonymous update" ON rate_limits
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

迁移脚本会：

- ✅ 添加 `usage_count` 字段
- ✅ 添加 `updated_at` 字段
- ✅ 初始化现有记录的使用次数
- ✅ 创建唯一约束
- ✅ 清理重复记录
- ✅ 创建自动更新触发器
- ✅ 添加更新策略（解决 usage_count 不更新的问题）

## 5. 验证配置

### 测试数据库连接

1. 启动开发服务器：`pnpm dev`
2. 访问 http://localhost:3000
3. 打开浏览器开发者工具（F12）
4. 点击 "立即体验" 或上传视频
5. 检查 Console 是否有错误信息

### 检查数据库记录

1. 进入 Supabase Dashboard
2. 点击 **Table Editor** → **rate_limits**
3. 查看是否有新记录生成
4. 检查记录的 `key`、`identifier`、`timestamp` 字段

### 测试使用限制

1. 清空浏览器 Cookie 或使用无痕模式
2. 上传视频或点击"立即体验"
3. 再次尝试，应该显示"免费使用次数已用完"
4. 检查数据库是否有多条记录

## 6. 常见问题

### Q1: 连接 Supabase 时出现 "Invalid API key" 错误

**解决方案**：

- 检查 `.env.local` 文件中的环境变量是否正确
- 确认复制的是 `anon public` key，而不是 `service_role` key
- 重启开发服务器

### Q2: 数据库表创建失败

**解决方案**：

- 确保你有 Supabase 项目的管理员权限
- 检查 SQL 脚本语法是否正确
- 尝试在 Supabase SQL Editor 中手动执行

### Q3: 使用限制不生效

**解决方案**：

- 检查浏览器 Cookie 是否正确设置
- 在 Supabase Table Editor 中查看 `rate_limits` 表是否有记录
- 检查 API 路由 `/api/record-usage` 是否正常工作

### Q4: 如何清理旧数据？

**解决方案**：
在 Supabase SQL Editor 中执行：

```sql
DELETE FROM rate_limits
WHERE created_at < NOW() - INTERVAL '30 days';
```

或者创建定时任务自动清理：

```sql
-- 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 设置每天执行一次（需要 Supabase Pro 计划）
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 2 * * *',
  'SELECT cleanup_old_rate_limits()'
);
```

### Q5: 如何修改使用限制次数？

当前实现是每个用户最多使用 2 次，次数会自动累加。如需修改限制次数，可以编辑 `apps/web/src/lib/guest-usage.ts`：

```typescript
// 修改最大使用次数
const MAX_USAGE_COUNT = 2; // 改为你想要的次数
```

### Q6: 如何查看用户使用情况？

在 Supabase Dashboard 中：

```sql
-- 查看所有使用记录
SELECT * FROM rate_limits
WHERE key = 'guest-analysis'
ORDER BY created_at DESC;

-- 查看某个用户的使用次数
SELECT identifier, usage_count, created_at, updated_at
FROM rate_limits
WHERE key = 'guest-analysis'
ORDER BY usage_count DESC;

-- 统计总使用次数
SELECT SUM(usage_count) as total_usage
FROM rate_limits
WHERE key = 'guest-analysis';
```

## 安全建议

1. **环境变量安全**：
   - 不要将 `.env.local` 提交到版本控制
   - 在 `.gitignore` 中添加 `.env.local`

2. **数据库安全**：
   - 启用 Row Level Security (RLS)
   - 定期清理旧数据
   - 监控异常使用情况

3. **API 安全**：
   - 使用 HTTPS
   - 限制 API 调用频率
   - 实施适当的错误处理

## 下一步

配置完成后，你可以：

- 测试用户使用限制功能
- 添加更多使用统计功能
- 集成用户认证系统
- 实现付费功能

## 技术支持

如遇到问题，请检查：

1. Supabase Dashboard 中的日志
2. 浏览器开发者工具的 Console
3. 服务器端的错误日志

## 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Next.js 环境变量](https://nextjs.org/docs/basic-features/environment-variables)
- [项目中的 guest-usage.ts](../src/lib/guest-usage.ts)
