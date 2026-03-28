# Workflow Policy Templates

ワークフロー用のポリシーテンプレート集です。各ポリシーはフェーズごとの許可/拒否パターンを定義します。

## 概要

ポリシー（Policy）は **Permission** を担当します：
- フェーズごとの`allow_bash_patterns`（許可パターン）
- フェーズごとの`deny_bash_patterns`（拒否パターン）
- `invariants`（不変条件）

## ファイル配置

```
config/workflow-guardian/policies/
├── coding_change_v1.json    # コード変更用ポリシー
├── ops_runbook_v1.json      # 運用・障害対応用ポリシー
├── docs_update_v1.json      # ドキュメント更新用ポリシー
└── video_generation_v1.json # 動画生成用ポリシー
```

## ポリシー構造

```json
{
  "id": "policy_id",
  "name": "Policy Name",
  "description": "説明",
  "strict_default": true,
  "triggers_when_state_missing": ["pattern1", "pattern2"],
  "invariants": {
    "read_before_write": true,
    "completion_requires_verify": true,
    "no_new_pipeline_scripts": true,
    "baseline_files": ["important.py"],
    "require_skill_evidence": {
      "enabled": true,
      "required_skill_ids": ["skill-1", "skill-2"]
    }
  },
  "phase_permissions": {
    "1_phase_name": {
      "name": "フェーズ名",
      "deny_bash_patterns": ["dangerous_command"],
      "allow_bash_patterns": ["safe_command"]
    }
  }
}
```

---

## 1. coding_change_v1 - コード変更用ポリシー

**用途**: バグ修正、機能追加、リファクタリング

### フェーズ権限

| フェーズ | 許可 | 拒否 |
|---------|------|------|
| 1_intake | git status | git push, gh pr create, npm publish, rm -rf, sudo |
| 2_reproduce | npm test, git diff | git push, rm -rf, sudo |
| 3_design | git status | git push, rm -rf, sudo |
| 4_implement | npm test, npm run lint, git diff | git push, rm -rf, sudo |
| 5_verify | npm test, npm run lint, npm run typecheck | rm -rf, sudo |
| 6_finalize | git commit, git push, gh pr create | rm -rf, sudo |

### 不変条件

- `read_before_write`: true（未読ファイル編集禁止）
- `completion_requires_verify`: true（検証なし完了禁止）
- `no_new_pipeline_scripts`: true（新規スクリプト作成制限）

---

## 2. ops_runbook_v1 - 運用・障害対応用ポリシー

**用途**: インシデント対応、運用作業

### フェーズ権限

| フェーズ | 許可 | 拒否 |
|---------|------|------|
| 1_triage | kubectl get, docker ps, systemctl status | rm -rf, kubectl delete, DROP TABLE |
| 2_investigation | logs, describe, top | rm -rf, delete, DROP |
| 3_plan | git diff, kubectl diff | rm -rf, apply, delete, DROP |
| 4_execute | kubectl apply, docker-compose, systemctl | rm -rf, DROP TABLE |
| 5_verify | kubectl get, curl, health endpoints | rm -rf, delete |
| 6_postmortem | git commit, git push | rm -rf, delete |

### 不変条件

- `read_before_write`: true
- `completion_requires_verify`: true
- `baseline_files`: [] (ops は通常ベースラインなし)

---

## 3. docs_update_v1 - ドキュメント更新用ポリシー

**用途**: README、設計書、運用手順書の更新

### フェーズ権限

| フェーズ | 許可 | 拒否 |
|---------|------|------|
| 1_intake | ls, rg, cat, git status | git push, gh pr create, npm publish, rm -rf, sudo |
| 2_research | rg, cat, git status, git diff | git push, gh pr create, rm -rf |
| 3_write_edit | git diff, git status | git push, gh pr create, rm -rf |
| 4_review | git diff, git status | git push, gh pr create, rm -rf |
| 5_publish_pr | git commit, git push, gh pr create | rm -rf, sudo |

### 特徴

- コード変更への逸脱を防止
- 検証なし公開を防止
- 完了詐称を防止

---

## 4. video_generation_v1 - 動画生成用ポリシー

**用途**: YouTube動画、プロモーション動画の生成

### フェーズ権限

| フェーズ | 許可 | 拒否 |
|---------|------|------|
| 1_planning | ls, cat, rg, git status | ffmpeg, python.*create_video, rm -rf |
| 2_script_writing | ls, cat, rg, git status | ffmpeg, python.*create_video, rm -rf |
| 3_asset_preparation | ls, cat, rg, curl, wget | ffmpeg, python.*create_video, rm -rf |
| 4_audio_generation | ffmpeg.*audio, python.*tts, ls | ffmpeg.*video, python.*create_video, rm -rf |
| 5_image_generation | ls, cat, curl | ffmpeg.*video, python.*create_video, rm -rf |
| 6_video_assembly | python create_video.py, ffmpeg, ls | rm -rf |
| 7_quality_check | ffprobe, python.*qa, ls, stat | rm -rf |
| 8_finalize | ffmpeg, ls, stat, md5, shasum | rm -rf |

### 特徴

- スキル指示の無視を防止
- 既存スクリプトの無視を防止
- 勝手な新規スクリプト作成を防止
- 要約比率の無視を防止

### 不変条件

- `baseline_files`: ["create_video.py", "generate_video.py"]
- `require_skill_evidence.enabled`: true
- `require_skill_evidence.required_skill_ids`: ["video-production", "youtubeschool-creator", "video-policy"]

---

## ポリシーの使用方法

### 1. ワークフロー定義との紐付け

ワークフロー定義ファイル（`config/workflows/wf_*.json`）で `policy_id` を指定：

```json
{
  "id": "wf_coding_change_v1",
  "policy_id": "coding_change_v1",
  ...
}
```

### 2. ワークフロー開始時のポリシー適用

```bash
npm run workflow:start -- wf_coding_change_v1 --strict
```

### 3. フック統合

ポリシーは以下のフックで参照されます：
- `workflow-fidelity-guard.js` - Permission Gate
- `deviation-approval-guard.js` - Deviation Approval

---

## カスタムポリシーの作成

新しいポリシーを作成する場合：

1. `config/workflow-guardian/policies/` に新しい JSON ファイルを作成
2. 上記の構造に従ってフェーズ権限を定義
3. 対応するワークフロー定義を `config/workflows/` に作成
4. ワークフロー定義で `policy_id` を紐付け

---

## 関連ドキュメント

- [WORKFLOW_DEFINITION_TEMPLATES.md](./WORKFLOW_DEFINITION_TEMPLATES.md) - ワークフロー定義テンプレート
- [WORKFLOW_STATE_MANAGEMENT.md](./WORKFLOW_STATE_MANAGEMENT.md) - 状態管理
- [WORKFLOW_PHASE3_QUICKSTART.md](./WORKFLOW_PHASE3_QUICKSTART.md) - Phase 3 クイックスタート
