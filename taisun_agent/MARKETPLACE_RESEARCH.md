# API & MCP Marketplace Deep Research Report

**調査日**: 2026-02-13
**調査者**: リサーチアナリスト（Claude Sonnet 4.5）
**目的**: taisun_agent2026の品質・セキュリティ・自動化機構の改善

---

## エグゼクティブサマリー

5つの主要マーケットプレイス（MCP.so、SkillsMP、Smithery、RapidAPI、Hugging Face）を深掘り調査し、以下の知見を得た：

### 重要ポイント（Key Takeaways）

1. **品質ガードの多層化**: 単一スキャンでなく、複数メカニズムの組み合わせが必須（偽陽性96%の現実）
2. **コミュニティガバナンス**: 最小スター数フィルタ + 身元確認 + レビューシステムの3点セット
3. **プログレッシブディスクロージャ**: コンテキスト効率化のため、メタデータ先行・詳細オンデマンド
4. **意図ベース設計**: 1:1 APIラップは非推奨、ユーザー/エージェント意図を優先
5. **セキュリティ段階化**: 読み取り専用 → 制限付き書き込み → フルアクセスの3段階推奨

---

## 1. MCP.so - Model Context Protocol Registry

### プラットフォーム特徴

- **中央集約型ガバナンス**: 全接続システムに対する認証・監査・ポリシー実行
- **ツールオーケストレーション**: スクリプト、スキャナー、データソースを単一UI互換レイヤーで統合
- **セキュリティ**: OAuth 2.1が主要標準として台頭（APIキーからの根本的シフト）

