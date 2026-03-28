/**
 * Workflow Registry
 * Loads and validates workflow definitions from config/workflows/
 */

import * as fs from 'fs';
import * as path from 'path';
import type { WorkflowDefinition } from './types';

let WORKFLOWS_DIR = path.join(process.cwd(), 'config', 'workflows');

/**
 * Set custom workflows directory (for testing)
 */
export function setWorkflowsDir(dir: string): void {
  WORKFLOWS_DIR = dir;
}

/**
 * Reset workflows directory to default (for testing cleanup)
 */
export function resetWorkflowsDir(): void {
  WORKFLOWS_DIR = path.join(process.cwd(), 'config', 'workflows');
}

/**
 * Load all workflow definitions
 */
export function loadAllWorkflows(): Map<string, WorkflowDefinition> {
  const workflows = new Map<string, WorkflowDefinition>();

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    throw new Error(
      `Workflows directory not found: ${WORKFLOWS_DIR}\n` +
        'ワークフロー定義ディレクトリが見つかりません。'
    );
  }

  const files = fs.readdirSync(WORKFLOWS_DIR);

  for (const file of files) {
    // Skip schema file and non-JSON files
    if (file.startsWith('_') || !file.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(WORKFLOWS_DIR, file);
    try {
      // Check if file still exists (might have been deleted by another test)
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // Skip empty files (might be in the process of being written)
      if (!content || content.trim() === '') {
        continue;
      }

      const definition = JSON.parse(content) as WorkflowDefinition;

      // Basic validation
      validateWorkflowDefinition(definition, file);

      workflows.set(definition.id, definition);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      // Skip files that were deleted or are being modified (ENOENT, empty JSON, etc.)
      if (err.code === 'ENOENT' || err.message.includes('Unexpected end of JSON input')) {
        continue;
      }
      throw new Error(
        `Failed to load workflow definition ${file}: ${err.message}\n` +
          `ワークフロー定義の読み込みに失敗: ${file}`
      );
    }
  }

  return workflows;
}

/**
 * Load a specific workflow by ID
 */
export function loadWorkflow(workflowId: string): WorkflowDefinition {
  const workflows = loadAllWorkflows();
  const workflow = workflows.get(workflowId);

  if (!workflow) {
    const available = Array.from(workflows.keys()).join(', ');
    throw new Error(
      `Workflow '${workflowId}' not found.\n` +
        `ワークフロー '${workflowId}' が見つかりません。\n` +
        `利用可能なワークフロー: ${available}`
    );
  }

  return workflow;
}

/**
 * Validate workflow definition structure
 */
function validateWorkflowDefinition(
  def: WorkflowDefinition,
  filename: string
): void {
  const errors: string[] = [];

  if (!def.id) {
    errors.push('Missing required field: id');
  }
  if (!def.name) {
    errors.push('Missing required field: name');
  }
  if (!def.version) {
    errors.push('Missing required field: version');
  }
  if (!Array.isArray(def.phases) || def.phases.length === 0) {
    errors.push('Missing or empty phases array');
  }

  // Validate phases
  if (def.phases) {
    const phaseIds = new Set<string>();

    for (const phase of def.phases) {
      if (!phase.id) {
        errors.push(`Phase missing id: ${JSON.stringify(phase)}`);
      }
      if (!phase.name) {
        errors.push(`Phase ${phase.id} missing name`);
      }

      // Check for duplicate phase IDs
      if (phaseIds.has(phase.id)) {
        errors.push(`Duplicate phase ID: ${phase.id}`);
      }
      phaseIds.add(phase.id);
    }

    // Validate nextPhase references
    for (const phase of def.phases) {
      if (phase.nextPhase && !phaseIds.has(phase.nextPhase)) {
        errors.push(
          `Phase ${phase.id} references non-existent nextPhase: ${phase.nextPhase}`
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid workflow definition in ${filename}:\n` +
        errors.map((e) => `  - ${e}`).join('\n') +
        '\n\nワークフロー定義が不正です。'
    );
  }
}

/**
 * Get workflow by ID (cached)
 */
let cachedWorkflows: Map<string, WorkflowDefinition> | null = null;

export function getWorkflow(workflowId: string): WorkflowDefinition {
  if (!cachedWorkflows) {
    cachedWorkflows = loadAllWorkflows();
  }

  const workflow = cachedWorkflows.get(workflowId);
  if (!workflow) {
    const available = Array.from(cachedWorkflows.keys()).join(', ');
    throw new Error(
      `Workflow '${workflowId}' not found. Available: ${available}`
    );
  }

  return workflow;
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  cachedWorkflows = null;
}
