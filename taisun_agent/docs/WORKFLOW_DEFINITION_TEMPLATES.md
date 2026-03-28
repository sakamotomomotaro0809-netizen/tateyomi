# Workflow Definition Templates

ワークフロー定義テンプレート集です。各ワークフローはフェーズ、バリデーション、許可スキルを定義します。

## 概要

ワークフロー定義（Definition）は **State/Validation** を担当します：
- フェーズ定義と遷移（`phases`）
- フェーズごとのバリデーション（`validations`）
- 許可スキル（`allowedSkills`）
- 必須成果物（`requiredArtifacts`）

## ファイル配置

```
config/workflows/
├── wf_coding_change_v1.json    # コード変更ワークフロー
├── wf_ops_runbook_v1.json      # 運用・障害対応ワークフロー
└── wf_docs_update_v1.json      # ドキュメント更新ワークフロー
```

## ワークフロー定義構造

```json
{
  "id": "workflow_id",
  "name": "Workflow Name",
  "version": "1.0.0",
  "description": "説明",
  "policy_id": "linked_policy_id",
  "phases": [
    {
      "id": "phase_1_name",
      "name": "フェーズ名",
      "description": "フェーズの目的",
      "allowedSkills": ["skill-1", "skill-2"],
      "requiredArtifacts": [],
      "validations": [
        {
          "type": "command",
          "command": "npm test",
          "errorMessage": "テストが失敗しました"
        }
      ],
      "nextPhase": "phase_2_name"
    }
  ]
}
```

---

## 1. wf_coding_change_v1 - コード変更ワークフロー

**用途**: バグ修正、機能追加、リファクタリング

### フェーズ構成

```
phase_1_intake → phase_2_reproduce → phase_3_design
                                          ↓
phase_6_finalize ← phase_5_verify ← phase_4_implement
```

| # | フェーズID | 名前 | 目的 | 許可スキル |
|---|-----------|------|------|-----------|
| 1 | phase_1_intake | 要件定義・契約 | 目的・制約・DoD確定 | requirements-elicitation, planner |
| 2 | phase_2_reproduce | 再現・調査 | 再現・原因仮説・最小修正方針 | code-searcher, log-analyzer, bug-fixer |
| 3 | phase_3_design | 設計・計画 | 最小化設計/手順確定 | system-architect, api-designer, planner |
| 4 | phase_4_implement | 実装 | 最小差分で実装 | implementer, backend-developer, frontend-developer, bug-fixer |
| 5 | phase_5_verify | 検証 | テスト/静的解析/差分確認 | test-engineer, qa-validator, code-reviewer |
| 6 | phase_6_finalize | PR作成 | コミット/PR化 | PRAgent |

### バリデーション

| フェーズ | バリデーション |
|---------|---------------|
| phase_2_reproduce | `npm test \|\| true` |
| phase_3_design | `git status` |
| phase_4_implement | `npm test`, `npm run lint \|\| true` |
| phase_5_verify | `npm test`, `npm run lint`, `npm run typecheck \|\| true` |
| phase_6_finalize | `git status` |

---

## 2. wf_ops_runbook_v1 - 運用・障害対応ワークフロー

**用途**: インシデント対応、運用作業、障害復旧

### フェーズ構成

```
phase_1_triage → phase_2_investigation → phase_3_plan
                                              ↓
phase_6_postmortem ← phase_5_verify ← phase_4_execute
```

| # | フェーズID | 名前 | 目的 | 許可スキル |
|---|-----------|------|------|-----------|
| 1 | phase_1_triage | トリアージ | 事象切り分け（影響・優先度） | incident-responder, system-diagnostician, log-analyzer |
| 2 | phase_2_investigation | 調査 | 観測・ログ・原因仮説 | log-analyzer, system-diagnostician, monitoring-specialist |
| 3 | phase_3_plan | 計画・承認 | 対応案（ロールバック含む）確定 | error-recovery-planner, incident-responder |
| 4 | phase_4_execute | 実行 | 計画に従って実行 | devops-engineer, container-specialist, cloud-architect |
| 5 | phase_5_verify | 検証 | 復旧・正常性検証 | qa-validator, monitoring-specialist, system-diagnostician |
| 6 | phase_6_postmortem | ポストモーテム | 事後レビュー・再発防止策 | learning-agent, knowledge-manager, tech-writer |

