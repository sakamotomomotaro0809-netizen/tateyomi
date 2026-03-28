# Workflow State Management (Phase 1)

## 概要

Workflow State Managementは、複雑なタスク（動画生成、開発プロセス等）を段階的に進めるための状態管理システムです。
AIの「勝手なショートカット」や「セッション跨ぎの忘却」を防ぐために設計されています。

**Phase 1の範囲**: 状態管理のみ（強制機能はPhase 2で実装予定）

## なぜ必要か

### 問題

1. **AIの善意の省略**: 「時間短縮のため」にフェーズをスキップする
2. **セッション跨ぎの忘却**: セッションが切れると進捗を忘れる
3. **曖昧な完了判定**: 「完了しました」が実際には未完了

### Phase 1の解決策

- **State（状態）**: `.workflow_state.json`に進捗を永続化
- **Visibility（可視化）**: 現在フェーズと必須成果物を明示
- **Verification（検証）**: 完了条件をチェックしてから次へ進む

## アーキテクチャ

```
.workflow_state.json          # 唯一の真実（Single Source of Truth）
    ↑↓
src/proxy-mcp/workflow/
    ├── types.ts              # 型定義
    ├── store.ts              # 状態の永続化
    ├── registry.ts           # ワークフロー定義の読み込み
    └── engine.ts             # 状態機械のロジック
    ↓
scripts/workflow/             # CLIインターフェース
    ├── start.ts
    ├── status.ts
    ├── next.ts
    └── verify.ts
    ↓
.claude/commands/             # Claudeコマンド
    ├── workflow-start.md
    ├── workflow-status.md
    ├── workflow-next.md
    └── workflow-verify.md
```

## 使い方

### 1. ワークフロー開始

```bash
# 動画生成ワークフローを開始
npm run workflow:start -- video_generation_v1

# または Claudeコマンドで
/workflow-start -- video_generation_v1
```

実行結果:
```
✅ Workflow started: video_generation_v1
📍 Current phase: phase_0
🔒 Strict mode: OFF

次のステップ: npm run workflow:status
```

### 2. 状態確認

```bash
npm run workflow:status
```

実行結果:
```
=== Workflow Status ===

Workflow: video_generation_v1
Progress: 1/9
Strict: OFF

現在のフェーズ:
  📍 phase_0: Phase 0: 企画・コンセプト設計
     動画の目的、ターゲット、構成を決定

必須成果物:
  - concept.md
  - target_audience.md

次のフェーズ:
  ➡️  phase_1: Phase 1: 台本作成

次のステップ: npm run workflow:next
```

### 3. フェーズの作業を実施

現在フェーズの必須成果物を作成します。例:

```bash
# concept.md を作成
echo "# 動画コンセプト..." > concept.md

# target_audience.md を作成
echo "# ターゲット..." > target_audience.md
```

### 4. 次のフェーズへ進む

```bash
npm run workflow:next
```

成功時:
```
✅ Phase phase_1 に進みました

次のステップ: npm run workflow:status
```

失敗時:
```
❌ Phase phase_0 の完了条件を満たしていません

  - 必須成果物が見つかりません: concept.md
```

### 5. ワークフロー完了確認

```bash
npm run workflow:verify
```

すべてのフェーズが完了している場合:
```
✅ ワークフロー完了！
すべてのフェーズと検証が完了しました。
```

未完了の場合:
```
❌ ワークフローは未完了です

  - ワークフローは完了していません。残りフェーズ: phase_7, phase_8
```

## ワークフロー定義

### ファイル構造

```
config/workflows/
├── _schema.md                   # スキーマ仕様
└── video_generation_v1.json     # 動画生成ワークフロー（Phase 0-8）
```

### 定義例

```json
{
  "id": "video_generation_v1",
  "name": "Video Generation Workflow",
  "version": "1.0.0",
  "phases": [
    {
      "id": "phase_0",
      "name": "企画・コンセプト設計",
      "requiredArtifacts": ["concept.md"],
      "validations": [
        {
          "type": "file_exists",
          "target": "concept.md",
          "errorMessage": "concept.md が必要です"
        }
      ],
      "nextPhase": "phase_1"
    }
  ]
}
```

## Phase 1 vs Phase 2

### Phase 1（デフォルト）: Advisory Mode