出典: [Best MCP Gateways and AI Agent Security Tools (2026)](https://www.integrate.io/blog/best-mcp-gateways-and-ai-agent-security-tools/)

### セキュリティ・品質ガード

| メカニズム | 詳細 |
|----------|------|
| **OAuth 2.1** | 細粒度権限 + 同意管理をサポート |
| **Type II認証** | 2026年時点で一部ゲートウェイのみ取得 |
| **SAST/SCA必須** | パイプラインでセキュリティベストプラクティス実装 |
| **レジストリ検証** | サーバーがセキュリティ・品質基準を満たすか確認 |

出典: [MCP Security Vulnerabilities Prevention](https://www.practical-devsecops.com/mcp-security-vulnerabilities/)

### オンボーディング

```bash
# mcp-index CLIツールで登録
npx mcp-index <github-repo-url>
```

**自動チェック内容**:
- 重複検出
- MCP互換性確認
- 処理キューへの追加
- リポジトリ公開時の通知

出典: [MCP Server Finder Directory](https://www.mcpserverfinder.com)

### 自動化機能

- **.well-known/mcp エンドポイント**: サーバーが自己広告、接続前に機能発見可能
- **自動カタログ化**: レジストリがケイパビリティを自動登録
- **文脈ベース権限**: 時間・状況に応じた条件付き権限サポート（将来実装予定）

出典: [SEP: .well-known/mcp Discovery Endpoint](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1960)

### エラーハンドリング

- **粒度制御**: エージェントが実行可能なアクション・状況を細かく指定
- **監査ログ**: 誰が何を呼び出したか追跡可能

### taisun_agent2026への適用

#### 即座に実装可能

1. **OAuth 2.1移行**: APIキー認証から細粒度権限へ
2. **SAST/SCA統合**: CI/CDパイプラインに`npm audit`、`semgrep`、`snyk`を追加
3. **.well-known/mcp作成**: `/api/mcp/.well-known/mcp`エンドポイントでメタデータ公開

#### 中期実装

1. **Type II認証取得**: セキュリティ監査を受け、信頼性証明
2. **条件付き権限**: `if (time > 22:00 || user.role !== 'admin') deny write`

---

## 2. SkillsMP - Agent Skills Marketplace

### プラットフォーム特徴

- **25,000+スキル**: SKILL.md標準に準拠
- **マルチプラットフォーム対応**: Claude Code、Codex CLI、ChatGPTで動作
- **プログレッシブディスクロージャ**: メタデータを先に読み込み、詳細は発動時に取得（コンテキスト効率化）

出典: [SkillsMP Complete Guide](https://smartscope.blog/en/blog/skillsmp-marketplace-guide/)

### 品質ガード

| メカニズム | 詳細 |
|----------|------|
| **最小スター数フィルタ** | GitHub 2スター未満は除外 |
| **品質インジケータ** | 基本スキャンで信頼性評価 |
| **コミュニティ検証** | スター数 = コミュニティ承認の指標 |

**重要**: 「コミュニティスキルはオープンソースコード同様、使用前に検査せよ」と明記

出典: [SkillsMP Agent Skills Marketplace](https://skillsmp.com/)

### オンボーディング

1. GitHubリポジトリをクローン
2. スキルフォルダを指定ディレクトリにコピー
3. AIアシスタントが自動発見・読み込み

**ワンクリックインストール**: ZIPダウンロード + CLI対応

### 自動化機能

- **セマンティック検索**: 意図ベースでスキル発見
- **カテゴリフィルタリング**: ソフトウェア開発、データ分析、DevOps、コンテンツ生成など
- **自動認識**: AIアシスタントが指定ディレクトリから自動ロード
- **skill-creatorスキル**: スキル作成ガイダンスを提供

出典: [About SkillsMP](https://skillsmp.com/about)

### エラーハンドリング

- **段階的失敗**: スキルが機能しない場合、メタデータのみ読み込みで影響最小化

### コミュニティ

- **現在フェーズ**: 収集段階（GitHub全体から集約）
- **次フェーズ**: 品質キュレーション強化予定

### taisun_agent2026への適用

#### 即座に実装可能

1. **SKILL.md標準採用**: 全スキルをSKILL.md形式で記述
   ```markdown
   # Skill Name

   ## Description

   ## Usage

   ## Examples
   ```

2. **プログレッシブディスクロージャ実装**:
   - `.claude/skills/*/metadata.json` (軽量)
   - `.claude/skills/*/SKILL.md` (詳細、発動時のみ読み込み)

3. **最小スター数フィルタ**: `scripts/skill-quality-check.ts`
   ```typescript
   if (githubStars < 2) {
     console.warn('Skill quality threshold not met')
     return { approved: false, reason: 'Insufficient community validation' }
   }
   ```

#### 中期実装

1. **セマンティック検索**: Embeddings APIで意図ベース検索
2. **skill-creator作成**: 新スキル作成を誘導するメタスキル

---

## 3. Smithery AI - MCP Registry with Community Trust

### プラットフォーム特徴

- **クライアント非依存**: Claude、Cursor、その他AIアシスタント対応
- **CLIベース管理**: インストール、アンインストール、検索、検査を統合
- **Dockerパッケージング**: 配布・実行の標準化

出典: [Smithery CLI GitHub](https://github.com/smithery-ai/cli)

### 品質ガード

| メカニズム | 詳細 |
|----------|------|
| **コミュニティレビュー** | upvote/downvote + テキストレビュー |
| **インタラクティブテスト** | `smithery inspect <server>`で本番前検証 |
| **トークン安全性** | 環境変数推奨、ローカルファースト |
| **透明性確保** | コミュニティの圧力で全オープンソース化を約束 |

**教訓**: 初期バージョンがminified（難読化）でコミュニティから批判 → 即座にオープンソース化約束

出典: [Smithery AI: A central hub for MCP servers](https://workos.com/blog/smithery-ai)

### オンボーディング

```bash
# インストール
npx @smithery/cli install mcp-obsidian --client claude

# 設定付きインストール
npx @smithery/cli install mcp-obsidian --client claude --config '{"vaultPath":"path/to/vault"}'

# 公開
smithery deploy .  # smithery.yaml + Dockerfile必須
```

出典: [Smithery CLI Documentation](https://smithery.ai/docs/concepts/cli)

### 自動化機能

- **レジストリ検索**: `smithery search [term]`
- **インストール済み一覧**: `smithery list`
- **リファレンス実装**: TypeScript/Python MCP SDK使用例を提供

### エラーハンドリング

- **ローカル実行**: 本番前にローカルテストして失敗を早期検出

### コミュニティ

```bash
# レビュー操作
smithery skills review list <skill>
smithery skills review add <skill> --up -b "Great skill!"
smithery skills review upvote <skill> <review-id>
smithery skills review downvote <skill> <review-id>
```

出典: [Smithery CLI Commands](https://github.com/smithery-ai/cli?tab=readme-ov-file)

### taisun_agent2026への適用

#### 即座に実装可能

1. **コミュニティレビューシステム**:
   ```bash
   taisun skill review add interactive-video-platform \
     --rating 5 \
     --body "TTS統合が完璧。Fish Audio連携が素晴らしい"
   ```

2. **インタラクティブテスト**:
   ```bash
   taisun skill inspect taiyo-style-vsl --dry-run
   ```

3. **透明性確保**: 全スキルをGitHub公開、難読化なし

#### 中期実装

1. **Dockerパッケージング**: `smithery.yaml`相当の`taisun.yaml`作成
2. **レジストリ統合**: Smithery/SkillsMPへの登録

---

## 4. RapidAPI - API Marketplace with Quality Curation

### プラットフォーム特徴

- **手動キュレーション**: チームが数千APIをテスト・レビュー
- **ダッシュボード**: 使用量・コスト・エラーを一元管理
- **承認ワークフロー**: API計画に承認が必要な場合、リクエスト管理

出典: [RapidAPI Review](https://apidog.com/blog/what-is-rapidapi-and-how-to-use-it/)

### 品質ガード

| メカニズム | 詳細 |
|----------|------|
| **チームレビュー** | 機能性・パフォーマンス・サポートレベルを評価 |
| **一貫性チェック** | 全エラーレスポンスで統一構造を要求 |
| **HTTPステータス標準** | エラー報告の第一線として標準コード使用 |

**課題**: 具体的な品質基準が公開されていない（内部基準の可能性）

出典: [Best Practices for API Errors](https://rapidapi.com/guides/practices-api-errors)

### オンボーディング

- **承認タブ**: API公開リクエストのステータス確認（OPEN/APPROVED）
- **コスト透明性**: 利用階層・超過ルール・契約構造を事前提示

### 自動化機能

- **レコメンデーションエンジンAPI**: 複数アルゴリズムで最適API推奨
- **自動監視**: ダッシュボードでパフォーマンス追跡

出典: [Recommendation Engine API](https://rapidapi.com/algorithms.io/api/recommendation-engine)

### エラーハンドリング

**ベストプラクティス**:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email address format is invalid",
    "details": {
      "field": "email",
      "provided": "user@invalid"
    }
  }
}
```

- **一貫性**: 全エンドポイントで同じ構造
- **明確性**: 何が問題か、どう修正するかを記載
- **リトライロジック**: クライアント側レート制限を最初から実装

出典: [FastAPI Best Practices for Production](https://fastlaunchapi.dev/blog/fastapi-best-practices-production-2026)

### コミュニティ

- ドキュメント品質はマーケットプレイスごとにばらつき
- API信頼性もプロバイダーに依存

### taisun_agent2026への適用

#### 即座に実装可能

1. **統一エラーレスポンス**:
   ```typescript
   interface TaisunError {
     success: false
     error: {
       code: string        // SKILL_NOT_FOUND, INVALID_PHASE, etc.
       message: string     // User-friendly message
       details?: object    // Debug info
       timestamp: string
     }
   }
   ```

2. **ダッシュボード作成**: `src/app/dashboard`
   - スキル使用頻度
   - エラー率
   - コスト（API呼び出し）
   - Phase別実行時間

3. **リトライロジック**:
   ```typescript
   async function callWithRetry(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn()
       } catch (err) {
         if (i === maxRetries - 1) throw err
         await sleep(Math.pow(2, i) * 1000)  // Exponential backoff
       }
     }
   }
   ```

#### 中期実装

1. **レコメンデーションエンジン**: タスク内容から最適スキル/エージェントを自動選択
2. **コスト見積もり**: スキル実行前にAPI呼び出し回数・コストを表示

---

## 5. Hugging Face - Model Marketplace with Safety Scanning

### プラットフォーム特徴

- **447万モデルバージョンをスキャン**: Protect AIとのパートナーシップ
- **35.2万件の問題検出**: 51,700モデルで安全性/疑わしい問題
- **協調的レビュー**: リポジトリオーナーと協力して解決

出典: [4M Models Scanned: Protect AI + Hugging Face](https://huggingface.co/blog/pai-6-month)

### セキュリティ・品質ガード

| メカニズム | 詳細 | 課題 |
|----------|------|------|
| **Guardian (Protect AI)** | 悪意あるコードをスキャン | 一部悪意モデルが未検出 |
| **Picklescan** | シリアル化モデルデータを精査 | **96%が偽陽性** |
| **safetensorsフォーマット** | 純粋データ（コードなし） | 移行中（全ライブラリ未対応） |
| **商用スキャナ統合** | 複数スキャナで多層防御 | コスト増 |

**重要な学び**: 偽陽性96%でも、残り4%の真陽性を見逃さないため許容

出典: [Hugging Face Unsafe Models](https://docs.mend.io/platform/latest/huggingface-unsafe-models)

### オンボーディング

- **ダウンロード前安全性表示**: ユーザーがリスクを認識してから取得
- **コンテンツポリシー**: 報告されたコンテンツを反復的にレビュー
- **優先順位**: 削除よりコラボレーティブソリューション（修正・ガードレール追加）

出典: [Hugging Face Content Policy](https://huggingface.co/content-policy)

### 自動化機能

- **自動スキャン**: アップロード時にPickleファイルをスキャン
- **安全バッジ**: 検査結果をバッジ表示

### エラーハンドリング

- **段階的対応**: 警告 → 協議 → ガードレール追加 → 最終手段として無効化

### コミュニティ

- **報告窓口**: `safety@huggingface.co`
- **異議申し立て**: `legal@huggingface.co`で再審査可能
- **Code of Conduct**: コミュニティ行動規範を明記

出典: [Hugging Face Code of Conduct](https://huggingface.co/code-of-conduct)

### taisun_agent2026への適用

#### 即座に実装可能

1. **マルチスキャナ統合**:
   ```bash
   # 13層防御に追加
   Layer 13: Multi-Scanner (VirusTotal + custom rules)
   ```

2. **安全性バッジ**:
   ```json
   {
     "skill": "interactive-video-platform",
     "safety": {
       "scanned": true,
       "scanDate": "2026-02-13",
       "issues": 0,
       "badge": "VERIFIED_SAFE"
     }
   }
   ```

3. **協調的レビュー**: スキル作者と対話して修正優先、削除は最終手段

#### 中期実装

1. **safetensors相当**: スキルをデータ + ロジック分離、データ部分は純粋JSON
2. **異議申し立てプロセス**: `taisun appeal <skill-id> --reason "..."`
3. **偽陽性許容**: 96%偽陽性でも、真陽性4%を守るため厳格スキャン維持

---

## 6. クロスプラットフォームのベストプラクティス

### 品質管理の多層化

| Layer | メカニズム | 実装例 |
|-------|----------|--------|
| **コミュニティ検証** | 最小スター数 | GitHub 2+ stars (SkillsMP) |
| **身元確認** | 公開者の身元 | ClawHub (ClawHavoc事件後に導入) |
| **自動スキャン** | VirusTotal等 | Hugging Face, ClawHub |
| **手動レビュー** | 人間によるチェック | RapidAPI, Hugging Face |
| **コミュニティレビュー** | upvote/downvote | Smithery |
| **多次元評価** | 5軸スコアリング | SkillHub (S/A/B/C/Dランク) |

出典: [ClawHub Skills Marketplace Guide](https://www.digitalapplied.com/blog/clawhub-skills-marketplace-developer-guide-2026)

### 自動化アーキテクチャ

#### 意図ベース設計（Intent-Based Design）

**非推奨**: 1:1 APIラッピング
```typescript
// ❌ Bad
tools: [
  { name: 'get_order', endpoint: '/orders/:id' },
  { name: 'get_user', endpoint: '/users/:id' },
  { name: 'get_shipment', endpoint: '/shipments/:id' }
]
```

**推奨**: ユーザー/エージェント意図を優先
```typescript
// ✅ Good
tools: [
  {
    name: 'track_latest_order',
    description: 'Find and track the most recent order for a customer',
    params: { email: string }
  }
]
```

出典: [MCP Best Practices for Building Servers](https://www.philschmid.de/mcp-best-practices)

#### セルフヒーリング

- **AIによるパターン検出**: 異常フラグ、品質問題予測
- **自動修復**: テストスクリプト失敗時の自己修正
- **フィードバックループ**: 同じ欠陥の再発防止

出典: [AI in Quality Assurance](https://appinventiv.com/blog/ai-in-quality-assurance/)

### エラーリカバリー

**段階化アプローチ**:

1. **読み取り専用モード**: 初期デプロイ
2. **制限付き書き込み**: テスト環境
3. **フルアクセス**: 本番環境（ログ・監査必須）

**スコープ縮小**:
- プロジェクト別APIキー
- ディレクトリ制限
- dev/testデータのみ

出典: [MCP Server Best Practices for 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026)

### コミュニティガバナンス

#### SkillHub評価システム（5次元）

| 次元 | 説明 | S-rankしきい値 |
|------|------|----------------|
| **Practicality** | 実用性 | 9.0+ |
| **Clarity** | 明瞭性 | 9.0+ |
| **Automation** | 自動化度 | 9.0+ |
| **Quality** | 品質 | 9.0+ |
| **Impact** | インパクト | 9.0+ |

出典: [SkillHub Claude Skills Marketplace](https://www.skillhub.club)

#### ClawHub（セキュリティ重視）

- **VirusTotal事前スキャン**: 公開前に全スキルをスキャン
- **毎日再スキャン**: 新たな脅威を検出
- **検証済みバッジ**: 信頼性の可視化
- **身元確認**: 公開者の本人確認

---

## 7. taisun_agent2026への統合提案

### 即座に実装可能（Phase 1: 1-2週間）

#### 1. SKILL.md標準化

全スキルを以下形式に統一：

```markdown
# Skill Name

## Description
Brief description of what this skill does.

## Usage
```bash
/skill-name [options]
```

## Parameters
- `param1` (required): Description
- `param2` (optional): Description

## Examples
```bash
/skill-name --param1 value1
```

## Dependencies
- fish-audio-api
- remotion

## Safety
- Scanned: 2026-02-13
- Issues: 0
- Badge: VERIFIED_SAFE
```

#### 2. プログレッシブディスクロージャ

**ディレクトリ構造**:
```
.claude/skills/
  interactive-video-platform/
    metadata.json          # 軽量（名前、説明、依存関係のみ）
    SKILL.md              # 詳細（発動時のみ読み込み）
    index.ts              # 実装
```

**metadata.json例**:
```json
{
  "name": "interactive-video-platform",
  "version": "2.0.0",
  "description": "4K interactive video with TTS and branching",
  "dependencies": ["flow-image", "fish-audio", "remotion"],
  "safety": {
    "scanned": true,
    "scanDate": "2026-02-13",
    "badge": "VERIFIED_SAFE"
  },
  "quality": {
    "stars": 15,
    "reviews": 8,
    "rating": 4.5
  }
}
```

#### 3. 統一エラーレスポンス

`src/lib/error-handler.ts`:
```typescript
export interface TaisunError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: string
    phase?: string
    skill?: string
  }
}

export function formatError(
  code: string,
  message: string,
  details?: object
): TaisunError {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      phase: process.env.CURRENT_PHASE,
      skill: process.env.CURRENT_SKILL
    }
  }
}
```

#### 4. 最小スター数フィルタ

`scripts/skill-quality-check.ts`:
```typescript
import { Octokit } from '@octokit/rest'

interface QualityCheckResult {
  approved: boolean
  reason?: string
  stars: number
}

export async function checkSkillQuality(
  repoUrl: string
): Promise<QualityCheckResult> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/')

  const { data } = await octokit.repos.get({ owner, repo })
  const stars = data.stargazers_count

  if (stars < 2) {
    return {
      approved: false,
      reason: 'Insufficient community validation (< 2 stars)',
      stars
    }
  }

  return { approved: true, stars }
}
```

#### 5. リトライロジック

`src/lib/retry.ts`:
```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = baseDelay * Math.pow(2, i)  // Exponential backoff
      console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Unreachable')
}
```

---

### 中期実装（Phase 2: 3-4週間）

#### 1. コミュニティレビューシステム

**データベーススキーマ**（Prisma）:
```prisma
model SkillReview {
  id        String   @id @default(cuid())
  skillId   String
  userId    String
  rating    Int      @db.SmallInt  // 1-5
  body      String
  upvotes   Int      @default(0)
  downvotes Int      @default(0)
  createdAt DateTime @default(now())

  @@index([skillId])
}

model SkillReviewVote {
  id       String @id @default(cuid())
  reviewId String
  userId   String
  vote     Int    @db.SmallInt  // 1 = upvote, -1 = downvote

  @@unique([reviewId, userId])
}
```

**CLI操作**:
```bash
taisun skill review add interactive-video-platform \
  --rating 5 \
  --body "TTS統合が完璧。Fish Audio連携が素晴らしい"

taisun skill review list interactive-video-platform

taisun skill review upvote <review-id>
```

#### 2. ダッシュボード（Next.js App Router）

`src/app/dashboard/page.tsx`:
```typescript
import { SkillUsageChart } from '@/components/dashboard/skill-usage-chart'
import { ErrorRateChart } from '@/components/dashboard/error-rate-chart'
import { CostEstimator } from '@/components/dashboard/cost-estimator'

export default async function Dashboard() {
  const stats = await getSkillStats()

  return (
    <div className="grid grid-cols-3 gap-4">
      <SkillUsageChart data={stats.usage} />
      <ErrorRateChart data={stats.errors} />
      <CostEstimator data={stats.apiCalls} />
    </div>
  )
}
```

#### 3. レコメンデーションエンジン

`src/lib/skill-recommender.ts`:
```typescript
import { embed } from './embeddings'
import { cosineSimilarity } from './vector-utils'

export async function recommendSkills(
  taskDescription: string,
  topK = 3
): Promise<Skill[]> {
  const taskEmbedding = await embed(taskDescription)

  const skills = await getAllSkills()
  const scores = await Promise.all(
    skills.map(async (skill) => {
      const skillEmbedding = await embed(skill.description)
      return {
        skill,
        score: cosineSimilarity(taskEmbedding, skillEmbedding)
      }
    })
  )

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ skill }) => skill)
}
```

#### 4. インタラクティブテスト

`scripts/skill-inspect.ts`:
```bash
#!/usr/bin/env node
import inquirer from 'inquirer'
import { loadSkill } from '../src/lib/skill-loader'

