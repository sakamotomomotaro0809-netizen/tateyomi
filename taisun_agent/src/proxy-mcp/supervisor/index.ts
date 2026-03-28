/**
 * Supervisor Module - M6
 *
 * LangGraph-based supervisor with human approval and Issue logging
 */

export { runSupervisor, resumeSupervisor, createSupervisorGraph } from './graph';
export { checkDangerousPatterns, requiresApproval, validatePlan } from './policy';
export {
  isGhAvailable,
  createRunlogIssue,
  createApprovalIssue,
  checkApproval,
  addIssueComment,
  closeIssue,
} from './github';
export type {
  SupervisorState,
  SupervisorStep,
  SupervisorOptions,
  SupervisorResult,
  RouteDecision,
  ExecutionPlan,
  PlanStep,
  ApprovalStatus,
  ExecutionResult,
} from './types';
export { DANGEROUS_PATTERNS } from './types';
