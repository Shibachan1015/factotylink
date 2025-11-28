# AGENT.md - BtoB受発注プラットフォーム + AI経営アドバイス

## プロジェクト概要

製造業向けBtoB受発注システム。得意先がオンラインで注文し、製造側が進捗管理から納品書発行までを一元管理。さらに原価計算・粗利分析・AIによる経営アドバイス機能を搭載した「製造業向けミニERP + AI CFO」。

### ビジョン
「製造業のスモールビジネスに、大企業並みの経営判断ツールを手頃な価格で」

### ターゲット
- 製造業のBtoB取引
- Shopify等のECで商品管理している事業者
- 経営数字を可視化したい小規模製造業
- 一般販売を視野に入れた汎用設計

---

## 技術スタック

### バックエンド
- ランタイム: Deno
- フレームワーク: Hono
- バリデーション: Zod
- デプロイ: Deno Deploy

### フロントエンド
- フレームワーク: React + Vite
- UIライブラリ: Shopify Polaris
- 状態管理: Zustand
- フォーム: React Hook Form + Zod
- デプロイ: Deno Deploy

### データベース
- Supabase (PostgreSQL)
- ORM: Supabase Client

### AI
- Claude API（経営アドバイス生成）

### 外部連携
- Shopify API（Phase 1）
- BASE API（Phase 3）
- STORES API（Phase 3）
- カラーミーショップ API（Phase 3）
- PDF生成: Puppeteer
- 通知: Slack / LINE連携

---

## ユーザー種別

### 1. 管理者（製造側）
- 全体管理権限
- 得意先の登録・管理
- 全注文の閲覧・ステータス管理
- 製造進捗管理
- 帳票発行（納品書・請求書・ラベル）
- 在庫管理（EC連携）
- 材料在庫管理
- 原価計算・粗利分析
- AI経営アドバイスの閲覧

### 2. 得意先（発注側）
- 自社専用アカウントでログイン
- 商品一覧・検索
- カート機能・注文確定
- 自社の注文履歴・ステータス確認

---

## 業務フロー

```
【得意先】
1. ログイン
2. 商品検索・閲覧
3. カートに追加
4. 注文確定
   ↓
【管理者】通知（Slack/LINE）
5. 注文確認
6. ステータス「製造中」に変更
   → 材料在庫から必要分を確認
   ↓
【得意先】ステータス更新を確認可能
   ↓
【管理者】
7. 製造完了 → ステータス「製造完了」
   → EC在庫 +（完成品が増える）
   → 原価が確定（材料費から自動計算）
8. 納品書・ラベル発行ボタンでPDF生成
9. 出荷 → ステータス「出荷済み」
   → EC在庫 -（出荷分を減らす）
   → 売上・粗利益が確定
   ↓
【得意先】ステータス「出荷済み」を確認
   ↓
【システム】
10. 日次/週次/月次でデータ集計
11. AIが経営アドバイスを生成
12. ダッシュボードに表示・通知
```

---

## 機能一覧

### Phase 1: MVP

#### 得意先ポータル
- [x] ログイン・ログアウト
- [x] 商品一覧表示
- [x] 商品検索（商品名、SKU、カテゴリ）
- [x] 商品詳細表示
- [x] カート機能（追加・削除・数量変更）
- [x] 注文確定
- [x] 注文履歴一覧
- [x] 注文詳細・ステータス確認

#### 管理者：受注管理
- [x] 注文一覧（全得意先）
- [x] 注文詳細表示
- [x] ステータス変更（新規→製造中→製造完了→出荷済み）
- [x] 検索・フィルター（得意先別、日付別、ステータス別）
- [x] 「製造完了」で在庫+
- [x] 「出荷済み」で在庫-

#### 管理者：帳票発行
- [x] 納品書PDF生成（HTML版）
- [x] 請求書PDF生成（HTML版）
- [x] ラベルPDF生成（A4用紙22面シール、HTML版）

#### 管理者：得意先管理
- [x] 得意先一覧
- [x] 得意先登録・編集・削除
- [x] 請求方式設定（都度 / 掛売）
- [x] ログインアカウント発行

#### 管理者：商品管理
- [x] 商品一覧表示
- [x] 商品登録・編集・削除
- [x] 商品検索

#### 管理者：在庫管理
- [x] 商品一覧表示
- [x] 在庫数表示
- [x] 在庫数の手動編集
- [ ] EC連携（Shopify API）

