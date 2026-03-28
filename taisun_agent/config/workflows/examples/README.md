# Workflow Phase 3 - サンプルワークフロー

このディレクトリには、Workflow Guardian Phase 3の機能を活用した実践的なサンプルワークフローが含まれています。

## サンプル一覧

| ワークフロー | ファイル | 主な機能 | 難易度 |
|-------------|---------|----------|--------|
| **コンテンツ制作** | `content_creation_v1.json` | 条件分岐 + 並列実行 | ⭐⭐ |
| **ソフトウェア開発** | `software_development_v1.json` | 並列実行 + ロールバック | ⭐⭐⭐ |
| **優先度ベース** | `priority_based_v1.json` | 全機能統合 | ⭐⭐⭐⭐ |

---

## 1. コンテンツ制作ワークフロー

**ファイル**: `content_creation_v1.json`

**使用する機能**:
- ✅ 条件分岐 (file_content)
- ✅ 並列実行 (waitStrategy: all)
- ✅ ロールバック

**概要**:
コンテンツタイプ（動画/記事/ポッドキャスト）を選択し、タイプに応じた制作フローを実行します。動画の場合は台本・サムネイル・SEOを並列実行します。

### 使い方

```bash
# 1. output/content ディレクトリを作成
mkdir -p output/content

# 2. ワークフローを開始
npm run workflow:start -- content_creation_v1 --strict

# 3. 企画を作成
echo "コンテンツ企画" > output/content/plan.txt
npm run workflow:next

# 4. コンテンツタイプを選択（例：動画）
echo "video" > output/content/content_type.txt
npm run workflow:next  # → phase_2_video_planへ

# 5. 動画企画を作成
echo "動画企画内容" > output/content/video_plan.txt
npm run workflow:next  # → 並列実行開始

# 6. 台本作成
echo "台本内容" > output/content/video_script.txt
npm run workflow:next  # → phase_3_video_thumbnailへ

# 7. サムネイル作成
echo "サムネイル" > output/content/thumbnail.txt
npm run workflow:next  # → phase_3_video_seoへ

# 8. SEO最適化
echo "SEO情報" > output/content/seo.txt
npm run workflow:next  # → phase_4_review（並列実行完了）

# 9. レビュー後、必要であればロールバック
npm run workflow:rollback -- phase_2_video_plan "企画見直し"

# 10. 完了確認
npm run workflow:verify
```

---

## 2. ソフトウェア開発ワークフロー

**ファイル**: `software_development_v1.json`

**使用する機能**:
- ✅ 並列実行 (waitStrategy: all)
- ✅ ロールバック（複数フェーズへの制限）
- ✅ スキル制限

**概要**:
要件定義から本番デプロイまでの完全な開発ワークフロー。実装フェーズではバックエンド・フロントエンド・テストを並列実行し、QAフェーズではセキュリティとパフォーマンスのテストを並列実行します。

### 使い方

```bash
# 1. output/dev ディレクトリを作成
mkdir -p output/dev

# 2. strict modeでワークフローを開始
npm run workflow:start -- software_development_v1 --strict

# 3. 要件定義
echo "機能要件" > output/dev/requirements.txt
npm run workflow:next

# 4. 設計
echo "システム設計" > output/dev/design.txt
npm run workflow:next

# 5. 実装計画
echo "実装計画" > output/dev/implementation_plan.txt
npm run workflow:next  # → 並列実行開始

# 6. バックエンド実装
echo "バックエンドコード" > output/dev/backend_code.txt
npm run workflow:next

# 7. フロントエンド実装
echo "フロントエンドコード" > output/dev/frontend_code.txt
npm run workflow:next

# 8. テスト作成
echo "テストコード" > output/dev/tests.txt
npm run workflow:next  # → コードレビューへ（並列実行完了）

# 9. コードレビュー（問題があればロールバック可能）
echo "レビュー結果" > output/dev/review_result.txt
npm run workflow:next

# ... 以降のフェーズを続ける
```

### ロールバック例

```bash
# コードレビュー後、設計からやり直しが必要な場合
npm run workflow:rollback -- phase_1_design "アーキテクチャ変更が必要"

# 実装計画からやり直し
npm run workflow:rollback -- phase_2_implementation "実装方針の見直し"
```

---

## 3. 優先度ベースワークフロー

**ファイル**: `priority_based_v1.json`

**使用する機能**:
- ✅ 条件分岐 (metadata_value, file_content)
- ✅ 並列実行 (waitStrategy: all と any を動的に切り替え)
- ✅ ロールバック

