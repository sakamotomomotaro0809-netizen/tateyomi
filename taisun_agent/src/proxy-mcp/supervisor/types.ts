/**
 * Supervisor Types - M6
 *
 * Types for LangGraph-based supervisor with human approval
 */

/**
 * State for the supervisor graph
 */
export interface SupervisorState {
  /** Unique run ID */
  runId: string;
  /** Original user input */
  input: string;
  /** Current step in the graph */
  step: SupervisorStep;
  /** Route decision */
  route?: RouteDecision;
  /** Execution plan */
  plan?: ExecutionPlan;
  /** Whether approval is required */
  requiresApproval: boolean;
  /** Approval status */
  approval?: ApprovalStatus;
  /** Execution result */
  result?: ExecutionResult;
  /** Error if any */
  error?: string;
  /** Reference IDs for stored data */
  refIds: string[];
  /** GitHub issue ID for RUNLOG */
  runlogIssue?: number;
  /** Timestamps */
  timestamps: {
    started: string;
    completed?: string;
  };
}

/**
 * Steps in the supervisor graph
 */
export type SupervisorStep =
  | 'ingest'
  | 'route'
  | 'plan'
  | 'approval'
  | 'execute_safe'
  | 'finalize'
  | 'error';

/**
 * Route decision from the router
 */
export interface RouteDecision {
  action: 'allow' | 'require_human' | 'require_clarify' | 'deny';
  reason: string;
  targetMcp?: string;
  confidence: number;
  dangerousPatterns?: string[];
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  steps: PlanStep[];
  estimatedRisk: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  approvalReason?: string;
}

/**
 * Single step in the execution plan
 */
export interface PlanStep {
  id: string;
  action: string;
  target?: string;
  params?: Record<string, unknown>;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Approval status
 */
export interface ApprovalStatus {
  required: boolean;
  approved: boolean;
  issueId?: number;
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  summary: string;
  refId?: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Supervisor options
 */
export interface SupervisorOptions {
  /** Custom run ID (auto-generated if not provided) */
  runId?: string;
  /** Skip approval even if required (for testing) */
  skipApproval?: boolean;
  /** Maximum steps before timeout */
  maxSteps?: number;
  /** Memory namespace */
  namespace?: 'short-term' | 'long-term';
}

/**
 * Supervisor result
 */
export interface SupervisorResult {
  success: boolean;
  runId: string;
  step: SupervisorStep;
  summary?: string;
  refId?: string;
  requiresApproval: boolean;
  approvalIssue?: number;
  error?: string;
  data?: {
    runlogIssue?: number;
    timestamps?: {
      started: string;
      completed?: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Dangerous operation patterns that always require human approval
 */
export const DANGEROUS_PATTERNS = [
  // Deployment
  'deploy',
  'production',
  'release',
  'publish',
  // Destructive
  'delete',
  'drop',
  'truncate',
  'remove',
  'destroy',
  'wipe',
  // Secrets
  'secret',
  'credential',
  'api.key',
  'api_key',
  'apikey',
  'password',
  'token',
  // Billing
  'billing',
  'payment',
  'subscription',
  'charge',
  'invoice',
  // Access control
  'role',
  'admin',
  'permission',
  'access.control',
  'access_control',
  'privilege',
  // Abuse
  'captcha',
  'bypass',
  'spam',
  'brute.force',
  'brute_force',
];
