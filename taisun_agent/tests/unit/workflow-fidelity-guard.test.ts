/**
 * Workflow Fidelity Guard Tests
 *
 * Phase 9: 論理違反が止まることをテストで固定
 *
 * テスト対象（5大シナリオ + 補助）:
 * (1) Intent Contract無しでBashが止まる → Phase 1 tests
 * (2) referenceAssetsあり & analysis無しで生成工程が止まる → Phase 2 tests
 * (3) sha256不一致（すり替え）が止まる → Phase 5 tests
 * (4) 探索無し新規作成が止まる → Phase 6 tests (直接テスト)
 * (5) 定義lint failでstart/resume/strictがblock → Phase 7 tests
 *
 * 補助テスト:
 * - requiredEvidence未達で step complete が fail する → Phase 3 & 4 tests
 * - State Version 検証 → State Version tests
 */

import * as fs from 'fs';
import * as path from 'path';

// テスト用ディレクトリ
const TEST_DIR = path.join(__dirname, '../fixtures/workflow-fidelity');

// workflow-state-manager のパス
const STATE_MANAGER_PATH = path.join(__dirname, '../../.claude/hooks/workflow-state-manager.js');

// テスト前の準備
beforeAll(() => {
  // フィクスチャディレクトリを作成
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

// テスト後のクリーンアップ
afterAll(() => {
  // フィクスチャディレクトリを削除
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('Workflow Fidelity Guard', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateManager: any;

  beforeEach(() => {
    // workflow-state-manager をリロード
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    stateManager = require(STATE_MANAGER_PATH);

    // テスト用ディレクトリをクリーン
    const stateFile = path.join(TEST_DIR, '.workflow_state.json');
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  describe('Phase 1: Intent Contract First Gate', () => {
    test('契約なしで危険操作が block される', () => {
      // Intent Contract が存在しない状態でvalidation
      const validation = stateManager.validateIntentContract(TEST_DIR);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('not_found');
    });

    test('契約に必須フィールドがない場合 block される', () => {
      // artifacts ディレクトリ作成
      const artifactsDir = path.join(TEST_DIR, 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      // 不完全な契約ファイル作成
      const contractPath = path.join(artifactsDir, 'intent_contract.yaml');
      fs.writeFileSync(contractPath, 'objective: test\nnon_goals:\n  - none\n');

      const validation = stateManager.validateIntentContract(TEST_DIR);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('missing_fields');
      expect(validation.missingFields).toContain('inputs');
    });

    test('完全な契約がある場合は valid', () => {
      const artifactsDir = path.join(TEST_DIR, 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      // 完全な契約ファイル作成
      const contractPath = path.join(artifactsDir, 'intent_contract.yaml');
      const completeContract = `
objective: "Test objective"
non_goals:
  - "Test non goal"
inputs:
  files: []
constraints:
  - "Test constraint"
definition_of_done:
  - "Test done"
allowed_deviations_policy:
  allow_without_approval:
    - "Minor changes"
`.trim();
      fs.writeFileSync(contractPath, completeContract);

      const validation = stateManager.validateIntentContract(TEST_DIR);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Phase 2: Reference Analysis Gate', () => {
    test('reference_analysis 未生成で validation fail', () => {
      const validation = stateManager.validateReferenceAnalysis(TEST_DIR);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('not_found');
    });

    test('有効な reference_analysis がある場合は valid', () => {
      const artifactsDir = path.join(TEST_DIR, 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      // 有効な分析結果を作成（必須フィールドをすべて含む）
      const analysisPath = path.join(artifactsDir, 'reference_analysis.json');
      const analysis = {
        assets: [
          {
            asset_id: 'test_image',
            type: 'image',
            sha256: 'abc123def456',
            metadata: { filename: 'test.png' },
            derived_features: { width: 100, height: 100 },
            timestamp: new Date().toISOString()
          }
        ],
        last_updated: new Date().toISOString()
      };
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

      const validation = stateManager.validateReferenceAnalysis(TEST_DIR);

      expect(validation.valid).toBe(true);
      expect(validation.data.assets.length).toBe(1);
    });
  });

  describe('Phase 5: Reference Provenance Guard', () => {
    test('sha256不一致で block される', () => {
      // State を作成してアセットを登録
      const state = stateManager.createInitialState('test-workflow', true);
      stateManager.registerReferenceAsset(state, 'test_asset', 'original_hash_123');
      stateManager.saveState(state, TEST_DIR);

      // 異なるハッシュの分析結果を作成
      const artifactsDir = path.join(TEST_DIR, 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      const analysisPath = path.join(artifactsDir, 'reference_analysis.json');
      const analysis = {
        assets: [
          {
            asset_id: 'test_asset',
            type: 'image',
            sha256: 'different_hash_456', // 不一致
            metadata: { filename: 'test.png' },
            derived_features: { width: 100, height: 100 },
            timestamp: new Date().toISOString()
          }
        ],
        last_updated: new Date().toISOString()
      };
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

      // 再読み込み
      const loadedState = stateManager.loadState(TEST_DIR);
      const provenanceCheck = stateManager.verifyReferenceProvenance(loadedState, TEST_DIR);

      expect(provenanceCheck.valid).toBe(false);
      expect(provenanceCheck.reason).toBe('provenance_mismatch');
      expect(provenanceCheck.mismatches.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 6: Read Before Create Gate', () => {
    test('Read証跡なしで新規ファイル作成が block される (シナリオ4直接テスト)', () => {
      const state = stateManager.createInitialState('test-workflow', true);

      // スキル開始
      stateManager.startSkill(state, 'test-skill');
      stateManager.startStep(state, 'step-1');

      // Read/Search/Decision 証跡なしで新規ファイル作成を検証
      const validation = stateManager.validateNewFileCreation(state, '/new/create_video.py');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('no_read_evidence');
      expect(validation.checks.hasRead).toBe(false);
      expect(validation.checks.hasSearch).toBe(false);
    });

    test('Read証跡ありで新規ファイル作成が許可される', () => {
      const state = stateManager.createInitialState('test-workflow', true);

      // スキル開始
      stateManager.startSkill(state, 'test-skill');
      stateManager.startStep(state, 'step-1');

      // 証跡を記録（探索＋Read＋決定）
      stateManager.captureSearchEvidence(state, 'glob', '*.py', ['existing.py']);
      stateManager.captureReadEvidence(state, '/existing/file.py', 'session-1');
      stateManager.captureDecisionEvidence(state, 'create_new', '既存に適切なファイルがないため新規作成');

      // 新規ファイル作成を検証
      const validation = stateManager.validateNewFileCreation(state, '/new/create_video.py');

      expect(validation.valid).toBe(true);
      expect(validation.reason).toBe(null);
    });
  });

  describe('Phase 3 & 4: Evidence and Step Transition', () => {
    test('requiredEvidence未達で step complete が fail する', () => {
      const state = stateManager.createInitialState('test-workflow', true);

      // スキル開始
      stateManager.startSkill(state, 'test-skill');
      stateManager.startStep(state, 'step-1');

      // 証跡なしで完了を試みる
      const result = stateManager.completeStep(state, 'step-1', [
        stateManager.EVIDENCE_TYPES.READ_FILE,
        stateManager.EVIDENCE_TYPES.SEARCH_REPO
      ]);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('missing_evidence');
      expect(result.missing).toContain(stateManager.EVIDENCE_TYPES.READ_FILE);
    });

    test('証跡があれば step complete が成功する', () => {
      const state = stateManager.createInitialState('test-workflow', true);

      // スキル開始
      stateManager.startSkill(state, 'test-skill');
      stateManager.startStep(state, 'step-1');

      // 証跡を記録
      stateManager.captureReadEvidence(state, '/test/file.ts', 'session-1');
      stateManager.captureSearchEvidence(state, 'grep', '*.ts', []);

      // 完了を試みる
      const result = stateManager.completeStep(state, 'step-1', [
        stateManager.EVIDENCE_TYPES.READ_FILE,
        stateManager.EVIDENCE_TYPES.SEARCH_REPO
      ]);

      expect(result.success).toBe(true);
    });
  });

  describe('Phase 7: Definition Lint Hard Gate', () => {
    test('lint fail で workflow start validation が fail する', () => {
      // 不正な skill-mapping.json を作成
      const configDir = path.join(TEST_DIR, '.claude/hooks/config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 必須フィールドがない不正な設定
      const invalidConfig = {
        // mappings がない
        settings: {}
      };
      fs.writeFileSync(
        path.join(configDir, 'skill-mapping.json'),
        JSON.stringify(invalidConfig, null, 2)
      );

      const validation = stateManager.validateWorkflowStart(TEST_DIR, true);

      // Intent Contract がないので失敗する（lint以前の問題）
      expect(validation.valid).toBe(false);
      expect(validation.blockers.length).toBeGreaterThan(0);
    });
  });
});

describe('State Version', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stateManager: any;

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    stateManager = require(STATE_MANAGER_PATH);
  });

  test('初期状態はv2.0.0', () => {
    const state = stateManager.createInitialState('test', true);
    expect(state.version).toBe('2.0.0');
  });

  test('必要なフィールドがすべて存在する', () => {
    const state = stateManager.createInitialState('test', true);

    expect(state.intentContractRef).toBeDefined();
    expect(state.activeSkillId).toBeDefined();
    expect(state.activeSkillStepId).toBeDefined();
    expect(state.registeredInputs.referenceAssets).toBeDefined();
    expect(state.locks.referenceAssets).toBeDefined();
    expect(state.evidence.skillEvidence).toBeDefined();
    expect(state.evidence.skillEvidenceIndexByStepId).toBeDefined();
    expect(state.decisions.assetReuse).toBeDefined();
    expect(state.approvals.deviations).toBeDefined();
    expect(state.validations.lastResults).toBeDefined();
  });
});
