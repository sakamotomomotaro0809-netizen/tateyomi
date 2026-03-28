#!/usr/bin/env npx ts-node
/**
 * Benchmark Runner CLI
 *
 * Runs performance benchmarks for TAISUN v2.
 *
 * Usage:
 *   npx ts-node scripts/run-benchmarks.ts [options]
 *
 * Options:
 *   --output=<path>       - Output file path
 *   --format=json|md      - Output format (default: console)
 *   --baseline=<path>     - Baseline file for comparison
 *   --iterations=<n>      - Number of iterations (default: 100)
 */

import * as fs from 'fs';
import { BenchmarkRunner } from '../src/performance/BenchmarkRunner';
import { PerformanceService } from '../src/performance/PerformanceService';
import { BenchmarkScenario, BenchmarkSuiteResult } from '../src/performance/types';

interface CliOptions {
  output: string;
  format: 'json' | 'markdown' | 'console';
  baseline: string;
  iterations: number;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    output: '',
    format: 'console',
    baseline: '',
    iterations: 100,
  };

  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1] as CliOptions['format'];
    } else if (arg.startsWith('--baseline=')) {
      options.baseline = arg.split('=')[1];
    } else if (arg.startsWith('--iterations=')) {
      options.iterations = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

function createScenarios(iterations: number): BenchmarkScenario[] {
  const performanceService = new PerformanceService();

  return [
    // Cache performance
    {
      id: 'cache-write',
      name: 'Cache Write Operations',
      description: 'Measure cache write performance',
      category: 'cache',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      run: async () => {
        for (let i = 0; i < 100; i++) {
          performanceService.cacheResult(`key-${i}`, { data: `value-${i}` });
        }
        return { success: true };
      },
    },
    {
      id: 'cache-read',
      name: 'Cache Read Operations',
      description: 'Measure cache read performance',
      category: 'cache',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      setup: async () => {
        for (let i = 0; i < 100; i++) {
          performanceService.cacheResult(`read-key-${i}`, { data: `value-${i}` });
        }
      },
      run: async () => {
        for (let i = 0; i < 100; i++) {
          performanceService.getCachedResult(`read-key-${i}`);
        }
        return { success: true };
      },
    },
    {
      id: 'cache-mixed',
      name: 'Cache Mixed Operations',
      description: 'Measure cache with mixed read/write',
      category: 'cache',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      run: async () => {
        for (let i = 0; i < 50; i++) {
          performanceService.cacheResult(`mixed-key-${i}`, { data: i });
          performanceService.getCachedResult(`mixed-key-${i}`);
        }
        return { success: true };
      },
    },

    // Model selection
    {
      id: 'model-selection',
      name: 'Model Selection Algorithm',
      description: 'Measure model recommendation performance',
      category: 'agent-selection',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      run: async () => {
        const criteria = [
          { taskComplexity: 'trivial' as const, estimatedTokens: 50, requiresReasoning: false, isCodeGeneration: false },
          { taskComplexity: 'simple' as const, estimatedTokens: 200, requiresReasoning: false, isCodeGeneration: true },
          { taskComplexity: 'moderate' as const, estimatedTokens: 1000, requiresReasoning: true, isCodeGeneration: true },
          { taskComplexity: 'complex' as const, estimatedTokens: 3000, requiresReasoning: true, isCodeGeneration: true },
          { taskComplexity: 'expert' as const, estimatedTokens: 8000, requiresReasoning: true, isCodeGeneration: true },
        ];

        for (const c of criteria) {
          performanceService.recommendModel(c);
        }
        return { success: true };
      },
    },

    // Complexity classification
    {
      id: 'complexity-classification',
      name: 'Task Complexity Classification',
      description: 'Measure complexity classification performance',
      category: 'agent-selection',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      run: async () => {
        const descriptions = [
          'list all files',
          'format the code',
          'implement user authentication',
          'design microservices architecture',
          'security audit the entire codebase',
        ];

        for (const desc of descriptions) {
          performanceService.classifyComplexity(desc, 1000);
        }
        return { success: true };
      },
    },

    // Rate limiting
    {
      id: 'rate-limit-check',
      name: 'Rate Limit Check',
      description: 'Measure rate limit check performance',
      category: 'api',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      run: async () => {
        for (let i = 0; i < 100; i++) {
          performanceService.checkRateLimit();
        }
        return { success: true };
      },
    },

    // Metrics collection
    {
      id: 'metrics-collection',
      name: 'Metrics Collection',
      description: 'Measure metrics collection performance',
      category: 'memory',
      iterations: Math.floor(iterations / 10), // Fewer iterations as this is heavier
      warmupIterations: 5,
      timeout: 10000,
      run: async () => {
        performanceService.getMetrics();
        return { success: true };
      },
    },

    // Agent selection cache
    {
      id: 'agent-cache',
      name: 'Agent Selection Cache',
      description: 'Measure agent selection caching',
      category: 'agent-selection',
      iterations,
      warmupIterations: 10,
      timeout: 5000,
      run: async () => {
        const keywordSets = [
          ['api', 'backend', 'rest'],
          ['frontend', 'react', 'ui'],
          ['database', 'sql', 'migration'],
          ['test', 'unit', 'coverage'],
          ['deploy', 'ci', 'cd'],
        ];

        for (const keywords of keywordSets) {
          performanceService.cacheAgentSelection(keywords, ['backend-developer']);
          performanceService.getCachedAgentSelection(keywords);
        }
        return { success: true };
      },
    },

    // Recommendations generation
    {
      id: 'recommendations',
      name: 'Recommendations Generation',
      description: 'Measure optimization recommendations',
      category: 'memory',
      iterations: Math.floor(iterations / 10),
      warmupIterations: 5,
      timeout: 10000,
      run: async () => {
        performanceService.getRecommendations();
        return { success: true };
      },
    },
  ];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const runner = new BenchmarkRunner();
  const scenarios = createScenarios(options.iterations);

  for (const scenario of scenarios) {
    runner.registerScenario(scenario);
  }

  let baseline: BenchmarkSuiteResult | undefined;
  if (options.baseline && fs.existsSync(options.baseline)) {
    baseline = JSON.parse(fs.readFileSync(options.baseline, 'utf-8'));
    console.log(`Loaded baseline from: ${options.baseline}`);
  }

  await runner.runAll({
    name: 'TAISUN v2 Performance Benchmarks',
    description: 'Core performance benchmarks for the TAISUN v2 system',
    scenarios,
    outputFormat: options.format,
    outputPath: options.output || undefined,
    baseline,
  });
}

main().catch(console.error);
