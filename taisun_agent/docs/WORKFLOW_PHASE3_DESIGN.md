# Workflow Guardian Phase 3 設計書

## 概要

Phase 3では、以下の高度な機能を追加します：

1. **条件分岐** (Conditional Branching) - フェーズ遷移時の条件判定
2. **並列実行** (Parallel Execution) - 複数フェーズの同時実行
3. **ロールバック** (Rollback) - 前のフェーズへの巻き戻し

## 実装の優先順位と段階

Phase 3は大規模な実装なので、以下の順序で段階的に実装します：

### Step 1: 型定義の拡張（基礎）
- 新しい型を定義
- 既存コードへの影響を最小化
- 後方互換性の維持

### Step 2: 条件分岐（最も基本的な拡張）
- シンプルな if-else 分岐
- ファイルベースの条件判定
- 実用例：コンテンツタイプによる分岐

### Step 3: 並列実行（中程度の複雑さ）
- 複数フェーズの同時開始
- 待機戦略（全完了 or 1つでも完了）
- 実用例：デザインとコピーを同時作成

### Step 4: ロールバック（最も複雑）
- フェーズの巻き戻し
- 成果物の削除/復元
- 監査ログの記録

### Step 5: 統合テスト
- 各機能の組み合わせテスト
- エッジケースの確認
- ドキュメント完成

---

## 1. 型定義の拡張

### 1.1 条件分岐の型

```typescript
// types.ts に追加

/**
 * 条件判定の種類
 */
export type ConditionType =
  | 'file_content'      // ファイル内容で判定
  | 'file_exists'       // ファイル存在で判定
  | 'command_output'    // コマンド出力で判定
  | 'metadata_value';   // メタデータの値で判定

/**
 * 条件定義
 */
export interface Condition {
  type: ConditionType;
  source: string;           // 判定対象（ファイルパス、コマンド等）
  pattern?: string;         // マッチパターン（正規表現）
  expectedValue?: string;   // 期待値
}

/**
 * 条件分岐定義
 */
export interface ConditionalNext {
  condition: Condition;
  branches: Record<string, string>;  // 値 → 次フェーズID
  defaultNext?: string;               // デフォルト遷移先
}
```

### 1.2 並列実行の型

```typescript
/**
 * 並列フェーズ定義
 */
export interface ParallelNext {
  phases: string[];         // 並列実行するフェーズID配列
  waitStrategy: 'all' | 'any';  // 全完了待ち or 1つでも完了
  timeoutMs?: number;       // タイムアウト（省略可）
}

/**
 * 並列実行状態
 */
export interface ParallelExecutionState {
  parallelGroupId: string;  // 並列グループのID
  startedPhases: string[];  // 開始済みフェーズ
  completedPhases: string[];// 完了済みフェーズ
  waitStrategy: 'all' | 'any';
  startedAt: string;
  completedAt?: string;
}
```

### 1.3 ロールバックの型

```typescript
/**
 * ロールバック履歴
 */
export interface RollbackHistory {
  rollbackId: string;
  fromPhase: string;
  toPhase: string;
  reason?: string;
  deletedArtifacts: string[];  // 削除された成果物
  timestamp: string;
  performedBy?: string;        // 実行者（将来の拡張用）
}

/**
 * フェーズスナップショット（復元用）
 */
export interface PhaseSnapshot {
  phaseId: string;
  artifacts: Record<string, string>;  // ファイル名 → 内容
  metadata: Record<string, unknown>;
  timestamp: string;
}
```

### 1.4 拡張されたWorkflowPhase

```typescript
export interface WorkflowPhase {
  id: string;
  name: string;
  description?: string;
  allowedSkills?: string[];
  requiredArtifacts?: string[];
  validations?: PhaseValidation[];

  // Phase 3: 拡張フィールド
  nextPhase?: string;                    // 通常遷移（既存）
  conditionalNext?: ConditionalNext;     // 条件分岐（新規）
  parallelNext?: ParallelNext;           // 並列実行（新規）
  allowRollbackTo?: string[];            // ロールバック許可先（新規）
  snapshotEnabled?: boolean;             // スナップショット有効化（新規）
}
```

