# Workflow Guardian Phase 3 - ユーザーガイド

## 目次

1. [概要](#概要)
2. [条件分岐（Conditional Branching）](#条件分岐conditional-branching)
3. [並列実行（Parallel Execution）](#並列実行parallel-execution)
4. [ロールバック（Rollback）](#ロールバックrollback)
5. [実践例](#実践例)
6. [ベストプラクティス](#ベストプラクティス)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

Workflow Guardian Phase 3は、ワークフローに高度な制御機能を追加します：

| 機能 | 説明 | ユースケース |
|------|------|--------------|
| **条件分岐** | 実行時の条件に基づいて次のフェーズを動的に決定 | コンテンツタイプの選択、優先度判定 |
| **並列実行** | 複数のフェーズを同時に実行 | 開発とQAの並行作業、複数資材の同時制作 |
| **ロールバック** | 以前のフェーズに戻り、成果物を自動削除 | レビュー後の修正、方針変更 |

---

## 条件分岐（Conditional Branching）

### 基本概念

条件分岐により、ワークフローは実行時の状態に応じて異なるパスを選択できます。

### 条件タイプ

#### 1. `file_content` - ファイル内容で分岐

ファイルの内容を読み取り、パターンマッチングで分岐を決定します。

```json
{
  "id": "phase_0",
  "name": "コンテンツタイプ選択",
  "conditionalNext": {
    "condition": {
      "type": "file_content",
      "source": "output/content_type.txt",
      "pattern": "^(video|article|podcast)$"
    },
    "branches": {
      "video": "phase_video",
      "article": "phase_article",
      "podcast": "phase_podcast"
    },
    "defaultNext": "phase_error"
  }
}
```

**使用例**：
```bash
echo "video" > output/content_type.txt
npm run workflow:next  # → phase_videoへ遷移
```

#### 2. `file_exists` - ファイル存在で分岐

ファイルの有無で分岐を決定します。

```json
{
  "id": "phase_check",
  "name": "オプション機能チェック",
  "conditionalNext": {
    "condition": {
      "type": "file_exists",
      "source": "output/optional_feature.flag"
    },
    "branches": {
      "true": "phase_with_feature",
      "false": "phase_without_feature"
    }
  }
}
```

**使用例**：
```bash
# オプション機能を有効化
touch output/optional_feature.flag
npm run workflow:next  # → phase_with_featureへ遷移
```

#### 3. `command_output` - コマンド出力で分岐

コマンドを実行し、その出力で分岐を決定します。

```json
{
  "id": "phase_env_check",
  "name": "環境チェック",
  "conditionalNext": {
    "condition": {
      "type": "command_output",
      "source": "node -v",
      "pattern": "^v(18|20|22)\\."
    },
    "branches": {
      "v18": "phase_node18",
      "v20": "phase_node20",
      "v22": "phase_node22"
    },
    "defaultNext": "phase_unsupported"
  }
}
```

#### 4. `metadata_value` - メタデータ値で分岐

ワークフロー開始時に渡されたメタデータで分岐を決定します。

```json
{
  "id": "phase_priority",
  "name": "優先度判定",
  "conditionalNext": {
    "condition": {
      "type": "metadata_value",
      "source": "priority",
      "pattern": "^(high|normal|low)$"
    },
    "branches": {
      "high": "phase_fast_track",
      "normal": "phase_standard",
      "low": "phase_backlog"
    },
    "defaultNext": "phase_default"
  }
}
```

**使用例**：
```bash
# priority=highでワークフロー開始
npm run workflow:start -- my_workflow --strict --metadata '{"priority":"high"}'
npm run workflow:next  # → phase_fast_trackへ遷移
```

### defaultNextの重要性

条件にマッチしない場合のフォールバックとして`defaultNext`を必ず指定することを推奨します：

```json
{
  "conditionalNext": {
    "condition": { ... },
    "branches": { ... },
    "defaultNext": "phase_error"  // ← 必須ではないが強く推奨
  }
}
```

`defaultNext`がない場合、マッチしないとエラーになります。

---

## 並列実行（Parallel Execution）

### 基本概念

並列実行により、複数のフェーズを同時に進行できます。全て完了するまで待つか、1つでも完了したら次へ進むかを選択できます。

### waitStrategy

#### `all` - 全フェーズの完了を待つ

全ての並列フェーズが完了するまで次のフェーズに進みません。

```json
{
  "id": "phase_plan",
  "name": "企画",
  "requiredArtifacts": ["output/plan.txt"],
  "parallelNext": {
    "phases": ["phase_design", "phase_copy", "phase_seo"],
    "waitStrategy": "all"
  }
}
```

**実行フロー**：
```
phase_plan
    ↓
  並列実行開始
    ├─ phase_design (完了)
    ├─ phase_copy   (完了)
    └─ phase_seo    (完了)
    ↓
  全て完了後に次のフェーズへ
```

**使用例**：
```bash
# phase_planを完了
echo "plan" > output/plan.txt
npm run workflow:next  # → phase_designへ（並列実行開始）

# phase_design完了
echo "design" > output/design.txt
npm run workflow:next  # → phase_copyへ

# phase_copy完了
echo "copy" > output/copy.txt
npm run workflow:next  # → phase_seoへ

# phase_seo完了（最後のフェーズ）
echo "seo" > output/seo.txt
npm run workflow:next  # → phase_integrationへ（並列実行完了）
```

#### `any` - いずれか1つの完了で次へ

いずれか1つの並列フェーズが完了したら次のフェーズに進みます。

```json
{
  "id": "phase_fast_track",
  "name": "高速トラック",
  "parallelNext": {
    "phases": ["phase_dev", "phase_qa"],
    "waitStrategy": "any"  // どちらか1つ完了でOK
  }
}
```

**実行フロー**：
```
phase_fast_track
    ↓
  並列実行開始
    ├─ phase_dev (完了) ← 先に完了
    └─ phase_qa  (実行中)
    ↓
  1つ完了で次のフェーズへ（phase_qaは未完了のまま）
```

**使用例**：
```bash
npm run workflow:next  # → phase_devへ（並列実行開始）

# phase_devだけ完了
echo "dev done" > output/dev.txt
npm run workflow:next  # → phase_finalへ（並列実行完了、phase_qaは未完了）
```

### 並列実行の状態確認

```bash
npm run workflow:status
```

出力例：
```json
{
  "workflowId": "content_creation_v1",
  "currentPhase": "phase_copy",
  "parallelExecutions": [
    {
      "parallelGroupId": "parallel_1234567890",
      "startedPhases": ["phase_design", "phase_copy", "phase_seo"],
      "completedPhases": ["phase_design"],
      "waitStrategy": "all",
      "startedAt": "2026-01-12T04:00:00.000Z"
    }
  ]
}
```

---

## ロールバック（Rollback）

### 基本概念

ロールバックにより、以前のフェーズに戻ることができます。後続フェーズの成果物は自動的に削除されます。

### 基本的な使い方

```bash
# 現在の状態を確認
npm run workflow:status
# Progress: 5/7 (phase_4)

# phase_2にロールバック
npm run workflow:rollback -- phase_2

# 出力：
# ✅ Phase phase_2 にロールバックしました
# 削除された成果物: 2個
# 削除されたファイル:
#   - output/phase_3_artifact.txt
#   - output/phase_4_artifact.txt
```

### 理由の記録

ロールバックの理由を記録できます（推奨）：

```bash
npm run workflow:rollback -- phase_2 "デザインレビューで修正が必要"
```

理由は`rollbackHistory`に記録され、後で参照できます。

### ロールバック制限

フェーズごとにロールバック可能な範囲を制限できます：

```json
{
  "id": "phase_production",
  "name": "本番環境",
  "allowRollbackTo": ["phase_staging"],  // phase_stagingへのみロールバック可
  "nextPhase": null
}
```

制限がある場合、許可されていないフェーズへのロールバックはエラーになります：

```bash
npm run workflow:rollback -- phase_planning
# ❌ Error: Rollback to phase_planning is not allowed from phase_production
```

### ロールバック履歴の確認

```bash
npm run workflow:status
```

出力例：
```json
{
  "currentPhase": "phase_2",
  "rollbackHistory": [
    {
      "rollbackId": "rollback_1234567890",
      "fromPhase": "phase_4",
      "toPhase": "phase_2",
      "reason": "デザインレビューで修正が必要",
      "deletedArtifacts": [
        "output/phase_3_artifact.txt",
        "output/phase_4_artifact.txt"
      ],
      "timestamp": "2026-01-12T04:00:00.000Z"
    }
  ]
}
```

---

## 実践例

### 例1: コンテンツ制作ワークフロー

条件分岐と並列実行を組み合わせた実践例です。

**ワークフロー定義**：
```json
{
  "id": "content_creation_v1",
  "name": "コンテンツ制作ワークフロー",
  "phases": [
    {
      "id": "phase_0",
      "name": "コンテンツタイプ選択",
      "conditionalNext": {
        "condition": {
          "type": "file_content",
          "source": "output/content_type.txt",
          "pattern": "^(video|article)$"
        },
        "branches": {
          "video": "phase_video_plan",
          "article": "phase_article_plan"
        }
      }
    },
    {
      "id": "phase_video_plan",
      "name": "動画企画",
      "requiredArtifacts": ["output/video_plan.txt"],
      "parallelNext": {
        "phases": ["phase_script", "phase_thumbnail"],
        "waitStrategy": "all"
      }
    },
    {
      "id": "phase_script",
      "name": "台本作成",
      "requiredArtifacts": ["output/script.txt"],
      "nextPhase": "phase_review"
    },
    {
      "id": "phase_thumbnail",
      "name": "サムネイル作成",
      "requiredArtifacts": ["output/thumbnail.txt"],
      "nextPhase": "phase_review"
    },
    {
      "id": "phase_article_plan",
      "name": "記事企画",
      "requiredArtifacts": ["output/article_plan.txt"],
      "nextPhase": "phase_review"
    },
    {
      "id": "phase_review",
      "name": "最終レビュー",
      "allowRollbackTo": ["phase_0", "phase_video_plan", "phase_article_plan"],
      "nextPhase": null
    }
  ]
}
```

**実行手順**：

```bash
# 1. ワークフロー開始
npm run workflow:start -- content_creation_v1 --strict

# 2. コンテンツタイプ選択
echo "video" > output/content_type.txt
npm run workflow:next  # → phase_video_planへ

# 3. 動画企画作成
echo "企画内容" > output/video_plan.txt
npm run workflow:next  # → phase_scriptへ（並列実行開始）

# 4. 台本作成
echo "台本内容" > output/script.txt
npm run workflow:next  # → phase_thumbnailへ

# 5. サムネイル作成
echo "サムネイル" > output/thumbnail.txt
npm run workflow:next  # → phase_reviewへ（並列実行完了）

# 6. レビュー後、企画からやり直しが必要な場合
npm run workflow:rollback -- phase_video_plan "企画の見直しが必要"

# 7. 完了確認
npm run workflow:verify
```

### 例2: 優先度ベースの開発ワークフロー

メタデータと並列実行を組み合わせた例です。

**ワークフロー開始**：
```bash
# 高優先度プロジェクト
npm run workflow:start -- dev_workflow_v1 --strict --metadata '{"priority":"high"}'

# 通常優先度プロジェクト
npm run workflow:start -- dev_workflow_v1 --strict --metadata '{"priority":"normal"}'
```

**ワークフロー定義の一部**：
```json
{
  "id": "phase_0",
  "name": "優先度判定",
  "conditionalNext": {
    "condition": {
      "type": "metadata_value",
      "source": "priority",
      "pattern": "^(high|normal)$"
    },
    "branches": {
      "high": "phase_fast_track",
      "normal": "phase_standard"
    }
  }
},
{
  "id": "phase_fast_track",
  "name": "高速トラック",
  "parallelNext": {
    "phases": ["phase_dev", "phase_qa"],
    "waitStrategy": "any"  // どちらか1つ完了でOK
  }
},
{
  "id": "phase_standard",
  "name": "標準トラック",
  "parallelNext": {
    "phases": ["phase_dev", "phase_qa"],
    "waitStrategy": "all"  // 両方完了が必要
  }
}
```

---

## ベストプラクティス

### 条件分岐

1. **defaultNextを必ず設定**
   - 予期しない値に対するフォールバックを用意
   - エラーハンドリング用のフェーズに遷移

2. **条件を明確に文書化**
   ```json
   {
     "description": "コンテンツタイプ(video/article/podcast)に基づいて分岐"
   }
   ```

3. **パターンは厳格に**
   ```json
   "pattern": "^(video|article|podcast)$"  // 完全一致
   ```
   曖昧なパターンは予期しない動作の原因になります。

### 並列実行

1. **成果物の依存関係を考慮**
   - 独立した作業のみ並列化
   - 依存関係がある場合は順次実行

2. **waitStrategyの選択**
   - `all`: 品質重視、全タスク必須の場合
   - `any`: スピード重視、いずれかで十分な場合

3. **並列フェーズ数は適度に**
   - 推奨: 2-5個
   - 多すぎると管理が複雑になります

### ロールバック

1. **理由を必ず記録**
   ```bash
   npm run workflow:rollback -- phase_2 "デザインレビューで修正が必要"
   ```

2. **重要フェーズには制限を設定**
   ```json
   {
     "id": "phase_production",
     "allowRollbackTo": ["phase_staging"]
   }
   ```

3. **ロールバック前に状態確認**
   ```bash
   npm run workflow:status  # 現在位置と成果物を確認
   npm run workflow:rollback -- target_phase
   ```

---

## トラブルシューティング

### Q: 条件分岐でエラーが発生する

**エラー**：
```
条件分岐の評価に失敗しました。
条件値: "unknown"
利用可能な分岐: video, article, podcast
デフォルト遷移: (なし)
```

**解決策**：
1. `defaultNext`を追加
2. ファイル内容やパターンを確認

### Q: 並列実行が進まない

**症状**：並列フェーズの1つが完了しても次に進まない

**原因と解決策**：
- `waitStrategy: "all"`の場合、全フェーズの完了が必要
- 各並列フェーズの`requiredArtifacts`を確認
- `npm run workflow:status`で並列実行の状態を確認

### Q: ロールバックが拒否される

**エラー**：
```
Rollback to phase_0 is not allowed from phase_production
```

**解決策**：
- `allowRollbackTo`の設定を確認
- 許可されたフェーズにのみロールバック可能

### Q: 成果物が削除されない

**症状**：ロールバック後も成果物が残っている

**原因**：
- フェーズ定義に`requiredArtifacts`が設定されていない
- ロールバックは`requiredArtifacts`に記載されたファイルのみ削除します

**解決策**：
```json
{
  "id": "phase_impl",
  "requiredArtifacts": [
    "output/code.txt",
    "output/tests.txt"
  ]
}
```

---

## まとめ

Phase 3の3つの機能を組み合わせることで、複雑で柔軟なワークフローを構築できます：

- **条件分岐**: 状況に応じた動的なルート選択
- **並列実行**: 効率的な同時タスク処理
- **ロールバック**: 安全なやり直しと修正

これらの機能は、Phase 1-2の既存ワークフローと完全に互換性があります。段階的に導入して、チームのワークフローを最適化してください。

---

## テスト実行

Phase 3のテストは、ファイルシステムの競合を避けるため、専用スクリプトで実行してください：

```bash
# Phase 3テストのみ実行（推奨）
npm run test:workflow-phase3

# 全テスト実行（Phase 3テストは除外される）
npm test

# 全テストを順次実行（時間がかかる）
npm test -- --runInBand
```

**重要**: `npm test` では Phase 3 テストは自動的にスキップされます。Phase 3 の機能をテストする場合は、必ず `npm run test:workflow-phase3` を使用してください。
