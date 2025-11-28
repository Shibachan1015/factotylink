#!/bin/bash
# Supabaseデータベーススキーマ適用スクリプト

echo "Supabaseデータベーススキーマを適用します"
echo ""

# 環境変数の確認
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "エラー: 環境変数が設定されていません"
  echo "SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください"
  exit 1
fi

# Supabase CLIがインストールされているか確認
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLIがインストールされていません"
  echo "インストール方法: https://supabase.com/docs/guides/cli"
  echo ""
  echo "または、Supabase DashboardのSQL Editorで以下のSQLを実行してください:"
  echo ""
  cat src/utils/database-schema.sql
  echo ""
  cat src/utils/rls-policies.sql
  exit 1
fi

# Supabaseプロジェクトに接続
echo "Supabaseプロジェクトに接続中..."
supabase link --project-ref $(echo $SUPABASE_URL | sed 's/.*\/\/\([^.]*\).*/\1/')

# スキーマを適用
echo "スキーマを適用中..."
supabase db push

echo ""
echo "✓ スキーマの適用が完了しました"

