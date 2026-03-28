# Workflow Guardian Phase 2 設計書

## 概要

Phase 2は「Strict Enforcement（厳格な強制モード）」を実装します。
Phase 1の状態管理に加えて、**実際にAIの行動を制限する機能**を追加します。

## Phase 1 vs Phase 2

| 機能 | Phase 1 | Phase 2 |
|------|---------|---------|
| **状態管理** | ✅ 実装済み | ✅ 継続 |
| **進捗可視化** | ✅ 実装済み | ✅ 継続 |
| **検証機能** | ✅ 実装済み | ✅ 継続 |
| **スキル制限** | ⚠️ 警告のみ | ✅ ブロック |
| **危険操作ブロック** | ❌ なし | ✅ hooks実装 |
| **strict mode強制** | ⚠️ フラグのみ | ✅ 完全強制 |

## 実装する3つの柱

### 1. Proxy MCP Skill Guard

**目的**: `allowedSkills` 以外のスキル実行をブロック

**実装場所**: `src/proxy-mcp/tools/skill.ts`

**動作**:
```typescript
// Before (Phase 1)
export function skillRun(skillName: string, args?: string) {
  const warning = canRunSkill(skillName);
  if (!warning.ok) {
    console.warn(warning.message); // 警告のみ
  }
  // スキルを実行（ブロックしない）
  return executeSkill(skillName, args);
}

// After (Phase 2)
export function skillRun(skillName: string, args?: string) {
  const check = canRunSkill(skillName);
  if (!check.ok && isStrictMode()) {
    throw new Error(check.message); // ブロック！
  }
  return executeSkill(skillName, args);
}
```

**検証ロジック**:
- ワークフロー状態を確認（`loadState()`）
- 現在フェーズの `allowedSkills` を取得
- スキル名がリストに含まれるかチェック
- strict mode時は例外を投げる

### 2. Claude Code Hooks

**目的**: 危険な操作（ファイル削除、Git強制プッシュ等）をブロック

**実装場所**: `.claude/hooks/`

**フック種類**:
```json
{
  "hooks": {
    "beforeWrite": ".claude/hooks/workflow-guard-write.sh",
    "beforeBash": ".claude/hooks/workflow-guard-bash.sh"
  }
}
```

**ガードロジック**:
1. `.workflow_state.json` の存在確認
2. strict mode確認
3. 危険なパターンマッチング:
   - `rm -rf`
   - `git push --force`
   - `.env` ファイル操作
   - `DROP TABLE`
4. 検出時はエラーコード1で終了（Claude Codeがブロック）

### 3. Strict Mode 強制機能

**目的**: strict mode時にすべての強制機能を有効化

**実装内容**:

#### 3.1. ワークフロー開始時の選択
```bash
npm run workflow:start -- video_generation_v1 --strict
```

#### 3.2. engine.ts での強制
```typescript
export function isStrictMode(): boolean {
  const state = loadState();
  return state?.strict ?? false;
}

export function enforceStrictMode() {
  if (!isStrictMode()) {
    return; // 強制なし
  }

  // strict mode時の追加チェック
  validateAllArtifacts();
  validateNoSkippedPhases();
  validateCompletionCriteria();
}
```

#### 3.3. エラーメッセージの改善
```typescript
// Phase 1: 優しいメッセージ
"⚠️  推奨: このフェーズでは ${allowedSkills} を使用してください"

// Phase 2 (strict): 厳格なメッセージ
"🔒 strict mode: スキル '${skillName}' は Phase ${currentPhase} で許可されていません"
"許可されているスキル: ${allowedSkills.join(', ')}"
```

## 実装順序

### Step 1: Skill Guard 基礎実装
- [ ] `isStrictMode()` ヘルパー追加
- [ ] `skillRun()` にガードロジック追加
- [ ] エラーメッセージ改善
- [ ] テスト追加

### Step 2: Hooks 実装
- [ ] `.claude/hooks/workflow-guard-write.sh` 作成
- [ ] `.claude/hooks/workflow-guard-bash.sh` 作成
- [ ] 危険パターンリスト定義
- [ ] `.claude/settings.json` にフック登録

### Step 3: Strict Mode 完全実装
- [ ] `enforceStrictMode()` 関数追加
- [ ] すべての遷移ポイントでチェック
- [ ] ドキュメント更新

### Step 4: テストとドキュメント
- [ ] Phase 2統合テスト
- [ ] strict mode動作確認
- [ ] ドキュメント更新（WORKFLOW_STATE_MANAGEMENT.md）

## 後方互換性

Phase 1モード（デフォルト）は引き続き利用可能:
```bash
# Phase 1モード（警告のみ）
npm run workflow:start -- video_generation_v1

# Phase 2モード（厳格）
npm run workflow:start -- video_generation_v1 --strict
```

## セキュリティ考慮事項

### ブロックすべき危険操作

1. **ファイル操作**:
   - `rm -rf`
   - `.env` ファイルの削除・変更
   - `secrets/` ディレクトリへのアクセス

2. **Git操作**:
   - `git push --force`
   - `git reset --hard` (未プッシュのコミット削除)
   - `.git/` ディレクトリの直接操作

3. **データベース操作**:
   - `DROP TABLE`
   - `TRUNCATE`
   - `DELETE FROM` (WHERE句なし)

4. **システムコマンド**:
   - `sudo`
   - `chmod 777`
   - `kill -9`

## 成功基準

Phase 2実装が成功したと言える条件:

1. ✅ strict mode時に許可されていないスキルがブロックされる
2. ✅ 危険な操作がhooksによってブロックされる
3. ✅ Phase 1モード（緩い）とPhase 2モード（厳格）が共存できる
4. ✅ テストカバレッジ80%以上維持
5. ✅ ドキュメントが完備されている

## 将来の拡張（Phase 3以降）

- **条件付きフェーズ**: if-else分岐
- **並列フェーズ**: 複数タスクの同時実行
- **ロールバック機能**: フェーズの巻き戻し
- **監査ログ**: すべての操作を記録
- **通知システム**: Slack/Discord連携

## まとめ

Phase 2は「信頼するが検証する」から「検証して制限する」へのシフトです。
AIの自律性を保ちながら、クリティカルな操作では人間の承認を必須にします。
