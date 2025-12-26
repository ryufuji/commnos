#!/bin/bash

# ============================================
# Commons Platform - 統合テストスクリプト
# Week 1-8 の全機能をテスト
# ============================================

set -e  # エラー時に停止

API_BASE="http://localhost:3000"
HOST="test-integration.commons.com"

echo "=========================================="
echo "Commons Platform - 統合テスト"
echo "=========================================="
echo ""

# カラー出力
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    exit 1
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# ============================================
# Test 1: 認証フロー
# ============================================
echo "=========================================="
echo "Test 1: 認証フロー"
echo "=========================================="
echo ""

# 1-1: テナント作成（登録）
info "1-1: テナント作成"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-owner@example.com",
    "password":"TestPass123",
    "subdomain":"test-integration",
    "communityName":"統合テストコミュニティ",
    "subtitle":"テスト用",
    "theme":"modern-business"
  }')

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    pass "テナント作成成功"
else
    fail "テナント作成失敗: $(echo $REGISTER_RESPONSE | jq -r '.error')"
fi

# 1-2: ログイン
info "1-2: ログイン"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-owner@example.com",
    "password":"TestPass123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    pass "ログイン成功"
else
    fail "ログイン失敗"
fi

# 1-3: 無効なパスワードでログイン（失敗するべき）
info "1-3: 無効なパスワードでログイン（失敗テスト）"
INVALID_LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-owner@example.com",
    "password":"WrongPassword"
  }')

if echo "$INVALID_LOGIN" | jq -e '.success == false' > /dev/null; then
    pass "無効なパスワードで正しく失敗"
else
    fail "無効なパスワードで失敗しなかった"
fi

echo ""

# ============================================
# Test 2: プロフィール管理
# ============================================
echo "=========================================="
echo "Test 2: プロフィール管理"
echo "=========================================="
echo ""

# 2-1: プロフィール取得
info "2-1: プロフィール取得"
PROFILE_GET=$(curl -s -X GET "$API_BASE/api/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROFILE_GET" | jq -e '.success == true' > /dev/null; then
    pass "プロフィール取得成功"
else
    fail "プロフィール取得失敗"
fi

# 2-2: プロフィール更新
info "2-2: プロフィール更新"
PROFILE_UPDATE=$(curl -s -X PUT "$API_BASE/api/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname":"テストオーナー",
    "bio":"これはテスト用の自己紹介です。"
  }')

if echo "$PROFILE_UPDATE" | jq -e '.success == true' > /dev/null; then
    pass "プロフィール更新成功"
else
    fail "プロフィール更新失敗"
fi

echo ""

# ============================================
# Test 3: 会員管理フロー
# ============================================
echo "=========================================="
echo "Test 3: 会員管理フロー"
echo "=========================================="
echo ""

# 3-1: 会員申請
info "3-1: 会員申請"
MEMBER_APPLY=$(curl -s -X POST "$API_BASE/api/members/apply" \
  -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-member@example.com",
    "password":"MemberPass123",
    "nickname":"テストメンバー"
  }')

if echo "$MEMBER_APPLY" | jq -e '.success == true' > /dev/null; then
    pass "会員申請成功"
else
    fail "会員申請失敗: $(echo $MEMBER_APPLY | jq -r '.error')"
fi

# 3-2: 承認待ちメンバー一覧取得
info "3-2: 承認待ちメンバー一覧取得"
PENDING_MEMBERS=$(curl -s -X GET "$API_BASE/api/admin/members/pending" \
  -H "Authorization: Bearer $TOKEN")

MEMBER_ID=$(echo "$PENDING_MEMBERS" | jq -r '.members[0].id')
if [ "$MEMBER_ID" != "null" ] && [ -n "$MEMBER_ID" ]; then
    pass "承認待ちメンバー取得成功 (ID: $MEMBER_ID)"
else
    fail "承認待ちメンバー取得失敗"
fi

# 3-3: 会員承認
info "3-3: 会員承認"
MEMBER_APPROVE=$(curl -s -X POST "$API_BASE/api/admin/members/$MEMBER_ID/approve" \
  -H "Authorization: Bearer $TOKEN")

if echo "$MEMBER_APPROVE" | jq -e '.success == true' > /dev/null; then
    MEMBER_NUMBER=$(echo "$MEMBER_APPROVE" | jq -r '.member.member_number')
    pass "会員承認成功 (会員番号: $MEMBER_NUMBER)"
else
    fail "会員承認失敗"
fi

# 3-4: 承認されたメンバーでログイン
info "3-4: 承認されたメンバーでログイン"
MEMBER_LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-member@example.com",
    "password":"MemberPass123"
  }')

MEMBER_TOKEN=$(echo "$MEMBER_LOGIN" | jq -r '.token')
if [ "$MEMBER_TOKEN" != "null" ] && [ -n "$MEMBER_TOKEN" ]; then
    pass "承認後のメンバーログイン成功"
