/**
 * Feature Extractor
 *
 * 22次元特徴量を0-1に正規化して抽出
 */

import * as fs from 'fs';
import { FeatureVector, IntentContext } from '../types';

const BASELINE_PATTERNS = [
  'CLAUDE.md',
  '.claude/settings.json',
  'unified-guard.js',
  'deviation-approval-guard.js',
];

export class FeatureExtractor {
  extract(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: IntentContext,
    intentConfidence: number,
    historyStats?: { approvalRate: number; errorRate: number }
  ): FeatureVector {
    const filePath = (toolInput.file_path as string) || '';
    const command = (toolInput.command as string) || '';

    return {
      toolEdit: toolName === 'Edit' ? 1 : 0,
      toolWrite: toolName === 'Write' ? 1 : 0,
      toolBash: toolName === 'Bash' ? 1 : 0,
      toolRead: toolName === 'Read' ? 1 : 0,
      toolSkill: toolName === 'Skill' ? 1 : 0,

      fileExists: this.checkFileExists(filePath),
      fileBaseline: this.checkBaseline(filePath),
      fileJs: this.checkExtension(filePath, ['.js', '.jsx', '.mjs', '.cjs']),
      fileTs: this.checkExtension(filePath, ['.ts', '.tsx']),
      fileMd: this.checkExtension(filePath, ['.md']),

      ctxSessionHandoff: context.sessionContinuation ? 1 : 0,
      ctxLateNight: this.checkLateNight(),
      ctxRecentErrors: 0,

      intentConfidence: Math.min(1, intentConfidence / 100),
      intentWorkflowReuse: context.workflowReuseDetected ? 1 : 0,
      intentSkill: context.skillRequested ? 1 : 0,
      intentExistingFile: context.existingFilesDetected.length > 0 ? 1 : 0,

      cmdRm: this.checkCommandPattern(command, /\brm\b/),
      cmdSudo: this.checkCommandPattern(command, /\bsudo\b/),
      cmdInstall: this.checkCommandPattern(command, /\b(npm|yarn|pnpm)\s+install\b/),

      histApprovalRate: historyStats?.approvalRate ?? 0.8,
      histErrorRate: historyStats?.errorRate ?? 0.05,
    };
  }

  toArray(fv: FeatureVector): number[] {
    return [
      fv.toolEdit, fv.toolWrite, fv.toolBash, fv.toolRead, fv.toolSkill,
      fv.fileExists, fv.fileBaseline, fv.fileJs, fv.fileTs, fv.fileMd,
      fv.ctxSessionHandoff, fv.ctxLateNight, fv.ctxRecentErrors,
      fv.intentConfidence, fv.intentWorkflowReuse, fv.intentSkill, fv.intentExistingFile,
      fv.cmdRm, fv.cmdSudo, fv.cmdInstall,
      fv.histApprovalRate, fv.histErrorRate,
    ];
  }

  static featureNames(): string[] {
    return [
      'toolEdit', 'toolWrite', 'toolBash', 'toolRead', 'toolSkill',
      'fileExists', 'fileBaseline', 'fileJs', 'fileTs', 'fileMd',
      'ctxSessionHandoff', 'ctxLateNight', 'ctxRecentErrors',
      'intentConfidence', 'intentWorkflowReuse', 'intentSkill', 'intentExistingFile',
      'cmdRm', 'cmdSudo', 'cmdInstall',
      'histApprovalRate', 'histErrorRate',
    ];
  }

  private checkFileExists(filePath: string): number {
    if (!filePath) return 0;
    try {
      return fs.existsSync(filePath) ? 1 : 0;
    } catch {
      return 0;
    }
  }

  private checkBaseline(filePath: string): number {
    if (!filePath) return 0;
    return BASELINE_PATTERNS.some((bp) => filePath.includes(bp)) ? 1 : 0;
  }

  private checkExtension(filePath: string, extensions: string[]): number {
    if (!filePath) return 0;
    return extensions.some((ext) => filePath.endsWith(ext)) ? 1 : 0;
  }

  private checkLateNight(): number {
    const hour = new Date().getHours();
    return (hour >= 23 || hour < 5) ? 1 : 0;
  }

  private checkCommandPattern(command: string, pattern: RegExp): number {
    if (!command) return 0;
    return pattern.test(command) ? 1 : 0;
  }
}

let extractorInstance: FeatureExtractor | null = null;

export function getFeatureExtractor(): FeatureExtractor {
  if (!extractorInstance) {
    extractorInstance = new FeatureExtractor();
  }
  return extractorInstance;
}
