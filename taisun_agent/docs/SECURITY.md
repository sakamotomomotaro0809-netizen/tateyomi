# TAISUN v2 セキュリティポリシー

## 脆弱性の報告

### 報告方法

セキュリティ上の脆弱性を発見した場合は、**公開Issueを作成せず**、以下の方法で報告してください：

1. **GitHub Security Advisory** (推奨)
   - [Security Advisory を作成](https://github.com/taiyousan15/taisun_agent/security/advisories/new)
   - 非公開で報告でき、修正まで情報が保護されます

2. **メールでの報告**
   - 件名: `[SECURITY] TAISUN v2 脆弱性報告`
   - 以下の情報を含めてください

### 報告に含める情報

```
## 脆弱性の概要
[脆弱性の種類と影響範囲]

## 再現手順
1. [手順1]
2. [手順2]
3. [手順3]

## 影響
[攻撃者が悪用した場合の影響]

## 推奨される修正方法（任意）
[修正案があれば記載]

## 環境情報
- TAISUN バージョン:
- Node.js バージョン:
- OS:
```

### 対応プロセス

1. **受領確認**: 2営業日以内
2. **初期評価**: 5営業日以内
3. **修正開発**: 深刻度に応じて優先対応
4. **セキュリティアドバイザリ公開**: 修正リリースと同時

---

## サポートされているバージョン

| バージョン | サポート状況 |
|-----------|-------------|
| 2.x.x | ✅ セキュリティアップデート提供 |
| 1.x.x | ❌ サポート終了 |

---

## セキュリティ対策

### 実装済みの対策

#### 1. 入力検証
- 全てのユーザー入力をサニタイズ
- JSON スキーマによる設定ファイル検証
- 環境変数の型チェック

#### 2. 認証・認可
- GitHub Token のスコープ検証
- MCP サーバーごとの許可リスト（allowlist）
- 危険操作のブロック（dangerousOperations）

#### 3. 秘密情報の保護
- `.env` ファイルは `.gitignore` に含まれる
- トークンはログに出力されない
- 機密設定ファイルは `600` パーミッション

#### 4. 依存関係の管理
- `npm audit` による脆弱性スキャン
- Trivy によるコンテナスキャン
- gitleaks によるシークレット検出

### セキュリティスキャンコマンド

```bash
# 依存関係の脆弱性チェック
npm audit

# 詳細スキャン（Trivy）
npm run security:scan

# シークレット検出
npm run security:secrets-scan

# 全てのスキャンを実行
npm audit && npm run security:scan && npm run security:secrets-scan
```

---

## セキュリティベストプラクティス

### 環境変数の管理

```bash
# ✅ 良い例: .env ファイルを使用
GITHUB_TOKEN=ghp_xxxxx

# ❌ 悪い例: コードにハードコード
const token = "ghp_xxxxx";  # 絶対にしない
```

### APIキーの取り扱い

1. **最小権限の原則**: 必要なスコープのみを付与
2. **定期的なローテーション**: 90日ごとにトークンを更新
3. **環境分離**: 本番/開発で異なるキーを使用

### MCP サーバーの設定

```json
{
  "name": "github",
  "dangerousOperations": ["delete", "force-push", "archive"],
  "allowlist": ["get_*", "list_*", "create_issue"]
}
```

- `dangerousOperations`: 人間の承認が必要な操作
- `allowlist`: 自動実行を許可するツールのパターン

---

## 既知のセキュリティ考慮事項

### 1. MCP サーバーの信頼性

外部 MCP サーバーは信頼できるソースからのみ使用してください：
- 公式 `@modelcontextprotocol/*` パッケージ
- 検証済みのサードパーティパッケージ

### 2. ファイルシステムアクセス

`filesystem` MCP は慎重に使用してください：
```json
{
  "name": "filesystem",
  "args": ["-y", "@modelcontextprotocol/server-filesystem@0.6.2", "."],
  "allowlist": ["read_file", "list_directory"]
}
```

- 書き込み操作は `allowlist` から除外を推奨
- アクセス範囲を必要最小限に制限

### 3. データベースアクセス

```json
{
  "name": "postgres",
  "requiredEnv": ["POSTGRES_DSN"],
  "dangerousOperations": ["drop", "truncate", "delete", "alter"]
}
```

- 読み取り専用の DSN を使用（`POSTGRES_MCP_DSN`）
- 書き込みが必要な場合のみ `POSTGRES_MCP_DSN_RW` を使用

---

## インシデント対応

### 緊急連絡先

セキュリティインシデントが発生した場合：

1. **即座に** 影響を受けるトークンを無効化
2. GitHub Security Advisory で報告
3. 影響範囲を特定・記録

### インシデント分類

| レベル | 説明 | 対応時間 |
|--------|------|---------|
| Critical | データ漏洩、リモートコード実行 | 即時対応 |
| High | 認証バイパス、権限昇格 | 24時間以内 |
| Medium | 情報漏洩（限定的） | 1週間以内 |
| Low | 軽微な問題 | 次回リリースで対応 |

---

## 監査ログ

### Supervisor RUNLOG

危険な操作は自動的にログに記録されます：

```
logs/supervisor-runlog.jsonl
```

含まれる情報：
- タイムスタンプ
- 実行されたコマンド
- 承認状況
- 実行結果

### 確認方法

```bash
# 最近の危険操作を確認
tail -20 logs/supervisor-runlog.jsonl | jq .
```

---

## コンプライアンス

### OWASP Top 10 対応

| リスク | 対策 |
|--------|------|
| インジェクション | 入力サニタイズ、パラメータ化クエリ |
| 認証の不備 | トークン検証、スコープチェック |
| 機密データの露出 | 暗号化、ログマスキング |
| XML外部実体 | N/A（JSON使用） |
| アクセス制御の不備 | allowlist、dangerousOperations |
| セキュリティ設定の不備 | デフォルト無効、明示的有効化 |
| XSS | N/A（CLI アプリケーション） |
| 安全でないデシリアライズ | JSON スキーマ検証 |
| 既知の脆弱性 | 定期的な依存関係更新 |
| 不十分なロギング | Supervisor RUNLOG |

---

## 更新履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-06 | セキュリティポリシー初版作成 |

---

*セキュリティに関する質問は [GitHub Security Advisory](https://github.com/taiyousan15/taisun_agent/security/advisories/new) からお問い合わせください。*
