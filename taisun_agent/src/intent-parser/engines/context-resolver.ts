/**
 * Context Resolver
 *
 * SESSION_HANDOFF.md, .workflow_state.json からコンテキストを解決
 */

import fs from 'fs';
import path from 'path';
import { ContextSource, IntentContext } from '../types';

/**
 * Context Resolver クラス
 */
export class ContextResolver {
  private projectRoot: string;
  private contextCache: ContextSource | null = null;
  private cacheTimestamp: number = 0;
  private cacheTtl: number = 60000; // 1分間キャッシュ

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * コンテキストソースを取得
   *
   * @returns コンテキストソース
   */
  async getContextSource(): Promise<ContextSource> {
    const now = Date.now();

    // キャッシュが有効なら返す
    if (this.contextCache && now - this.cacheTimestamp < this.cacheTtl) {
      return this.contextCache;
    }

    const sessionHandoffPath = path.join(this.projectRoot, 'SESSION_HANDOFF.md');
    const workflowStatePath = path.join(this.projectRoot, '.workflow_state.json');
    const baselineFilesPath = path.join(this.projectRoot, '.claude/baseline_files.json');

    const contextSource: ContextSource = {
      sessionHandoffExists: fs.existsSync(sessionHandoffPath),
      workflowStateExists: fs.existsSync(workflowStatePath),
      baselineFiles: [],
      currentPhase: undefined,
    };

    // .workflow_state.json から現在のフェーズを取得
    if (contextSource.workflowStateExists) {
      try {
        const workflowState = JSON.parse(fs.readFileSync(workflowStatePath, 'utf-8'));
        contextSource.currentPhase = workflowState.currentPhase;
      } catch (error) {
        console.debug('Failed to read workflow state:', error);
      }
    }

    // baseline_files.json からベースラインファイルを取得
    if (fs.existsSync(baselineFilesPath)) {
      try {
        const baselineData = JSON.parse(fs.readFileSync(baselineFilesPath, 'utf-8'));
        contextSource.baselineFiles = baselineData.files || [];
      } catch (error) {
        console.debug('Failed to read baseline files:', error);
      }
    }

    // キャッシュを更新
    this.contextCache = contextSource;
    this.cacheTimestamp = now;

    return contextSource;
  }

  /**
   * SESSION_HANDOFF.md の内容を取得
   *
   * @returns SESSION_HANDOFF.md の内容、存在しなければ null
   */
  async getSessionHandoff(): Promise<string | null> {
    const sessionHandoffPath = path.join(this.projectRoot, 'SESSION_HANDOFF.md');

    if (!fs.existsSync(sessionHandoffPath)) {
      return null;
    }

    try {
      return fs.readFileSync(sessionHandoffPath, 'utf-8');
    } catch (error) {
      console.error('Failed to read SESSION_HANDOFF.md:', error);
      return null;
    }
  }

  /**
   * テキストからコンテキストを解決
   *
   * @param text - 入力テキスト
   * @param existingFiles - 検出された既存ファイル
   * @returns IntentContext
   */
  async resolve(text: string, existingFiles: string[] = []): Promise<IntentContext> {
    const contextSource = await this.getContextSource();

    // セッション継続の判定
    const sessionContinuation = contextSource.sessionHandoffExists;

    // 逸脱検出（指示にない行動の提案）
    const deviationDetected = this.detectDeviation(text);

    // ワークフロー再利用検出
    const workflowReuseDetected = this.detectWorkflowReuse(text);

    // ベースラインファイル改変検出
    const baselineFileModification = this.detectBaselineModification(existingFiles, contextSource.baselineFiles);

    // スキル要求検出
    const skillRequested = this.detectSkillRequest(text);

    return {
      sessionContinuation,
      existingFilesDetected: existingFiles,
      skillRequested,
      deviationDetected,
      workflowReuseDetected,
      baselineFileModification,
    };
  }

  /**
   * 逸脱を検出
   *
   * @param text - 入力テキスト
   * @returns 逸脱が検出されたら true
   */
  private detectDeviation(text: string): boolean {
    const deviationPatterns = [
      /提案/,
      /推奨/,
      /より良い/,
      /改善/,
      /最適化/,
      /suggest/i,
      /recommend/i,
      /better/i,
    ];

    return deviationPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * ワークフロー再利用を検出
   *
   * @param text - 入力テキスト
   * @returns ワークフロー再利用が検出されたら true
   */
  private detectWorkflowReuse(text: string): boolean {
    const workflowPatterns = [
      /同じ.*ワークフロー/,
      /前回と同じ/,
      /さっきと同じ/,
      /以前と同じ/,
      /same.*workflow/i,
    ];

    return workflowPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * ベースラインファイル改変を検出
   *
   * @param existingFiles - 検出された既存ファイル
   * @param baselineFiles - ベースラインファイルリスト
   * @returns ベースラインファイルが含まれていたら true
   */
  private detectBaselineModification(existingFiles: string[], baselineFiles: string[]): boolean {
    return existingFiles.some((file) => baselineFiles.includes(file));
  }

  /**
   * スキル要求を検出
   *
   * @param text - 入力テキスト
   * @returns スキル名、検出されなければ undefined
   */
  private detectSkillRequest(text: string): string | undefined {
    const skillPattern = /([a-z\-]+)(スキル|skill)/i;
    const slashPattern = /\/([a-z\-]+)/;

    const skillMatch = text.match(skillPattern);
    if (skillMatch) {
      return skillMatch[1];
    }

    const slashMatch = text.match(slashPattern);
    if (slashMatch) {
      return slashMatch[1];
    }

    return undefined;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.contextCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * プロジェクトルートを設定
   *
   * @param projectRoot - プロジェクトルートパス
   */
  setProjectRoot(projectRoot: string): void {
    this.projectRoot = projectRoot;
    this.clearCache();
  }
}

/**
 * シングルトンインスタンス
 */
let resolverInstance: ContextResolver | null = null;

/**
 * Context Resolver インスタンスを取得
 *
 * @returns ContextResolver インスタンス
 */
export function getContextResolver(): ContextResolver {
  if (!resolverInstance) {
    resolverInstance = new ContextResolver();
  }
  return resolverInstance;
}
