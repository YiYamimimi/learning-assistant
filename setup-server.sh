#!/bin/bash

set -e

echo "========================================="
echo "服务器初始化脚本"
echo "========================================="

echo "更新系统包..."
apt update && apt upgrade -y

echo "安装必要工具..."
apt install -y curl git build-essential

echo "安装 Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "安装 pnpm..."
npm install -g pnpm@9.15.0

echo "安装 PM2..."
npm install -g pm2

echo "安装 Nginx..."
apt install -y nginx

echo "安装 Certbot (用于 SSL 证书)..."
apt install -y certbot python3-certbot-nginx

echo "创建项目目录..."
mkdir -p /var/www/learning-assistant
mkdir -p /var/www/learning-assistant/logs

echo "设置目录权限..."
chown -R $USER:$USER /var/www/learning-assistant

echo "========================================="
echo "初始化完成！"
echo "========================================="
echo ""
echo "接下来请执行："
echo "1. 上传项目代码到 /var/www/learning-assistant"
echo "2. 配置环境变量 (创建 .env.local 文件)"
echo "3. 运行部署脚本: bash deploy.sh"
echo "4. 配置 Nginx: sudo cp nginx.conf /etc/nginx/sites-available/learning-assistant"
echo "5. 启用站点: sudo ln -s /etc/nginx/sites-available/learning-assistant /etc/nginx/sites-enabled/"
echo "6. 测试 Nginx 配置: sudo nginx -t"
echo "7. 重启 Nginx: sudo systemctl restart nginx"
echo "8. 配置 SSL: sudo certbot --nginx -d your-domain.com"
echo "========================================="
