#!/usr/bin/env npx ts-node
/**
 * Performance Report CLI
 *
 * Generates performance reports and recommendations.
 *
 * Usage:
 *   npx ts-node scripts/performance-report.ts [command] [options]
 *
 * Commands:
 *   metrics       - Show current metrics
 *   recommend     - Show optimization recommendations
 *   cache-stats   - Show cache statistics
 *   rate-status   - Show rate limit status
 *   help          - Show help
 */

import { PerformanceService } from '../src/performance/PerformanceService';

const HELP_TEXT = `
TAISUN v2 Performance Report CLI
=================================

Usage:
  npx ts-node scripts/performance-report.ts [command]

Commands:
  metrics       - Show current performance metrics
  recommend     - Show optimization recommendations
  cache-stats   - Show cache statistics
  rate-status   - Show rate limit status
  full          - Show full performance report
  help          - Show this help message

Examples:
  npx ts-node scripts/performance-report.ts metrics
  npx ts-node scripts/performance-report.ts recommend
  npx ts-node scripts/performance-report.ts full
`;

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const performanceService = new PerformanceService();

  switch (command) {
    case 'metrics': {
      const metrics = performanceService.getMetrics();
      console.log('\nPerformance Metrics:');
      console.log('─'.repeat(40));
      console.log(JSON.stringify(metrics, null, 2));
      break;
    }

    case 'recommend': {
      const recommendations = performanceService.getRecommendations();
      console.log('\nOptimization Recommendations:');
      console.log('─'.repeat(40));

      if (recommendations.length === 0) {
        console.log('No recommendations at this time. System is performing optimally.');
      } else {
        for (const rec of recommendations) {
          console.log(`\n[${rec.priority.toUpperCase()}] ${rec.title}`);
          console.log(`  Category: ${rec.category}`);
          console.log(`  ${rec.description}`);
          console.log(`  Impact: ${rec.estimatedImpact}`);
          console.log(`  Action: ${rec.implementation}`);
          console.log(`  Effort: ${rec.effort}`);
        }
      }
      break;
    }

    case 'cache-stats': {
      const metrics = performanceService.getMetrics();
      console.log('\nCache Statistics:');
      console.log('─'.repeat(40));
      console.log(`  Hits:      ${metrics.cache.hits}`);
      console.log(`  Misses:    ${metrics.cache.misses}`);
      console.log(`  Hit Rate:  ${(metrics.cache.hitRate * 100).toFixed(1)}%`);
      console.log(`  Size:      ${metrics.cache.size}`);
      console.log(`  Evictions: ${metrics.cache.evictions}`);
      break;
    }

    case 'rate-status': {
      const status = performanceService.checkRateLimit();
      console.log('\nRate Limit Status:');
      console.log('─'.repeat(40));
      console.log(`  Requests Remaining: ${status.requestsRemaining}`);
      console.log(`  Tokens Remaining:   ${status.tokensRemaining}`);
      console.log(`  Is Limited:         ${status.isLimited ? 'Yes' : 'No'}`);
      if (status.isLimited) {
        console.log(`  Wait Time:          ${status.waitTimeMs}ms`);
      }
      break;
    }

    case 'full':
    default:
      console.log(performanceService.generateReport());
      break;
  }
}

main();
