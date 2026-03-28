/**
 * Layer 2: State Validator
 *
 * 責務:
 * - Read-before-Write 検証
 * - ワークフロー状態検証
 * - ベースラインファイルロック検証
 */

import { HookEvent, PolicyViolation, WorkflowState } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class StateValidator {
  /**
   * Read-before-Write 検証
   */
  checkReadBeforeWrite(
    event: HookEvent,
    state: WorkflowState | null,
    violations: PolicyViolation[]
  ): void {
    if (event.toolName !== 'Write' && event.toolName !== 'Edit') {
      return;
    }

    const filePath = event.toolInput.file_path || '';
    if (!filePath) return;

    // 新規ファイル作成の場合
    if (!fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const significantExts = ['.ts', '.js', '.py', '.sh', '.tsx', '.jsx'];

      if (significantExts.includes(ext)) {
        // 承認済みかチェック
        const approved = this.isFileCreationApproved(state, filePath);

        if (!approved) {
          violations.push({
            type: 'read_before_write',
            severity: 'high',
            message: `新規ファイル「${path.basename(filePath)}」の作成は承認されていません`,
            suggestion: 'ユーザーの承認を得てから作成してください',
          });
        }
      }

      return;
    }

    // 既存ファイルの編集の場合
    const hasRead = state?.evidence.read_log.includes(filePath) ?? false;

    if (!hasRead) {
      violations.push({
        type: 'read_before_write',
        severity: 'medium',
        message: `ファイル「${path.basename(filePath)}」を Read せずに編集しようとしています`,
        suggestion: 'Read tool でファイルを読み込んでから編集してください',
      });
    }
  }

  /**
   * ファイル作成が承認済みかチェック
   */
  private isFileCreationApproved(state: WorkflowState | null, filePath: string): boolean {
    if (!state) return false;

    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);

    // approved_deviations をチェック
    return state.evidence.approved_deviations.some(
      d =>
        d.deviation.includes(basename) ||
        d.deviation.includes('newfile') ||
        d.reason.toLowerCase().includes('approved for creation')
    );
  }

  /**
   * ベースラインファイルロック検証
   */
  checkBaselineLock(
    event: HookEvent,
    state: WorkflowState | null,
    violations: PolicyViolation[]
  ): void {
    if (!state || !state.baseline || !state.baseline.files) {
      return;
    }

    const filePath = event.toolInput.file_path || '';
    if (!filePath) return;

    const basename = path.basename(filePath);

    // ベースラインファイルに含まれているかチェック
    if (state.baseline.files[basename] || state.baseline.files[filePath]) {
      violations.push({
        type: 'baseline_lock',
        severity: 'critical',
        message: `ベースラインファイル「${basename}」は改変禁止です`,
        suggestion: 'このファイルはワークフローの基準として登録されています',
      });
    }
  }
}
