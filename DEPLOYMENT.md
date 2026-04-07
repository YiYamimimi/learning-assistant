# 云服务器部署指南

本指南将帮助你将 Learning Assistant Web 应用部署到云服务器，并通过 Nginx 配置域名访问。

## 目录

- [服务器要求](#服务器要求)
- [部署步骤](#部署步骤)
- [Nginx 配置](#nginx-配置)
- [SSL 证书配置](#ssl-证书配置)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

## 服务器要求

- **操作系统**: Ubuntu 20.04+ 或 CentOS 7+
- **内存**: 至少 2GB RAM
- **存储**: 至少 20GB 可用空间
- **Node.js**: 18.x 或更高版本
- **包管理器**: pnpm 9.x

## 部署步骤

### 1. 服务器初始化

连接到你的云服务器后，运行初始化脚本：

```bash
# 上传项目代码到服务器
scp -r ./* user@your-server-ip:/var/www/learning-assistant/

# 连接到服务器
ssh user@your-server-ip

# 进入项目目录
cd /var/www/learning-assistant

# 给脚本执行权限
chmod +x setup-server.sh deploy.sh

# 运行初始化脚本
sudo bash setup-server.sh
```

### 2. 配置环境变量

在服务器上创建环境变量文件：

```bash
cd /var/www/learning-assistant/apps/web

# 创建 .env.local 文件
nano .env.local
```

添加以下内容：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=your-openai-api-key
```

保存并退出（Ctrl+O, Enter, Ctrl+X）。

### 3. 首次部署

```bash
cd /var/www/learning-assistant

# 安装依赖
pnpm install --frozen-lockfile

# 构建项目
pnpm build:web

# 使用 PM2 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置 PM2 开机自启
pm2 startup
```

### 4. 配置 Nginx

```bash
# 复制 Nginx 配置文件
sudo cp /var/www/learning-assistant/nginx.conf /etc/nginx/sites-available/learning-assistant

# 启用站点
sudo ln -s /etc/nginx/sites-available/learning-assistant /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm /etc/nginx/sites-enabled/default

# 修改配置文件中的域名
sudo nano /etc/nginx/sites-available/learning-assistant
# 将 your-domain.com 替换为你的实际域名

# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 5. 配置域名解析

在你的域名服务商控制台：

1. 添加 A 记录
   - 主机记录: `@` 或 `www`
   - 记录类型: A
   - 记录值: 你的服务器 IP 地址

2. 等待 DNS 解析生效（通常需要几分钟到几小时）

### 6. 配置 SSL 证书

使用 Certbot 自动配置 HTTPS：

```bash
# 安装 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，添加 SSL 相关设置。

## Nginx 配置说明

项目提供的 `nginx.conf` 文件包含以下优化：

### 静态资源缓存

- `/_next/static/` - 缓存 1 年，适合版本化的静态资源
- `/uploads/` - 缓存 30 天，适合用户上传的文件

### Gzip 压缩

自动压缩文本、CSS、JavaScript、JSON 等文件，减少传输大小。

### 反向代理

- `/api/` - API 请求代理到 Node.js 应用
- `/` - 其他请求代理到 Next.js 应用

### 文件上传限制

`client_max_body_size 500M` - 允许上传最大 500MB 的文件

## 常用命令

### PM2 相关

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs learning-assistant-web

# 重启应用
pm2 restart learning-assistant-web

# 停止应用
pm2 stop learning-assistant-web

# 监控
pm2 monit
```

### Nginx 相关

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/learning-assistant-error.log
```

### 部署相关

```bash
# 日常更新部署
cd /var/www/learning-assistant
bash deploy.sh
```

## 自动化部署（可选）

### 使用 Git Hooks 自动部署

在服务器上设置 Git Hook：

```bash
# 在服务器上创建裸仓库
mkdir -p /var/git/learning-assistant.git
cd /var/git/learning-assistant.git
git init --bare

# 创建 post-receive hook
nano hooks/post-receive
```

添加以下内容：

```bash
#!/bin/bash
git --work-tree=/var/www/learning-assistant --git-dir=/var/git/learning-assistant.git checkout -f
cd /var/www/learning-assistant
bash deploy.sh
```

给脚本执行权限：

```bash
chmod +x hooks/post-receive
```

在本地添加远程仓库：

```bash
git remote add deploy user@your-server-ip:/var/git/learning-assistant.git
git push deploy main
```

### 使用 GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/learning-assistant
            git pull origin main
            bash deploy.sh
```

## 故障排查

### 1. 应用无法启动

检查日志：

```bash
pm2 logs learning-assistant-web
```

常见问题：

- 环境变量未配置
- 端口被占用
- 依赖未安装

### 2. Nginx 502 错误

检查 Node.js 应用是否运行：

```bash
pm2 status
```

检查端口是否监听：

```bash
netstat -tulpn | grep 3000
```

### 3. 文件上传失败

检查 Nginx 配置中的 `client_max_body_size`

检查上传目录权限：

```bash
ls -la /var/www/learning-assistant/apps/web/uploads
```

### 4. SSL 证书问题

续期证书：

```bash
sudo certbot renew
```

### 5. 内存不足

检查内存使用：

```bash
free -h
```

增加交换空间：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 性能优化建议

### 1. 启用 HTTP/2

Nginx 配置中添加：

```nginx
listen 443 ssl http2;
```

### 2. 启用缓存

添加 Redis 缓存：

```bash
apt install redis-server
```

### 3. 数据库优化

- 定期清理旧数据
- 添加数据库索引
- 使用连接池

### 4. CDN 加速

将静态资源上传到 CDN：

- 阿里云 OSS + CDN
- 腾讯云 COS + CDN
- Cloudflare

## 安全建议

1. **防火墙配置**

```bash
# 只开放必要端口
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **定期更新**

```bash
# 定期更新系统
sudo apt update && sudo apt upgrade -y
```

3. **备份数据**

```bash
# 备份上传的文件
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/learning-assistant/apps/web/uploads
```

4. **监控日志**

```bash
# 查看访问日志
sudo tail -f /var/log/nginx/learning-assistant-access.log

# 查看错误日志
sudo tail -f /var/log/nginx/learning-assistant-error.log
```

## 相关文档

- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Certbot 文档](https://certbot.eff.org/docs/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
