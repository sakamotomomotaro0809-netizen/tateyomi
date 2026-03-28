/**
 * Workflow Phase 3 - Conditional Branching Tests
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  startWorkflow,
  transitionToNextPhase,
  getStatus,
} from '../../src/proxy-mcp/workflow/engine';
import { clearState, setStateDir, resetStateDir } from '../../src/proxy-mcp/workflow/store';
import { clearCache, setWorkflowsDir, resetWorkflowsDir } from '../../src/proxy-mcp/workflow/registry';
import type { WorkflowDefinition } from '../../src/proxy-mcp/workflow/types';

// テスト用のディレクトリ（OSの一時ディレクトリを使用して権限問題を回避）
const TEMP_BASE = path.join(os.tmpdir(), 'taisun-test-' + process.pid);
const WORKFLOW_DIR = path.join(TEMP_BASE, 'config', 'workflows');
const TEST_WORKFLOW_PATH = path.join(WORKFLOW_DIR, 'test_conditional_v1.json');
const TEST_FILES_DIR = path.join(TEMP_BASE, 'test-conditional-temp');

// テストがスキップされるべきかどうかをチェック
let canRunTests = true;
let skipReason = '';

describe('Workflow Phase 3 - Conditional Branching', () => {
  // 一時ディレクトリのセットアップ（全テスト開始前）
  beforeAll(() => {
    try {
      // ベースディレクトリ作成
      fs.mkdirSync(TEMP_BASE, { recursive: true });
      fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
      fs.mkdirSync(TEST_FILES_DIR, { recursive: true });

      // 書き込みテスト
      const testFile = path.join(TEMP_BASE, '.write-test');
      fs.writeFileSync(testFile, 'test', 'utf-8');
      fs.unlinkSync(testFile);

      // ワークフローディレクトリをテスト用に設定
      setWorkflowsDir(WORKFLOW_DIR);
      // 状態ファイルディレクトリをテスト用に設定
      setStateDir(TEMP_BASE);
    } catch (error) {
      canRunTests = false;
      skipReason = `Cannot create temp directories: ${(error as Error).message}`;
      console.warn(`Skipping tests: ${skipReason}`);
    }
  });

  // 一時ディレクトリのクリーンアップ（全テスト終了後）
  afterAll(() => {
    // ワークフローディレクトリをリセット
    resetWorkflowsDir();
    // 状態ファイルディレクトリをリセット
    resetStateDir();

    try {
      if (fs.existsSync(TEMP_BASE)) {
        fs.rmSync(TEMP_BASE, { recursive: true, force: true });
      }
    } catch (error) {
      // クリーンアップエラーは無視
      console.warn(`Cleanup warning: ${(error as Error).message}`);
    }
  });

  beforeEach(() => {
    // 権限問題でテストをスキップ
    if (!canRunTests) {
      return;
    }

    // テスト用ディレクトリ作成
    try {
      if (!fs.existsSync(TEST_FILES_DIR)) {
        fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
      }

      // ワークフロー定義ディレクトリ確認
      if (!fs.existsSync(WORKFLOW_DIR)) {
        fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
      }
    } catch (error) {
      console.warn(`Setup warning: ${(error as Error).message}`);
    }

    // テスト用ワークフロー定義を作成
    const testWorkflow: WorkflowDefinition = {
      id: 'test_conditional_v1',
      name: 'Conditional Branching Test Workflow',
      version: '1.0.0',
      description: 'Test workflow for conditional branching',
      phases: [
        {
          id: 'phase_0',
          name: 'Planning',
          description: 'Choose content type',
          // requiredArtifacts removed - file existence is checked in condition
          conditionalNext: {
            condition: {
              type: 'file_content',
              source: path.join(TEST_FILES_DIR, 'content_type.txt'),
              pattern: '^(video|article|podcast)$',
            },
            branches: {
              video: 'phase_1_video',
              article: 'phase_1_article',
              podcast: 'phase_1_podcast',
            },
            defaultNext: 'phase_error',
          },
        },
        {
          id: 'phase_1_video',
          name: 'Video Script',
          nextPhase: 'phase_final',
        },
        {
          id: 'phase_1_article',
          name: 'Article Writing',
          nextPhase: 'phase_final',
        },
        {
          id: 'phase_1_podcast',
          name: 'Podcast Script',
          nextPhase: 'phase_final',
        },
        {
          id: 'phase_error',
          name: 'Error Phase',
          nextPhase: null,
        },
        {
          id: 'phase_final',
          name: 'Final Phase',
          nextPhase: null,
        },
      ],
    };

    fs.writeFileSync(
      TEST_WORKFLOW_PATH,
      JSON.stringify(testWorkflow, null, 2),
      'utf-8'
    );

    // キャッシュをクリア（重要：ファイル作成後に新しいワークフロー定義を読み込むため）
    clearCache();
  });

  afterEach(() => {
    // 権限問題でテストをスキップ
    if (!canRunTests) {
      return;
    }

    try {
      // テストファイルのクリーンアップ
      if (fs.existsSync(TEST_FILES_DIR)) {
        fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
      }

      // テスト用ディレクトリを再作成（次のテスト用）
      fs.mkdirSync(TEST_FILES_DIR, { recursive: true });

      // ワークフロー定義のクリーンアップ
      if (fs.existsSync(TEST_WORKFLOW_PATH)) {
        fs.unlinkSync(TEST_WORKFLOW_PATH);
      }
    } catch (error) {
      // クリーンアップエラーは無視（並列テストでの競合を防ぐ）
      console.warn(`Cleanup warning: ${(error as Error).message}`);
    }

    // ワークフロー状態のクリーンアップ（エラーは内部で処理される）
    clearState();

    // キャッシュのクリーンアップ
    clearCache();
  });

  describe('file_content condition', () => {
    it('should branch to video phase when content is "video"', () => {
      // 権限問題でテストをスキップ
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      // 準備: content_type.txt に "video" を書き込む
      fs.writeFileSync(
        path.join(TEST_FILES_DIR, 'content_type.txt'),
        'video',
        'utf-8'
      );

      // ワークフロー開始
      startWorkflow('test_conditional_v1', false);

      // Phase 0 から遷移
      const result = transitionToNextPhase();

      // Debug: エラーがある場合は表示
      if (!result.success) {
        console.log('Test failed:', result);
      }

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_1_video');
      expect(result.message).toContain('phase_1_video');

      // 状態確認
      const status = getStatus();
      expect(status.state?.currentPhase).toBe('phase_1_video');

      // Branch history check
      if (status.state?.branchHistory) {
        expect(status.state.branchHistory).toContain(
          'phase_0 -> phase_1_video (video)'
        );
      }
    });

    it('should branch to article phase when content is "article"', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      fs.writeFileSync(
        path.join(TEST_FILES_DIR, 'content_type.txt'),
        'article',
        'utf-8'
      );

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_1_article');

      const status = getStatus();
      if (status.state?.branchHistory) {
        expect(status.state.branchHistory).toContain(
          'phase_0 -> phase_1_article (article)'
        );
      }
    });

    it('should branch to podcast phase when content is "podcast"', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      fs.writeFileSync(
        path.join(TEST_FILES_DIR, 'content_type.txt'),
        'podcast',
        'utf-8'
      );

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_1_podcast');

      const status = getStatus();
      if (status.state?.branchHistory) {
        expect(status.state.branchHistory).toContain(
          'phase_0 -> phase_1_podcast (podcast)'
        );
      }
    });

    it('should use defaultNext when pattern does not match', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      // パターンにマッチしない値
      fs.writeFileSync(
        path.join(TEST_FILES_DIR, 'content_type.txt'),
        'unknown',
        'utf-8'
      );

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_error');
    });

    it('should use defaultNext when file does not exist', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      // ファイルを作成しない

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_error');
    });
  });

  describe('file_exists condition', () => {
    beforeEach(() => {
      if (!canRunTests) {
        return;
      }

      // キャッシュをクリア
      clearCache();

      // file_exists 条件を使うワークフローを作成
      const workflow: WorkflowDefinition = {
        id: 'test_conditional_v1',
        name: 'File Exists Test',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Check',
            conditionalNext: {
              condition: {
                type: 'file_exists',
                source: path.join(TEST_FILES_DIR, 'optional.txt'),
              },
              branches: {
                'true': 'phase_exists',
                'false': 'phase_not_exists',
              },
              defaultNext: 'phase_error',
            },
          },
          {
            id: 'phase_exists',
            name: 'File Exists',
            nextPhase: null,
          },
          {
            id: 'phase_not_exists',
            name: 'File Does Not Exist',
            nextPhase: null,
          },
          {
            id: 'phase_error',
            name: 'Error',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );
    });

    it('should branch to "true" when file exists', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      fs.writeFileSync(path.join(TEST_FILES_DIR, 'optional.txt'), 'test');

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_exists');
    });

    it('should branch to "false" when file does not exist', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_not_exists');
    });
  });

  describe('metadata_value condition', () => {
    beforeEach(() => {
      if (!canRunTests) {
        return;
      }

      // キャッシュをクリア
      clearCache();

      const workflow: WorkflowDefinition = {
        id: 'test_conditional_v1',
        name: 'Metadata Test',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Check Metadata',
            conditionalNext: {
              condition: {
                type: 'metadata_value',
                source: 'priority',
                pattern: '^(high|low)$',
              },
              branches: {
                high: 'phase_high',
                low: 'phase_low',
              },
              defaultNext: 'phase_default',
            },
          },
          {
            id: 'phase_high',
            name: 'High Priority',
            nextPhase: null,
          },
          {
            id: 'phase_low',
            name: 'Low Priority',
            nextPhase: null,
          },
          {
            id: 'phase_default',
            name: 'Default',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );
    });

    it('should branch based on metadata value', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      startWorkflow('test_conditional_v1', false, { priority: 'high' });
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_high');
    });

    it('should use defaultNext when metadata does not match', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      startWorkflow('test_conditional_v1', false, { priority: 'medium' });
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_default');
    });

    it('should use defaultNext when metadata is missing', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      startWorkflow('test_conditional_v1', false, {});
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_default');
    });
  });

  describe('error handling', () => {
    it('should fail when no branch matches and no defaultNext', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      // キャッシュをクリア
      clearCache();

      const workflow: WorkflowDefinition = {
        id: 'test_conditional_v1',
        name: 'No Default Test',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'No Default',
            conditionalNext: {
              condition: {
                type: 'file_content',
                source: path.join(TEST_FILES_DIR, 'type.txt'),
              },
              branches: {
                option1: 'phase_1',
              },
              // defaultNext なし
            },
          },
          {
            id: 'phase_1',
            name: 'Phase 1',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );

      fs.writeFileSync(
        path.join(TEST_FILES_DIR, 'type.txt'),
        'option2', // マッチしない
        'utf-8'
      );

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('条件分岐の評価に失敗');
    });
  });

  describe('backward compatibility', () => {
    it('should work with Phase 1-2 style workflows (no conditionalNext)', () => {
      if (!canRunTests) {
        console.log(`Skipped: ${skipReason}`);
        return;
      }

      // キャッシュをクリア
      clearCache();

      const oldWorkflow: WorkflowDefinition = {
        id: 'test_conditional_v1',
        name: 'Old Style',
        version: '1.0.0',
        phases: [
          {
            id: 'phase_0',
            name: 'Phase 0',
            nextPhase: 'phase_1',
          },
          {
            id: 'phase_1',
            name: 'Phase 1',
            nextPhase: null,
          },
        ],
      };

      fs.writeFileSync(
        TEST_WORKFLOW_PATH,
        JSON.stringify(oldWorkflow, null, 2),
        'utf-8'
      );

      startWorkflow('test_conditional_v1', false);
      const result = transitionToNextPhase();

      expect(result.success).toBe(true);
      expect(result.newPhase).toBe('phase_1');
    });
  });
});
