# 書き込み操作のコンテキスト最適化ガイド

## 問題

CONTEXT_MANAGEMENT.mdは読み取り最適化に特化しているが、**Writeツールは全内容をメッセージ履歴に記録**するため、大量のファイル生成時にコンテキストを大量消費する。

## 実例（2026-01-09セッション）

```
生成ファイル:
- esports_ai_hero_section.md    22KB
- nanobanana_lp_prompt_template.md  18KB
- nanobanana_ready_prompts.md   17KB
- hero_styles.css                14KB
- lp_structure.json             13KB
合計: 113KB → メッセージ履歴に全記録

結果: 83.1k tokens (41.5%) をメッセージが消費
```

---

## 書き込み最適化戦略

### 1. Agent委託 ⭐ (最も効果的)

**原則**: 大きなファイル（5KB以上）はAgentに委託

```bash
# ❌ 悪い例：直接Write
Write hero_styles.css (14KB)  → 14KB全てが履歴に

# ✅ 良い例：Agent委託
/Task frontend-developer "hero_styles.css を生成"
→ Agentの作業は圧縮される
→ 結果のみを受け取る
```

### 2. バッチ分割

**原則**: 連続して3-5ファイル生成したら/compact

```bash
# ステップ1: 構造化ファイル生成（3個）
Write lp_structure.json
Write nanobanana_lp_prompt_template.md
Write hero_index.html

# /compact 実行

# ステップ2: スタイルとガイド（3個）
Write hero_styles.css
Write HERO_QUICKSTART.md
Write CANVA_IMPORT_GUIDE.md

# /compact 実行
```

### 3. 増分書き込み（大ファイル対策）

**原則**: 10KB以上のファイルは分割して生成

```bash
# ❌ 悪い例：一度に22KB
Write esports_ai_hero_section.md (全内容)

# ✅ 良い例：セクション分割
Write esports_ai_hero_section.md (ヘッダー部分)
# ... 作業 ...
Edit esports_ai_hero_section.md (プロンプトセクション追加)
# ... 作業 ...
Edit esports_ai_hero_section.md (実装セクション追加)
```

### 4. 外部生成（最適解）

**原則**: テンプレートからの生成は外部ツールで

```bash
# ❌ 悪い例：Claude内で全生成
Write template1.md (20KB)
Write template2.md (18KB)
Write template3.md (17KB)

# ✅ 良い例：テンプレートエンジン使用
Bash: npx mustache data.json template.mustache > output.md
→ 生成結果の確認のみ（ls, grep）
→ ファイル内容は履歴に残らない
```

---

## コンテキスト消費の数式

### 読み取り操作
```
Read file.txt (limit=50)
→ コスト: 50行分のトークン
```

### 書き込み操作
```
Write file.txt (1000行)
→ コスト: 1000行分のトークン × 2
  (1回目: ファイル生成 + 2回目: メッセージ記録)
```

### Agent委託
```
Task agent "file.txt を生成"
→ コスト: 指示文のみ（圧縮される）
→ 生成ファイルは外部、履歴に残らない
```

---

## 推奨ワークフロー

### パターンA: 小規模ファイル（<5KB）

```bash
直接Write OK
例: Write config.json (2KB)
```

### パターンB: 中規模ファイル（5-20KB）

```bash
1. Agent委託を検討
2. または、Writeしたら即/compact
例: Write styles.css (14KB) → /compact
```

### パターンC: 大規模ファイル（>20KB）

```bash
必須: Agent委託 or 外部生成
例: /Task tech-writer "documentation.md を生成"
```

### パターンD: 大量ファイル（10個以上）

```bash
1. バッチに分割（3-5個ずつ）
2. 各バッチ後に/compact
3. または、全体をAgent委託

例:
Write file1.md
Write file2.md
Write file3.md
/compact
Write file4.md
Write file5.md
Write file6.md
/compact
```

---

## チェックリスト

### 生成前チェック

- [ ] ファイルサイズは5KB未満か？
  - YES → 直接Write OK
  - NO → 次へ

- [ ] Agent委託できるか？
  - YES → /Task [agent] を使用
  - NO → 次へ

- [ ] 外部ツールで生成できるか？
  - YES → Bashでテンプレート処理
  - NO → 分割Writeを検討

- [ ] 複数ファイルを生成するか？
  - YES → バッチ分割 + /compact
  - NO → 直接Write

### 生成後チェック

- [ ] /context で使用率を確認
- [ ] 60%超えたら即/compact
- [ ] 大きなタスク完了後は/new検討

---

## 実装例

### Before（コンテキスト消費大）

```typescript
// 一度に大量のファイルを生成
await Promise.all([
  writeFile('template1.md', largeContent1), // 20KB
  writeFile('template2.md', largeContent2), // 18KB
  writeFile('template3.md', largeContent3), // 17KB
  writeFile('styles.css', cssContent),      // 14KB
]);
// 合計69KB → メッセージ履歴に記録
```

### After（コンテキスト最適化）

```typescript
// Agent委託
const agent = await Task('tech-writer', {
  prompt: 'Generate templates from spec.json',
  files: ['template1.md', 'template2.md', 'template3.md']
});

// または、外部生成
await bash('npm run generate-templates');

// 結果確認のみ（内容は読まない）
await bash('ls -lh templates/*.md');
```

---

## 統合: CONTEXT_MANAGEMENT.md への追加

既存の「コンテキスト節約戦略」に以下を追加：

### 3. 書き込み操作の最適化

```markdown
1. **大きなファイルはAgent委託** - 5KB以上はTask toolを使用
2. **バッチ処理で分割** - 3-5ファイルごとに/compact
3. **外部ツールを活用** - テンプレート生成はnpx/Bashで
4. **増分書き込み** - 10KB超はEditで段階的に構築
```

---

## 効果測定

### Before
```
113KB生成 → 83.1k tokens消費 (41.5%)
```

### After（Agent委託）
```
113KB生成 → 約10-15k tokens消費 (5-7%)
削減: 約70k tokens (35%)
```

### After（バッチ分割 + compact）
```
113KB生成 → 約40-50k tokens消費 (20-25%)
削減: 約35k tokens (17%)
```

---

このガイドをCONTEXT_MANAGEMENT.mdと併用することで、読み取り・書き込み両方の最適化が実現します。
