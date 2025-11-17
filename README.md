# RideLog Map

Supabaseを使ったライドログ可視化Webアプリケーション

GPX/TCXファイルをアップロードして、ライドを地図上で可視化し、速度や標高などのデータを確認できます。

## 主な機能

- **ユーザー認証**: Supabase Authによる安全なログイン/サインアップ
- **ファイルアップロード**: GPX/TCXファイルのアップロードとパース
- **地図表示**: Leafletを使った地図上でのルート表示
- **速度の可視化**: 速度に応じた色分け表示（青→緑→黄→オレンジ→赤）
- **タイムスライダー**: ライドの再生機能で、いつどこを走っていたかを確認
- **統計情報**: 距離、獲得標高、平均速度、最高速度などの表示

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + React + TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase (Auth + PostgreSQL + Storage)
- **地図**: Leaflet + OpenStreetMap
- **パーサー**: gpxparser, fast-xml-parser

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとANON KEYを取得

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下を設定:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. データベースのセットアップ

Supabaseのダッシュボードで、SQL Editorを開き、以下のマイグレーションファイルを実行:

```bash
supabase/migrations/001_initial_schema.sql
```

または、Supabase CLIを使用する場合:

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクトの初期化
supabase init

# マイグレーションの実行
supabase db push
```

### 5. Storageバケットの設定

Supabaseのダッシュボード → Storage → Create Bucketで以下を設定:

- Bucket name: `ride-logs`
- Public: OFF (プライベート)

ポリシーは上記のマイグレーションファイルで自動的に設定されます。

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 使い方

### 1. アカウント作成

1. トップページから「新規登録」をクリック
2. メールアドレスとパスワードを入力
3. 確認メールが届くので、リンクをクリック（開発環境では自動確認も可能）

### 2. ファイルのアップロード

1. ログイン後、ダッシュボードに移動
2. 「新しいライドをアップロード」エリアにGPX/TCXファイルをドラッグ&ドロップ
3. ファイルが自動的にパースされ、データベースに保存されます

### 3. ライドの確認

1. ダッシュボードからライドをクリック
2. 地図上でルートが表示されます
3. タイムスライダーで再生して、ライドを追体験できます

## データベーススキーマ

### rides テーブル

- `id`: UUID (主キー)
- `user_id`: ユーザーID
- `title`: ライド名
- `description`: 説明
- `file_path`: アップロードしたファイルのパス
- `started_at`: 開始時刻
- `finished_at`: 終了時刻
- `distance_m`: 距離（メートル）
- `elevation_gain_m`: 獲得標高（メートル）
- `max_speed_m_s`: 最高速度（m/s）
- `avg_speed_m_s`: 平均速度（m/s）

### ride_points テーブル

- `id`: BIGSERIAL (主キー)
- `ride_id`: ライドID
- `t`: タイムスタンプ
- `lat`: 緯度
- `lon`: 経度
- `ele`: 標高（メートル）
- `speed_m_s`: 速度（m/s）
- `cum_dist_m`: 累積距離（メートル）

## カスタマイズ

### 速度の色分けを変更

`components/RideMap.tsx`の`speedToColor`関数を編集してください。

```typescript
function speedToColor(speedMs: number): string {
  const speedKmh = speedMs * 3.6

  if (speedKmh < 10) return '#3b82f6'  // blue
  if (speedKmh < 20) return '#10b981'  // green
  if (speedKmh < 30) return '#fbbf24'  // yellow
  if (speedKmh < 40) return '#f59e0b'  // orange
  return '#ef4444'                      // red
}
```

### 地図タイルの変更

`components/RideMap.tsx`でOpenStreetMap以外のタイルプロバイダーを使用できます:

```typescript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '...',
}).addTo(map)
```

## デプロイ

### GitHub Pagesへのデプロイ（推奨）

このプロジェクトはGitHub Pagesに静的サイトとしてデプロイできます。

#### 1. Supabaseプロジェクトのセットアップ

先に上記の「Supabaseプロジェクトの作成」と「データベースのセットアップ」を完了してください。

#### 2. GitHub Secretsの設定

リポジトリの Settings → Secrets and variables → Actions → New repository secret で以下の2つのシークレットを追加:

- `NEXT_PUBLIC_SUPABASE_URL`: あなたのSupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: あなたのSupabaseプロジェクトのANON KEY

#### 3. GitHub Pagesの有効化

1. リポジトリの Settings → Pages に移動
2. Source を「GitHub Actions」に設定
3. mainブランチにプッシュすると自動的にビルド＆デプロイされます

#### 4. カスタムドメインの設定（オプション）

リポジトリ名がURLのパスに含まれる場合（例: `username.github.io/ridelog-map`）、`next.config.js`で以下のコメントを外してください:

```javascript
basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
```

そして、GitHub Secretsに追加:
- `NEXT_PUBLIC_BASE_PATH`: `/ridelog-map` (リポジトリ名)

#### デプロイURL

デプロイ後は以下のURLでアクセスできます:
- カスタムドメインなし: `https://username.github.io/ridelog-map/`
- カスタムドメインあり: `https://yourdomain.com/`

### Vercelへのデプロイ

```bash
npm install -g vercel
vercel
```

環境変数（`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定することを忘れずに！

## ライセンス

MIT

## 今後の拡張案

- [ ] 心拍数データの表示（TCXファイルに含まれる場合）
- [ ] パワーデータの表示
- [ ] ライド同士の比較機能
- [ ] 月間・年間の統計ダッシュボード
- [ ] ライドのエクスポート機能
- [ ] SNSシェア機能
- [ ] Edge Functionsでのファイルパース（サーバーサイド処理）
- [ ] AI分析機能（GPT-4によるライド分析など）