✅ 状態の永続化（セッション跨ぎで継続可能）
✅ 進捗の可視化（現在フェーズ、必須成果物）
✅ 完了条件の検証（次へ進む前にチェック）
✅ 完了判定（verify コマンド）
⚠️ スキル制限（警告のみ、ブロックしない）

### Phase 2（strict mode）: Enforcement Mode

✅ **Phase 1のすべて機能に加えて:**
✅ スキル実行の強制ブロック（`allowedSkills`以外は拒否）
✅ Hooksによる危険操作のブロック
✅ strict mode の完全強制

### Phase 2の使い方

```bash
# Phase 2 (strict mode) で開始
npm run workflow:start -- video_generation_v1 --strict
```

strict mode時の動作:
- ✅ 許可されていないスキルは実行不可
- ✅ 危険なBashコマンドは実行不可（`rm -rf`, `git push --force`等）
- ✅ 重要ファイルへの書き込み禁止（`.env`, `secrets/`等）

## セッション跨ぎの継続

Phase 1の最大の価値は、セッション跨ぎでも状態を保持できることです。

### シナリオ例

**Day 1（3:00 PM）**:
```bash
npm run workflow:start -- video_generation_v1
# Phase 0-2 を完了
npm run workflow:next
npm run workflow:next
npm run workflow:next
# → Phase 3 で中断（帰宅）
```

**Day 2（9:00 AM）**:
```bash
# 新しいセッションで Claude Code を起動
npm run workflow:status
# → Phase 3 から継続できる！
```

## トラブルシューティング

### state_file が壊れた場合

```bash
# 手動で削除して再開
rm .workflow_state.json
npm run workflow:start -- video_generation_v1
```

### ワークフロー定義が見つからない

```bash
# config/workflows/ を確認
ls -la config/workflows/
# → video_generation_v1.json が存在するか
```

### 検証が失敗する

```bash
# status で必須成果物を確認
npm run workflow:status

# 成果物を作成
touch <required_file>

# 再試行
npm run workflow:next
```

## Phase 2詳細: Strict Enforcement

### Proxy MCP Skill Guard

**実装場所**: `src/proxy-mcp/tools/skill.ts`

strict mode時、`allowedSkills`に含まれないスキルの実行を自動的にブロックします。

```typescript
// Phase 2: Workflow Guardian - Check if skill is allowed
if (hasState()) {
  const skillCheck = canRunSkill(skillName);
  if (!skillCheck.ok) {
    return {
      success: false,
      error: `🔒 strict mode: スキル '${skillName}' は許可されていません`,
    };
  }
}
```

### Claude Code Hooks

**実装場所**: `.claude/hooks/`

2つのhooksを提供（オプション、settings.jsonで有効化）:

1. **workflow-guard-bash.sh**: 危険なBashコマンドをブロック
   - `rm -rf`
   - `git push --force`
   - `DROP TABLE`
   - `chmod 777`
   - `sudo`
   - `.env` ファイル操作

2. **workflow-guard-write.sh**: 重要ファイルへの書き込みをブロック
   - `.env` ファイル
   - `secrets/` ディレクトリ
   - `.git/` ディレクトリ
   - `.workflow_state.json`

### Hooks有効化方法

`.claude/settings.json` で hooks を有効化:

```json
{
  "hooks": {
    "beforeBash": ".claude/hooks/workflow-guard-bash.sh",
    "beforeWrite": ".claude/hooks/workflow-guard-write.sh"
  }
}
```

デフォルトでは無効（コメントアウト）です。必要に応じて有効化してください。

### ワークフロー追加

新しいワークフローを追加する場合:

1. `config/workflows/my_workflow_v1.json` を作成
2. スキーマに従って定義
3. `npm run workflow:start -- my_workflow_v1` で開始

## まとめ

### Phase 1（Advisory Mode）
「忘却を防ぐ」ことに特化:

- ✅ セッション跨ぎで状態保持
- ✅ 現在フェーズの可視化
- ✅ 完了条件の明確化
- ✅ 完了判定の構造化

### Phase 2（Strict Mode）
「ショートカットを防ぐ」強制機能を追加:

- ✅ スキル実行の強制ブロック
- ✅ 危険操作の自動防止
- ✅ セキュリティ保護の強化

**推奨**: 本番環境や重要なワークフローでは Phase 2 (strict mode) を使用してください。