const skillName = process.argv[2]
const skill = await loadSkill(skillName)

console.log(`🔍 Inspecting ${skillName}...`)
console.log(`Description: ${skill.metadata.description}`)

const { dryRun } = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'dryRun',
    message: 'Run in dry-run mode?',
    default: true
  }
])

if (dryRun) {
  console.log('📋 Dry-run output:')
  await skill.execute({ dryRun: true })
} else {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Execute for real?',
      default: false
    }
  ])

  if (confirm) {
    await skill.execute()
  }
}
```

#### 5. マルチスキャナ統合

`scripts/security-scan.ts`:
```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ScanResult {
  scanner: string
  safe: boolean
  issues: string[]
}

export async function scanSkill(skillPath: string): Promise<ScanResult[]> {
  const scanners = [
    { name: 'npm-audit', cmd: 'npm audit --json' },
    { name: 'semgrep', cmd: 'semgrep --config auto --json' },
    { name: 'snyk', cmd: 'snyk test --json' }
  ]

  const results = await Promise.all(
    scanners.map(async ({ name, cmd }) => {
      try {
        const { stdout } = await execAsync(cmd, { cwd: skillPath })
        const report = JSON.parse(stdout)

        return {
          scanner: name,
          safe: report.vulnerabilities?.length === 0,
          issues: report.vulnerabilities?.map((v: any) => v.title) || []
        }
      } catch (error) {
        return {
          scanner: name,
          safe: false,
          issues: [`Scanner failed: ${error.message}`]
        }
      }
    })
  )

  return results
}
```

---

### 長期実装（Phase 3: 2-3ヶ月）

#### 1. OAuth 2.1移行

`src/lib/auth/oauth.ts`:
```typescript
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  'http://localhost:3000/callback'
)

