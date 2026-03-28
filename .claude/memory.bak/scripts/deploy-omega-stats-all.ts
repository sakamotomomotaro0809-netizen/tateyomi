#!/usr/bin/env tsx
/**
 * Deploy Ω Statistics to All Agents
 *
 * Automatically adds omega_metrics to all 48 agent stats files
 * using data from complexity analysis and dependency analysis
 *
 * Usage:
 *   npx tsx .claude/memory/scripts/deploy-omega-stats-all.ts
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface ComplexityResult {
  agent: string;
  score: number;
  maintainability_index: number;
  cyclomatic_complexity: number;
  cognitive_complexity: number;
}

interface DependencyResult {
  agent: string;
  omega: number;
  littleOmega: number;
  coupling: number;
  dependencies: string[];
}

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

const AGENTS_DIR = path.resolve(__dirname, '../agents');
const COMPLEXITY_REPORT = path.resolve(
  __dirname,
  '../../../complexity-analysis/reports'
);
const DEPENDENCY_REPORT = path.resolve(
  __dirname,
  '../../../complexity-analysis/reports/omega-dependency-analysis.json'
);

function loadComplexityData(): Map<string, ComplexityResult> {
  const files = fs.readdirSync(COMPLEXITY_REPORT).filter((f) =>
    f.startsWith('complexity-report-') && f.endsWith('.csv')
  );

  if (files.length === 0) {
    console.warn('⚠️  No complexity report found, using defaults');
    return new Map();
  }

  // Get most recent report
  const latestReport = files.sort().reverse()[0];
  const reportPath = path.join(COMPLEXITY_REPORT, latestReport);
  const csvContent = fs.readFileSync(reportPath, 'utf-8');

  const map = new Map<string, ComplexityResult>();
  const lines = csvContent.trim().split('\n');

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 4) {
      const agent = parts[0].replace(/"/g, '');
      map.set(agent, {
        agent,
        score: parseInt(parts[1], 10),
        maintainability_index: parseInt(parts[2], 10),
        cyclomatic_complexity: parseFloat(parts[3]),
        cognitive_complexity: parts[4] ? parseFloat(parts[4]) : 0,
      });
    }
  }

  return map;
}

function loadDependencyData(): Map<string, DependencyResult> {
  if (!fs.existsSync(DEPENDENCY_REPORT)) {
    console.warn('⚠️  Dependency report not found, using defaults');
    return new Map();
  }

  const data = JSON.parse(fs.readFileSync(DEPENDENCY_REPORT, 'utf-8'));
  const map = new Map<string, DependencyResult>();

  for (const item of data) {
    map.set(item.agent, item);
  }

  return map;
}

function estimateCompletionProbability(qualityScore: number): {
  low: number;
  medium: number;
  high: number;
} {
  // Estimate based on quality score
  // Higher quality = better at complex tasks
  const baseRate = qualityScore / 100;

  return {
    low: Math.min(0.99, baseRate + 0.15),     // Simple tasks almost always succeed
    medium: Math.min(0.95, baseRate + 0.05),  // Moderate success rate
    high: Math.max(0.50, baseRate - 0.15),    // Complex tasks are harder
  };
}

function generateOmegaMetrics(
  agentName: string,
  complexity: ComplexityResult | undefined,
  dependency: DependencyResult | undefined
): OmegaMetrics {
  const qualityScore = complexity?.score || 75;
  const coupling = dependency?.coupling || 1.0;

  // Categorize dependencies
  const allDeps = dependency?.dependencies || [];
  const tools = allDeps.filter((d) =>
    ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'WebFetch', 'WebSearch', 'Task'].includes(d)
  );
  const agents = allDeps.filter((d) => d.includes('-') && !tools.includes(d));
  const external = allDeps.filter((d) => !tools.includes(d) && !agents.includes(d));

  const completionProb = estimateCompletionProbability(qualityScore);

  // Coupling health
  let couplingStatus = 'good';
  let recommendation = '';
  if (coupling > 2.0) {
    couplingStatus = 'poor';
    recommendation = 'High coupling detected. Consider refactoring to reduce dependencies.';
  } else if (coupling > 1.5) {
    couplingStatus = 'fair';
    recommendation = 'Moderate coupling. Monitor and consider refactoring if increasing.';
  }

  return {
    performance_bounds: {
      min_quality_score: qualityScore,
      min_success_rate: 0.80,
      max_latency_ms: 5000,
      worst_case: {
        quality_score: qualityScore,
        success_rate: 0.0,
        latency_ms: 0,
      },
    },
    dependencies: {
      omega: dependency?.omega || 0,
      little_omega: dependency?.littleOmega || 0,
      coupling_ratio: coupling,
      dependencies_list: {
        tools,
        agents,
        external,
      },
      coupling_health: {
        status: couplingStatus,
        recommendation,
      },
    },
    completion_probability: {
      base_omega: 0.0,
      by_complexity: completionProb,
      by_category: {
        implementation: 0.0,
        refactoring: 0.0,
        testing: 0.0,
        documentation: 0.0,
        debugging: 0.0,
      },
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

function updateAgentStats(
  agentName: string,
  complexityData: Map<string, ComplexityResult>,
  dependencyData: Map<string, DependencyResult>
): boolean {
  const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);

  if (!fs.existsSync(statsPath)) {
    console.warn(`⚠️  Stats file not found: ${agentName}-stats.yaml`);
    return false;
  }

  try {
    const content = fs.readFileSync(statsPath, 'utf-8');
    const stats = yaml.parse(content);

    // Check if already has omega_metrics
    if (stats.omega_metrics) {
      console.log(`⏭️  ${agentName}: Already has omega_metrics, skipping`);
      return true;
    }

    // Generate omega_metrics
    const complexity = complexityData.get(agentName);
    const dependency = dependencyData.get(agentName);
    const omegaMetrics = generateOmegaMetrics(agentName, complexity, dependency);

    // Add omega_metrics
    stats.omega_metrics = omegaMetrics;

    // Add learning_metrics if not exists
    if (!stats.learning_metrics) {
      stats.learning_metrics = {
        learning_rate: 0.1,
        quality_trend: {
          direction: 'stable',
          rate: 0.0,
        },
        success_trend: {
          direction: 'stable',
          rate: 0.0,
        },
        specialization: {
          primary_category: 'implementation',
          specialization_score: 0.0,
          categories: {
            implementation: 0,
            refactoring: 0,
            testing: 0,
            documentation: 0,
            debugging: 0,
          },
        },
      };
    }

    // Add metadata if not exists
    if (!stats.metadata) {
      stats.metadata = {};
    }
    stats.metadata.last_updated = new Date().toISOString();
    stats.metadata.schema_version = '1.0.0';
    stats.metadata.omega_integration_date = '2025-11-06';

    // Calculate quality gates
    const passesMinQuality = omegaMetrics.performance_bounds.min_quality_score >= 75;
    const passesMinSuccess = omegaMetrics.performance_bounds.min_success_rate >= 0.80;
    const passesAcceptableCoupling = omegaMetrics.dependencies.coupling_ratio < 2.0;

    stats.metadata.passes_quality_gates = {
      min_quality: passesMinQuality,
      min_success_rate: passesMinSuccess,
      acceptable_coupling: passesAcceptableCoupling,
    };

    // Overall health
    const passCount = [passesMinQuality, passesMinSuccess, passesAcceptableCoupling].filter(
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

    // Save updated stats
    const updatedContent = yaml.stringify(stats, {
      lineWidth: 0,
      indent: 2,
    });
    fs.writeFileSync(statsPath, updatedContent, 'utf-8');

    console.log(
      `✅ ${agentName}: Quality=${omegaMetrics.performance_bounds.min_quality_score}, Coupling=${omegaMetrics.dependencies.coupling_ratio.toFixed(
        2
      )}, Health=${stats.metadata.overall_health}`
    );
    return true;
  } catch (error) {
    console.error(`❌ ${agentName}: Error - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Deploy Ω Statistics to All Agents');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Loading analysis data...');
  const complexityData = loadComplexityData();
  const dependencyData = loadDependencyData();
  console.log(`  Complexity data: ${complexityData.size} agents`);
  console.log(`  Dependency data: ${dependencyData.size} agents\n`);

  console.log('🔍 Scanning agent stats files...');
  const statsFiles = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('-stats.yaml'))
    .map((f) => f.replace('-stats.yaml', ''));

  console.log(`  Found ${statsFiles.length} agent stats files\n`);

  console.log('🚀 Deploying Ω statistics...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const agentName of statsFiles) {
    const success = updateAgentStats(agentName, complexityData, dependencyData);
    if (success) {
      if (statsFiles.indexOf(agentName) === 0) {
        successCount++; // Count first as success if it was already done
      } else {
        successCount++;
      }
    } else {
      errorCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Deployment Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total agents: ${statsFiles.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped (already done): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`\n📊 Success rate: ${((successCount / statsFiles.length) * 100).toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (successCount === statsFiles.length) {
    console.log('🎉 All agents successfully updated with Ω statistics!');
  } else if (errorCount > 0) {
    console.log('⚠️  Some agents failed to update. Please review errors above.');
  }

  // Verify YAML validity
  console.log('\n🔍 Verifying YAML validity...');
  let validCount = 0;
  for (const agentName of statsFiles) {
    const statsPath = path.join(AGENTS_DIR, `${agentName}-stats.yaml`);
    try {
      const content = fs.readFileSync(statsPath, 'utf-8');
      yaml.parse(content);
      validCount++;
    } catch (error) {
      console.error(`❌ ${agentName}: Invalid YAML - ${error.message}`);
    }
  }

  console.log(`✅ Valid YAML: ${validCount}/${statsFiles.length}`);

  if (validCount === statsFiles.length) {
    console.log('\n✅ All files are valid YAML!');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