### バリデーション

| フェーズ | バリデーション |
|---------|---------------|
| phase_1_triage | `date && uptime \|\| true` |
| phase_2_investigation | `npm run workflow:status \|\| true` |
| phase_3_plan | `npm run workflow:status \|\| true` |
| phase_4_execute | `npm run workflow:status \|\| true` |
| phase_5_verify | `npm run workflow:status \|\| true` |
| phase_6_postmortem | `npm run workflow:verify \|\| true` |

---

## 3. wf_docs_update_v1 - ドキュメント更新ワークフロー

**用途**: README、設計書、運用手順書の更新

### フェーズ構成

```
phase_1_intake → phase_2_research → phase_3_write
                                        ↓
            phase_5_publish ← phase_4_review
```

| # | フェーズID | 名前 | 目的 | 許可スキル |
|---|-----------|------|------|-----------|
| 1 | phase_1_intake | 目的確認 | 更新目的・対象読者・スコープ確定 | requirements-elicitation, planner |
| 2 | phase_2_research | 調査 | 既存ドキュメント/実装をRead | researcher, code-searcher, doc-reviewer |
| 3 | phase_3_write | 執筆・編集 | 文章更新、用語一貫性担保 | tech-writer, knowledge-manager |
| 4 | phase_4_review | レビュー | セルフレビュー（誤字・リンク・手順） | doc-reviewer, code-reviewer |
| 5 | phase_5_publish | 公開・PR作成 | コミット/PR化 | PRAgent |

### バリデーション

| フェーズ | バリデーション |
|---------|---------------|
| phase_1_intake | `git status` |
| phase_2_research | `git diff \|\| true` |
| phase_3_write | `git diff`（差分がないとエラー） |
| phase_4_review | `git diff && git status` |
| phase_5_publish | `git status` |

---

## ワークフローの使用方法

### 1. ワークフロー開始

```bash
# strictモードで開始（推奨）
npm run workflow:start -- wf_coding_change_v1 --strict

# 通常モードで開始
npm run workflow:start -- wf_coding_change_v1
```

### 2. 状態確認

```bash
npm run workflow:status
```

### 3. 次フェーズへ移行

```bash
npm run workflow:next
```

### 4. 完了検証

```bash
npm run workflow:verify
```

---

## Policy と Definition の関係

| 概念 | 役割 | 保持する情報 |
|------|------|------------|
| **Policy** | Permission | allow/deny パターン、不変条件 |
| **Definition** | State/Validation | フェーズ構成、バリデーション、許可スキル |

ワークフロー定義は `policy_id` で対応するポリシーを参照：

```json
{
  "id": "wf_coding_change_v1",
  "policy_id": "coding_change_v1",
  ...
}
```

---

## カスタムワークフローの作成

新しいワークフローを作成する場合：

1. **Policy を作成**: `config/workflow-guardian/policies/` に新しいポリシーを追加
2. **Definition を作成**: `config/workflows/` に新しいワークフロー定義を追加
3. **policy_id を紐付け**: ワークフロー定義で `policy_id` を指定
4. **Registry 自動ロード**: `src/proxy-mcp/workflow/registry.ts` が自動的に読み込む

### 命名規則

- Policy: `{domain}_{version}.json` (例: `coding_change_v1.json`)
- Definition: `wf_{domain}_{version}.json` (例: `wf_coding_change_v1.json`)

---

## 関連ドキュメント

- [WORKFLOW_POLICY_TEMPLATES.md](./WORKFLOW_POLICY_TEMPLATES.md) - ポリシーテンプレート
- [WORKFLOW_STATE_MANAGEMENT.md](./WORKFLOW_STATE_MANAGEMENT.md) - 状態管理
- [WORKFLOW_PHASE3_QUICKSTART.md](./WORKFLOW_PHASE3_QUICKSTART.md) - Phase 3 クイックスタート
- [WORKFLOW_PHASE3_USER_GUIDE.md](./WORKFLOW_PHASE3_USER_GUIDE.md) - Phase 3 ユーザーガイド
