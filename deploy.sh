#!/bin/bash

set -e

PROJECT_DIR="/var/www/learning-assistant"
LOG_DIR="$PROJECT_DIR/logs"

echo "========================================="
echo "部署 Learning Assistant Web 应用"
echo "========================================="

if [ ! -d "$LOG_DIR" ]; then
    echo "创建日志目录..."
    mkdir -p "$LOG_DIR"
fi

echo "拉取最新代码..."
cd "$PROJECT_DIR"
git pull origin main

echo "安装依赖..."
pnpm install --frozen-lockfile

echo "构建项目..."
pnpm build:web

echo "重启 PM2 服务..."
pm2 restart learning-assistant-web || pm2 start ecosystem.config.js

echo "保存 PM2 配置..."
pm2 save

echo "========================================="
echo "部署完成！"
echo "========================================="
pm2 status
