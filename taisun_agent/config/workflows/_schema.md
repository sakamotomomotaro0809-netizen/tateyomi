# Workflow Definition Schema

## Overview

ワークフロー定義は、複雑なタスク（動画生成、開発プロセス等）を段階的に進めるための設計図です。
各フェーズで「何ができるか」「何が必要か」を明確に定義し、AIの勝手なショートカットを防ぎます。

## Schema Structure

```json
{
  "id": "workflow_id",
  "name": "ワークフロー名",
  "version": "1.0.0",
  "description": "このワークフローの目的",
  "phases": [
    {
      "id": "phase_0",
      "name": "フェーズ名",
      "description": "このフェーズで何をするか",
      "allowedSkills": ["skill-name-1", "skill-name-2"],
      "requiredArtifacts": ["file1.json", "file2.md"],
      "validations": [
        {
          "type": "file_exists",
          "target": "sections.json",
          "errorMessage": "sections.json が必要です"
        },
        {
          "type": "command",
          "command": "npm run validate:sections",
          "errorMessage": "セクション検証が失敗しました"
        }
      ],
      "nextPhase": "phase_1"
    }
  ]
}
```

## Field Definitions

### Root Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | ワークフローの一意ID（例: `video_generation_v1`） |
| `name` | string | Yes | 人間が読める名前 |
| `version` | string | Yes | セマンティックバージョニング |
| `description` | string | No | ワークフローの説明 |
| `phases` | array | Yes | フェーズ定義の配列 |

### Phase Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | フェーズID（例: `phase_0`, `phase_2_1`）|
| `name` | string | Yes | フェーズ名 |
| `description` | string | No | フェーズの説明 |
| `allowedSkills` | array | No | このフェーズで実行可能なスキル名（空=制限なし） |
| `requiredArtifacts` | array | No | 次フェーズへ進むために必要な成果物 |
| `validations` | array | No | 次フェーズへ進む前の検証 |
| `nextPhase` | string | No | 次のフェーズID（null=最終フェーズ） |

### Validation Types

#### `file_exists`
```json
{
  "type": "file_exists",
  "target": "output/video.mp4",
  "errorMessage": "動画ファイルが生成されていません"
}
```

#### `command`
```json
{
  "type": "command",
  "command": "npm run test:video",
  "errorMessage": "動画品質チェックが失敗しました"
}
```

#### `json_schema`
```json
{
  "type": "json_schema",
  "target": "config.json",
  "schema": "schemas/config.schema.json",
  "errorMessage": "config.json のスキーマが不正です"
}
```

## Strict Mode

Phase 1では実装されませんが、Phase 2で以下が追加される予定:

- `allowedSkills` 以外のスキル実行を物理的にブロック
- `denyBashPatterns` による危険なbashコマンドのブロック
- Hook経由での強制的な検証

## Example: Software Development Workflow

```json
{
  "id": "software_change_v1",
  "name": "Software Change Workflow",
  "version": "1.0.0",
  "phases": [
    {
      "id": "phase_0_contract",
      "name": "Contract & Requirements",
      "description": "要件定義と契約",
      "requiredArtifacts": ["requirements.md"],
      "nextPhase": "phase_1_design"
    },
    {
      "id": "phase_1_design",
      "name": "Design",
      "description": "設計書作成",
      "requiredArtifacts": ["design.md", "api-spec.yaml"],
      "nextPhase": "phase_2_implement"
    },
    {
      "id": "phase_2_implement",
      "name": "Implementation",
      "description": "実装",
      "allowedSkills": ["code-reviewer", "test-generator"],
      "validations": [
        {
          "type": "command",
          "command": "npm run lint",
          "errorMessage": "Lintエラーがあります"
        },
        {
          "type": "command",
          "command": "npm test",
          "errorMessage": "テストが失敗しています"
        }
      ],
      "nextPhase": "phase_3_docs"
    },
    {
      "id": "phase_3_docs",
      "name": "Documentation",
      "description": "ドキュメント作成",
      "requiredArtifacts": ["README.md"],
      "nextPhase": "phase_4_release"
    },
    {
      "id": "phase_4_release",
      "name": "Release",
      "description": "リリース",
      "validations": [
        {
          "type": "command",
          "command": "npm run build",
          "errorMessage": "ビルドが失敗しました"
        }
      ],
      "nextPhase": null
    }
  ]
}
```

## Notes

- `allowedSkills` が空の場合、スキル実行の制限はありません（Phase 1の動作）
- `requiredArtifacts` はファイルの存在確認のみ（内容検証はvalidationsで）
- `validations` は上から順に実行され、1つでも失敗したら次フェーズへ進めません
