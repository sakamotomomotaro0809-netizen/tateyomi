/**
 * Intent Parser Type Definitions
 *
 * ユーザーの自然言語コマンドから意図を抽出するシステムの型定義
 */

/**
 * 意図タイプ（35+ パターン）
 */
export enum IntentType {
  // Core Workflow Intents
  WORKFLOW_REUSE = 'WORKFLOW_REUSE',
  SKILL_INVOCATION = 'SKILL_INVOCATION',
  SESSION_CONTINUATION = 'SESSION_CONTINUATION',
  EXISTING_FILE_REFERENCE = 'EXISTING_FILE_REFERENCE',
  DEVIATION_REQUEST = 'DEVIATION_REQUEST',

  // File Operations
  FILE_CREATE = 'FILE_CREATE',
  FILE_EDIT = 'FILE_EDIT',
  FILE_DELETE = 'FILE_DELETE',
  FILE_READ = 'FILE_READ',

  // Code Operations
  CODE_REFACTOR = 'CODE_REFACTOR',
  CODE_REVIEW = 'CODE_REVIEW',
  CODE_IMPLEMENTATION = 'CODE_IMPLEMENTATION',
  CODE_BUGFIX = 'CODE_BUGFIX',

  // Testing
  TEST_CREATE = 'TEST_CREATE',
  TEST_RUN = 'TEST_RUN',
  TEST_FIX = 'TEST_FIX',

  // Documentation
  DOC_CREATE = 'DOC_CREATE',
  DOC_UPDATE = 'DOC_UPDATE',

  // Analysis
  ANALYSIS_CODE = 'ANALYSIS_CODE',
  ANALYSIS_PERFORMANCE = 'ANALYSIS_PERFORMANCE',
  ANALYSIS_SECURITY = 'ANALYSIS_SECURITY',

  // Project Management
  PROJECT_SETUP = 'PROJECT_SETUP',
  PROJECT_BUILD = 'PROJECT_BUILD',
  PROJECT_DEPLOY = 'PROJECT_DEPLOY',

  // Search & Navigation
  SEARCH_CODE = 'SEARCH_CODE',
  SEARCH_FILE = 'SEARCH_FILE',
  NAVIGATE_PROJECT = 'NAVIGATE_PROJECT',

  // Agent & Skills
  AGENT_RUN = 'AGENT_RUN',
  SKILL_LIST = 'SKILL_LIST',
  SKILL_EXECUTE = 'SKILL_EXECUTE',

  // Security & Performance
  SECURITY_RISK = 'SECURITY_RISK',
  PERFORMANCE_IMPACT = 'PERFORMANCE_IMPACT',

  // Misc
  QUESTION = 'QUESTION',
  CONFIRMATION = 'CONFIRMATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * リスクレベル
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * エンティティ型
 */
export interface Entity {
  type: string;
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

/**
 * コンテキスト情報
 */
export interface IntentContext {
  sessionContinuation: boolean;
  existingFilesDetected: string[];
  skillRequested?: string;
  deviationDetected: boolean;
  workflowReuseDetected: boolean;
  baselineFileModification: boolean;
}

/**
 * Intent 分析結果
 */
export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities: Entity[];
  context: IntentContext;
  riskLevel: RiskLevel;
  shouldSkipLayers: number[];
  reasoning: string;
}

/**
 * トークン情報
 */
export interface Token {
  surface: string;
  pos: string;
  base?: string;
  reading?: string;
}

/**
 * パターンマッチ結果
 */
export interface PatternMatch {
  pattern: string;
  confidence: number;
  matched: string;
  position: {
    start: number;
    end: number;
  };
}

/**
 * Intent Parser 設定
 */
export interface IntentParserConfig {
  enableJapaneseTokenizer: boolean;
  confidenceThreshold: number;
  maxProcessingTimeMs: number;
  enableContextResolution: boolean;
  enableRiskEvaluation: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Intent Parser のデフォルト設定
 */
export const DEFAULT_CONFIG: IntentParserConfig = {
  enableJapaneseTokenizer: true,
  confidenceThreshold: 50,
  maxProcessingTimeMs: 50,
  enableContextResolution: true,
  enableRiskEvaluation: true,
  logLevel: 'info',
};

/**
 * パターン定義
 */
export interface Pattern {
  name: string;
  regex: RegExp;
  intent: IntentType;
  confidence: number;
  examples: string[];
}

/**
 * コンテキストソース
 */
export interface ContextSource {
  sessionHandoffExists: boolean;
  workflowStateExists: boolean;
  baselineFiles: string[];
  currentPhase?: string;
}

/**
 * 実行履歴レコード
 */
export interface ExecutionRecord {
  timestamp: number;
  toolName: string;
  intent: string;
  riskLevel: RiskLevel;
  wasBlocked: boolean;
  wasApproved: boolean;
  features: FeatureVector;
}

/**
 * 22次元特徴量ベクトル（0-1正規化）
 */
export interface FeatureVector {
  // ツール種別（5）
  toolEdit: number;
  toolWrite: number;
  toolBash: number;
  toolRead: number;
  toolSkill: number;
  // ファイル属性（5）
  fileExists: number;
  fileBaseline: number;
  fileJs: number;
  fileTs: number;
  fileMd: number;
  // コンテキスト（3）
  ctxSessionHandoff: number;
  ctxLateNight: number;
  ctxRecentErrors: number;
  // Intent属性（4）
  intentConfidence: number;
  intentWorkflowReuse: number;
  intentSkill: number;
  intentExistingFile: number;
  // コマンドパターン（3）
  cmdRm: number;
  cmdSudo: number;
  cmdInstall: number;
  // ユーザー履歴（2）
  histApprovalRate: number;
  histErrorRate: number;
}

/**
 * ML予測結果
 */
export interface MLPrediction {
  riskLevel: RiskLevel;
  confidence: number;
  method: 'bayes' | 'tree' | 'rule';
  processingTimeMs: number;
}
