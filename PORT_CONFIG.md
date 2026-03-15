# 端口配置说明

## 应用端口分配

| 应用           | 开发端口 | 生产端口 | 说明             |
| -------------- | -------- | -------- | ---------------- |
| 后端 (Next.js) | 3000     | 3000     | Next.js 默认端口 |
| 前端 (Vite)    | 5173     | 4173     | Vite 默认端口    |

## 端口配置位置

### 后端端口配置

**文件**: [apps/backend/package.json](file:///d:/practice/longcut_my/apps/backend/package.json#L6-L8)

```json
{
  "scripts": {
    "dev": "next dev --turbo --port 3000",
    "start": "next start --port 3000"
  }
}
```

### 前端端口配置

**文件**: [apps/frontend/package.json](file:///d:/practice/longcut_my/apps/frontend/package.json#L6-L8)

```json
{
  "scripts": {
    "dev": "vite --port 5173",
    "preview": "vite preview --port 4173"
  }
}
```

## 如何知道后端运行在 3000 端口？

### 1. 查看配置文件

检查 [apps/backend/package.json](file:///d:/practice/longcut_my/apps/backend/package.json#L6) 中的 `dev` 脚本：

```bash
"dev": "next dev --turbo --port 3000"
```

这里明确指定了 `--port 3000`。

### 2. 启动时查看终端输出

运行后端时，终端会显示：

```
▲ Next.js 15.1.3
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

### 3. Next.js 默认端口

即使没有指定 `--port` 参数，Next.js 默认也会使用 **3000** 端口。

## 前端如何连接后端

前端通过环境变量配置后端 API 地址：

**开发环境** ([apps/frontend/.env.development](file:///d:/practice/longcut_my/apps/frontend/.env.development)):

```env
VITE_API_URL=http://localhost:3000
```

**生产环境** ([apps/frontend/.env.production](file:///d:/practice/longcut_my/apps/frontend/.env.production)):

```env
VITE_API_URL=https://your-production-api.com
```

## 端口占用问题

如果端口被占用，可以：

### 方法 1: 修改端口配置

在 [package.json](file:///d:/practice/longcut_my/apps/backend/package.json) 中修改端口号：

```json
"dev": "next dev --turbo --port 3001"
```

同时更新前端的环境变量：

```env
VITE_API_URL=http://localhost:3001
```

### 方法 2: 使用环境变量

创建 `.env.local` 文件：

```env
PORT=3001
```

### 方法 3: 命令行指定

```bash
pnpm --filter backend dev --port 3001
```

## 查看端口占用情况

### Windows (PowerShell)

```powershell
# 查看端口 3000 的进程
netstat -ano | findstr :3000

# 查看端口 5173 的进程
netstat -ano | findstr :5173
```

### Windows (CMD)

```cmd
# 查看端口 3000 的进程
netstat -ano | findstr :3000

# 查看端口 5173 的进程
netstat -ano | findstr :5173
```

### 终止占用端口的进程

```powershell
# 先找到进程 ID (PID)
netstat -ano | findstr :3000

# 终止进程（替换 <PID> 为实际的进程 ID）
taskkill /PID <PID> /F
```

## 启动顺序

由于前端需要调用后端 API，建议按以下顺序启动：

```bash
# 1. 先启动后端
pnpm dev:backend

# 2. 再启动前端（新终端）
pnpm dev:frontend
```

或者同时启动（推荐）：

```bash
pnpm dev
```

## 常见问题

### Q: 为什么前端需要知道后端端口？

Chrome 扩展运行在浏览器环境中，需要通过 HTTP 请求与后端 API 通信。前端配置的 `VITE_API_URL` 指定了后端 API 的完整地址（包括端口）。

### Q: 可以修改端口吗？

可以！修改 [package.json](file:///d:/practice/longcut_my/apps/backend/package.json) 中的 `--port` 参数，并同步更新前端的环境变量。

### Q: 生产环境也需要端口吗？

生产环境通常使用域名（如 `https://api.example.com`），不需要指定端口（默认使用 HTTPS 的 443 端口）。如果使用非标准端口，需要在域名后加上端口号。

### Q: 如何验证后端是否正常运行？

访问 `http://localhost:3000`，应该能看到后端首页。或者测试 API：

```bash
curl http://localhost:3000/api/items
```
