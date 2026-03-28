/**
 * Intent Pattern Definitions
 *
 * 35+ パターンの正規表現定義
 */

import { IntentType, Pattern } from '../types';

/**
 * Core Workflow パターン
 */
export const WORKFLOW_PATTERNS: Pattern[] = [
  {
    name: 'WORKFLOW_REUSE',
    regex: /(同じ|前回と同じ|さっきと同じ|以前と同じ).*(ワークフロー|手順|方法|やり方|スクリプト)/,
    intent: IntentType.WORKFLOW_REUSE,
    confidence: 95,
    examples: ['同じワークフローで', '前回と同じ手順で', 'さっきと同じやり方で'],
  },
  {
    name: 'SKILL_INVOCATION',
    regex: /([a-z\-]+)スキルを?(使って|使用して|利用して|で)/,
    intent: IntentType.SKILL_INVOCATION,
    confidence: 98,
    examples: ['lp-full-generationスキルを使って', 'taiyo-analyzerスキルで'],
  },
  {
    name: 'EXISTING_FILE_REFERENCE',
    regex: /(既存の|このファイル|そのファイル|([a-zA-Z0-9_\-\.\/]+\.(ts|js|md|json))を?)(編集|修正|変更|更新)/,
    intent: IntentType.EXISTING_FILE_REFERENCE,
    confidence: 90,
    examples: ['既存のファイルを編集', 'app.tsを修正', 'README.mdを更新'],
  },
];

/**
 * File Operation パターン
 */
export const FILE_PATTERNS: Pattern[] = [
  {
    name: 'FILE_CREATE',
    regex: /(新しい|新規|作成|追加).*(ファイル|スクリプト|モジュール)/,
    intent: IntentType.FILE_CREATE,
    confidence: 85,
    examples: ['新しいファイルを作成', '新規スクリプト追加'],
  },
  {
    name: 'FILE_EDIT',
    regex: /(編集|修正|変更|更新).*(ファイル|コード)/,
    intent: IntentType.FILE_EDIT,
    confidence: 80,
    examples: ['ファイルを編集', 'コードを修正'],
  },
  {
    name: 'FILE_DELETE',
    regex: /(削除|消去|取り除く).*(ファイル|コード)/,
    intent: IntentType.FILE_DELETE,
    confidence: 90,
    examples: ['ファイルを削除', '不要なコードを取り除く'],
  },
  {
    name: 'FILE_READ',
    regex: /([a-zA-Z0-9_\-\.\/]+\.(ts|js|tsx|jsx|json|md|txt|yml|yaml|css|scss|html))を?(読んで|確認して|見て|表示して)/,
    intent: IntentType.FILE_READ,
    confidence: 85,
    examples: ['app.tsを読んで', 'README.mdを確認して'],
  },
];

/**
 * Code Operation パターン
 */
export const CODE_PATTERNS: Pattern[] = [
  {
    name: 'CODE_REFACTOR',
    regex: /(リファクタリング|リファクタ|整理|最適化)/,
    intent: IntentType.CODE_REFACTOR,
    confidence: 88,
    examples: ['コードをリファクタリング', '関数を整理'],
  },
  {
    name: 'CODE_REVIEW',
    regex: /(レビュー|チェック|確認|検証).*(コード|実装)/,
    intent: IntentType.CODE_REVIEW,
    confidence: 85,
    examples: ['コードレビュー', '実装をチェック'],
  },
  {
    name: 'CODE_IMPLEMENTATION',
    regex: /(実装|作成|追加).*(機能|関数|メソッド|クラス)/,
    intent: IntentType.CODE_IMPLEMENTATION,
    confidence: 82,
    examples: ['新機能を実装', '関数を作成'],
  },
  {
    name: 'CODE_BUGFIX',
    regex: /((バグ|エラー|問題|不具合).*(修正|直して|fix)|(修正|直して|fix).*(バグ|エラー|問題|不具合))/,
    intent: IntentType.CODE_BUGFIX,
    confidence: 92,
    examples: ['バグを修正', 'エラーを直して', '修正してバグを直す'],
  },
];

/**
 * Testing パターン
 */
export const TEST_PATTERNS: Pattern[] = [
  {
    name: 'TEST_CREATE',
    regex: /(作成|追加|書いて).*(テスト|test)/,
    intent: IntentType.TEST_CREATE,
    confidence: 88,
    examples: ['テストを作成', 'ユニットテストを追加'],
  },
  {
    name: 'TEST_RUN',
    regex: /(実行|run|動かして).*(テスト|test)/,
    intent: IntentType.TEST_RUN,
    confidence: 90,
    examples: ['テストを実行', 'テストを動かして'],
  },
  {
    name: 'TEST_FIX',
    regex: /(修正|直して|fix).*(テスト|test)/,
    intent: IntentType.TEST_FIX,
    confidence: 85,
    examples: ['テストを修正', '失敗しているテストを直して'],
  },
];

/**
 * Documentation パターン
 */
