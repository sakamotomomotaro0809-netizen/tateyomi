# TAISUN Agent 2026 - セットアップ & 検証プロンプト集

このドキュメントには、TAISUN Agent 2026の全機能を確実に実装・活用するためのプロンプトが含まれています。

---

## 📋 目次

1. [初期セットアッププロンプト](#1-初期セットアッププロンプト)
2. [実装完全性チェックプロンプト](#2-実装完全性チェックプロンプト)
3. [クイック診断プロンプト](#3-クイック診断プロンプト)
4. [トラブルシューティングプロンプト](#4-トラブルシューティングプロンプト)

---

## 1. 初期セットアッププロンプト

**使用タイミング**: リポジトリをクローンした直後、最初のセッションで使用

```markdown
# TAISUN Agent 2026 完全セットアップ実行

このプロジェクトに TAISUN Agent 2026 を導入します。以下の手順を**すべて**実行し、全機能が正しく動作することを確認してください。

## Phase 1: 環境検証（必須）

1. **依存関係の確認**
   - Node.js バージョン確認（v18以上必須）
   - Python バージョン確認（3.10以上必須）
   - npm/bun のインストール状態確認

2. **必須パッケージのインストール**
   ```bash
   npm install
   pip install -r requirements.txt 2>/dev/null || true
   ```

3. **ビルド実行**
   ```bash
   npm run build:all
   ```

## Phase 2: 13層防御システムの有効化（最重要）

以下の各ファイルが存在し、正しく設定されていることを確認してください：

### Layer 0-7: コアガード
- [ ] `.claude/CLAUDE.md` - 絶対遵守ルール
- [ ] `.claude/hooks/workflow-fidelity-guard.js` - ワークフロー忠実性
- [ ] `.claude/hooks/workflow-sessionstart-injector.js` - セッション開始注入
- [ ] `.claude/hooks/workflow-state-manager.js` - 状態管理

### Layer 8-12: セキュリティ・品質ガード
- [ ] `.claude/hooks/copy-safety-guard.js` - コピー安全性
- [ ] `.claude/hooks/input-sanitizer-guard.js` - 入力サニタイズ
- [ ] `.claude/hooks/skill-usage-guard.js` - スキル使用監視
- [ ] `.claude/hooks/definition-lint-gate.js` - 定義検証
- [ ] `.claude/hooks/console-log-guard.js` - コンテキスト品質

### 統合ガード
- [ ] `.claude/hooks/unified-guard.js` - 統合ガード（高速化）

## Phase 3: settings.json のHooks設定確認

`.claude/settings.json` に以下のHooks設定が含まれていることを確認：

```json
{
  "hooks": {
    "SessionStart": [{"matcher": "", "hooks": [{"type": "command", "command": "node .claude/hooks/workflow-sessionstart-injector.js"}]}],
    "PreToolUse": [
      {"matcher": "Bash", "hooks": [{"type": "command", "command": "node .claude/hooks/unified-guard.js"}]},
      {"matcher": "Write|Edit", "hooks": [{"type": "command", "command": "node .claude/hooks/unified-guard.js"}]}
    ],
    "PostToolUse": [{"matcher": "Write|Edit", "hooks": [{"type": "command", "command": "node .claude/hooks/definition-lint-gate.js"}]}],
    "SessionEnd": [{"matcher": "", "hooks": [{"type": "command", "command": "node .claude/hooks/session-handoff-generator.js"}]}]
  }
}
```

## Phase 4: スキルシステムの確認

1. **スキルマッピング設定**
   - [ ] `.claude/hooks/config/skill-mapping.json` が存在する
   - [ ] 必要なスキルマッピングが定義されている

2. **スキルフォルダの確認**
   ```bash
   ls -la .claude/skills/
   ```
   最低限以下が存在すること：
   - [ ] taiyo-style/
   - [ ] taiyo-analyzer/
   - [ ] sales-letter/
   - [ ] step-mail/

## Phase 5: エージェントシステムの確認

1. **エージェント定義の確認**
   ```bash
   ls -la .claude/agents/ | wc -l
   ```
   82個以上のエージェント定義ファイルが存在すること

2. **コーディネーターの確認**
   - [ ] `.claude/agents/00-ait42-coordinator.md` が存在する

## Phase 6: MCPツールの確認

1. **MCPツール定義の確認**
   ```bash
   ls -la .claude/mcp-tools/
   ```
   以下のファイルが存在すること：
   - [ ] agent.json
   - [ ] git.json
   - [ ] file.json
   - [ ] process.json

2. **.mcp.json の確認**
   - [ ] `.mcp.json` が存在し、taisun-proxy が登録されている

## Phase 7: メモリシステムの確認

- [ ] `.claude/memory.md` - 長期記憶ファイル
- [ ] `.claude/pins.md` - ピン留め台帳
- [ ] `.claude/directives.md` - 指示台帳
- [ ] `.claude/traceability.yml` - トレーサビリティ
- [ ] `memory_bank/` ディレクトリが存在する

## Phase 8: Hooksの実行権限確認

```bash
chmod +x .claude/hooks/*.js .claude/hooks/*.sh 2>/dev/null || true
```

## Phase 9: 統合テストの実行

```bash
npm run test:guards 2>/dev/null || echo "テストスキップ"
npm run guard:verify 2>/dev/null || echo "検証スキップ"
```

## Phase 10: 最終確認チェックリスト

以下がすべて✅であることを確認してください：

### 13層防御システム
- [ ] Layer 0: CLAUDE.md ルール読み込み済み
- [ ] Layer 1: SessionStart Injector 動作確認
- [ ] Layer 2: Permission Gate 設定済み
- [ ] Layer 3: Read-before-Write 有効
- [ ] Layer 4: Baseline Lock 設定済み
- [ ] Layer 5: Skill Evidence 追跡有効
- [ ] Layer 6: Deviation Approval 設定済み
- [ ] Layer 7: Agent Enforcement 有効
- [ ] Layer 8: Copy Safety Guard 有効
- [ ] Layer 9: Input Sanitizer 有効
- [ ] Layer 10: Skill Auto-Select 設定済み
- [ ] Layer 11: Definition Lint 有効
- [ ] Layer 12: Context Quality 監視有効

### コアシステム
- [ ] 82エージェント定義完備
- [ ] 75スキル利用可能
- [ ] 227 MCPツール登録済み
- [ ] メモリシステム初期化完了
- [ ] ワークフローエンジン準備完了

---

**セットアップ完了後、このメッセージの結果を報告してください。**
**問題がある項目は具体的に指摘し、修正方法を提案してください。**
```

---

## 2. 実装完全性チェックプロンプト

**使用タイミング**: 途中から参加した場合、または定期的な健全性チェック

```markdown
# TAISUN Agent 2026 実装完全性チェック

このプロジェクトで TAISUN Agent 2026 の全機能が正しく実装・活用されているか診断してください。

## 診断項目

### A. 13層防御システム診断

各レイヤーについて、以下を確認・報告してください：
1. ファイルの存在
2. settings.json への登録状態
3. 実際の動作テスト結果

```
Layer 0  (CLAUDE.md)           : [存在/未存在] [有効/無効]
Layer 1  (SessionStart)        : [存在/未存在] [有効/無効]
Layer 2  (Permission Gate)     : [存在/未存在] [有効/無効]
Layer 3  (Read-before-Write)   : [存在/未存在] [有効/無効]
Layer 4  (Baseline Lock)       : [存在/未存在] [有効/無効]
Layer 5  (Skill Evidence)      : [存在/未存在] [有効/無効]
Layer 6  (Deviation Approval)  : [存在/未存在] [有効/無効]
Layer 7  (Agent Enforcement)   : [存在/未存在] [有効/無効]
Layer 8  (Copy Safety)         : [存在/未存在] [有効/無効]
Layer 9  (Input Sanitizer)     : [存在/未存在] [有効/無効]
Layer 10 (Skill Auto-Select)   : [存在/未存在] [有効/無効]
Layer 11 (Definition Lint)     : [存在/未存在] [有効/無効]
Layer 12 (Context Quality)     : [存在/未存在] [有効/無効]
```

### B. Hooks設定診断

`.claude/settings.json` の hooks セクションを確認し、以下を報告：

| Hook | 期待される設定 | 実際の状態 |
|------|---------------|-----------|
| SessionStart | workflow-sessionstart-injector.js | ? |
| PreToolUse (Bash) | unified-guard.js | ? |
| PreToolUse (Write\|Edit) | unified-guard.js | ? |
| PostToolUse (Write\|Edit) | definition-lint-gate.js | ? |
| SessionEnd | session-handoff-generator.js | ? |

### C. スキルシステム診断

1. **スキルマッピング** (`.claude/hooks/config/skill-mapping.json`)
   - マッピング数: ?個
   - strict設定のマッピング数: ?個

2. **利用可能スキル** (`.claude/skills/`)
   - 総スキル数: ?個
   - 太陽スタイル関連: ?個
   - マーケティング関連: ?個
   - インフラ関連: ?個

### D. エージェントシステム診断

1. **エージェント定義** (`.claude/agents/`)
   - 総エージェント数: ?個
   - コーディネーター数: ?個
   - 開発系エージェント数: ?個
   - QA系エージェント数: ?個

2. **エージェント選択設定**
   - AIT42 Coordinator: [存在/未存在]
   - 並列実行設定: [有効/無効]

### E. MCPツール診断

1. **ツール定義** (`.claude/mcp-tools/`)
   - 総ツール数: ?個
   - カテゴリ数: ?個

2. **MCP設定** (`.mcp.json`)
   - 登録サーバー数: ?個
   - taisun-proxy: [有効/無効]

### F. メモリシステム診断

| ファイル | 存在 | 内容有無 |
|---------|------|---------|
| .claude/memory.md | ? | ? |
| .claude/pins.md | ? | ? |
| .claude/directives.md | ? | ? |
| .claude/traceability.yml | ? | ? |
| memory_bank/ | ? | ? |
| .workflow_state.json | ? | ? |

### G. 品質ゲート診断

```json
{
  "codeReviewMinScore": ?,
  "testCoverageMin": ?,
  "securityScanRequired": ?
}
```

---

## 診断結果レポート形式

以下の形式で結果を報告してください：

```
============================================
TAISUN Agent 2026 実装完全性レポート
============================================

【総合スコア】: ??/100点

【13層防御システム】
- 有効レイヤー: ??/13
- 無効レイヤー: [リスト]
- 緊急対応必要: [あり/なし]

【スキルシステム】
- 利用可能: ??/75
- マッピング設定: ??/10
- 問題点: [リスト]

【エージェントシステム】
- 利用可能: ??/82
- コーディネーター: [正常/異常]
- 問題点: [リスト]

【MCPツール】
- 利用可能: ??/227
- 問題点: [リスト]

【メモリシステム】
- 初期化状態: [完了/未完了]
- 問題点: [リスト]

【推奨アクション】（優先度順）
1. [最優先] ...
2. [高] ...
3. [中] ...

============================================
```

---

**この診断を実行し、結果を報告してください。**
**問題がある場合は、修正コマンドも一緒に提案してください。**
```

---

## 3. クイック診断プロンプト

**使用タイミング**: 毎日の作業開始時、または素早く確認したい時

```markdown
# TAISUN クイック診断

以下を30秒以内で確認し、結果を報告してください：

## 必須チェック（5項目）

1. **CLAUDE.md存在確認**
   ```bash
   test -f .claude/CLAUDE.md && echo "✅ OK" || echo "❌ MISSING"
   ```

2. **Hooks設定確認**
   ```bash
   grep -q "SessionStart" .claude/settings.json && echo "✅ OK" || echo "❌ MISSING"
   ```

3. **unified-guard確認**
   ```bash
   test -f .claude/hooks/unified-guard.js && echo "✅ OK" || echo "❌ MISSING"
   ```

4. **skill-mapping確認**
   ```bash
   test -f .claude/hooks/config/skill-mapping.json && echo "✅ OK" || echo "❌ MISSING"
   ```

5. **エージェント数確認**
   ```bash
   ls .claude/agents/*.md 2>/dev/null | wc -l
   ```

## 結果報告形式

```
🔍 TAISUN クイック診断結果
─────────────────────────
CLAUDE.md      : ✅/❌
Hooks設定      : ✅/❌
統合ガード     : ✅/❌
スキルマッピング: ✅/❌
エージェント数  : ??個

【状態】: 正常 / 要確認 / 緊急対応必要
```
```

---

## 4. トラブルシューティングプロンプト

**使用タイミング**: 問題が発生した時、機能が動作しない時

```markdown
# TAISUN トラブルシューティング

現在発生している問題を診断し、解決策を提案してください。

## 問題の種類を特定

以下のどれに該当しますか？

### A. Hooksが動作しない
```bash
# 確認コマンド
cat .claude/settings.json | grep -A 20 "hooks"
ls -la .claude/hooks/*.js
```

**よくある原因と解決策**:
1. 実行権限がない → `chmod +x .claude/hooks/*.js`
2. settings.jsonにhooksが未登録 → hooks設定を追加
3. ファイルパスが間違っている → 相対パスを確認

### B. 13層防御が機能しない
```bash
# 確認コマンド
node .claude/hooks/unified-guard.js --test 2>/dev/null
cat .workflow_state.json 2>/dev/null || echo "状態ファイルなし"
```

**よくある原因と解決策**:
1. unified-guard.jsがビルドされていない → `npm run build:all`
2. 状態ファイルが破損 → 削除して再初期化
3. Node.jsバージョンが古い → v18以上にアップデート

### C. スキルが自動選択されない
```bash
# 確認コマンド
cat .claude/hooks/config/skill-mapping.json
grep -r "skill-usage-guard" .claude/settings.json
```

**よくある原因と解決策**:
1. skill-mapping.jsonが空 → マッピング定義を追加
2. UserPromptSubmitフックが未設定 → settings.jsonに追加
3. スキルフォルダが存在しない → `.claude/skills/`を確認

### D. エージェントが選択されない
```bash
# 確認コマンド
ls .claude/agents/00-*.md
cat .claude/agents/00-ait42-coordinator.md | head -50
```

**よくある原因と解決策**:
1. コーディネーターが存在しない → ファイルを復元
2. エージェント定義が破損 → 再ダウンロード
3. Task toolが無効 → permissions設定を確認

### E. メモリが保存されない
```bash
# 確認コマンド
ls -la .claude/memory.md
ls -la memory_bank/
cat .claude/hooks/auto-memory-saver.js 2>/dev/null | head -20
```

**よくある原因と解決策**:
1. memory.mdが読み取り専用 → `chmod 644 .claude/memory.md`
2. memory_bankディレクトリがない → `mkdir -p memory_bank`
3. セッション終了フックが未設定 → settings.jsonを確認

---

## 完全リセット手順

すべてが動作しない場合の最終手段：

```bash
# 1. 状態ファイルをクリア
rm -f .workflow_state.json
rm -f .agent_usage_state.json
rm -f SESSION_HANDOFF.md

# 2. ビルドキャッシュをクリア
rm -rf dist/
rm -rf node_modules/.cache/

# 3. 再ビルド
npm install
npm run build:all

# 4. 権限を再設定
chmod +x .claude/hooks/*.js .claude/hooks/*.sh 2>/dev/null || true

# 5. テスト実行
npm run test:guards 2>/dev/null || echo "テストスキップ"
```

---

**発生している問題を具体的に説明してください。**
**上記の診断を実行し、結果を報告してください。**
```

---

## 📌 使用ガイドライン

| シチュエーション | 使用するプロンプト |
|------------------|-------------------|
| 新規プロジェクト導入 | 1. 初期セットアッププロンプト |
| 途中から参加 | 2. 実装完全性チェックプロンプト |
| 毎日の作業開始 | 3. クイック診断プロンプト |
| 問題発生時 | 4. トラブルシューティングプロンプト |
| 定期監査（週1回推奨） | 2. 実装完全性チェックプロンプト |

---

## 🔧 自動化スクリプト

上記プロンプトの一部を自動化するスクリプトも用意できます：

```bash
# クイック診断の自動実行
npm run taisun:diagnose

# 完全性チェックの自動実行
npm run taisun:full-check

# 自動修復
npm run taisun:repair
```

---

**最終更新**: 2026-01-24
**バージョン**: TAISUN Agent 2026 v2.6.0 対応
