/**
 * Layer 2: Policy Validator
 *
 * 責務:
 * - Workflow Fidelity Contract 検証
 * - 複雑度検出 (66 パターン)
 * - Skill 要求強制
 */

import { HookEvent, HookIntent, Layer2Output, HookDecision, PolicyViolation, SkillRequirement } from '../types';

export class PolicyValidator {
  /**
   * ポリシー検証を実行
   */
  async validate(event: HookEvent, intent: HookIntent): Promise<Layer2Output> {
    const startTime = performance.now();

    const violations: PolicyViolation[] = [];
    const skillRequirements: SkillRequirement[] = [];

    // Workflow Fidelity Contract 検証
    this.checkWorkflowFidelity(event, violations);

    // Skill 要求検出
    this.detectSkillRequirements(event, skillRequirements);

    // 決定
    let decision: HookDecision = HookDecision.ALLOW;
    let reason: string | undefined;

    if (violations.some(v => v.severity === 'critical')) {
      decision = HookDecision.BLOCK;
      reason = violations.find(v => v.severity === 'critical')?.message;
    } else if (violations.some(v => v.severity === 'high')) {
      decision = HookDecision.WARNING;
      reason = violations.find(v => v.severity === 'high')?.message;
    }

    return {
      decision,
      violations,
      skillRequirements,
      stateValid: violations.length === 0,
      processingTimeMs: performance.now() - startTime,
      reason,
    };
  }

  /**
   * Workflow Fidelity Contract 検証
   */
  private checkWorkflowFidelity(event: HookEvent, violations: PolicyViolation[]): void {
    // "same workflow" パターン検出
    const description = event.toolInput.description || '';
    const command = event.toolInput.command || '';

    const simplificationKeywords = [
      /simplif/i,
      /optimiz/i,
      /better/i,
      /シンプルに/,
      /最適化/,
      /効率化/,
    ];

    for (const keyword of simplificationKeywords) {
      if (keyword.test(description) || keyword.test(command)) {
        violations.push({
          type: 'workflow_fidelity',
          severity: 'high',
          message: '無断簡略化の可能性を検出しました',
          suggestion: 'ユーザーの承認を得てから実行してください',
        });
        break;
      }
    }
  }

  /**
   * Skill 要求検出 (66 パターンのサブセット)
   */
  private detectSkillRequirements(event: HookEvent, requirements: SkillRequirement[]): void {
    const text = JSON.stringify(event.toolInput).toLowerCase();

    // インタラクティブ動画 / VSL
    if (text.includes('interactive') || text.includes('分岐') || text.includes('vsl')) {
      requirements.push({
        skillName: 'interactive-video-platform',
        strict: true,
        reason: 'インタラクティブ動画/VSL動画の作成を検出',
        autoMapped: true,
      });
    }

    // YouTube教材
    if ((text.includes('youtube') || text.includes('ユーチューブ')) && (text.includes('教材') || text.includes('講座'))) {
      requirements.push({
        skillName: 'youtubeschool-creator',
        strict: true,
        reason: 'YouTube教材動画の作成を検出',
        autoMapped: true,
      });
    }

    // セールスレター
    if (text.includes('sales') && text.includes('letter') || text.includes('セールスレター')) {
      requirements.push({
        skillName: 'taiyo-style-sales-letter',
        strict: false,
        reason: 'セールスレターの作成を検出',
        autoMapped: true,
      });
    }

    // Voice AI / 電話
    if (text.includes('voice') || text.includes('電話') || text.includes('架電') || text.includes('通話')) {
      requirements.push({
        skillName: 'voice-ai',
        strict: false,
        reason: 'Voice AI / 電話機能の使用を検出',
        autoMapped: true,
      });
    }

    // AI SDR / 営業パイプライン
    if (text.includes('sdr') || text.includes('営業') || text.includes('パイプライン') || text.includes('リード')) {
      requirements.push({
        skillName: 'ai-sdr',
        strict: false,
        reason: 'AI SDR / 営業機能の使用を検出',
        autoMapped: true,
      });
    }
  }
}