#### 管理者：材料在庫管理
- [x] 材料マスタ登録・編集・削除（無制限）
- [x] 入庫登録（手動）
- [x] 出庫登録（手動）
- [x] 現在在庫表示
- [x] 入出庫履歴一覧

#### 通知
- [x] 新規注文時 → Slack/LINE通知
- [x] ステータス変更時 → LINE通知

---

### Phase 2: 経営分析 + AI

#### 原価計算
- [ ] BOM（部品表）管理
- [ ] 商品ごとの材料構成定義
- [ ] 製造原価の自動計算
- [ ] 製造時の材料自動引き当て

#### 粗利分析
- [ ] 商品別粗利益・粗利率
- [ ] 得意先別粗利益・粗利率
- [ ] 期間別（日次/週次/月次）粗利推移

#### 経営ダッシュボード
- [ ] 売上サマリー（日次/週次/月次）
- [ ] 粗利益サマリー
- [ ] 在庫回転率
- [ ] 売掛金残高・滞留状況
- [ ] 得意先別売上ランキング
- [ ] 商品別売上ランキング
- [ ] グラフ・チャート表示

#### AI経営アドバイス
- [ ] Claude API連携
- [ ] 週次レポート自動生成
- [ ] 月次レポート自動生成
- [ ] 異常検知アラート
  - 粗利率の急激な低下
  - 材料費の高騰
  - 在庫の滞留
  - 売掛金の長期化
- [ ] 改善提案の生成
- [ ] ダッシュボードへの表示
- [ ] Slack/LINE通知

#### AIアドバイスの例
```
📊 今月のサマリー
売上: ¥2,450,000（前月比 +12%）
粗利益: ¥735,000（粗利率 30%）

💡 AIからのアドバイス:

1. 【警告】材料「木材」の在庫が安全在庫を下回っています
   → 発注を検討してください

2. 【改善提案】商品「椅子A」の粗利率が15%と低いです
   → 材料費が高騰しています。販売価格の見直しを検討しては？

3. 【好調】得意先「B社」の注文が先月比30%増加
   → 関係強化のチャンス。新商品の提案はいかがですか？

4. 【注意】売掛金「C社」が45日経過しています
   → 支払い確認をおすすめします

5. 【予測】このペースだと月末売上は¥2,800,000の見込み
   → 目標達成まであと¥200,000です
```

---

### Phase 3: 拡張機能

#### マルチECプラットフォーム対応
- [ ] BASE API連携
- [ ] STORES API連携
- [ ] カラーミーショップ API連携
- [ ] 楽天市場 API連携（将来）
- [ ] Amazon API連携（将来）
- [ ] 在庫の一元管理（複数EC統合）

#### 仕入れ・発注管理
- [ ] 仕入れ先マスタ管理
- [ ] 発注書発行
- [ ] 発注履歴管理
- [ ] 入荷予定管理

#### 棚卸機能
- [ ] 棚卸頻度設定（毎月/四半期/年1回/なし）
- [ ] 棚卸リスト出力
- [ ] 実在庫入力
- [ ] 差異レポート

#### 高度な分析
- [ ] 損益計算書（簡易版）
- [ ] キャッシュフロー予測
- [ ] 季節変動分析
- [ ] 得意先の信用スコアリング

---

## データベース設計

### テーブル一覧

#### shops（ストア/管理者）
- id: UUID, PK
- shop_domain: TEXT（ECドメイン）
- platform: TEXT（'shopify' / 'base' / 'stores' / 'colorme'）
- access_token: TEXT（EC APIトークン）
- company_name: TEXT
- address: TEXT
- phone: TEXT
- invoice_number: TEXT（インボイス登録番号）
- plan: TEXT（'basic' / 'standard' / 'pro'）
- created_at: TIMESTAMPTZ

#### customers（得意先）
- id: UUID, PK
- shop_id: UUID, FK → shops
- company_name: TEXT
- address: TEXT
- phone: TEXT
- email: TEXT
- billing_type: TEXT（'immediate' / 'credit'）都度/掛売
- payment_terms_days: INTEGER（支払いサイト日数）
- login_id: TEXT
- password_hash: TEXT
- created_at: TIMESTAMPTZ

#### products（商品キャッシュ - ECから同期）
- id: BIGINT, PK（EC Product ID）
- shop_id: UUID, FK → shops
- title: TEXT
- sku: TEXT
- price: DECIMAL
- cost_price: DECIMAL（原価）
- inventory_quantity: INTEGER
- image_url: TEXT
- synced_at: TIMESTAMPTZ

