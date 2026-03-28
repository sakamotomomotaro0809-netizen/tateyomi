/**
 * Layer 4: State Persistence
 *
 * 責務:
 * - ワークフロー状態の差分管理
 * - セッションハンドオフの更新
 * - Context Quality 監視
 */

import { HookEvent, WorkflowState } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class StatePersistence {
  private readonly stateFile = '.workflow_state.json';
  private readonly handoffFile = 'SESSION_HANDOFF.md';

  /**
   * 状態を読み込み
   */
  loadState(cwd: string): WorkflowState | null {
    try {
      const filePath = path.join(cwd, this.stateFile);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  /**
   * 状態を永続化 (差分のみ)
   */
  async persistState(cwd: string, updates: Partial<WorkflowState>): Promise<boolean> {
    try {
      const filePath = path.join(cwd, this.stateFile);
      const currentState = this.loadState(cwd);

      if (!currentState) {
        return false;
      }

      // 差分を適用
      const newState = this.mergeState(currentState, updates);

      // 保存
      fs.writeFileSync(filePath, JSON.stringify(newState, null, 2), 'utf8');

      return true;
    } catch (error) {
      console.error('Failed to persist state:', error);
      return false;
    }
  }

  /**
   * 状態をマージ (差分のみ更新)
   */
  private mergeState(current: WorkflowState, updates: Partial<WorkflowState>): WorkflowState {
    return {
      ...current,
      ...updates,
      meta: {
        ...current.meta,
        ...updates.meta,
        lastUpdated: new Date().toISOString(),
      },
      evidence: {
        ...current.evidence,
        ...updates.evidence,
      },
    };
  }

  /**
   * Read ログに追加
   */
  async addToReadLog(cwd: string, filePath: string): Promise<void> {
    const state = this.loadState(cwd);
    if (!state) return;

    if (!state.evidence.read_log.includes(filePath)) {
      state.evidence.read_log.push(filePath);
      await this.persistState(cwd, state);
    }
  }

  /**
   * セッションハンドオフを更新
   */
  async updateHandoff(cwd: string, event: HookEvent): Promise<boolean> {
    try {
      const filePath = path.join(cwd, this.handoffFile);

      // 既存のハンドオフを読み込み
      let content = '';
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
      }

      // 最終更新時刻を更新
      const timestamp = new Date().toISOString();
      content = content.replace(
        /\*\*最終更新\*\*:.*/,
        `**最終更新**: ${timestamp}`
      );

      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to update handoff:', error);
      return false;
    }
  }

  /**
   * Context Quality を監視
   */
  getContextQualitySuggestions(event: HookEvent): string[] {
    const suggestions: string[] = [];

    // console.log 検出
    const content = event.toolInput.content || '';
    if (content.includes('console.log')) {
      suggestions.push('console.log が検出されました。デバッグ用のログは削除してください。');
    }

    // tmux 推奨
    if (event.toolName === 'Bash') {
      const command = event.toolInput.command || '';
      const longRunningCommands = ['npm run', 'npm start', 'npm test', 'docker', 'python', 'node'];

      if (longRunningCommands.some(cmd => command.startsWith(cmd))) {
        suggestions.push('長時間実行されるコマンドは tmux で実行することを推奨します。');
      }
    }

    return suggestions;
  }
}