### 1.5 拡張されたWorkflowState

```typescript
export interface WorkflowState {
  workflowId: string;
  currentPhase: string;
  completedPhases: string[];
  startedAt: string;
  lastUpdatedAt: string;
  strict: boolean;
  metadata?: Record<string, unknown>;

  // Phase 3: 拡張フィールド
  parallelExecutions?: ParallelExecutionState[];  // 並列実行状態（新規）
  rollbackHistory?: RollbackHistory[];            // ロールバック履歴（新規）
  snapshots?: PhaseSnapshot[];                    // フェーズスナップショット（新規）
  branchHistory?: string[];                       // 分岐履歴（デバッグ用）
}
```

---

## 2. 条件分岐の実装

### 2.1 ユースケース

**例：コンテンツ制作ワークフロー**

```json
{
  "id": "content_production_v1",
  "phases": [
    {
      "id": "phase_0",
      "name": "企画・構成決定",
      "requiredArtifacts": ["plan.md", "content_type.txt"],
      "conditionalNext": {
        "condition": {
          "type": "file_content",
          "source": "content_type.txt",
          "pattern": "^(video|article|podcast)$"
        },
        "branches": {
          "video": "phase_1_video",
          "article": "phase_1_article",
          "podcast": "phase_1_podcast"
        },
        "defaultNext": "phase_error"
      }
    },
    {
      "id": "phase_1_video",
      "name": "動画台本作成",
      "allowedSkills": ["vsl", "launch-video"],
      "nextPhase": "phase_2_production"
    },
    {
      "id": "phase_1_article",
      "name": "記事執筆",
      "allowedSkills": ["copywriting-helper"],
      "nextPhase": "phase_2_production"
    },
    {
      "id": "phase_1_podcast",
      "name": "台本作成",
      "allowedSkills": ["copywriting-helper"],
      "nextPhase": "phase_2_production"
    }
  ]
}
```

### 2.2 実装方針

**engine.ts に追加**:

```typescript
/**
 * 条件を評価
 */
function evaluateCondition(condition: Condition): string | null {
  switch (condition.type) {
    case 'file_content': {
      if (!fs.existsSync(condition.source)) {
        return null;
      }
      const content = fs.readFileSync(condition.source, 'utf-8').trim();

      if (condition.pattern) {
        const regex = new RegExp(condition.pattern);
        if (regex.test(content)) {
          return content;
        }
      }
      return content;
    }

    case 'file_exists': {
      return fs.existsSync(condition.source) ? 'true' : 'false';
    }

    case 'command_output': {
      try {
        const output = execSync(condition.source, {
          encoding: 'utf-8',
          stdio: 'pipe'
        }).trim();
        return output;
      } catch {
        return null;
      }
    }

    case 'metadata_value': {
      const state = loadState();
      const value = state?.metadata?.[condition.source];
      return value ? String(value) : null;
    }
  }
}

/**
 * 次のフェーズを決定（条件分岐対応版）
 */
function determineNextPhase(currentPhase: WorkflowPhase): string | null {
  // 条件分岐がある場合
  if (currentPhase.conditionalNext) {
    const value = evaluateCondition(currentPhase.conditionalNext.condition);

    if (value && currentPhase.conditionalNext.branches[value]) {
      return currentPhase.conditionalNext.branches[value];
    }

    // デフォルト遷移
    if (currentPhase.conditionalNext.defaultNext) {
      return currentPhase.conditionalNext.defaultNext;
    }

    throw new Error(
      `条件分岐の評価に失敗しました。\n` +
      `条件値: ${value}\n` +
      `利用可能な分岐: ${Object.keys(currentPhase.conditionalNext.branches).join(', ')}`
    );
  }

  // 通常遷移
  return currentPhase.nextPhase || null;
}
```