export async function getAuthUrl(scopes: string[]) {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  })
}

export async function handleCallback(code: string) {
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)
  return tokens
}
```

#### 2. .well-known/mcp エンドポイント

`src/app/api/mcp/.well-known/mcp/route.ts`:
```typescript
export async function GET() {
  const capabilities = {
    name: 'taisun-agent-mcp',
    version: '2.0.0',
    tools: [
      {
        name: 'interactive-video-platform',
        description: '4K interactive video with TTS',
        parameters: {
          script: { type: 'string', required: true },
          voiceId: { type: 'string', required: true }
        }
      }
      // ... 他のツール
    ],
    resources: [
      { uri: 'skill://interactive-video-platform', mimeType: 'application/json' }
    ],
    prompts: [
      { name: 'taiyo-style-vsl', description: 'VSL台本生成' }
    ]
  }

  return Response.json(capabilities)
}
```

#### 3. 条件付き権限

`src/lib/auth/permissions.ts`:
```typescript
interface PermissionContext {
  user: User
  skill: string
  action: 'read' | 'write' | 'execute'
  time: Date
}

export function checkPermission(ctx: PermissionContext): boolean {
  // 時間ベース制限
  const hour = ctx.time.getHours()
  if (hour >= 22 || hour < 6) {
    console.warn('Restricted hours (22:00-6:00)')
    return ctx.action === 'read'  // 読み取り専用
  }

  // ロールベース制限
  if (ctx.user.role !== 'admin' && ctx.action === 'write') {
    console.warn('Write access requires admin role')
    return false
  }

  // スキル別制限
  const dangerousSkills = ['delete-all-data', 'deploy-to-production']
  if (dangerousSkills.includes(ctx.skill) && ctx.user.role !== 'admin') {
    return false
  }

  return true
}
```

#### 4. Type II認証取得

**必要ステップ**:
1. SAST/SCAパイプライン構築（✅ Phase 1で実装済み）
2. セキュリティ監査（外部企業に依頼）
3. ペネトレーションテスト
4. 脆弱性管理プロセスの文書化
5. インシデント対応計画の策定
6. 認証機関への申請

**想定コスト**: $10,000 - $50,000（監査費用）

#### 5. セルフヒーリング機構

`src/lib/self-healing.ts`:
```typescript
import { analyzeError } from './error-analyzer'
import { generateFix } from './ai-fixer'