**概要**:
プロジェクトの優先度（high/normal/low）に応じて、異なるワークフローパスと並列実行戦略を適用します。Phase 3の全機能を統合した最も複雑な例です。

### 使い方

```bash
# 1. output/priority ディレクトリを作成
mkdir -p output/priority

# 2. 高優先度プロジェクトを開始
npm run workflow:start -- priority_based_v1 --strict --metadata '{"priority":"high"}'

# 3. プロジェクト情報
echo "高優先度プロジェクト" > output/priority/project_info.txt
npm run workflow:next  # → phase_1_high_priority_planningへ

# 4. 高優先度企画
echo "企画内容" > output/priority/high_plan.txt
npm run workflow:next  # → 並列実行開始（waitStrategy: any）

# 5. 設計のみ完了（anyなので1つ完了でOK）
echo "設計書" > output/priority/design.txt
npm run workflow:next  # → すぐにphase_3_implementation_planningへ

# ... 続く

# === 通常優先度プロジェクトの場合 ===
npm run workflow:start -- priority_based_v1 --strict --metadata '{"priority":"normal"}'

# プロジェクト情報
echo "通常優先度プロジェクト" > output/priority/project_info.txt
npm run workflow:next  # → phase_1_normal_priority_planningへ

# 通常企画
echo "企画内容" > output/priority/normal_plan.txt
npm run workflow:next  # → 並列実行開始（waitStrategy: all）

# すべて完了が必要
echo "設計書" > output/priority/design.txt
npm run workflow:next
echo "リソース" > output/priority/resources.txt
npm run workflow:next
echo "リスク評価" > output/priority/risks.txt
npm run workflow:next  # → 全て完了してphase_3へ
```

### レビュー承認/却下

```bash
# レビューフェーズで承認
echo "approved" > output/priority/review_result.txt
npm run workflow:next  # → phase_7_deploymentへ

# レビューフェーズで却下
echo "rejected" > output/priority/review_result.txt
npm run workflow:next  # → phase_errorへ
```

---

## カスタマイズのヒント

### 1. 独自のワークフローを作成

これらのサンプルをベースに、プロジェクトに合わせてカスタマイズできます：

```bash
# サンプルをコピーして編集
cp content_creation_v1.json ../my_custom_workflow_v1.json
# my_custom_workflow_v1.json を編集
```

### 2. 条件分岐のカスタマイズ

```json
{
  "conditionalNext": {
    "condition": {
      "type": "metadata_value",
      "source": "your_custom_field",
      "pattern": "^(option1|option2|option3)$"
    },
    "branches": {
      "option1": "phase_a",
      "option2": "phase_b",
      "option3": "phase_c"
    },
    "defaultNext": "phase_default"
  }
}
```

### 3. 並列実行のカスタマイズ

```json
{
  "parallelNext": {
    "phases": ["phase_x", "phase_y", "phase_z"],
    "waitStrategy": "all"  // または "any"
  }
}
```

### 4. ロールバック制限のカスタマイズ

```json
{
  "id": "phase_critical",
  "allowRollbackTo": [
    "phase_safe_1",
    "phase_safe_2"
  ]
}
```

---

## トラブルシューティング

### Q: ワークフローが見つからない

```bash
# ワークフローディレクトリを確認
ls config/workflows/

# examplesディレクトリから親ディレクトリにコピー
cp config/workflows/examples/content_creation_v1.json config/workflows/
```

### Q: 条件分岐で想定外のフェーズに進む

```bash
# ファイル内容を確認
cat output/content/content_type.txt

# パターンマッチを確認
# "video\n"（改行付き）は "^video$" にマッチしません
# echo -n "video" で改行なしで書き込む
```

### Q: 並列実行が進まない

```bash
# 現在の状態を確認
npm run workflow:status

# parallelExecutions を確認
# waitStrategy: "all" の場合、すべてのフェーズ完了が必要
```

---

## 関連ドキュメント

- [Phase 3 User Guide](../../../docs/WORKFLOW_PHASE3_USER_GUIDE.md) - 詳細な使い方
- [Phase 3 API Reference](../../../docs/WORKFLOW_PHASE3_API_REFERENCE.md) - 技術仕様
- [Phase 3 Design](../../../docs/WORKFLOW_PHASE3_DESIGN.md) - 設計ドキュメント

---

## ライセンス

これらのサンプルワークフローは、TAISUN v2プロジェクトの一部として提供されています。自由にカスタマイズして使用してください。
