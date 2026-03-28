/**
 * Supervisor Policy - M6
 *
 * Policy checks for dangerous operations
 */

import { DANGEROUS_PATTERNS, RouteDecision, ExecutionPlan, PlanStep } from './types';

/**
 * Check if input contains dangerous patterns
 */
export function checkDangerousPatterns(input: string): string[] {
  const inputLower = input.toLowerCase();
  const matched: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    // Handle patterns with dots/underscores
    const normalizedPattern = pattern.replace(/[._]/g, '[._]?');
    const regex = new RegExp(normalizedPattern, 'i');
    if (regex.test(inputLower)) {
      matched.push(pattern);
    }
  }

  return matched;
}

/**
 * Determine if approval is required based on input and route
 */
export function requiresApproval(input: string, route?: RouteDecision): boolean {
  // Check dangerous patterns in input
  const dangerousMatches = checkDangerousPatterns(input);
  if (dangerousMatches.length > 0) {
    return true;
  }

  // Check route decision
  if (route?.action === 'require_human') {
    return true;
  }

  // Check route's dangerous patterns
  if (route?.dangerousPatterns && route.dangerousPatterns.length > 0) {
    return true;
  }

  return false;
}

/**
 * Analyze execution plan for risk level
 */
export function analyzePlanRisk(plan: ExecutionPlan): 'low' | 'medium' | 'high' | 'critical' {
  let maxRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const riskOrder = ['low', 'medium', 'high', 'critical'];

  for (const step of plan.steps) {
    const stepRiskIndex = riskOrder.indexOf(step.risk);
    const maxRiskIndex = riskOrder.indexOf(maxRisk);
    if (stepRiskIndex > maxRiskIndex) {
      maxRisk = step.risk;
    }
  }

  return maxRisk;
}

/**
 * Determine risk level for a single action
 */
export function determineStepRisk(action: string, target?: string): 'low' | 'medium' | 'high' | 'critical' {
  const combined = `${action} ${target || ''}`.toLowerCase();
  const dangerousMatches = checkDangerousPatterns(combined);

  if (dangerousMatches.length === 0) {
    return 'low';
  }

  // Critical patterns
  const criticalPatterns = ['delete', 'drop', 'destroy', 'wipe', 'production', 'deploy'];
  const highPatterns = ['secret', 'credential', 'password', 'token', 'billing', 'payment'];
  const mediumPatterns = ['admin', 'role', 'permission', 'remove'];

  for (const pattern of criticalPatterns) {
    if (dangerousMatches.includes(pattern)) {
      return 'critical';
    }
  }

  for (const pattern of highPatterns) {
    if (dangerousMatches.includes(pattern)) {
      return 'high';
    }
  }

  for (const pattern of mediumPatterns) {
    if (dangerousMatches.includes(pattern)) {
      return 'medium';
    }
  }

  return 'medium';
}

/**
 * Create a plan step with risk assessment
 */
export function createPlanStep(
  id: string,
  action: string,
  target?: string,
  params?: Record<string, unknown>
): PlanStep {
  return {
    id,
    action,
    target,
    params,
    risk: determineStepRisk(action, target),
  };
}

/**
 * Validate that a plan can be executed safely
 */
export function validatePlan(plan: ExecutionPlan, approved: boolean): { valid: boolean; reason?: string } {
  const risk = analyzePlanRisk(plan);

  // Critical and high risk always need approval
  if ((risk === 'critical' || risk === 'high') && !approved) {
    return {
      valid: false,
      reason: `Plan has ${risk} risk and requires approval`,
    };
  }

  // Medium risk needs approval if plan explicitly requires it
  if (risk === 'medium' && plan.requiresApproval && !approved) {
    return {
      valid: false,
      reason: 'Plan requires approval for medium-risk operations',
    };
  }

  return { valid: true };
}