---

## 3. 並列実行の実装

### 3.1 ユースケース

**例：マーケティングキャンペーン**

```json
{
  "id": "marketing_campaign_v1",
  "phases": [
    {
      "id": "phase_0",
      "name": "キャンペーン設計",
      "nextPhase": "phase_1_prep"
    },
    {
      "id": "phase_1_prep",
      "name": "準備フェーズ",
      "parallelNext": {
        "phases": ["phase_2a_design", "phase_2b_copy", "phase_2c_seo"],
        "waitStrategy": "all"
      }
    },
    {
      "id": "phase_2a_design",
      "name": "デザイン作成",
      "allowedSkills": ["nanobanana-pro"],
      "requiredArtifacts": ["design/banner.png"],
      "nextPhase": "phase_3_integration"
    },
    {
      "id": "phase_2b_copy",
      "name": "コピーライティング",
      "allowedSkills": ["copywriting-helper", "taiyo-style"],
      "requiredArtifacts": ["copy/ad_copy.md"],
      "nextPhase": "phase_3_integration"
    },
    {
      "id": "phase_2c_seo",
      "name": "SEO調査",
      "allowedSkills": ["research-cited-report"],
      "requiredArtifacts": ["seo/keywords.md"],
      "nextPhase": "phase_3_integration"
    },
    {
      "id": "phase_3_integration",
      "name": "統合・最終確認",
      "nextPhase": "phase_4_launch"
    }
  ]
}
```

### 3.2 実装方針

**engine.ts に追加**:

```typescript
/**
 * 並列実行を開始
 */
function startParallelExecution(
  parallelNext: ParallelNext
): ParallelExecutionState {
  const state = loadState();
  if (!state) {
    throw new Error('No active workflow');
  }

  const parallelState: ParallelExecutionState = {
    parallelGroupId: `parallel_${Date.now()}`,
    startedPhases: [...parallelNext.phases],
    completedPhases: [],
    waitStrategy: parallelNext.waitStrategy,
    startedAt: new Date().toISOString(),
  };

  // 状態に追加
  if (!state.parallelExecutions) {
    state.parallelExecutions = [];
  }
  state.parallelExecutions.push(parallelState);

  saveState(state);

  return parallelState;
}

/**
 * 並列フェーズの完了を記録
 */
function completeParallelPhase(phaseId: string): void {
  const state = loadState();
  if (!state || !state.parallelExecutions) {
    return;
  }

  // アクティブな並列実行を見つける
  const activeParallel = state.parallelExecutions.find(
    p => p.startedPhases.includes(phaseId) && !p.completedAt
  );

  if (!activeParallel) {
    return;
  }

  // 完了マーク
  if (!activeParallel.completedPhases.includes(phaseId)) {
    activeParallel.completedPhases.push(phaseId);
  }

  // 完了条件チェック
  const shouldComplete =
    activeParallel.waitStrategy === 'all'
      ? activeParallel.completedPhases.length === activeParallel.startedPhases.length
      : activeParallel.completedPhases.length > 0;

  if (shouldComplete) {
    activeParallel.completedAt = new Date().toISOString();
  }

  saveState(state);
}

/**
 * 並列実行が完了しているか確認
 */
function isParallelExecutionComplete(): boolean {
  const state = loadState();
  if (!state || !state.parallelExecutions) {
    return true;  // 並列実行なし = 完了扱い
  }

  const activeParallel = state.parallelExecutions.find(p => !p.completedAt);
  return !activeParallel;
}
```

---

## 4. ロールバックの実装

### 4.1 ユースケース

**例：デザインレビュー後の修正**

```bash
# Phase 4まで進んだ
npm run workflow:status
# Progress: 5/7

# デザインレビューの結果、Phase 2からやり直しが必要
npm run workflow:rollback -- phase_2

# Phase 2に戻る
# Phase 3, 4の成果物は自動削除（オプション）
# ロールバック履歴に記録
```

