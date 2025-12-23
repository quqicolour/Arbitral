#!/bin/bash
# venv.sh - 批量覆盖更新 Vercel 环境变量（去掉多余换行、空格）

while IFS='=' read -r key value; do
  # 跳过空行或注释
  [[ -z "$key" ]] && continue
  [[ "$key" =~ ^# ]] && continue

  # 去掉回车、换行和两端空格
  key=$(echo "$key" | tr -d '\r\n' | xargs)
  value=$(echo "$value" | tr -d '\r\n' | xargs)

  echo "Updating $key=$value in production..."

  # 先删除已有变量（自动确认 y）
  vercel env rm "$key" production <<< "y"

  # 再添加新值
  vercel env add "$key" production <<< "$value"
done < .env

echo "✅ All production environment variables updated!"
