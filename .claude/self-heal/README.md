# AIT42 v2.0.0 - Self-Healing Module

## 概要

AutoPatch自動バグ修正システム。過去の失敗事例から学習し、類似エラーを自動修復します。

## 🎯 2つの実装バージョン

### 1. `auto-patch-file-based.ts` ✅ **Claude Code推奨**

**特徴**:
- ✅ ChromaDB不要（外部依存なし）
- ✅ 既存の`.claude/memory/tasks/*.yaml`を利用
- ✅ Claude Codeで即座に動作
- ✅ シンプルなテキスト類似度マッチング

**利用シーン**:
- Claude Code環境での開発
- Docker未インストール環境
- 軽量・高速な動作が必要な場合

### 2. `auto-patch.ts` (将来用)

**特徴**:
- ChromaDBベクトル検索（高精度）
- セマンティック類似度マッチング
- 大規模インシデントデータベース対応

**利用シーン**:
- Docker環境が利用可能
- 本番環境・大規模プロジェクト
- 高精度な類似検索が必要な場合

---

## 📖 使い方（Claude Code）

### Step 1: エラーログファイルの準備

CI失敗ログを保存：

```bash
# 例: テスト失敗ログ
cat > error.log <<'EOF'
TypeError: Cannot read properties of undefined (reading 'user')
at AuthController.login (/app/src/controllers/auth.controller.ts:45:18)
at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
...
EOF
```

### Step 2: AutoPatch実行

```bash
npx tsx .claude/self-heal/auto-patch-file-based.ts error.log
```

**出力例**:
```
🔧 AIT42 AutoPatch - File-Based (Claude Code Compatible)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Step 1: Searching for similar past incidents...

✅ Found 2 similar incidents:

   1. 2025-11-10-042-authentication-api-fix
      Root Cause: Null check missing for req.body.user
      Success: Yes

   2. 2025-11-09-031-login-error-fix
      Root Cause: Missing input validation
      Success: Yes

🧠 Step 2: Generating patch prompt for refactor-specialist...

✅ Patch prompt saved to: .claude/memory/autopatch-prompt.md

📋 Step 3: Next Steps (Manual in Claude Code)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Read the generated prompt:
   cat .claude/memory/autopatch-prompt.md

2. Invoke refactor-specialist with the prompt:
   "refactor-specialistで、.claude/memory/autopatch-prompt.mdの内容を実行して"

3. After successful fix, record the incident:
   npx tsx .claude/memory/scripts/record-task.ts \
     --description "AutoPatch fix for TypeError in AuthController" \
     --agents refactor-specialist \
     --success true \
     --quality-score 92 \
     --incident-error-log "$(cat error.log)" \
     --incident-error-code "TypeError" \
     --incident-root-cause "Null check missing for req.body.user" \
     --incident-patch-files src/controllers/auth.controller.ts \
     --incident-patch-diff "$(git diff HEAD src/controllers/auth.controller.ts)" \
     --incident-patch-success true
```

### Step 3: Claude Codeでパッチ適用

AutoPatchが生成したプロンプト（`.claude/memory/autopatch-prompt.md`）を使って、refactor-specialistエージェントを呼び出します：

```
"refactor-specialistで、.claude/memory/autopatch-prompt.mdの内容を実行して"
```

### Step 4: 成功時のインシデント記録

修正が成功したら、将来の学習データとして記録：

```bash
npx tsx .claude/memory/scripts/record-task.ts \
  --description "AutoPatch fix for TypeError" \
  --agents refactor-specialist \
  --success true \
  --quality-score 92 \
  --incident-error-log "$(cat error.log)" \
  --incident-error-code "TypeError" \
  --incident-root-cause "Null check missing" \
  --incident-patch-files src/controllers/auth.controller.ts \
  --incident-patch-diff "$(git diff HEAD src/controllers/auth.controller.ts)" \
  --incident-patch-success true
```

---

## 🔬 動作原理

### 類似検索アルゴリズム

**Jaccard Similarity**を使用した単純だが効果的なアルゴリズム：

```typescript
similarity = intersection(tokens1, tokens2).size / union(tokens1, tokens2).size
```