### 4.2 実装方針

**新しいコマンド: scripts/workflow/rollback.ts**

```typescript
import { rollbackToPhase } from '../../src/proxy-mcp/workflow/engine.js';

const args = process.argv.slice(2);
const targetPhase = args[0];
const reason = args[1];

if (!targetPhase) {
  console.error('使い方: npm run workflow:rollback -- <phase_id> [reason]');
  process.exit(1);
}

try {
  const result = rollbackToPhase(targetPhase, reason);

  console.log(`✅ Phase ${targetPhase} にロールバックしました\n`);
  console.log(`削除された成果物: ${result.deletedArtifacts.length}個`);

  if (result.deletedArtifacts.length > 0) {
    console.log('\n削除されたファイル:');
    result.deletedArtifacts.forEach(file => console.log(`  - ${file}`));
  }

  console.log('\n次のステップ: npm run workflow:status');
} catch (error) {
  console.error('❌ Error:', (error as Error).message);
  process.exit(1);
}
```

**engine.ts に追加**:

```typescript
/**
 * フェーズスナップショットを作成
 */
function createSnapshot(phaseId: string): PhaseSnapshot {
  const state = loadState();
  const workflow = getWorkflow(state!.workflowId);
  const phase = workflow.phases.find(p => p.id === phaseId);

  if (!phase) {
    throw new Error(`Phase ${phaseId} not found`);
  }

  const artifacts: Record<string, string> = {};

  // 成果物のバックアップ
  if (phase.requiredArtifacts) {
    for (const artifact of phase.requiredArtifacts) {
      if (fs.existsSync(artifact)) {
        artifacts[artifact] = fs.readFileSync(artifact, 'utf-8');
      }
    }
  }

  return {
    phaseId,
    artifacts,
    metadata: { ...state!.metadata },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 指定フェーズにロールバック
 */
export function rollbackToPhase(
  targetPhaseId: string,
  reason?: string
): RollbackHistory {
  const state = loadState();

  if (!state) {
    throw new Error('No active workflow');
  }

  const workflow = getWorkflow(state.workflowId);

  // ターゲットフェーズが存在するか確認
  const targetPhase = workflow.phases.find(p => p.id === targetPhaseId);
  if (!targetPhase) {
    throw new Error(`Phase ${targetPhaseId} not found in workflow`);
  }

  // ロールバック可能か確認
  const currentPhase = workflow.phases.find(p => p.id === state.currentPhase);
  if (currentPhase?.allowRollbackTo &&
      !currentPhase.allowRollbackTo.includes(targetPhaseId)) {
    throw new Error(
      `Rollback to ${targetPhaseId} is not allowed from ${state.currentPhase}`
    );
  }

  // 削除する成果物を収集
  const deletedArtifacts: string[] = [];
  const targetIndex = workflow.phases.findIndex(p => p.id === targetPhaseId);
  const currentIndex = workflow.phases.findIndex(p => p.id === state.currentPhase);

  // 現在より後のフェーズの成果物を削除
  for (let i = targetIndex + 1; i <= currentIndex; i++) {
    const phase = workflow.phases[i];
    if (phase.requiredArtifacts) {
      for (const artifact of phase.requiredArtifacts) {
        if (fs.existsSync(artifact)) {
          fs.unlinkSync(artifact);
          deletedArtifacts.push(artifact);
        }
      }
    }
  }

  // ロールバック履歴を記録
  const rollback: RollbackHistory = {
    rollbackId: `rollback_${Date.now()}`,
    fromPhase: state.currentPhase,
    toPhase: targetPhaseId,
    reason,
    deletedArtifacts,
    timestamp: new Date().toISOString(),
  };

  if (!state.rollbackHistory) {
    state.rollbackHistory = [];
  }
  state.rollbackHistory.push(rollback);

  // 完了フェーズを更新
  state.completedPhases = state.completedPhases.filter(
    phaseId => {
      const index = workflow.phases.findIndex(p => p.id === phaseId);
      return index < targetIndex;
    }
  );

  // 現在フェーズを更新
  state.currentPhase = targetPhaseId;
  state.lastUpdatedAt = new Date().toISOString();

  saveState(state);

  return rollback;
}
```

