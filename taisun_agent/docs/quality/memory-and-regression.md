# Memory++ システム説明書

## 概要

Memory++ は TAISUN v2 の記憶・品質管理システムを強化するアップグレードです。

### 主な機能
1. **ピン留め（pins.md）** - 「ここを修正して」の"ここ"を固定
2. **トレーサビリティ（traceability.yml）** - DoD→変更→テスト→証跡の追跡
3. **契約Lint（contract-lint.ts）** - ルール違反の自動検知
4. **回帰テスト生成（mistake-to-test.ts）** - ミスからテストを自動生成

---

## 1. ピン留め（pins.md）

### 目的
ユーザーが「ここを修正して」と言った"ここ"を明確に固定し、作業中に見失わない。

### 使い方

1. **ピンを作成**
   ```markdown
   ### PIN-001: success=true バグ修正
   - **Created**: 2026-01-07
   - **Scope**:
     - File: `src/proxy-mcp/ops/schedule/runner.ts`
     - Function: `runJob`
     - Line: 45-60
   - **Symptom**: エラー時に success: true を返す
   - **Expected Behavior**: エラー時は success: false
   - **Anti-Regression Check**:
     - [ ] catch ブロックで success: true を返していない
   - **Expiry Condition**: テストが追加され、CI が通る
   ```

2. **作業中は常に参照**
   - task_contract.md から pins.md を参照
   - ピンに記載された範囲のみ修正

3. **解除条件が満たされたらアーカイブ**

---

## 2. トレーサビリティ（traceability.yml）

### 目的
すべてのDoDが「どの変更」「どのテスト」「どの証跡」で担保されているかを追跡。

### 構造
```yaml
current_task:
  name: "タスク名"
  dod_items:
    - id: DOD-001
      description: "DoD項目"
      status: completed
      changes:
        - file: "path/to/file.ts"
          type: created
      tests:
        - name: "テスト名"
      evidence:
        - type: file_exists
          path: "path/to/file"
```

### 更新タイミング
- タスク開始時：DoD項目を追加
- 実装中：changes を更新
- テスト追加時：tests を更新
- 完了時：evidence を追加

---

## 3. 契約Lint（contract-lint.ts）

### 目的
契約/ルール違反を自動検知し、CIゲートとして使用。

### 実行
```bash
npm run contract:lint
```

### チェック項目
| ルール | 説明 |
|--------|------|
| proxy-only | taisun-proxy 以外のMCPサーバーが有効化されていない |
| japanese-default | デフォルトロケールが日本語 |
| secrets-exposure | 秘密情報が露出していない |
| task-contract | task_contract.md の構造が適切 |
| mistakes-ledger | mistakes.md が存在する |
| pins-ledger | pins.md が存在する |

### CI統合
```yaml
# .github/workflows/ci.yml
- name: Contract Lint
  run: npm run contract:lint
```

---

## 4. 回帰テスト生成（mistake-to-test.ts）

### 目的
mistakes.md の「Prevention」をテストとして固定し、再発を機械的に防止。

### 実行
```bash
npm run mistake:testgen
```

### 生成されるファイル
```
tests/regression/
├── success-true-on-error.test.ts
├── command-injection-vulnerability.test.ts
├── silent-error-catch.test.ts
└── index.test.ts
```

### テスト実行
```bash
npm test -- --testPathPattern=regression
```

---

## 運用フロー

### タスク開始時
```
1. 指示抽出 → directives.md に追記
2. 指示差分確認 → Directive Diff を記録
3. ピン作成 → 「ここを修正して」があれば pins.md に追加
4. 計画固定 → task_contract.md を更新
5. traceability.yml 初期化
```

### 実装中
```
1. pins.md を参照しながら実装
2. 変更したら traceability.yml を更新
3. テストを書いたら traceability.yml を更新
```

### 完了前
```
1. npm run contract:lint（CIゲート）
2. npm test（全テスト通過）
3. traceability.yml に evidence を追加
4. ピンの解除条件を確認
5. Issue/RUNLOGに日本語で記録
```

---

## コマンド一覧

| コマンド | 説明 |
|----------|------|
| `npm run briefing` | セッション開始ブリーフィング |
| `npm run contract:lint` | 契約/ルール違反チェック |
| `npm run mistake:testgen` | 回帰テスト生成 |
| `npm run quality:check` | 全品質チェック（lint + test）|

---

## ファイル一覧

| ファイル | 説明 |
|----------|------|
| `.claude/pins.md` | ピン留め台帳 |
| `.claude/traceability.yml` | トレーサビリティ対応表 |
| `.claude/directives.md` | 指示台帳（Directive Diff含む）|
| `.claude/mistakes.md` | ミス台帳 |
| `.claude/task_contract.md` | タスク契約 |
| `scripts/contract-lint.ts` | 契約Lintスクリプト |
| `scripts/mistake-to-test.ts` | 回帰テスト生成スクリプト |
