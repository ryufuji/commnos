#!/bin/bash

# ============================================
# エッジケース・エラーハンドリングテスト
# ============================================

set -e

API_BASE="http://localhost:3000"
HOST="test-integration.commons.com"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${YELLOW}ℹ INFO${NC}: $1"; }

echo "=========================================="
echo "エッジケース・エラーハンドリングテスト"
echo "=========================================="
echo ""

# 既存のトークンを取得
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-owner@example.com","password":"TestPass123"}' | jq -r '.token')

# ============================================
# Test 1: バリデーションエラー
# ============================================
echo "Test 1: バリデーションエラー"
echo ""

# 1-1: 短いパスワードで登録
info "1-1: 短いパスワードで登録（7文字）"
SHORT_PASS=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"short@example.com","password":"short12","subdomain":"short-test","communityName":"Test"}')

if echo "$SHORT_PASS" | jq -e '.success == false' > /dev/null; then
    pass "短いパスワードが正しく拒否された"
else
    fail "短いパスワードで登録できてしまった"
fi

# 1-2: 無効なサブドメイン形式
info "1-2: 無効なサブドメイン形式（大文字を含む）"
INVALID_SUBDOMAIN=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"TestPass123","subdomain":"Test-Invalid","communityName":"Test"}')

if echo "$INVALID_SUBDOMAIN" | jq -e '.success == false' > /dev/null; then
    pass "無効なサブドメインが正しく拒否された"
else
    fail "無効なサブドメインで登録できてしまった"
fi

# 1-3: 重複サブドメイン
info "1-3: 重複サブドメイン"
DUPLICATE_SUBDOMAIN=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test3@example.com","password":"TestPass123","subdomain":"test-integration","communityName":"Test"}')

if echo "$DUPLICATE_SUBDOMAIN" | jq -e '.success == false and (.error | contains("already exists"))' > /dev/null; then
    pass "重複サブドメインが正しく拒否された"
else
    fail "重複サブドメインで登録できてしまった"
fi

# 1-4: 長すぎるニックネーム（51文字）
info "1-4: 長すぎるニックネーム"
LONG_NICKNAME=$(curl -s -X PUT "$API_BASE/api/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"'$(printf 'a%.0s' {1..51})'"}')

if echo "$LONG_NICKNAME" | jq -e '.success == false' > /dev/null; then
    pass "長すぎるニックネームが正しく拒否された"
else
    fail "長すぎるニックネームが受け入れられてしまった"
fi

# 1-5: 空のコメント
info "1-5: 空のコメント"
EMPTY_COMMENT=$(curl -s -X POST "$API_BASE/api/posts/7/comments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{"content":""}')

if echo "$EMPTY_COMMENT" | jq -e '.success == false' > /dev/null; then
    pass "空のコメントが正しく拒否された"
else
    fail "空のコメントが受け入れられてしまった"
fi

echo ""

# ============================================
# Test 2: 存在しないリソース
# ============================================
echo "Test 2: 存在しないリソース"
echo ""

# 2-1: 存在しない投稿を取得
info "2-1: 存在しない投稿を取得"
NOT_FOUND_POST=$(curl -s -X GET "$API_BASE/api/posts/99999" \
  -H "Host: $HOST")

if echo "$NOT_FOUND_POST" | jq -e '.success == false' > /dev/null; then
    pass "存在しない投稿で404エラー"
else
    fail "存在しない投稿が見つかってしまった"
fi

# 2-2: 存在しない会員を承認
info "2-2: 存在しない会員を承認"
NOT_FOUND_MEMBER=$(curl -s -X POST "$API_BASE/api/admin/members/99999/approve" \
  -H "Authorization: Bearer $TOKEN")

if echo "$NOT_FOUND_MEMBER" | jq -e '.success == false' > /dev/null; then
    pass "存在しない会員で404エラー"
else
    fail "存在しない会員が承認されてしまった"
fi

echo ""

# ============================================
# Test 3: トークン関連
# ============================================
echo "Test 3: トークン関連"
echo ""

# 3-1: 無効なトークン
info "3-1: 無効なトークン"
INVALID_TOKEN=$(curl -s -X GET "$API_BASE/api/profile" \
  -H "Authorization: Bearer invalid-token-12345")

if echo "$INVALID_TOKEN" | jq -e '.success == false' > /dev/null; then
    pass "無効なトークンが正しく拒否された"
else
    fail "無効なトークンで認証されてしまった"
fi

# 3-2: トークンなし
info "3-2: トークンなしでprotectedエンドポイントにアクセス"
NO_TOKEN=$(curl -s -X GET "$API_BASE/api/profile")

if echo "$NO_TOKEN" | jq -e '.success == false' > /dev/null; then
    pass "トークンなしアクセスが正しく拒否された"
else
    fail "トークンなしでアクセスできてしまった"
fi

echo ""

# ============================================
# Test 4: テナント分離
# ============================================
echo "Test 4: テナント分離"
echo ""

# 4-1: 異なるテナントの投稿にアクセス
info "4-1: 異なるテナントの投稿にアクセス（クロステナントアクセス防止）"
# new-community テナントの投稿に test-integration からアクセス
CROSS_TENANT=$(curl -s -X GET "$API_BASE/api/posts/6" \
  -H "Host: $HOST")

if echo "$CROSS_TENANT" | jq -e '.success == false' > /dev/null; then
    pass "クロステナントアクセスが正しく拒否された"
else
    fail "別テナントの投稿にアクセスできてしまった"
fi

echo ""

# ============================================
# テスト結果サマリー
# ============================================
echo "=========================================="
echo "エッジケーステスト結果"
echo "=========================================="
echo ""
echo -e "${GREEN}すべてのエッジケーステストに合格しました！${NC}"
echo ""
echo "テスト対象:"
echo "  ✓ バリデーションエラー（パスワード、サブドメイン、ニックネーム等）"
echo "  ✓ 存在しないリソース（404エラー）"
echo "  ✓ トークン関連（無効、なし）"
echo "  ✓ テナント分離（クロステナントアクセス防止）"
echo ""
echo "=========================================="