---

## 5. 実装順序

Phase 3を丁寧に実装するため、以下の順序で進めます：

### Week 1: 基礎実装
- [ ] Day 1-2: 型定義の拡張とテスト
- [ ] Day 3-4: 条件分岐の実装とテスト
- [ ] Day 5: 条件分岐のドキュメントと実例

### Week 2: 中級機能
- [ ] Day 1-3: 並列実行の実装とテスト
- [ ] Day 4-5: 並列実行のドキュメントと実例

### Week 3: 高度機能
- [ ] Day 1-3: ロールバックの実装とテスト
- [ ] Day 4-5: ロールバックのドキュメントと実例

### Week 4: 統合とリリース
- [ ] Day 1-2: 統合テスト（3機能の組み合わせ）
- [ ] Day 3: パフォーマンステスト
- [ ] Day 4: ドキュメント完成
- [ ] Day 5: リリース準備

---

## 6. 後方互換性

Phase 3の機能はすべて**オプション**です：

- ✅ 既存のワークフロー（Phase 1, 2）は変更なしで動作
- ✅ 新しいフィールドは省略可能
- ✅ 型チェックで段階的に移行可能

---

## 7. テスト戦略

### 7.1 単体テスト

```typescript
// tests/unit/workflow-phase3.test.ts

describe('Workflow Phase 3 - Conditional Branching', () => {
  it('should evaluate file_content condition', () => {
    // テスト実装
  });

  it('should transition to correct branch', () => {
    // テスト実装
  });
});

describe('Workflow Phase 3 - Parallel Execution', () => {
  it('should start parallel phases', () => {
    // テスト実装
  });

  it('should wait for all phases when waitStrategy=all', () => {
    // テスト実装
  });
});

describe('Workflow Phase 3 - Rollback', () => {
  it('should rollback to target phase', () => {
    // テスト実装
  });

  it('should delete artifacts after rollback', () => {
    // テスト実装
  });
});
```

### 7.2 統合テスト

```typescript
describe('Workflow Phase 3 - Integration', () => {
  it('should handle conditional + parallel combination', () => {
    // 条件分岐の後に並列実行
  });

  it('should rollback from parallel execution', () => {
    // 並列実行中のフェーズからロールバック
  });
});
```

---

## 8. セキュリティ考慮事項

### 8.1 条件分岐

- ✅ ファイルパスのサニタイゼーション（path traversal防止）
- ✅ コマンドインジェクション防止
- ✅ 正規表現DoS防止（パターン複雑度制限）

### 8.2 並列実行

- ✅ リソース制限（最大並列数）
- ✅ タイムアウト設定
- ✅ デッドロック検出

### 8.3 ロールバック

- ✅ 監査ログ記録（誰がいつ巻き戻したか）
- ✅ スナップショット暗号化（機密情報保護）
- ✅ ロールバック回数制限（無限ループ防止）

---

## 9. まとめ

Phase 3は以下の価値を提供します：

### 条件分岐
- ✅ 1つのワークフローで複数のパターンに対応
- ✅ 無駄な手順をスキップ
- ✅ 柔軟性の向上

### 並列実行
- ✅ 複数タスクの同時実行（時間短縮）
- ✅ リソースの効率的利用
- ✅ 依存関係の明確化

### ロールバック
- ✅ やり直しが安全にできる
- ✅ 成果物の整合性維持
- ✅ 監査証跡の保持

**推定実装時間**: 4週間（丁寧に進める場合）

**テストカバレッジ目標**: 85%以上