#### orders（注文）
- id: UUID, PK
- shop_id: UUID, FK → shops
- customer_id: UUID, FK → customers
- order_number: TEXT（自動採番）
- status: TEXT（'new' / 'manufacturing' / 'completed' / 'shipped'）
- total_amount: DECIMAL
- total_cost: DECIMAL（原価合計）
- gross_profit: DECIMAL（粗利益）
- gross_profit_rate: DECIMAL（粗利率）
- notes: TEXT
- ordered_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
- shipped_at: TIMESTAMPTZ

#### order_items（注文明細）
- id: UUID, PK
- order_id: UUID, FK → orders
- product_id: BIGINT, FK → products
- product_name: TEXT
- sku: TEXT
- quantity: INTEGER
- unit_price: DECIMAL
- unit_cost: DECIMAL（単位原価）
- subtotal: DECIMAL
- cost_subtotal: DECIMAL（原価小計）
- gross_profit: DECIMAL（粗利益）

#### materials（材料マスタ）
- id: UUID, PK
- shop_id: UUID, FK → shops
- name: TEXT
- code: TEXT
- unit: TEXT（kg, 本, L, m など）
- current_stock: DECIMAL
- safety_stock: DECIMAL
- unit_price: DECIMAL
- supplier_id: UUID, FK → suppliers
- created_at: TIMESTAMPTZ

#### material_transactions（材料入出庫履歴）
- id: UUID, PK
- material_id: UUID, FK → materials
- type: TEXT（'in' / 'out'）
- quantity: DECIMAL
- unit_price: DECIMAL（入庫時の単価）
- date: DATE
- order_id: UUID, FK → orders（出庫時の関連注文）
- notes: TEXT
- created_at: TIMESTAMPTZ

#### bom（部品表/レシピ）
- id: UUID, PK
- product_id: BIGINT, FK → products
- material_id: UUID, FK → materials
- quantity_per_unit: DECIMAL（1個あたりの必要量）

#### suppliers（仕入れ先マスタ）
- id: UUID, PK
- shop_id: UUID, FK → shops
- name: TEXT
- contact_name: TEXT
- phone: TEXT
- email: TEXT
- address: TEXT
- created_at: TIMESTAMPTZ

#### documents（発行済み帳票）
- id: UUID, PK
- order_id: UUID, FK → orders
- type: TEXT（'delivery_note' / 'invoice' / 'label'）
- document_number: TEXT（帳票番号）
- pdf_url: TEXT
- generated_at: TIMESTAMPTZ

#### ai_reports（AI経営レポート）
- id: UUID, PK
- shop_id: UUID, FK → shops
- type: TEXT（'weekly' / 'monthly' / 'alert'）
- period_start: DATE
- period_end: DATE
- summary: TEXT
- advice: JSONB（アドバイス配列）
- metrics: JSONB（指標データ）
- generated_at: TIMESTAMPTZ

#### accounts_receivable（売掛金管理）
- id: UUID, PK
- shop_id: UUID, FK → shops
- customer_id: UUID, FK → customers
- order_id: UUID, FK → orders
- amount: DECIMAL
- due_date: DATE
- paid_at: TIMESTAMPTZ
- status: TEXT（'unpaid' / 'paid' / 'overdue'）
- created_at: TIMESTAMPTZ

---

## 帳票仕様

### 納品書
- 得意先: 会社名、住所
- 注文番号
- 注文日、納品日
- 商品明細: 商品名、SKU、数量、単価、小計
- 合計金額
- 自社情報: 会社名、住所、電話番号
- 備考欄
- 印鑑欄
- インボイス登録番号

### 請求書
- 納品書と同等の情報
- 支払条件（都度/掛売に応じて）
- 振込先情報
- 支払期限

### ラベル
- 商品名
- SKU
- バーコード
- 商品写真
- 用紙: A4（22面シール）

---

## API設計方針

### エンドポイント構成
```
/api/auth/*           - 認証
/api/customers/*      - 得意先管理
/api/products/*       - 商品（EC連携）
/api/orders/*         - 受注管理
/api/materials/*      - 材料在庫管理
/api/bom/*            - 部品表管理
/api/documents/*      - 帳票生成
/api/notifications/*  - 通知
/api/analytics/*      - 経営分析データ
/api/ai/*             - AI経営アドバイス
```

### 認証
- 管理者: EC OAuth（Shopify等）
- 得意先: ID/パスワード認証 + JWT

---

