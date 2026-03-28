/**
 * Unified Hook Architecture - Type Definitions
 * 4層統合アーキテクチャの共通型定義
 */

/**
 * Hook Intent - 操作の意図を表す列挙型
 */
export enum HookIntent {
  READ = 'READ',
  WRITE = 'WRITE',
  BASH = 'BASH',
  SKILL = 'SKILL',
  EDIT = 'EDIT',
  GLOB = 'GLOB',
  GREP = 'GREP',
  DEVIATION = 'DEVIATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Hook Decision - フックの判定結果
 */
export enum HookDecision {
  ALLOW = 'allow',
  BLOCK = 'block',
  WARNING = 'warning',
}

/**
 * Hook Event - フック実行イベント
 */
export interface HookEvent {
  timestamp: number;
  toolName: string;
  toolInput: Record<string, any>;
  phase: 'PreToolUse' | 'PostToolUse' | 'SessionStart' | 'Stop';
  cwd: string;
  sessionId?: string;
}

/**
 * Layer 1 Output - Intent Router の出力
 */
export interface Layer1Output {
  intent: HookIntent;
  allow: boolean;
  skipLayers: number[]; // スキップするレイヤー番号 (例: [2, 3] = Layer 2, 3 をスキップ)
  fastPath: boolean;
  cacheHit: boolean;
  processingTimeMs: number;
  reason?: string;
}

/**
 * Layer 2 Output - Policy & State Validator の出力
 */
export interface Layer2Output {
  decision: HookDecision;
  violations: PolicyViolation[];
  skillRequirements: SkillRequirement[];
  stateValid: boolean;
  processingTimeMs: number;
  reason?: string;
}

/**
 * Policy Violation - ポリシー違反情報
 */
export interface PolicyViolation {
  type: 'workflow_fidelity' | 'skill_bypass' | 'read_before_write' | 'baseline_lock' | 'phase_transition';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion?: string;
}

/**
 * Skill Requirement - スキル要件
 */
export interface SkillRequirement {
  skillName: string;
  strict: boolean;
  reason: string;
  autoMapped: boolean;
}

/**
 * Layer 3 Output - Security & Safety Gate の出力
 */
export interface Layer3Output {
  decision: HookDecision;
  threats: SecurityThreat[];
  safetyIssues: SafetyIssue[];
  processingTimeMs: number;
  reason?: string;
}

/**
 * Security Threat - セキュリティ脅威情報
 */
export interface SecurityThreat {
  category: 'injection' | 'secret_leakage' | 'privilege_escalation' | 'data_exfiltration';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  pattern?: string;
}

/**
 * Safety Issue - 安全性問題
 */
export interface SafetyIssue {
  type: 'copy_marker' | 'destructive_operation' | 'resource_exhaustion' | 'unsafe_execution';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  marker?: string;
}

/**
 * Layer 4 Output - Observability の出力 (非ブロッキング)
 */
export interface Layer4Output {
  metricsRecorded: boolean;
  statePersisted: boolean;
  handoffUpdated: boolean;
  contextQualitySuggestions: string[];
  processingTimeMs: number;
  errors?: string[];
}

/**
 * Unified Hook Result - 統合フック結果
 */
export interface UnifiedHookResult {
  decision: HookDecision;
  layer1: Layer1Output;
  layer2?: Layer2Output;
  layer3?: Layer3Output;
  layer4?: Layer4Output;
  totalProcessingTimeMs: number;
  fastPath: boolean;
  cacheHit: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Cache Entry - LRU キャッシュエントリ
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Hook Metrics - フックメトリクス
 */
export interface HookMetrics {
  timestamp: number;
  hookName: string;
  decision: HookDecision;
  processingTimeMs: number;
  cacheHit: boolean;
  fastPath: boolean;
  layer1TimeMs: number;
  layer2TimeMs?: number;
  layer3TimeMs?: number;
  layer4TimeMs?: number;
}

/**
 * Workflow State - ワークフロー状態 (簡略版)
 */
export interface WorkflowState {
  version: string;
  meta: {
    workflowId: string;
    strict: boolean;
    currentPhase: number;
    startedAt: string;
    lastUpdated: string;
  };
  evidence: {
    read_log: string[];
    approved_deviations: Array<{
      deviation: string;
      approvedAt: string;
      approvedBy: string;
      reason: string;
    }>;
    skillEvidence: any[];
    required_skills: Record<string, {
      requestedAt: string;
      used: boolean;
      autoMapped: boolean;
    }>;
  };
  baseline: {
    files: Record<string, any>;
  };
  approvals: {
    deviations: Array<{
      deviation: string;
      approvedAt: string;
      approvedBy: string;
      reason: string;
    }>;
  };
}
