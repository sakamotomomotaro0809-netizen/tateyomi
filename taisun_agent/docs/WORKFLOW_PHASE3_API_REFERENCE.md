# Workflow Guardian Phase 3 - API Reference

## 目次

1. [型定義](#型定義)
2. [Engine API](#engine-api)
3. [State Management](#state-management)
4. [Workflow定義](#workflow定義)

---

## 型定義

### Condition Types

#### `ConditionType`

条件評価のタイプを定義します。

```typescript
export type ConditionType =
  | 'file_content'      // ファイル内容で判定
  | 'file_exists'       // ファイル存在で判定
  | 'command_output'    // コマンド出力で判定
  | 'metadata_value';   // メタデータの値で判定
```

#### `Condition`

条件評価の詳細設定を定義します。

```typescript
export interface Condition {
  /**
   * 条件評価のタイプ
   */
  type: ConditionType;

  /**
   * 評価対象のソース
   * - file_content: ファイルパス
   * - file_exists: ファイルパス
   * - command_output: シェルコマンド
   * - metadata_value: メタデータのキー名
   */
  source: string;

  /**
   * 正規表現パターン（オプション）
   * マッチした値がbranches のキーとして使用される
   */
  pattern?: string;

  /**
   * 期待値（オプション）
   * pattern と排他的に使用
   */
  expectedValue?: string;
}
```

**使用例**：

```typescript
// ファイル内容で分岐
const fileContentCondition: Condition = {
  type: 'file_content',
  source: 'output/content_type.txt',
  pattern: '^(video|article|podcast)$'
};

// ファイル存在で分岐
const fileExistsCondition: Condition = {
  type: 'file_exists',
  source: 'output/optional.flag'
};

// コマンド出力で分岐
const commandCondition: Condition = {
  type: 'command_output',
  source: 'node -v',
  pattern: '^v(18|20|22)\\.'
};

// メタデータ値で分岐
const metadataCondition: Condition = {
  type: 'metadata_value',
  source: 'priority',
  pattern: '^(high|normal|low)$'
};
```

#### `ConditionalNext`

条件分岐の設定を定義します。

```typescript
export interface ConditionalNext {
  /**
   * 評価する条件
   */
  condition: Condition;

  /**
   * 条件評価結果とフェーズIDのマッピング
   * キー: 条件評価の結果値
   * 値: 遷移先のフェーズID
   */
  branches: Record<string, string>;

  /**
   * デフォルトの遷移先（オプション）
   * branches にマッチしない場合に使用
   * 未設定の場合、マッチしないとエラー
   */
  defaultNext?: string;
}
```

**使用例**：

```typescript
const conditionalNext: ConditionalNext = {
  condition: {
    type: 'file_content',
    source: 'output/type.txt',
    pattern: '^(video|article)$'
  },
  branches: {
    video: 'phase_video_production',
    article: 'phase_article_writing'
  },
  defaultNext: 'phase_error_handler'
};
```

### Parallel Execution Types

#### `ParallelNext`

並列実行の設定を定義します。

```typescript
export interface ParallelNext {
  /**
   * 並列実行するフェーズIDのリスト
   * 2個以上を推奨（1個の場合は通常の遷移と同じ）
   */
  phases: string[];

  /**
   * 完了待機戦略
   * - 'all': 全フェーズの完了を待つ
   * - 'any': いずれか1つの完了で次へ進む
   */
  waitStrategy: 'all' | 'any';

  /**
   * タイムアウト（ミリ秒）（オプション）
   * 未実装（将来の拡張用）
   */
  timeoutMs?: number;
}
```

**使用例**：

```typescript
// 全フェーズの完了を待つ
const parallelAll: ParallelNext = {
  phases: ['phase_design', 'phase_copy', 'phase_seo'],
  waitStrategy: 'all'
};

// いずれか1つの完了で次へ
const parallelAny: ParallelNext = {
  phases: ['phase_fast_path', 'phase_slow_path'],
  waitStrategy: 'any'
};
```

#### `ParallelExecutionState`

並列実行の状態を定義します。

```typescript
export interface ParallelExecutionState {
  /**
   * 並列実行グループの一意ID
   * フォーマット: "parallel_{timestamp}"
   */
  parallelGroupId: string;

  /**
   * 開始されたフェーズIDのリスト
   */
  startedPhases: string[];

  /**
   * 完了したフェーズIDのリスト
   */
  completedPhases: string[];

  /**
   * 完了待機戦略
   */
  waitStrategy: 'all' | 'any';

  /**
   * 並列実行開始時刻（ISO 8601形式）
   */
  startedAt: string;

  /**
   * 並列実行完了時刻（ISO 8601形式）（オプション）
   * 未設定の場合、まだ完了していない
   */
  completedAt?: string;
}
```

**状態例**：

```typescript
const parallelState: ParallelExecutionState = {
  parallelGroupId: 'parallel_1705032000000',
  startedPhases: ['phase_dev', 'phase_qa', 'phase_docs'],
  completedPhases: ['phase_dev', 'phase_qa'],
  waitStrategy: 'all',
  startedAt: '2026-01-12T04:00:00.000Z',
  // completedAt is undefined (not completed yet)
};
```

### Rollback Types

#### `RollbackHistory`

ロールバック履歴を定義します。

```typescript
export interface RollbackHistory {
  /**
   * ロールバックの一意ID
   * フォーマット: "rollback_{timestamp}"
   */
  rollbackId: string;

  /**
   * ロールバック元のフェーズID
   */
  fromPhase: string;

  /**
   * ロールバック先のフェーズID
   */
  toPhase: string;

  /**
   * ロールバックの理由（オプション）
   */
  reason?: string;

  /**
   * 削除された成果物のリスト（ファイルパス）
   */
  deletedArtifacts: string[];

  /**
   * ロールバック実行時刻（ISO 8601形式）
   */
  timestamp: string;

  /**
   * ロールバック実行者（オプション）
   * 未実装（将来の拡張用）
   */
  performedBy?: string;
}
```

**履歴例**：

```typescript
const rollback: RollbackHistory = {
  rollbackId: 'rollback_1705032000000',
  fromPhase: 'phase_review',
  toPhase: 'phase_design',
  reason: 'デザインレビューで大幅な修正が必要',
  deletedArtifacts: [
    'output/implementation.txt',
    'output/tests.txt'
  ],
  timestamp: '2026-01-12T04:00:00.000Z'
};
```

#### `PhaseSnapshot`

フェーズのスナップショットを定義します。

```typescript
export interface PhaseSnapshot {
  /**
   * スナップショットを取得したフェーズID
   */
  phaseId: string;

  /**
   * 成果物のバックアップ
   * キー: ファイルパス
   * 値: ファイル内容
   */
  artifacts: Record<string, string>;

  /**
   * メタデータのバックアップ
   */
  metadata: Record<string, unknown>;

  /**
   * スナップショット作成時刻（ISO 8601形式）
   */
  timestamp: string;
}
```

**注意**: `PhaseSnapshot`は実装されていますが、現在は未使用です。将来の拡張用に定義されています。

### Extended Workflow Types

#### `WorkflowPhase` (Phase 3拡張)

フェーズ定義にPhase 3フィールドを追加します。

```typescript
export interface WorkflowPhase {
  id: string;
  name: string;
  description?: string;
  allowedSkills?: string[];
  requiredArtifacts?: string[];
  validations?: WorkflowValidation[];

  // Phase 1-2: 通常の遷移
  nextPhase?: string | null;

  // Phase 3: 条件分岐
  conditionalNext?: ConditionalNext;

  // Phase 3: 並列実行
  parallelNext?: ParallelNext;

  // Phase 3: ロールバック制限
  allowRollbackTo?: string[];

  // Phase 3: スナップショット有効化（未実装）
  snapshotEnabled?: boolean;
}
```

**優先順位**：
1. `conditionalNext` - 条件分岐が最優先
2. `parallelNext` - 並列実行
3. `nextPhase` - 通常の遷移

#### `WorkflowState` (Phase 3拡張)

ワークフロー状態にPhase 3フィールドを追加します。

```typescript
export interface WorkflowState {
  workflowId: string;
  currentPhase: string;
  completedPhases: string[];
  startedAt: string;
  lastUpdatedAt: string;
  strict: boolean;
  metadata?: Record<string, unknown>;

  // Phase 3: 並列実行状態
  parallelExecutions?: ParallelExecutionState[];

  // Phase 3: ロールバック履歴
  rollbackHistory?: RollbackHistory[];

  // Phase 3: スナップショット（未実装）
  snapshots?: PhaseSnapshot[];

  // Phase 3: 分岐履歴
  branchHistory?: string[];
}
```

---

## Engine API

### `rollbackToPhase()`

指定されたフェーズにロールバックします。

```typescript
export function rollbackToPhase(
  targetPhaseId: string,
  reason?: string
): RollbackHistory
```

**パラメータ**：
- `targetPhaseId`: ロールバック先のフェーズID
- `reason`: ロールバックの理由（オプション、推奨）

**戻り値**：
- `RollbackHistory`: ロールバック履歴オブジェクト

**throws**：
- `Error`: アクティブなワークフローがない場合
- `Error`: ターゲットフェーズが存在しない場合
- `Error`: ロールバックが制限されている場合

**使用例**：

```typescript
import { rollbackToPhase } from './engine';

try {
  const result = rollbackToPhase('phase_design', 'デザインレビューで修正が必要');
  console.log(`ロールバック成功: ${result.fromPhase} → ${result.toPhase}`);
  console.log(`削除された成果物: ${result.deletedArtifacts.length}個`);
} catch (error) {
  console.error('ロールバック失敗:', error.message);
}
```

### `transitionToNextPhase()` (Phase 3更新)

次のフェーズに遷移します。Phase 3機能を自動的に処理します。

```typescript
export function transitionToNextPhase(): PhaseTransitionResult
```

**戻り値**：

```typescript
interface PhaseTransitionResult {
  success: boolean;
  newPhase?: string;
  errors: string[];
  message: string;
}
```

**動作**：
1. 現在のフェーズを検証
2. Phase 3機能をチェック：
   - 並列実行中の場合、並列フェーズ間を遷移
   - `conditionalNext`がある場合、条件を評価して分岐
   - `parallelNext`がある場合、並列実行を開始
   - それ以外は`nextPhase`に遷移
3. 状態を更新して保存

**並列実行時のメッセージ**：
- 並列実行開始: `"並列実行開始。Phase {id} に進みました（並列: {count}個）"`
- 並列フェーズ間遷移: `"次の並列フェーズ {id} に進みました（残り: {count}）"`
- 並列実行完了: `"並列実行完了。Phase {id} に進みました"`

**使用例**：

```typescript
import { transitionToNextPhase } from './engine';

const result = transitionToNextPhase();

if (result.success) {
  console.log(`✅ ${result.message}`);
  console.log(`新しいフェーズ: ${result.newPhase}`);
} else {
  console.error(`❌ 遷移失敗`);
  result.errors.forEach(err => console.error(`  - ${err}`));
}
```

### Internal Helper Functions

これらの関数は内部使用のみです（エクスポートされていません）。

#### `evaluateCondition()`

条件を評価して結果値を返します。

```typescript
function evaluateCondition(condition: Condition): string | null
```

**パラメータ**：
- `condition`: 評価する条件

**戻り値**：
- 評価結果の文字列（マッチした値）
- 評価失敗時は`null`

**動作**：
- `file_content`: ファイルを読み取り、パターンマッチング
- `file_exists`: ファイル存在確認（"true" または "false"を返す）
- `command_output`: コマンド実行して出力を評価
- `metadata_value`: メタデータから値を取得して評価

#### `determineNextPhase()`

現在のフェーズから次のフェーズIDを決定します。

```typescript
function determineNextPhase(currentPhase: WorkflowPhase): string | null
```

**パラメータ**：
- `currentPhase`: 現在のフェーズ定義

**戻り値**：
- 次のフェーズID
- 最終フェーズの場合は`null`

**throws**：
- 条件分岐でマッチしない場合

**優先順位**：
1. `conditionalNext` - 条件を評価して分岐先を決定
2. `parallelNext` - 最初の並列フェーズを返す
3. `nextPhase` - 通常の遷移

#### `startParallelExecution()`

並列実行を開始します。

```typescript
function startParallelExecution(parallelNext: ParallelNext): ParallelExecutionState
```

#### `completeParallelPhase()`

並列フェーズの完了を記録します。

```typescript
function completeParallelPhase(phaseId: string): void
```

#### `isParallelExecutionComplete()`

並列実行が完了しているか確認します。

```typescript
function isParallelExecutionComplete(): boolean
```

#### `getParallelExecutionForPhase()`

指定フェーズが属する並列実行グループを取得します。

```typescript
function getParallelExecutionForPhase(phaseId: string): ParallelExecutionState | null
```

---

## State Management

### `.workflow_state.json`

ワークフロー状態は`.workflow_state.json`に保存されます。

**Phase 3で追加されるフィールド**：

```json
{
  "workflowId": "example_v1",
  "currentPhase": "phase_2a",
  "completedPhases": ["phase_0", "phase_1"],
  "startedAt": "2026-01-12T04:00:00.000Z",
  "lastUpdatedAt": "2026-01-12T04:05:00.000Z",
  "strict": true,
  "metadata": {
    "priority": "high",
    "author": "user@example.com"
  },

  // Phase 3: 並列実行状態
  "parallelExecutions": [
    {
      "parallelGroupId": "parallel_1705032000000",
      "startedPhases": ["phase_2a", "phase_2b", "phase_2c"],
      "completedPhases": ["phase_2a"],
      "waitStrategy": "all",
      "startedAt": "2026-01-12T04:05:00.000Z"
    }
  ],

  // Phase 3: ロールバック履歴
  "rollbackHistory": [
    {
      "rollbackId": "rollback_1705031000000",
      "fromPhase": "phase_3",
      "toPhase": "phase_1",
      "reason": "デザインレビューで修正が必要",
      "deletedArtifacts": ["output/phase_2.txt", "output/phase_3.txt"],
      "timestamp": "2026-01-12T03:50:00.000Z"
    }
  ],

  // Phase 3: 分岐履歴
  "branchHistory": [
    "phase_0 -> phase_video_plan (video)",
    "phase_3 -> phase_high_priority (high)"
  ]
}
```

---

## Workflow定義

### 完全な例

Phase 3のすべての機能を使用したワークフロー定義の例：

```json
{
  "id": "advanced_workflow_v1",
  "name": "高度なワークフロー例",
  "version": "1.0.0",
  "description": "Phase 3機能をすべて使用した例",
  "phases": [
    {
      "id": "phase_0",
      "name": "優先度判定",
      "description": "プロジェクトの優先度を判定",
      "conditionalNext": {
        "condition": {
          "type": "metadata_value",
          "source": "priority",
          "pattern": "^(high|normal)$"
        },
        "branches": {
          "high": "phase_fast_track",
          "normal": "phase_standard"
        },
        "defaultNext": "phase_error"
      }
    },
    {
      "id": "phase_fast_track",
      "name": "高速トラック企画",
      "description": "高優先度プロジェクトの企画",
      "requiredArtifacts": ["output/fast_plan.txt"],
      "parallelNext": {
        "phases": ["phase_dev", "phase_qa"],
        "waitStrategy": "any"
      }
    },
    {
      "id": "phase_standard",
      "name": "標準トラック企画",
      "description": "通常優先度プロジェクトの企画",
      "requiredArtifacts": ["output/standard_plan.txt"],
      "parallelNext": {
        "phases": ["phase_dev", "phase_qa"],
        "waitStrategy": "all"
      }
    },
    {
      "id": "phase_dev",
      "name": "開発",
      "description": "実装作業",
      "requiredArtifacts": ["output/code.txt"],
      "allowedSkills": ["implementer", "backend-developer"],
      "nextPhase": "phase_review"
    },
    {
      "id": "phase_qa",
      "name": "品質保証",
      "description": "テスト作業",
      "requiredArtifacts": ["output/tests.txt"],
      "allowedSkills": ["test-engineer", "qa-validator"],
      "nextPhase": "phase_review"
    },
    {
      "id": "phase_review",
      "name": "最終レビュー",
      "description": "完成物のレビュー",
      "allowRollbackTo": ["phase_0", "phase_fast_track", "phase_standard"],
      "nextPhase": null
    },
    {
      "id": "phase_error",
      "name": "エラー処理",
      "description": "予期しない状態の処理",
      "nextPhase": null
    }
  ]
}
```

### 最小限の例（Phase 1-2互換）

Phase 3機能を使わない最小限のワークフロー（Phase 1-2と完全互換）：

```json
{
  "id": "simple_workflow_v1",
  "name": "シンプルなワークフロー",
  "version": "1.0.0",
  "phases": [
    {
      "id": "phase_0",
      "name": "開始",
      "nextPhase": "phase_1"
    },
    {
      "id": "phase_1",
      "name": "作業",
      "requiredArtifacts": ["output/work.txt"],
      "nextPhase": "phase_2"
    },
    {
      "id": "phase_2",
      "name": "完了",
      "nextPhase": null
    }
  ]
}
```

---

## バージョン情報

- **Phase 1**: 基本的なワークフロー機能、strict mode
- **Phase 2**: 状態検証、スキル制限
- **Phase 3**: 条件分岐、並列実行、ロールバック（本ドキュメント）

**後方互換性**: Phase 3は完全に後方互換です。Phase 1-2のワークフローは変更なしで動作します。

---

## 関連ドキュメント

- [Phase 3 User Guide](./WORKFLOW_PHASE3_USER_GUIDE.md) - ユーザー向けガイド
- [Phase 3 Design](./WORKFLOW_PHASE3_DESIGN.md) - 設計ドキュメント
- [Workflow Engine](../src/proxy-mcp/workflow/engine.ts) - 実装コード
- [Type Definitions](../src/proxy-mcp/workflow/types.ts) - 型定義