export async function attemptSelfHeal(
  error: Error,
  context: { skill: string; phase: string }
): Promise<{ healed: boolean; fix?: string }> {
  // エラーパターン分析
  const analysis = await analyzeError(error, context)

  if (analysis.knownIssue) {
    // 既知の問題 → 自動修正
    console.log(`Known issue detected: ${analysis.pattern}`)
    const fix = analysis.fix
    await applyFix(fix, context)
    return { healed: true, fix }
  }

  // 未知の問題 → AI修正試行
  console.log('Unknown issue, attempting AI fix...')
  const fix = await generateFix(error, context)

  if (fix.confidence > 0.8) {
    await applyFix(fix.code, context)
    return { healed: true, fix: fix.code }
  }

  return { healed: false }
}

async function applyFix(fix: string, context: { skill: string }) {
  // ドライランで安全性確認
  const dryRunResult = await executeDryRun(fix, context)

  if (dryRunResult.safe) {
    await executeReal(fix, context)
    console.log('✅ Fix applied successfully')
  } else {
    console.warn('⚠️  Fix deemed unsafe, manual intervention required')
  }
}
```

---

## 8. ブロック最小化のベストプラクティス

### 13層防御システムとの統合

| Layer | 既存機能 | 追加機能（マーケットプレイス学習） |
|-------|---------|-----------------------------------|
| 0 | CLAUDE.md絶対遵守 | + SKILL.md標準 |
| 1 | SessionStart Injector | + プログレッシブディスクロージャ |
| 2 | Permission Gate | + 条件付き権限（時間・ロール・スキル別） |
| 3 | Read-before-Write | + インタラクティブテスト（dry-run） |
| 4 | Baseline Lock | + .well-known/mcp メタデータ |
| 5 | Skill Evidence | + レコメンデーションエンジン |
| 6 | Deviation Approval | + 協調的レビュー（削除前に対話） |
| 7 | Agent Enforcement | + 意図ベース設計 |
| 8 | Copy Safety | + マルチスキャナ（npm audit + semgrep + snyk） |
| 9 | Input Sanitizer | + リトライロジック（指数バックオフ） |
| 10 | Skill Auto-Select | + セマンティック検索 |
| 11 | Definition Lint | + SKILL.md構造検証 |
| 12 | Context Quality | + メタデータ先行読み込み |
| **13** | **Multi-Scanner** | **VirusTotal + 偽陽性許容（96%でも厳格維持）** |

### エラーリカバリー戦略

#### 1. 段階的失敗（Graceful Degradation）

```typescript
async function executeSkill(skillName: string, params: object) {
  try {
    // Phase 1: メタデータ読み込み（軽量）
    const metadata = await loadMetadata(skillName)

    // Phase 2: 詳細読み込み（必要時のみ）
    if (params.dryRun) {
      console.log('Dry-run mode, skipping full load')
      return { success: true, skipped: true }
    }

    const skill = await loadFullSkill(skillName)

    // Phase 3: 実行
    return await skill.execute(params)
  } catch (error) {
    // セルフヒーリング試行
    const { healed, fix } = await attemptSelfHeal(error, { skill: skillName })

    if (healed) {
      console.log(`✅ Self-healed with fix: ${fix}`)
      return await executeSkill(skillName, params)  // Retry
    }

    // 失敗を記録してフィードバックループへ
    await logFailure(skillName, error)
    throw error
  }
}
```

#### 2. フィードバックループ

`src/lib/feedback-loop.ts`:
```typescript
interface FailureLog {
  skill: string
  error: string
  context: object
  timestamp: Date
}