export const DOC_PATTERNS: Pattern[] = [
  {
    name: 'DOC_CREATE',
    regex: /(作成|書いて|追加).*(ドキュメント|README|doc)/,
    intent: IntentType.DOC_CREATE,
    confidence: 85,
    examples: ['ドキュメントを作成', 'READMEを書いて'],
  },
  {
    name: 'DOC_UPDATE',
    regex: /(更新|修正|変更).*(ドキュメント|README|doc)/,
    intent: IntentType.DOC_UPDATE,
    confidence: 83,
    examples: ['ドキュメントを更新', 'READMEを修正'],
  },
];

/**
 * Analysis パターン
 */
export const ANALYSIS_PATTERNS: Pattern[] = [
  {
    name: 'ANALYSIS_CODE',
    regex: /(分析|解析|調査).*(コード|実装)/,
    intent: IntentType.ANALYSIS_CODE,
    confidence: 80,
    examples: ['コードを分析', '実装を調査'],
  },
  {
    name: 'ANALYSIS_PERFORMANCE',
    regex: /(分析|解析|調査).*(パフォーマンス|性能|速度)/,
    intent: IntentType.ANALYSIS_PERFORMANCE,
    confidence: 85,
    examples: ['パフォーマンスを分析', '速度を調査'],
  },
  {
    name: 'ANALYSIS_SECURITY',
    regex: /(分析|解析|調査|チェック).*(セキュリティ|脆弱性|security)/,
    intent: IntentType.ANALYSIS_SECURITY,
    confidence: 88,
    examples: ['セキュリティを分析', '脆弱性をチェック'],
  },
];

/**
 * Project Management パターン
 */
export const PROJECT_PATTERNS: Pattern[] = [
  {
    name: 'PROJECT_SETUP',
    regex: /(セットアップ|初期化|setup|init).*(プロジェクト|環境)/,
    intent: IntentType.PROJECT_SETUP,
    confidence: 90,
    examples: ['プロジェクトをセットアップ', '環境を初期化'],
  },
  {
    name: 'PROJECT_BUILD',
    regex: /(ビルド|build|コンパイル)/,
    intent: IntentType.PROJECT_BUILD,
    confidence: 92,
    examples: ['プロジェクトをビルド', 'ビルドして'],
  },
  {
    name: 'PROJECT_DEPLOY',
    regex: /(デプロイ|deploy|公開)/,
    intent: IntentType.PROJECT_DEPLOY,
    confidence: 95,
    examples: ['本番環境にデプロイ', 'アプリを公開'],
  },
];

/**
 * Search & Navigation パターン
 */
export const SEARCH_PATTERNS: Pattern[] = [
  {
    name: 'SEARCH_CODE',
    regex: /(検索|探して|find).*(コード|関数|クラス)/,
    intent: IntentType.SEARCH_CODE,
    confidence: 78,
    examples: ['コードを検索', '関数を探して'],
  },
  {
    name: 'SEARCH_FILE',
    regex: /(検索|探して|find).*(ファイル|file)/,
    intent: IntentType.SEARCH_FILE,
    confidence: 80,
    examples: ['ファイルを検索', 'config.jsonを探して'],
  },
];

/**
 * Agent & Skills パターン
 */
export const AGENT_PATTERNS: Pattern[] = [
  {
    name: 'AGENT_RUN',
    regex: /(実行|run|動かして).*(エージェント|agent)/,
    intent: IntentType.AGENT_RUN,
    confidence: 88,
    examples: ['plannerエージェントを実行', 'code-reviewerを動かして'],
  },
  {
    name: 'SKILL_EXECUTE',
    regex: /^\/([a-z\-]+)/,
    intent: IntentType.SKILL_EXECUTE,
    confidence: 95,
    examples: ['/lp-full-generation', '/taiyo-analyzer'],
  },
];

/**
 * Misc パターン
 */
export const MISC_PATTERNS: Pattern[] = [
  {
    name: 'QUESTION',
    regex: /(どうやって|どのように|何を|なぜ|why|how|what)\?/,
    intent: IntentType.QUESTION,
    confidence: 70,
    examples: ['どうやって実装する?', 'なぜエラーが出る?'],
  },
  {
    name: 'CONFIRMATION',
    regex: /(はい|yes|ok|承認|許可)/,
    intent: IntentType.CONFIRMATION,
    confidence: 95,
    examples: ['はい', 'OK', '承認します'],
  },
];

/**
 * 全パターンをマージ
 */
export const ALL_PATTERNS: Pattern[] = [
  ...WORKFLOW_PATTERNS,
  ...FILE_PATTERNS,
  ...CODE_PATTERNS,
  ...TEST_PATTERNS,
  ...DOC_PATTERNS,
  ...ANALYSIS_PATTERNS,
  ...PROJECT_PATTERNS,
  ...SEARCH_PATTERNS,
  ...AGENT_PATTERNS,
  ...MISC_PATTERNS,
];

/**
 * パターン数: 35+
 */
export const PATTERN_COUNT = ALL_PATTERNS.length;
