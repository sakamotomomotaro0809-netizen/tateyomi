# テキスト安全ガイド（日本語/マルチバイト対応）

## 概要

このガイドでは、日本語やマルチバイト文字を含むファイルを安全に編集する方法を説明します。

### 問題

Claude Code の内蔵「一括置換」機能は、UTF-8 のマルチバイト文字（日本語、絵文字など）を
バイト位置でスライスしてしまうことがあり、以下のエラーが発生します：

```
byte index is not a char boundary
```

また、文字化け（U+FFFD 置換文字の混入）やファイル破損の原因になります。

### 解決策

1. **一括置換を使わない** - Claude Code内蔵の一括置換は日本語ファイルに使用禁止
2. **safe-replace を使う** - Unicode安全な置換ツール
3. **utf8-guard で検証** - 変更後に文字化けがないか確認

---

## safe-replace の使い方

### 基本的な使い方

```bash
# 単一ファイルの置換
npm run text:safe-replace -- --file src/example.ts --from "古いテキスト" --to "新しいテキスト"

# ドライラン（変更を確認するだけ）
npm run text:safe-replace -- --file src/example.ts --from "old" --to "new" --dry-run

# 正規表現を使った置換
npm run text:safe-replace -- --file src/example.ts --from "pattern\\d+" --to "replacement" --regex

# バックアップなしで置換（非推奨）
npm run text:safe-replace -- --file src/example.ts --from "old" --to "new" --no-backup
```

### 複数のルールを適用

```bash
# rules.json を作成
cat > rules.json << 'EOF'
[
  { "from": "旧文字列1", "to": "新文字列1" },
  { "from": "旧文字列2", "to": "新文字列2" },
  { "from": "pattern\\d+", "to": "replaced", "regex": true }
]
EOF

# ルールファイルを使って置換
npm run text:safe-replace -- --file src/example.ts --rules rules.json
```

### 特徴

- **UTF-8 fatal decode**: 不正なUTF-8を検知して停止
- **原子的書き込み**: temp → rename で書き込み（途中で失敗してもファイル破損しない）
- **自動バックアップ**: `.claude/backups/` にバックアップを作成
- **U+FFFD 検知**: 置換後に文字化けが増えたら停止

---

## utf8-guard の使い方

### 基本的な使い方

```bash
# 変更されたファイルをチェック（git diff）
npm run text:utf8-guard

# ステージされたファイルのみチェック
npm run text:utf8-guard -- --staged

# 全テキストファイルをチェック
npm run text:utf8-guard -- --all

# 特定のファイルをチェック
npm run text:utf8-guard -- --files src/app.ts src/utils.ts

# 詳細出力
npm run text:utf8-guard -- --verbose

# UTF-8 BOM を自動削除
npm run text:utf8-guard -- --fix-bom
```

### チェック項目

1. **UTF-8 fatal decode**: 不正なバイト列を検知
2. **U+FFFD 検出**: 文字化け（置換文字）を検知
3. **BOM 警告**: UTF-8 BOM を検出（オプションで削除可能）

### CI/CD 統合

```yaml
# .github/workflows/ci.yml
- name: Check encoding
  run: npm run quality:encoding
```

---

## 復旧手順

### 文字化けが発生した場合

1. **git restore で戻す**（最も簡単）
   ```bash
   git restore src/corrupted-file.ts
   ```

2. **バックアップから復元**
   ```bash
   # バックアップ一覧を確認
   ls -la .claude/backups/

   # バックアップから復元
   cp .claude/backups/file.ts.2026-01-07T... src/file.ts
   ```

3. **git stash から復元**
   ```bash
   git stash list
   git stash pop
   ```

### 予防策

1. **こまめにコミット** - 変更前に `git commit` しておく
2. **Git管理下で作業** - `git init` されていないと復旧が困難
3. **safe-replace を使う** - 直接編集より安全
4. **utf8-guard を通す** - 変更後に必ず検証

---

## 品質ゲート

### 完了前チェックリスト

- [ ] `npm run quality:encoding` が通る
- [ ] `npm run contract:lint` が通る
- [ ] `npm test` が通る

### 推奨フロー

```bash
# 1. 変更前にコミット
git add . && git commit -m "WIP: before text changes"

# 2. safe-replace で置換
npm run text:safe-replace -- --file src/app.ts --from "old" --to "new"

# 3. utf8-guard で検証
npm run text:utf8-guard

# 4. 品質チェック
npm run quality:check

# 5. 変更をコミット
git add . && git commit -m "fix: update text safely"
```

---

## よくある質問

### Q: なぜ一括置換が危険なのですか？

A: UTF-8では、日本語1文字が3バイト、絵文字が4バイトを使います。
バイト位置で文字列をスライスすると、文字の途中で切れてしまい、
不正なUTF-8シーケンスになります。

### Q: 絵文字も安全に置換できますか？

A: はい。safe-replace は文字列レベルで置換するため、
サロゲートペア（絵文字など）も安全に処理できます。

### Q: バックアップはどこに保存されますか？

A: `.claude/backups/` ディレクトリに、
`filename.ext.YYYY-MM-DDTHH-mm-ss.bak` の形式で保存されます。

### Q: CIで自動的にチェックされますか？

A: はい。`npm run quality:check` にエンコーディングチェックが含まれています。
GitHub Actions で自動実行されます。

---

## 関連ファイル

| ファイル | 説明 |
|----------|------|
| `scripts/text/safe-replace.ts` | Unicode安全な置換CLI |
| `scripts/text/utf8-guard.ts` | UTF-8検証CLI |
| `.claude/backups/` | バックアップディレクトリ |
| `docs/operations/text-safety-ja.md` | このドキュメント |

---

## 変更履歴

- 2026-01-07: 初版作成（UTF-8境界クラッシュ対策）