const failureDb: FailureLog[] = []

export async function logFailure(skill: string, error: Error) {
  failureDb.push({
    skill,
    error: error.message,
    context: { stack: error.stack },
    timestamp: new Date()
  })

  // 同じエラーが3回以上 → パターン検出
  const recentFailures = failureDb.filter(
    (log) => log.skill === skill && log.error === error.message
  )

  if (recentFailures.length >= 3) {
    console.warn(`⚠️  Recurring error in ${skill}: ${error.message}`)
    await createGitHubIssue({
      title: `Recurring error in ${skill}`,
      body: `Error: ${error.message}\nOccurrences: ${recentFailures.length}`,
      labels: ['bug', 'auto-detected']
    })
  }
}
```

#### 3. スコープ縮小（Blast Radius Reduction）

**読み取り専用モード**:
```typescript
// .env
TAISUN_MODE=readonly  # readonly | limited | full

// src/lib/permissions.ts
export function checkWritePermission(skill: string): boolean {
  const mode = process.env.TAISUN_MODE

  if (mode === 'readonly') {
    console.warn('System in read-only mode')
    return false
  }

  if (mode === 'limited') {
    const allowedSkills = ['taiyo-style-vsl', 'agentic-vision']
    return allowedSkills.includes(skill)
  }

  return true  // full mode
}
```

---

## 9. 他プロジェクトへの汎用化

### 汎用スキルマネージャー（Universal Skill Manager）

**ディレクトリ構造**:
```
universal-skill-manager/
  src/
    core/
      skill-loader.ts          # プログレッシブディスクロージャ
      skill-validator.ts       # SKILL.md検証
      skill-recommender.ts     # セマンティック検索
    security/
      multi-scanner.ts         # npm audit + semgrep + snyk
      permission-checker.ts    # 条件付き権限
    error/
      retry.ts                 # 指数バックオフ
      self-healing.ts          # AI自動修正
    community/
      review-system.ts         # upvote/downvote
      quality-checker.ts       # 最小スター数フィルタ
  skills/
    template/
      metadata.json
      SKILL.md
      index.ts