**例**:
```
Error 1: "TypeError: Cannot read property 'user' of undefined"
Error 2: "TypeError: Cannot read property 'email' of undefined"

Tokens 1: {typeerror, cannot, read, property, user, undefined}
Tokens 2: {typeerror, cannot, read, property, email, undefined}

Intersection: {typeerror, cannot, read, property, undefined} (5 tokens)
Union: {typeerror, cannot, read, property, user, email, undefined} (7 tokens)

Similarity: 5/7 = 0.71 (71%)
```

**閾値**: 0.6（60%以上の類似度で「類似」と判定）

### パッチ生成ロジック

1. **類似インシデントから学習**
   - 過去の成功パッチのパターン抽出
   - Root Cause分析の参照
   - 修正ファイルの特定

2. **プロンプト生成**
   - 現在のエラーログ
   - 類似インシデントの詳細
   - 過去の成功パッチのdiff
   - Lessons Learned

3. **refactor-specialistへ委譲**
   - 生成されたプロンプトを元に修正
   - Clean Architectureパターンに従う
   - テストコード生成

---

## 📊 期待される効果

| 指標 | 改善目標 | 実測値（予想） |
|------|---------|---------------|
| **MTTR（平均復旧時間）** | -50% | 15分 → 7分 |
| **バグ再発率** | -70% | 30% → 9% |
| **CI失敗の自動修復率** | 30-60% | 初期40% |
| **学習精度向上** | タスク数に比例 | 100タスク後70% |

---

## 🧪 テストシナリオ

### テスト1: Null Check Missing

**エラーログ**:
```
TypeError: Cannot read properties of undefined (reading 'user')
```

**期待される修正**:
```diff
-  const { user } = req.body;
+  const { user } = req.body || {};
+  if (!user) {
+    return res.status(400).json({ error: 'User data required' });
+  }
```

### テスト2: Missing Import

**エラーログ**:
```
ReferenceError: bcrypt is not defined
```

**期待される修正**:
```diff
+import * as bcrypt from 'bcrypt';
```

### テスト3: Type Mismatch

**エラーログ**:
```
Type 'string' is not assignable to type 'number'
```

**期待される修正**:
```diff
-  const port: number = process.env.PORT;
+  const port: number = parseInt(process.env.PORT || '3000', 10);
```

---

## 🔧 設定

### 環境変数

`.env.example`から`.env`をコピーして設定：

```bash
# AutoPatch設定
AUTOPATCH_ENABLED=true
AUTOPATCH_MAX_RETRIES=3
AUTOPATCH_SIMILARITY_THRESHOLD=0.75  # ChromaDB版のみ
```

### ファイルベース版の閾値

`auto-patch-file-based.ts`内で調整：

```typescript
const SIMILARITY_THRESHOLD = 0.6; // 0.0-1.0 (デフォルト: 0.6)
const MAX_SIMILAR_INCIDENTS = 3;  // 最大検索数
```

---

## 🧪 SpecSynth - Regression Test Generation

### 概要

SpecSynthは、バグ修正後に**回帰テストを自動生成**するシステムです。同じバグの再発を防ぎ、テストカバレッジを向上させます。

### 使い方（Claude Code）

#### Step 1: パッチと元のエラーログを準備

```bash
# パッチをファイルに保存
git diff HEAD src/auth.controller.ts > patch.diff

# 元のエラーログ（既に保存済みの場合はスキップ）
# error.log が既にある場合
```

#### Step 2: SpecSynth実行

```bash
npx tsx .claude/self-heal/spec-synth-file-based.ts \
  patch.diff \
  error.log \
  src/auth.controller.ts
```

**オプション**: 手動でRoot Causeを指定する場合:

```bash
ROOT_CAUSE="Missing null check for req.body.user" \
  npx tsx .claude/self-heal/spec-synth-file-based.ts \
  patch.diff \
  error.log \
  src/auth.controller.ts
```

**出力例**:
```
🧪 AIT42 SpecSynth - Regression Test Generation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Step 1: Analyzing root cause...

   Category: JavaScript Runtime Error
   Description: Missing null/undefined validation
   Risk Level: HIGH

📝 Step 2: Generating test specification prompt...

✅ Test specification saved to: .claude/memory/specsynth-prompt.md

📋 Step 3: Next Steps (Manual in Claude Code)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Read the generated test specification:
   cat .claude/memory/specsynth-prompt.md

2. Invoke test-generator with the specification:
   "test-generatorで、.claude/memory/specsynth-prompt.mdの内容を実行して"

3. Run the generated tests to verify:
   npm test

4. After successful test generation, record the task:
   npx tsx .claude/memory/scripts/record-task.ts \
     --description "Regression test for Missing null/undefined validation" \
     --agents test-generator \
     --success true \
     --quality-score 90

💡 Lessons Learned:
   1. Always validate input parameters before use
   2. Use TypeScript strict mode to catch null/undefined issues
```

