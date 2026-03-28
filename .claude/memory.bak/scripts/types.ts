/**
 * AIT42 Memory System Type Definitions
 * Version: 1.0.0
 */

export interface TaskRecord {
  id: string;                        // "2025-11-13-042"
  timestamp: string;                  // ISO 8601
  request: string;                    // User request
  task_type: string;                  // "implementation" | "bug-fix" | ...
  selected_agents: string[];          // ["backend-developer", ...]
  duration_ms: number;
  success: boolean;
  quality_score: number;              // 0-100
  errors: string[];
  warnings: string[];
  quality_metrics?: {
    code_coverage?: number;
    documentation_complete?: boolean;
    security_review_passed?: boolean;
    performance_benchmark?: string;
  };
  reflection?: {
    score: number;
    decision: 'approved' | 'rejected' | 'needs-revision';
    feedback: string;
    improvements: string[];
  };
  artifacts?: Array<{
    path: string;
    type: string;
  }>;
  resources?: {
    tokens_used?: number;
    api_calls?: number;
    files_modified?: number;
  };
  tags: string[];
  // AIT42 v2.0.0: AutoPatch incident data
  incident?: {
    error_log: string;
    error_code?: string;
    root_cause?: string;
    applied_patch?: {
      files_modified: string[];
      diff: string;
      success: boolean;
    };
  };
}

export interface AgentStats {
  agent_name: string;
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  success_rate: number;              // 0.0 - 1.0
  avg_quality_score: number;         // 0-100
  avg_duration_ms: number;
  last_updated: string;              // ISO 8601
  recent_tasks: RecentTask[];
  trends: {
    success_rate_trend: number;
    quality_score_trend: number;
    avg_duration_trend: number;
  };
  specializations: Record<string, number>;  // { "implementation": 80, ... }
}

export interface RecentTask {
  task_id: string;
  quality_score: number;
  success: boolean;
  timestamp: string;
}

export interface MemoryConfig {
  max_tasks: number;
  retention_days: number;
  backup_enabled: boolean;
  recent_tasks_limit: number;
}