```

**NPMパッケージ化**:
```json
{
  "name": "@taisun/universal-skill-manager",
  "version": "1.0.0",
  "description": "Marketplace-inspired skill manager for AI agents",
  "exports": {
    "./core": "./dist/core/index.js",
    "./security": "./dist/security/index.js",
    "./error": "./dist/error/index.js",
    "./community": "./dist/community/index.js"
  }
}
```

**他プロジェクトでの使用例**:
```typescript
import { loadSkill } from '@taisun/universal-skill-manager/core'
import { scanSkill } from '@taisun/universal-skill-manager/security'
import { retryWithBackoff } from '@taisun/universal-skill-manager/error'

// スキル読み込み
const skill = await loadSkill('my-custom-skill')

// セキュリティスキャン
const scanResults = await scanSkill('./skills/my-custom-skill')
if (!scanResults.every((r) => r.safe)) {
  throw new Error('Security scan failed')
}

// 実行（リトライ付き）
await retryWithBackoff(() => skill.execute())
```

---

## 10. 結論と未解決課題

### 結論

5つのマーケットプレイスから以下の普遍的原則を抽出：

1. **多層防御が必須**: 単一スキャンは96%偽陽性の現実、複数メカニズムで補完
2. **コミュニティ検証が信頼の基盤**: 最小スター数 + レビュー + 身元確認
3. **意図ベース設計が鍵**: 1:1 APIラップは非効率、ユーザー意図を優先
4. **段階的権限が安全**: 読み取り専用 → 制限付き → フルアクセス
5. **協調的解決が削除より優先**: リポジトリオーナーとの対話で修正を試みる

### 重要ポイント（再掲）

- **OAuth 2.1**: 細粒度権限で企業級セキュリティ（[Best MCP Gateways](https://www.integrate.io/blog/best-mcp-gateways-and-ai-agent-security-tools/)）
- **SKILL.md標準**: 25,000+スキルの互換性保証（[SkillsMP](https://skillsmp.com/)）
- **プログレッシブディスクロージャ**: コンテキスト効率化（[SkillsMP Guide](https://smartscope.blog/en/blog/skillsmp-marketplace-guide/)）
- **マルチスキャナ**: 447万モデルスキャンの実績（[Hugging Face](https://huggingface.co/blog/pai-6-month)）
- **セルフヒーリング**: AI品質保証の未来（[AI in QA](https://appinventiv.com/blog/ai-in-quality-assurance/)）

### 未解決課題・追加調査が必要な領域

#### 1. コスト最適化

**課題**: マルチスキャナ + OAuth 2.1 + レコメンデーションエンジン = コスト増

**追加調査**:
- 各スキャナの月額コスト（npm audit無料、Snyk有料）
- OpenAI Embeddings APIコスト vs ローカルモデル（sentence-transformers）
- OAuth 2.1実装コスト vs 既存APIキーメンテナンスコスト

#### 2. 偽陽性との戦い

**課題**: Picklescan 96%偽陽性を許容するか、フィルタリングするか

**追加調査**:
- 偽陽性をAIで分類する手法（Hugging Faceの内部手法）
- 真陽性4%を見逃さないための閾値設定
- ホワイトリスト管理の運用コスト

#### 3. コミュニティ冷え込み対策

**課題**: 厳格スキャンでスキル公開のハードルが上がり、コミュニティが萎縮

**追加調査**:
- SkillsMP「収集フェーズ → キュレーションフェーズ」の移行タイミング
- ClawHub ClawHavoc事件後のコミュニティ反応
- 段階的導入（最初は緩く、徐々に厳格化）の事例

#### 4. セルフヒーリングの限界

**課題**: AI修正の信頼性（confidence > 0.8で本当に安全か）

**追加調査**:
- AI生成コードのバグ率（GitHub Copilot等の統計）
- ドライランで検出できない副作用（外部API呼び出し等）
- 人間レビューとのハイブリッドアプローチ

#### 5. プライバシー vs 品質

**課題**: ダッシュボードでの使用量追跡 vs ユーザープライバシー

**追加調査**:
- GDPR準拠のテレメトリ収集（オプトイン/オプトアウト）
- 匿名化手法（k-匿名性、差分プライバシー）
- Hugging Face等のプライバシーポリシー詳細

---

## Sources（出典一覧）

### MCP.so
- [Best MCP Gateways and AI Agent Security Tools (2026)](https://www.integrate.io/blog/best-mcp-gateways-and-ai-agent-security-tools/)
- [MCP Security Vulnerabilities: Prevention Guide](https://www.practical-devsecops.com/mcp-security-vulnerabilities/)
- [MCP Server Finder Directory](https://www.mcpserverfinder.com)
- [SEP: .well-known/mcp Discovery Endpoint](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1960)
- [MCP Server Best Practices for 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026)
- [MCP Best Practices for Building Servers](https://www.philschmid.de/mcp-best-practices)

### SkillsMP
- [Agent Skills Marketplace - Claude, Codex & ChatGPT Skills](https://skillsmp.com/)
- [About SkillsMP](https://skillsmp.com/about)
- [SkillsMP Complete Guide](https://smartscope.blog/en/blog/skillsmp-marketplace-guide/)
- [SkillsMP Documentation](https://skillsmp.com/docs)

### Smithery AI
- [Smithery - Turn scattered context into skills for AI](https://smithery.ai/)
- [Smithery AI: A central hub for MCP servers](https://workos.com/blog/smithery-ai)
- [GitHub - smithery-ai/cli](https://github.com/smithery-ai/cli)
- [Smithery CLI Documentation](https://smithery.ai/docs/concepts/cli)

### RapidAPI
- [RapidAPI Review: What is RapidAPI](https://apidog.com/blog/what-is-rapidapi-and-how-to-use-it/)
- [Best Practices for Creating Good API Errors](https://rapidapi.com/guides/practices-api-errors)
- [Recommendation Engine API](https://rapidapi.com/algorithms.io/api/recommendation-engine)
- [FastAPI Best Practices for Production: Complete 2026 Guide](https://fastlaunchapi.dev/blog/fastapi-best-practices-production-2026)

### Hugging Face
- [4M Models Scanned: Protect AI + Hugging Face 6 Months In](https://huggingface.co/blog/pai-6-month)
- [Hugging Face Security](https://huggingface.co/docs/hub/en/security)
- [Hugging Face Content Policy](https://huggingface.co/content-policy)
- [Hugging Face Code of Conduct](https://huggingface.co/code-of-conduct)
- [Hugging Face Unsafe Models](https://docs.mend.io/platform/latest/huggingface-unsafe-models)

### ベストプラクティス
- [AI in Quality Assurance: The Next Stage of Automation Disruption](https://appinventiv.com/blog/ai-in-quality-assurance/)
- [ClawHub Skills Marketplace: Developer Guide 2026](https://www.digitalapplied.com/blog/clawhub-skills-marketplace-developer-guide-2026)
- [SkillHub - Claude Skills & Agent Skills Marketplace](https://www.skillhub.club)
- [The Best MCP Servers for Developers in 2026](https://www.builder.io/blog/best-mcp-servers-2026)

---

## 次のアクション

### 即座に実行（今週）

1. ✅ **SKILL.md標準化**: 全スキルをテンプレート化
2. ✅ **metadata.json作成**: プログレッシブディスクロージャの準備
3. ✅ **統一エラーレスポンス**: `src/lib/error-handler.ts`実装
4. ✅ **リトライロジック**: `src/lib/retry.ts`実装

### 来週実行

5. **最小スター数フィルタ**: `scripts/skill-quality-check.ts`
6. **マルチスキャナ統合**: npm audit + semgrep + snyk
7. **ダッシュボード基盤**: Next.js App Routerセットアップ

### 1ヶ月以内

8. **コミュニティレビューDB**: Prismaスキーマ設計
9. **レコメンデーションエンジン**: OpenAI Embeddings試作
10. **インタラクティブテスト**: `taisun skill inspect`コマンド

---

**調査完了日**: 2026-02-13
**次回更新**: 実装進捗に応じて随時更新