#### Step 3: Claude Codeでテスト生成

SpecSynthが生成したテスト仕様（`.claude/memory/specsynth-prompt.md`）を使って、test-generatorエージェントを呼び出します：

```
"test-generatorで、.claude/memory/specsynth-prompt.mdの内容を実行して"
```

#### Step 4: テスト実行と記録

```bash
# テストが生成されたら実行
npm test

# 成功したら記録
npx tsx .claude/memory/scripts/record-task.ts \
  --description "Regression test for auth null check" \
  --agents test-generator \
  --success true \
  --quality-score 95
```

### Root Cause分析機能

SpecSynthは以下のパターンを自動検出します：

| パターン | 検出キーワード | Lessons Learned |
|---------|---------------|-----------------|
| **Null/Undefined** | `if (!`, `?? {}`, `\|\| {}` | 入力検証を常に実施、strict mode使用 |
| **Missing Import** | `+import ... from` | IDE自動インポート機能の活用 |
| **Type Error** | `: Type`, `\|`, `&` | 厳格なTypeScript設定 |
| **Error Handling** | `try {`, `catch (` | async操作はtry-catchで囲む |
| **Async/Await** | `+await` | ESLintルールで強制 |

### テスト生成の例

**元のエラー**:
```
TypeError: Cannot read properties of undefined (reading 'user')
```

**生成されるテスト仕様**:
```typescript
describe('Regression: Missing null/undefined validation', () => {
  it('should handle undefined req.body', () => {
    const req = { body: undefined };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'User data required' });
  });

  it('should handle empty req.body', () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle valid user data', () => {
    const req = { body: { user: 'test@example.com' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

### 期待される効果

| 指標 | 改善目標 | 実測値（予想） |
|------|---------|---------------|
| **バグ再発率** | -70% | 30% → 9% |
| **テストカバレッジ** | +15-25% | 65% → 80%+ |
| **テスト作成時間** | -60% | 30分 → 12分 |
| **品質スコア** | +10点 | 80 → 90 |

---

## 🔄 AutoPatch + SpecSynth ワークフロー

完全な自己学習サイクル：

```
1. CI Build Fails
   ↓
2. AutoPatch実行
   npx tsx .claude/self-heal/auto-patch-file-based.ts error.log
   ↓
3. refactor-specialistでパッチ適用
   "refactor-specialistで、.claude/memory/autopatch-prompt.mdの内容を実行して"
   ↓
4. git diff でパッチ取得
   git diff HEAD > patch.diff
   ↓
5. SpecSynth実行
   npx tsx .claude/self-heal/spec-synth-file-based.ts patch.diff error.log [files...]
   ↓
6. test-generatorでテスト生成
   "test-generatorで、.claude/memory/specsynth-prompt.mdの内容を実行して"
   ↓
7. テスト実行
   npm test
   ↓
8. インシデント記録
   npx tsx .claude/memory/scripts/record-task.ts \
     --incident-error-log "$(cat error.log)" \
     --incident-root-cause "..." \
     --incident-patch-diff "$(cat patch.diff)" \
     --incident-patch-success true
   ↓
9. 次回から同じエラーは自動修正可能！
```

---

## 🚀 次のステップ

### Phase 4B: コアアーキテクチャ刷新（予定）

1. **LangGraph統合**: ステートフルなタスクオーケストレーション
2. **MCP統合**: Model Context Protocol対応
3. **AutoPatch完全自動化**: CI/CDパイプライン統合
4. **SpecSynth完全自動化**: パッチ適用後の自動テスト生成・実行

### Phase 4C: 動的エージェント選択（予定）

1. **K5D Coach**: エージェント性能監視と動的交代
2. **ShadowLab**: ベンチマーク環境でのエージェント評価
3. **Bandit Scheduler**: 探索/活用バランスの最適化

---

## 📝 ライセンス

MIT License - AIT42 Project
