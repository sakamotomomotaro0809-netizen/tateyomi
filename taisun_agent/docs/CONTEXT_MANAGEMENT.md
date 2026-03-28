# コンテキスト管理システム完全ガイド

## 📚 目次
1. [概要](#概要)
2. [コンテキスト節約戦略](#コンテキスト節約戦略)
3. [メモリーシステム階層](#メモリーシステム階層)
4. [実装詳細](#実装詳細)
5. [使用方法](#使用方法)
6. [統計と効果](#統計と効果)

---

## 概要

TAISUN v2では、**3段階のコンテキスト管理システム**を実装し、セッション間の継続性を確保しながら、コンテキスト使用量を**99%削減**しています。

### 基本設計思想

```
過去の作業 (3,422,754 トークン)
    ↓ 圧縮・インデックス化
現在の読み込み (29,183 トークン)
    ↓ 節約
実質コスト削減 (3,393,571 トークン = 99%)
```

---

## コンテキスト節約戦略

### 1. ユーザー側の対策（グローバル設定）

場所: `~/.claude/CLAUDE.md`

```markdown
## Context Low 対策（最重要）

### 即座に実行すべきこと
「Context low」が出たら：
1. `/compact` を実行
2. 新しいセッションを開始

### 予防策
1. **ログを読まない** - grep で必要な行だけ抽出
2. **大きなファイルを全部読まない** - 行番号指定で部分読み
3. **出力を抑制** - `> /dev/null 2>&1` を使う
4. **バックグラウンド実行** - `&` で実行して完了を待つ

### 推奨コマンドパターン
```bash
# ❌ 悪い例（コンテキスト消費大）
python auto.py
cat session.log
tail -f output.log

# ✅ 良い例（コンテキスト節約）
python auto.py > run.log 2>&1 &
grep -i error run.log | tail -3
ls output/*/final_*.mp4
```
```

### 2. プロジェクト側の対策

#### 遅延ロード (Lazy Loading)
```typescript
// ❌ 悪い例：起動時に全モジュールロード
import { heavyModule } from './heavy';

// ✅ 良い例：必要な時だけロード
async function useHeavyFeature() {
  const { heavyModule } = await import('./heavy');
  return heavyModule();
}
```

#### 出力外部化
```typescript
// ❌ 悪い例：会話に大量出力
console.log(JSON.stringify(bigData, null, 2));

// ✅ 良い例：ファイルに書き出し
writeFileSync('artifacts/result.json', JSON.stringify(bigData));
console.log('結果を artifacts/result.json に保存しました');
```

### 3. 書き込み操作の最適化 🆕

**問題**: Writeツールは全内容をメッセージ履歴に記録する

#### Agent委託（最も効果的）
```bash
# ❌ 悪い例：大きなファイルを直接Write
Write hero_styles.css (14KB)  → 14KB全てが履歴に記録

# ✅ 良い例：Agent委託
/Task frontend-developer "hero_styles.css を生成"
→ Agentの作業は圧縮される
→ 結果のみを受け取る
```

#### ファイルサイズ別ガイドライン
```markdown
< 5KB   : 直接Write OK
5-20KB  : Agent委託を検討 or Write後に/compact
20-50KB : Agent委託推奨
> 50KB  : 必須Agent委託 or 外部生成
```

#### バッチ処理
```bash
# 3-5ファイル生成したら/compact
Write file1.md
Write file2.md
Write file3.md
/compact  # ← ここで圧縮
Write file4.md
Write file5.md
Write file6.md
/compact  # ← 再度圧縮
```

#### 自動監視（実装済み）
```bash
# .claude/hooks/context-monitor.js が自動で：
- ファイルサイズチェック（5KB/20KB/50KB閾値）
- コンテキスト使用率監視（60%/75%/85%警告）
- Agent委託・/compact推奨を表示
```

**詳細**: `docs/CONTEXT_WRITE_OPTIMIZATION.md` を参照

---

## メモリーシステム階層

### 階層1: 指示忠実性フレームワーク（基本台帳）

**場所**: `.claude/` ディレクトリ

| ファイル | 目的 | 更新頻度 |
|---------|------|---------|
| `directives.md` | ユーザー指示の構造化記録 | タスク開始時 |
| `mistakes.md` | 過去のミスと再発防止策 | ミス発生時 |
| `task_contract.md` | 現在のタスク契約 | タスク開始時/完了時 |
| `pins.md` | 「ここを修正」の"ここ"固定 | 修正指示時 |
| `memory.md` | 長期に効く不変ルール | 初期設定/ルール追加時 |

#### directives.md の構造
```markdown
## YYYY-MM-DD Task: タスク名
- **Goal**: 目標
- **Constraints**: 制約条件（Must）
- **Never Do**: 禁止事項（Must NOT）
- **DoD**: 完了条件
- **Directive Diff**: 既存契約との差分
- **Status**: 状態
```

#### mistakes.md の構造
```markdown
## YYYY-MM-DD Mistake: mistake-id
- **Symptom**: 症状
- **Root cause**: 根本原因
- **Where it happened**: 発生場所
- **Fix**: 修正内容
- **Prevention**: 再発防止策（チェックリスト）
- **Related constraints**: 関連ルール
```

#### task_contract.md の構造
```markdown
## Goal
- 現在のタスクの目標

## Deliverables
- Issue, PR, Docs, Tests

## Constraints (Must)
- 守るべき制約

## Never Do (Must NOT)
- 禁止事項

## Acceptance Criteria / DoD
- [ ] 完了条件チェックリスト

## Regression Checklist (from mistakes.md)
- [ ] 過去のミスを繰り返さないためのチェック

## Plan (file-level)
- 変更予定のファイルリスト

## Status
- 現在の状態
```

### 階層2: セッション記憶強化

#### 2-1. セッションブリーフィング

**実装**: `scripts/session-briefing.ts`

```bash
npm run briefing        # ブリーフィング表示
npm run briefing:sync   # Memory同期も実行
```

**表示内容**:
1. 現在の状態 (task_contract.md)
2. 未完了のDoD項目
3. 再発防止リマインダー（直近3件）
4. 重要ルール（Proxy-Only, 最小差分, No-Guessing）

#### 2-2. MCP Memory統合

**実装**: `src/proxy-mcp/memory/directive-sync.ts`

- directives.md, mistakes.mdをMemoryServiceに自動同期
- セマンティック検索が可能
- タグベースのフィルタリング

```typescript
import { syncDirectivesToMemory } from './src/proxy-mcp/memory/directive-sync';

// 同期実行
const result = await syncDirectivesToMemory();
console.log(`✅ Synced ${result.synced} entries`);
```

### 階層3: 分散メモリーコンテキスト（CLAUDE.md）

**配置**: プロジェクト内56箇所

- `.claude/CLAUDE.md` - メインCLAUDE.md
- `.claude/commands/CLAUDE.md` - コマンド関連
- `.claude/skills/*/CLAUDE.md` - スキル別
- `src/**/CLAUDE.md` - ソースコード別
- `tests/**/CLAUDE.md` - テスト別

**構造**:
```markdown
<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

### Jan 7, 2026

| ID | Time | T | Title | Read | Work |
|----|------|---|-------|------|------|
| #708 | 5:32 PM | 🟣 | UTF-8安全性ツール実装 | ~596 | 🛠️ 135K |

</claude-mem-context>
```

**アイコン凡例**:
- 🔴 `bugfix` - バグ修正
- 🟣 `feature` - 新機能
- 🔄 `refactor` - リファクタリング
- ✅ `change` - 変更
- 🔵 `discovery` - 調査・発見
- ⚖️ `decision` - 意思決定

**トークン表示**:
- **Read**: その記録を読むコスト
- **Work**: その作業に費やされたトークン

### 階層4: 長期エージェント統計

**場所**: `.claude/memory/`

```
.claude/memory/
├── config.yaml              # メモリーシステム設定
├── tasks/                   # 個別タスク実行記録
│   └── YYYY-MM-DD-NNN-description.yaml
├── agents/                  # エージェント別パフォーマンス統計
│   └── agent-name-stats.yaml
└── README.md
```

#### タスク記録フォーマット
```yaml
id: "2025-11-04-001"
timestamp: "2025-11-04T14:30:00Z"
request: "Original user request"
task_type: "implementation"

selected_agents:
  - backend-developer
  - api-developer

duration_ms: 45000
success: true
quality_score: 95           # 0-100

quality_metrics:
  code_coverage: 92
  documentation_complete: true
  security_review_passed: true
```

#### エージェント統計フォーマット
```yaml
agent_name: "backend-developer"
total_tasks: 150
successful_tasks: 142
failed_tasks: 8
success_rate: 0.947
avg_quality_score: 93.2
avg_duration_ms: 30000

trends:
  success_rate_trend: 0.05  # 改善中
  quality_score_trend: 2.3
  avg_duration_trend: -500  # 高速化中
```

---

## 実装詳細

### Memory++ (v1.1) 機能

#### 1. ピン留めシステム

**ファイル**: `.claude/pins.md`

```markdown
### PIN-001: ログイン処理の修正
- **Created**: 2026-01-08
- **Scope**:
  - File: `src/auth/login.ts`
  - Function: `handleLogin`
  - Line: 42-58
- **Symptom**: 認証エラーが握りつぶされる
- **Expected Behavior**: エラーをユーザーに表示
- **Anti-Regression Check**:
  - [ ] エラーハンドリングテストを追加
  - [ ] ログレベルをdebugに設定
- **Expiry Condition**: PR #123 がマージされたら解除
- **Related**: mistakes.md#silent-error-catch
```

#### 2. トレーサビリティ

**ファイル**: `traceability.yml` (自動生成)

```yaml
task_id: "2026-01-07-memory-enhancement"
dod_items:
  - id: "dod-001"
    description: "MCP Memory統合実装"
    changes:
      - file: "src/proxy-mcp/memory/directive-sync.ts"
        lines: "1-150"
    tests:
      - file: "tests/unit/directive-sync.test.ts"
        coverage: 95
    evidence:
      - type: "test-result"
        path: "artifacts/test-results.json"
      - type: "commit"
        sha: "4d0f54f"
```

#### 3. 契約Lint

**実装**: `scripts/contract-lint.ts`

```bash
npm run contract:lint
```

**検証項目**:
1. ✅ Proxy-Only: 外部MCP直接呼び出しなし
2. ✅ 日本語既定: Issue/RUNLOGは日本語
3. ✅ Secrets非露出: .env/.gitignore適切
4. ✅ エラーハンドリング: 空catch禁止
5. ✅ UTF-8安全性: safe-replace使用
6. ✅ テスト環境分離: NODE_ENV=test判定

**CI統合**:
```yaml
# .github/workflows/ci.yml
- name: Contract Lint
  run: npm run contract:lint
```

#### 4. 回帰テスト自動生成

**実装**: `scripts/mistake-to-test.ts`

```bash
npm run mistake:testgen
```

**動作**:
1. `mistakes.md` を解析
2. 各ミスパターンから `tests/regression/` にテスト生成
3. 現在17個の回帰テストを自動生成中

**例**:
```typescript
// tests/regression/silent-error-catch.test.ts
describe('Regression: silent-error-catch', () => {
  it('should not have empty catch blocks', () => {
    // mistakes.md の Prevention から自動生成
    const files = globSync('src/**/*.ts');
    files.forEach(file => {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*\}/);
    });
  });
});
```

---

## 使用方法

### 基本ワークフロー

#### 1. セッション開始時

```bash
# ブリーフィング表示
npm run briefing

# 出力例:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📋 セッション開始ブリーフィング
#
# ## 現在のタスク
# **Goal**: テスト環境でのGitHub issue自動作成を無効化
#
# **未完了のDoD**:
# - [x] テスト環境判定を追加
# - [x] リソースリーク修正
# - [ ] ドキュメント更新
#
# ## 再発防止リマインダー
# - ⚠️ success-true-on-error
# - ⚠️ command-injection-vulnerability
# - ⚠️ silent-error-catch
# - ⚠️ utf8-boundary-crash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 2. 新しいタスク開始時

```bash
# 1. directives.md に新しいタスクを追加
# 2. task_contract.md を更新
# 3. Memory同期
npm run briefing:sync
```

#### 3. ミス発生時

```bash
# 1. mistakes.md に記録
# 2. 回帰テスト生成
npm run mistake:testgen

# 3. テスト実行
npm test
```

#### 4. コミット前

```bash
# 品質チェック
npm run contract:lint    # 契約違反チェック
npm test                 # 全テスト実行

# UTF-8ファイル編集時
npm run text:utf8-guard  # 文字化けチェック
```

### Memory検索（MCP経由）

```typescript
import { MemoryService } from './src/proxy-mcp/memory';

const memory = MemoryService.getInstance();

// セマンティック検索
const results = await memory.search({
  query: 'command injection prevention',
  tags: ['security', 'mistake'],
  limit: 5
});

// タグフィルタ
const mistakes = await memory.search({
  tags: ['mistake'],
});
```

---

## 統計と効果

### コンテキスト削減効果

```
過去の作業トークン: 3,422,754 tokens
現在の読み込み:        29,183 tokens
─────────────────────────────────────
削減効果:         3,393,571 tokens (99.1%)
```

### セッション継続性向上

**Before**:
- セッション間で過去の決定を忘れる
- 同じミスを繰り返す
- 制約を無視した実装

**After**:
- セッション開始時に自動ブリーフィング
- mistakes.mdから回帰テスト自動生成（17個）
- contract-lintで制約違反を自動検出

### 品質ゲート統合

```yaml
# CI/CD統合
quality_gates:
  - contract:lint (6/6項目)
  - mistake:testgen (17 tests)
  - test:coverage (80%+)
  - security:scan (0 Critical/High)
```

### ファイル構成

```
コンテキスト管理ファイル: 56 CLAUDE.md
基本台帳: 5 ファイル (directives, mistakes, task_contract, pins, memory)
Memory++: 4 スクリプト (briefing, sync, contract-lint, mistake-testgen)
長期統計: .claude/memory/ (タスク記録 + エージェント統計)
```

---

## トラブルシューティング

### Q: Context lowエラーが出る

**A**: 即座に以下を実行
```bash
/compact
# 新しいセッションを開始
```

### Q: 大量のログを確認したい

**A**: grepで必要な部分だけ抽出
```bash
# ❌ 悪い例
cat huge.log

# ✅ 良い例
grep -i error huge.log | tail -20
```

### Q: ブリーフィングが表示されない

**A**: 手動実行
```bash
npm run briefing
```

### Q: Memory同期がうまくいかない

**A**: デバッグモードで実行
```bash
npm run briefing:sync -- --verbose
```

### Q: 契約違反が検出される

**A**: 詳細を確認
```bash
npm run contract:lint -- --verbose
```

---

## まとめ

TAISUN v2のコンテキスト管理システムは：

1. **3段階のメモリー階層**で過去の知識を保持
2. **99%のコンテキスト削減**を実現
3. **自動品質ゲート**で契約違反を防止
4. **回帰テスト自動生成**でミス再発を防止
5. **56箇所の分散CLAUDE.md**で局所的なコンテキスト提供

これにより、長期プロジェクトでも一貫した品質と指示忠実性を維持できます。
