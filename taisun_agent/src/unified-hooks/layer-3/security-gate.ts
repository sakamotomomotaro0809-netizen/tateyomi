/**
 * Layer 3: Security & Safety Gate
 *
 * 責務:
 * - セキュリティ脅威検出
 * - Copy Safety マーカー検出
 * - シークレット漏洩防止
 */

import { HookEvent, Layer3Output, HookDecision, SecurityThreat, SafetyIssue } from '../types';
import { InjectionDetector } from './injection-detector';

export class SecurityGate {
  private injectionDetector: InjectionDetector;

  constructor() {
    this.injectionDetector = new InjectionDetector();
  }

  /**
   * セキュリティ検証を実行
   */
  async validate(event: HookEvent): Promise<Layer3Output> {
    const startTime = performance.now();

    const threats: SecurityThreat[] = [];
    const safetyIssues: SafetyIssue[] = [];

    // インジェクション検出
    this.checkInjection(event, threats);

    // Copy Safety マーカー検出
    this.checkCopySafetyMarkers(event, safetyIssues);

    // シークレット漏洩検出
    this.checkSecretLeakage(event, threats);

    // 危険な操作検出
    this.checkDangerousOperations(event, safetyIssues);

    // 決定
    let decision: HookDecision = HookDecision.ALLOW;
    let reason: string | undefined;

    if (threats.some(t => t.severity === 'critical') || safetyIssues.some(s => s.severity === 'critical')) {
      decision = HookDecision.BLOCK;
      reason = threats.find(t => t.severity === 'critical')?.description ||
               safetyIssues.find(s => s.severity === 'critical')?.description;
    } else if (threats.some(t => t.severity === 'high') || safetyIssues.some(s => s.severity === 'high')) {
      decision = HookDecision.WARNING;
      reason = threats.find(t => t.severity === 'high')?.description ||
               safetyIssues.find(s => s.severity === 'high')?.description;
    }

    return {
      decision,
      threats,
      safetyIssues,
      processingTimeMs: performance.now() - startTime,
      reason,
    };
  }

  /**
   * インジェクション検出
   */
  private checkInjection(event: HookEvent, threats: SecurityThreat[]): void {
    if (event.toolName === 'Bash') {
      const command = event.toolInput.command || '';
      const threat = this.injectionDetector.detectCommandInjection(command);
      if (threat) threats.push(threat);
    }

    if (event.toolName === 'Write') {
      const content = event.toolInput.content || '';
      const sqlThreat = this.injectionDetector.detectSQLInjection(content);
      if (sqlThreat) threats.push(sqlThreat);
    }

    const filePath = event.toolInput.file_path || '';
    if (filePath) {
      const pathThreat = this.injectionDetector.detectPathTraversal(filePath);
      if (pathThreat) threats.push(pathThreat);
    }
  }

  /**
   * Copy Safety マーカー検出
   */
  private checkCopySafetyMarkers(event: HookEvent, safetyIssues: SafetyIssue[]): void {
    if (event.toolName !== 'Write') return;

    const content = event.toolInput.content || '';

    // U+FFFD (replacement character)
    if (content.includes('\uFFFD')) {
      safetyIssues.push({
        type: 'copy_marker',
        severity: 'high',
        description: 'U+FFFD (replacement character) を検出しました',
        marker: 'U+FFFD',
      });
    }

    // U+3000 (ideographic space)
    if (content.includes('\u3000')) {
      safetyIssues.push({
        type: 'copy_marker',
        severity: 'medium',
        description: 'U+3000 (ideographic space) を検出しました',
        marker: 'U+3000',
      });
    }
  }

  /**
   * シークレット漏洩検出
   */
  private checkSecretLeakage(event: HookEvent, threats: SecurityThreat[]): void {
    const content = event.toolInput.content || event.toolInput.command || '';

    const secretPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{20,}/,reason: 'OpenAI API Key' },
      { pattern: /AIza[a-zA-Z0-9_-]{35}/,reason: 'Google API Key' },
      { pattern: /[a-zA-Z0-9]{32}-us[0-9]{1,2}/,reason: 'Mailchimp API Key' },
      { pattern: /xox[baprs]-[a-zA-Z0-9-]+/, pattern: 'Slack Token' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, reason: 'GitHub Personal Access Token' },
    ];

    for (const { pattern, reason } of secretPatterns) {
      if (pattern.test(content)) {
        threats.push({
          category: 'secret_leakage',
          severity: 'critical',
          description: `${reason} を検出しました`,
          pattern: pattern.toString(),
        });
      }
    }
  }

  /**
   * 危険な操作検出
   */
  private checkDangerousOperations(event: HookEvent, safetyIssues: SafetyIssue[]): void {
    if (event.toolName !== 'Bash') return;

    const command = event.toolInput.command || '';

    const dangerousPatterns = [
      { pattern: /rm\s+-rf\s+\//, reason: 'ルートディレクトリの削除' },
      { pattern: /:\(\)\{\s*:\|\:&\s*\};:/, reason: 'Fork Bomb' },
      { pattern: /dd\s+if=\/dev\/zero/, reason: 'ディスク破壊' },
    ];

    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(command)) {
        safetyIssues.push({
          type: 'destructive_operation',
          severity: 'critical',
          description: `危険な操作を検出: ${reason}`,
        });
      }
    }
  }
}