## EC連携

### Phase 1: Shopify
- Products API: 商品データ取得
- Inventory API: 在庫数の取得・更新

### Phase 3: マルチEC
- BASE API
- STORES API
- カラーミーショップ API
- 共通インターフェースで抽象化

### 同期方針
- 商品データ: 定期同期 + 手動同期ボタン
- 在庫更新: 製造完了時に+、出荷時に-

---

## AI経営アドバイス仕様

### 使用API
- Claude API（Anthropic）

### 分析指標
| カテゴリ | 指標 |
|---------|------|
| 売上 | 月次売上、前年比、前月比、得意先別売上 |
| 原価 | 材料費、製造原価、原価率 |
| 利益 | 粗利益、粗利率、商品別粗利、得意先別粗利 |
| 在庫 | 在庫回転率、滞留在庫、適正在庫、安全在庫割れ |
| 債権 | 売掛金残高、回収サイト、滞留債権 |
| 生産 | 製造リードタイム、製造件数 |

### レポート生成タイミング
- 週次: 毎週月曜 9:00
- 月次: 毎月1日 9:00
- アラート: リアルタイム（異常検知時）

### アラート条件例
- 粗利率が前月比10%以上低下
- 材料在庫が安全在庫を下回る
- 売掛金が支払期限を30日超過
- 在庫回転率が業界平均を大幅に下回る

---

## 通知連携

### Slack
- Webhook URLを設定
- 新規注文時に通知
- AIアラート通知

### LINE
- LINE Notify または LINE Messaging API
- 新規注文時に通知
- 得意先へのステータス変更通知
- AIアラート通知

---

## 価格プラン

| プラン | 月額 | 機能 |
|--------|------|------|
| ベーシック | ¥3,000 | 受発注・進捗管理・帳票発行・EC連携（1サービス） |
| スタンダード | ¥8,000 | + 材料在庫・BOM・原価計算・粗利分析 |
| プロ | ¥15,000 | + AI経営アドバイス・マルチEC連携 |

---

## 開発フェーズ

### Phase 1: MVP
1. プロジェクトセットアップ（Deno + Supabase）
2. 認証基盤（Shopify OAuth + 得意先ログイン）
3. 商品データ同期（Shopify → Supabase）
4. 得意先ポータル（商品閲覧・注文）
5. 受注管理（ステータス管理）
6. 帳票生成（納品書・請求書・ラベル）
7. 材料在庫管理（基本機能）
8. 通知連携（Slack/LINE）

### Phase 2: 経営分析 + AI
1. BOM管理
2. 原価計算・粗利分析
3. 経営ダッシュボード
4. Claude API連携
5. AI経営アドバイス生成
6. 週次/月次レポート
7. アラート機能

### Phase 3: 拡張
1. BASE API連携
2. STORES API連携
3. カラーミーショップ API連携
4. 仕入れ先管理・発注書
5. 棚卸機能
6. 高度な分析機能

---

## コーディング規約

### 全般
- TypeScript strict mode
- 関数型アプローチを優先
- エラーハンドリングを徹底

### 命名規則
- ファイル: kebab-case（例: order-service.ts）
- 関数: camelCase（例: getOrderById）
- 型/インターフェース: PascalCase（例: OrderItem）
- 定数: UPPER_SNAKE_CASE（例: MAX_RETRY_COUNT）

### ディレクトリ構成
```
/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── integrations/
│   │   │   ├── shopify/
│   │   │   ├── base/
│   │   │   ├── stores/
│   │   │   └── claude/
│   │   └── utils/
│   └── deno.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   └── package.json
└── AGENT.md
```

---

## 環境変数

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# BASE（Phase 3）
BASE_CLIENT_ID=
BASE_CLIENT_SECRET=

# STORES（Phase 3）
STORES_API_KEY=

# カラーミーショップ（Phase 3）
COLORME_CLIENT_ID=
COLORME_CLIENT_SECRET=

# Claude AI
ANTHROPIC_API_KEY=

# 通知
SLACK_WEBHOOK_URL=
LINE_CHANNEL_ACCESS_TOKEN=

# その他
JWT_SECRET=
```

---

## 注意事項

- ECプラットフォームをマスタとし、商品の二重管理を避ける
- 価格は全得意先共通（Phase 1）
- 材料在庫とEC在庫は別管理
- 日本語UIのみ対応
- インボイス制度対応必須
- AI経営アドバイスは参考情報であり、最終判断はユーザーが行う旨を明記
