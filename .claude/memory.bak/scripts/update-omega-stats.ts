#!/usr/bin/env tsx
/**
 * Ω Statistics Update Script
 *
 * Automatically updates agent Ω statistics after task completion
 * using Bayesian update (exponential moving average)
 *
 * Usage:
 *   npx tsx .claude/memory/scripts/update-omega-stats.ts \
 *     --agent backend-developer \
 *     --task-id 2025-11-06-001 \
 *     --complexity medium \
 *     --category implementation \
 *     --success true \
 *     --quality-score 88 \
 *     --duration-ms 165000
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface OmegaMetrics {
  performance_bounds: {
    min_quality_score: number;
    min_success_rate: number;
    max_latency_ms: number;
    worst_case: {
      quality_score: number;
      success_rate: number;
      latency_ms: number;
    };
  };
  dependencies: {
    omega: number;
    little_omega: number;
    coupling_ratio: number;
    dependencies_list: {
      tools: string[];
      agents: string[];
      external: string[];
    };
    coupling_health: {
      status: string;
      recommendation: string;
    };
  };
  completion_probability: {
    base_omega: number;
    by_complexity: {
      low: number;
      medium: number;
      high: number;
    };
    by_category: {
      [key: string]: number;
    };
    confidence_interval: number;
    sample_size: number;
    prediction_accuracy: {
      total_predictions: number;
      accurate_predictions: number;
      accuracy_rate: number;
    };
  };
}

interface AgentStats {
  agent_name: string;
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  success_rate: number;
  avg_quality_score: number;
  avg_duration_ms: number;
  last_updated: string;
  recent_tasks: any[];
  trends: any;
  specializations: any;
  omega_metrics?: OmegaMetrics;
  learning_metrics?: any;
  metadata?: any;
}

interface TaskResult {
  agent_name: string;
  task_id: string;
  complexity: 'low' | 'medium' | 'high';
  category: string;
  success: boolean;
  quality_score: number;
  duration_ms: number;
  predicted_omega?: number;
}

const LEARNING_RATE = 0.1; // Alpha for exponential moving average

function parseArgs(): TaskResult {
  const args = process.argv.slice(2);
  const result: Partial<TaskResult> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];

    switch (key) {
      case 'agent':
        result.agent_name = value;
        break;
      case 'task-id':
        result.task_id = value;
        break;
      case 'complexity':
        result.complexity = value as 'low' | 'medium' | 'high';
        break;
      case 'category':
        result.category = value;
        break;
      case 'success':
        result.success = value === 'true';
        break;
      case 'quality-score':
        result.quality_score = parseInt(value, 10);
        break;
      case 'duration-ms':
        result.duration_ms = parseInt(value, 10);
        break;
      case 'predicted-omega':
        result.predicted_omega = parseFloat(value);
        break;
    }
  }

  if (!result.agent_name || !result.task_id) {
    console.error('❌ Error: --agent and --task-id are required');
    process.exit(1);
  }

  return result as TaskResult;
}

function loadAgentStats(agentName: string): AgentStats {
  const statsPath = path.resolve(
    __dirname,
    `../agents/${agentName}-stats.yaml`
  );

  if (!fs.existsSync(statsPath)) {
    console.error(`❌ Error: Stats file not found: ${statsPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(statsPath, 'utf-8');
  return yaml.parse(content);
}

function updateOmegaStatistics(
  stats: AgentStats,
  result: TaskResult
): AgentStats {
  if (!stats.omega_metrics) {
    console.warn('⚠️  Warning: omega_metrics not found, initializing...');
    stats.omega_metrics = initializeOmegaMetrics();
  }

  const omega = stats.omega_metrics;

  // 1. Update Performance Bounds (Big-Omega)
  if (result.quality_score < omega.performance_bounds.min_quality_score) {
    omega.performance_bounds.min_quality_score = result.quality_score;
    omega.performance_bounds.worst_case.quality_score = result.quality_score;
    console.log(
      `📉 New min_quality_score: ${result.quality_score} (decreased)`
    );
  }

  if (result.duration_ms > omega.performance_bounds.max_latency_ms) {
    omega.performance_bounds.max_latency_ms = result.duration_ms;
    omega.performance_bounds.worst_case.latency_ms = result.duration_ms;
    console.log(`⏱️  New max_latency_ms: ${result.duration_ms}ms (increased)`);
  }

  // 2. Update Completion Probability (Chaitin's Ω)
  const oldProb = omega.completion_probability.by_complexity[result.complexity];
  const actualSuccess = result.success ? 1.0 : 0.0;

  // Exponential Moving Average (EMA)
  const newProb = oldProb * (1 - LEARNING_RATE) + actualSuccess * LEARNING_RATE;
  omega.completion_probability.by_complexity[result.complexity] = newProb;

  console.log(
    `🎯 Updated Ω_completion(${result.complexity}): ${oldProb.toFixed(
      3
    )} → ${newProb.toFixed(3)} (${result.success ? '✅' : '❌'})`
  );

  // 3. Update Category-specific Completion Probability
  const categoryOldProb = omega.completion_probability.by_category[result.category] || 0.5;
  const categoryNewProb =
    categoryOldProb * (1 - LEARNING_RATE) + actualSuccess * LEARNING_RATE;
  omega.completion_probability.by_category[result.category] = categoryNewProb;

  // 4. Update Base Omega (overall success rate)
  omega.completion_probability.base_omega = stats.success_rate;

  // 5. Update Sample Size
  omega.completion_probability.sample_size++;

  // 6. Update Prediction Accuracy (if predicted_omega provided)
  if (result.predicted_omega !== undefined) {
    omega.completion_probability.prediction_accuracy.total_predictions++;

    const error = Math.abs(actualSuccess - result.predicted_omega);
    const confidenceInterval = omega.completion_probability.confidence_interval;

    if (error <= confidenceInterval) {
      omega.completion_probability.prediction_accuracy.accurate_predictions++;
    }

    omega.completion_probability.prediction_accuracy.accuracy_rate =
      omega.completion_probability.prediction_accuracy.accurate_predictions /
      omega.completion_probability.prediction_accuracy.total_predictions;

    console.log(
      `📊 Prediction accuracy: ${(
        omega.completion_probability.prediction_accuracy.accuracy_rate * 100
      ).toFixed(1)}% (${
        omega.completion_probability.prediction_accuracy.accurate_predictions
      }/${omega.completion_probability.prediction_accuracy.total_predictions})`
    );
  }

  // 7. Update Metadata
  if (!stats.metadata) {
    stats.metadata = {};
  }
  stats.metadata.last_updated = new Date().toISOString();

  // Update quality gates
  if (!stats.metadata.passes_quality_gates) {
    stats.metadata.passes_quality_gates = {};
  }
  stats.metadata.passes_quality_gates.min_quality =
    omega.performance_bounds.min_quality_score >= 75;
  stats.metadata.passes_quality_gates.min_success_rate =
    omega.completion_probability.base_omega >= 0.8;
  stats.metadata.passes_quality_gates.acceptable_coupling =
    omega.dependencies.coupling_ratio < 2.0;

  // Overall health assessment
  const passCount = Object.values(stats.metadata.passes_quality_gates).filter(
    (v) => v === true
  ).length;
  if (passCount === 3) {
    stats.metadata.overall_health = 'excellent';
  } else if (passCount === 2) {
    stats.metadata.overall_health = 'good';
  } else if (passCount === 1) {
    stats.metadata.overall_health = 'fair';
  } else {
    stats.metadata.overall_health = 'poor';
  }

  return stats;
}

function initializeOmegaMetrics(): OmegaMetrics {
  return {
    performance_bounds: {
      min_quality_score: 100,
      min_success_rate: 1.0,
      max_latency_ms: 0,
      worst_case: {
        quality_score: 100,
        success_rate: 1.0,
        latency_ms: 0,
      },
    },
    dependencies: {
      omega: 0,
      little_omega: 0,
      coupling_ratio: 1.0,
      dependencies_list: {
        tools: [],
        agents: [],
        external: [],
      },
      coupling_health: {
        status: 'unknown',
        recommendation: '',
      },
    },
    completion_probability: {
      base_omega: 0.0,
      by_complexity: {
        low: 0.9,
        medium: 0.8,
        high: 0.6,
      },
      by_category: {},
      confidence_interval: 0.05,
      sample_size: 0,
      prediction_accuracy: {
        total_predictions: 0,
        accurate_predictions: 0,
        accuracy_rate: 0.0,
      },
    },
  };
}

function saveAgentStats(agentName: string, stats: AgentStats): void {
  const statsPath = path.resolve(
    __dirname,
    `../agents/${agentName}-stats.yaml`
  );

  const content = yaml.stringify(stats, {
    lineWidth: 0, // Disable line wrapping
    indent: 2,
  });

  fs.writeFileSync(statsPath, content, 'utf-8');
  console.log(`✅ Saved: ${statsPath}`);
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Ω Statistics Update');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = parseArgs();

  console.log('📥 Input:');
  console.log(`  Agent: ${result.agent_name}`);
  console.log(`  Task: ${result.task_id}`);
  console.log(`  Complexity: ${result.complexity}`);
  console.log(`  Category: ${result.category}`);
  console.log(`  Success: ${result.success ? '✅' : '❌'}`);
  console.log(`  Quality Score: ${result.quality_score}/100`);
  console.log(`  Duration: ${result.duration_ms}ms\n`);

  console.log('📊 Loading agent statistics...');
  const stats = loadAgentStats(result.agent_name);

  console.log('🔄 Updating Ω metrics...');
  const updatedStats = updateOmegaStatistics(stats, result);

  console.log('\n💾 Saving updated statistics...');
  saveAgentStats(result.agent_name, updatedStats);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Update Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
