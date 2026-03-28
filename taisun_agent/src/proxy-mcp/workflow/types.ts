/**
 * Workflow Type Definitions
 * Phase 1: State Management Only (no strict enforcement)
 * Phase 2: Strict Enforcement Mode
 * Phase 3: Advanced Features (Conditional Branching, Parallel Execution, Rollback)
 */

export interface WorkflowValidation {
  type: 'file_exists' | 'command' | 'json_schema';
  target?: string;
  command?: string;
  schema?: string;
  errorMessage: string;
}

// ========================================
// Phase 3: Conditional Branching
// ========================================

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

// ========================================
// Phase 3: Parallel Execution
// ========================================

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

// ========================================
// Phase 3: Rollback
// ========================================

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

export interface WorkflowPhase {
  id: string;
  name: string;
  description?: string;
  allowedSkills?: string[];
  requiredArtifacts?: string[];
  validations?: WorkflowValidation[];

  // Phase 1-2: 通常遷移
  nextPhase?: string | null;

  // Phase 3: 条件分岐（新規）
  conditionalNext?: ConditionalNext;

  // Phase 3: 並列実行（新規）
  parallelNext?: ParallelNext;

  // Phase 3: ロールバック許可先（新規）
  allowRollbackTo?: string[];

  // Phase 3: スナップショット有効化（新規）
  snapshotEnabled?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  phases: WorkflowPhase[];
}

export interface WorkflowState {
  workflowId: string;
  currentPhase: string;
  completedPhases: string[];
  startedAt: string;
  lastUpdatedAt: string;
  strict: boolean;
  metadata?: Record<string, unknown>;

  // Phase 3: 並列実行状態（新規）
  parallelExecutions?: ParallelExecutionState[];

  // Phase 3: ロールバック履歴（新規）
  rollbackHistory?: RollbackHistory[];

  // Phase 3: フェーズスナップショット（新規）
  snapshots?: PhaseSnapshot[];

  // Phase 3: 分岐履歴（デバッグ用、新規）
  branchHistory?: string[];
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface CanRunSkillResult {
  ok: boolean;
  reason?: string;
  suggestedNext?: string;
}

export interface PhaseTransitionResult {
  success: boolean;
  newPhase?: string;
  errors: string[];
  message: string;
}
