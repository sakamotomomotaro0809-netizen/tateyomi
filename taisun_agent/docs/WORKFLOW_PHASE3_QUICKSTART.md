# ワークフロー Phase 3 - 5分でわかるクイックスタート

初めてでも大丈夫！5分で Phase 3 の新機能を体験できます。

---

## ステップ1：準備（1分）

### 必要なもの

- TAISUN Agent v2.4.0 以降
- テキストエディタ

### インストール確認

```bash
# バージョン確認
cat package.json | grep version
# → "version": "2.4.0" と表示されればOK

# テスト実行
npm test -- --selectProjects=workflow-phase3 --runInBand
# → 50 tests passed と表示されればOK
```

---

## ステップ2：最初のワークフロー（2分）

### シナリオ：簡単なコンテンツ制作

「動画」か「記事」を選んで、それぞれの手順に進むワークフローを作ります。

#### 1. 設定ファイルを作る

ファイル：`config/workflows/my_first_workflow.json`

```json
{
  "id": "my_first_workflow",
  "name": "初めてのワークフロー",
  "version": "1.0.0",
  "description": "動画か記事を選んで制作",
  "phases": [
    {
      "id": "phase_0",
      "name": "コンテンツタイプを選ぶ",
      "description": "動画か記事か選択",
      "conditionalNext": {
        "condition": {
          "type": "file_content",
          "source": "content_type.txt",
          "pattern": "^(video|article)$"
        },
        "branches": {
          "video": "phase_video",
          "article": "phase_article"
        }
      }
    },
    {
      "id": "phase_video",
      "name": "動画制作",
      "description": "台本を書く",
      "nextPhase": null
    },
    {
      "id": "phase_article",
      "name": "記事制作",
      "description": "記事を書く",
      "nextPhase": null
    }
  ]
}
```

#### 2. コンテンツタイプを決める

```bash
# 動画を選ぶ場合
echo "video" > content_type.txt

# または、記事を選ぶ場合
echo "article" > content_type.txt
```

#### 3. ワークフローを開始

```bash
npm run workflow:start my_first_workflow
```

**結果：**
- `video` を選んだら → 「動画制作」フェーズへ
- `article` を選んだら → 「記事制作」フェーズへ

🎉 **おめでとうございます！** 条件分岐が動きました！

---

## ステップ3：並列実行を試す（2分）

### シナリオ：動画制作で同時作業

台本とサムネイルを**同時に**作る例です。

#### ワークフロー設定

ファイル：`config/workflows/parallel_workflow.json`

```json
{
  "id": "parallel_workflow",
  "name": "並列実行ワークフロー",
  "version": "1.0.0",
  "phases": [
    {
      "id": "phase_0",
      "name": "企画",
      "description": "動画の企画を立てる",
      "nextPhase": "phase_1"
    },
    {
      "id": "phase_1",
      "name": "制作開始",
      "description": "並列で作業",
      "parallelNext": {
        "phases": ["phase_script", "phase_thumbnail"],
        "waitStrategy": "all"
      }
    },
    {
      "id": "phase_script",
      "name": "台本作成",
      "description": "台本を書く",
      "requiredArtifacts": ["script.txt"],
      "nextPhase": "phase_final"
    },
    {
      "id": "phase_thumbnail",
      "name": "サムネイル作成",
      "description": "サムネイルを作る",
      "requiredArtifacts": ["thumbnail.png"],
      "nextPhase": "phase_final"
    },
    {
      "id": "phase_final",
      "name": "完成",
      "description": "全て完了",
      "nextPhase": null
    }
  ]
}
```

#### 実行

```bash
# ワークフロー開始
npm run workflow:start parallel_workflow

# フェーズを進める
npm run workflow:next

# 台本を作る（模擬）
echo "台本の内容" > script.txt
npm run workflow:next

# サムネイルを作る（模擬）
touch thumbnail.png
npm run workflow:next

# → 両方終わったら「完成」フェーズへ！
```

🎉 **並列実行成功！** 2つの作業が同時に進みました！

---

## よくある質問

### Q1: エラーが出た

```bash
Error: Workflow 'xxx' not found
```

**解決方法：**
- ファイル名を確認：`config/workflows/xxx.json` が存在するか
- JSON形式が正しいか確認（カンマ忘れなど）

### Q2: テストが失敗する

```bash
npm test -- --selectProjects=workflow-phase3 --runInBand
```

**必ず `--runInBand` を付けてください！**

### Q3: どのワークフローがあるか知りたい

```bash
ls config/workflows/*.json
```

---

## 次のステップ

おめでとうございます！Phase 3 の基本をマスターしました！

### もっと学ぶには

1. **サンプルを見る**
   - `config/workflows/` フォルダの他のファイル
   - `video_generation_v1.json` - 動画制作の本格例
   - `software_development_v1.json` - 開発フローの例

2. **詳しいガイド**
   - `docs/WORKFLOW_PHASE3_GUIDE.md` - 全機能の説明
   - `docs/WORKFLOW_PHASE3_DESIGN.md` - 設計仕様

3. **実践**
   - 自分の仕事の流れをワークフローにしてみる
   - チームで使ってみる

---

## 困ったら

- GitHub Issues で質問
- Discordコミュニティで相談
- ドキュメントを再読

**楽しいワークフロー自動化ライフを！** 🚀
