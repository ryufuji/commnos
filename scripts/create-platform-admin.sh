#!/bin/bash

# ============================================
# プラットフォーム管理者初期セットアップスクリプト
# ============================================

echo "🔐 Platform Admin Setup"
echo "======================="
echo ""

# 管理者情報入力
read -p "Email: " email
read -p "Name: " name
read -sp "Password: " password
echo ""

# APIエンドポイント
API_URL="http://localhost:3000/api/platform/auth/register"

# 登録リクエスト
response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$password\",\"name\":\"$name\"}")

echo ""
echo "Response: $response"

# 結果確認
if echo "$response" | grep -q '"success":true'; then
  echo ""
  echo "✅ Platform admin created successfully!"
  echo ""
  echo "Login credentials:"
  echo "  Email: $email"
  echo "  Name: $name"
  echo ""
  echo "Access the admin portal at:"
  echo "  http://localhost:3000/va-admin-portal/login"
else
  echo ""
  echo "❌ Failed to create admin"
  echo "This might mean an admin already exists."
fi