else
    fail "承認後のメンバーログイン失敗"
fi

echo ""

# ============================================
# Test 4: 投稿・コメント機能
# ============================================
echo "=========================================="
echo "Test 4: 投稿・コメント機能"
echo "=========================================="
echo ""

# 4-1: 投稿作成（owner）
info "4-1: 投稿作成"
POST_CREATE=$(curl -s -X POST "$API_BASE/api/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"テスト投稿",
    "content":"# テストタイトル\n\nこれは**テスト**投稿です。\n\n- 項目1\n- 項目2",
    "status":"published"
  }')

POST_ID=$(echo "$POST_CREATE" | jq -r '.post.id')
if [ "$POST_ID" != "null" ] && [ -n "$POST_ID" ]; then
    pass "投稿作成成功 (ID: $POST_ID)"
else
    fail "投稿作成失敗"
fi

# 4-2: 投稿一覧取得
info "4-2: 投稿一覧取得"
POSTS_LIST=$(curl -s -X GET "$API_BASE/api/posts" \
  -H "Host: $HOST")

if echo "$POSTS_LIST" | jq -e '.success == true and (.posts | length) > 0' > /dev/null; then
    pass "投稿一覧取得成功"
else
    fail "投稿一覧取得失敗"
fi

# 4-3: 投稿詳細取得（HTML変換確認）
info "4-3: 投稿詳細取得"
POST_DETAIL=$(curl -s -X GET "$API_BASE/api/posts/$POST_ID" \
  -H "Host: $HOST")

if echo "$POST_DETAIL" | jq -e '.post.content_html' | grep -q "<h1>"; then
    pass "投稿詳細取得成功（Markdown→HTML変換確認）"
else
    fail "投稿詳細取得失敗またはHTML変換失敗"
fi

# 4-4: コメント投稿（member）
info "4-4: コメント投稿"
COMMENT_CREATE=$(curl -s -X POST "$API_BASE/api/posts/$POST_ID/comments" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{"content":"素晴らしい投稿です！"}')

COMMENT_ID=$(echo "$COMMENT_CREATE" | jq -r '.comment.id')
if [ "$COMMENT_ID" != "null" ] && [ -n "$COMMENT_ID" ]; then
    pass "コメント投稿成功 (ID: $COMMENT_ID)"
else
    fail "コメント投稿失敗"
fi

# 4-5: コメント一覧取得
info "4-5: コメント一覧取得"
COMMENTS_LIST=$(curl -s -X GET "$API_BASE/api/posts/$POST_ID/comments" \
  -H "Host: $HOST")

if echo "$COMMENTS_LIST" | jq -e '.success == true and (.comments | length) > 0' > /dev/null; then
    pass "コメント一覧取得成功"
else
    fail "コメント一覧取得失敗"
fi

echo ""

# ============================================
# Test 5: 権限チェック
# ============================================
echo "=========================================="
echo "Test 5: 権限チェック"
echo "=========================================="
echo ""

# 5-1: member が投稿作成（失敗するべき）
info "5-1: member が投稿作成（失敗テスト）"
MEMBER_POST=$(curl -s -X POST "$API_BASE/api/posts" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"メンバーの投稿",
    "content":"これは失敗するはず",
    "status":"published"
  }')

if echo "$MEMBER_POST" | jq -e '.success == false' > /dev/null; then
    pass "member の投稿作成が正しく拒否された"
else
    fail "member が投稿作成できてしまった"
fi

# 5-2: 未認証で管理者APIにアクセス（失敗するべき）
info "5-2: 未認証で管理者APIアクセス（失敗テスト）"
UNAUTH_ADMIN=$(curl -s -X GET "$API_BASE/api/admin/members/pending")

if echo "$UNAUTH_ADMIN" | jq -e '.success == false' > /dev/null; then
    pass "未認証アクセスが正しく拒否された"
else
    fail "未認証でアクセスできてしまった"
fi

echo ""

# ============================================
# テスト結果サマリー
# ============================================
echo "=========================================="
echo "テスト結果サマリー"
echo "=========================================="
echo ""
echo -e "${GREEN}すべてのテストに合格しました！${NC}"
echo ""
echo "テスト対象:"
echo "  ✓ 認証フロー（登録、ログイン、エラー処理）"
echo "  ✓ プロフィール管理（取得、更新）"
echo "  ✓ 会員管理（申請、承認、ログイン）"
echo "  ✓ 投稿機能（作成、一覧、詳細、Markdown変換）"
echo "  ✓ コメント機能（投稿、一覧）"
echo "  ✓ 権限チェック（役割制限、認証チェック）"
echo ""
echo "=========================================="
echo "統合テスト完了"
echo "=========================================="
