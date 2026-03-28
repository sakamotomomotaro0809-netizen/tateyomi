"use strict";
/**
 * i18n - Internationalization for Issue Logs
 *
 * Provides localized templates for GitHub Issue logs.
 * Default locale is Japanese (ja).
 *
 * Usage:
 *   import { t, getLocale, setLocale } from '../i18n';
 *   const message = t('supervisor.runlog.title', { runId: '123' });
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enTemplates = exports.jaTemplates = exports.createProgressBar = exports.formatSteps = exports.getStatusEmoji = exports.t = exports.setLocale = exports.getLocale = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Default locale is Japanese
let currentLocale = 'ja';
/**
 * Get current locale from environment or config
 */
function getLocale() {
    // Check environment variable first
    const envLocale = process.env.TAISUN_LOCALE;
    if (envLocale === 'en' || envLocale === 'en-US') {
        return 'en';
    }
    if (envLocale === 'ja' || envLocale === 'ja-JP') {
        return 'ja';
    }
    // Try to load from config file
    try {
        const configPath = path.join(process.cwd(), 'config', 'proxy-mcp', 'logging.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.issueLogLocale === 'en' || config.issueLogLocale === 'en-US') {
                return 'en';
            }
        }
    }
    catch {
        // Ignore config errors, use default
    }
    return currentLocale;
}
exports.getLocale = getLocale;
/**
 * Set current locale
 */
function setLocale(locale) {
    currentLocale = locale;
}
exports.setLocale = setLocale;
/**
 * Template strings for Japanese
 */
const jaTemplates = {
    // Supervisor RUNLOG
    'supervisor.runlog.title': '[SUPERVISOR] {runId}',
    'supervisor.runlog.body': `## Supervisor 実行: {runId}

**入力:** {inputPreview}

**開始時刻:** {startedAt}

**ステータス:** {step}

---

このIssueはSupervisorの実行を追跡します。進捗はコメントとして投稿されます。
`,
    // Supervisor Approval
    'supervisor.approval.title': '[承認要求] {runId}',
    'supervisor.approval.body': `## 承認が必要です

**実行ID:** {runId}

**入力:** {inputPreview}

**リスクレベル:** {riskLevel}

**理由:** {reason}

### 計画されたステップ

{stepsText}

---

## 承認方法

1. 上記の計画されたステップを確認してください
2. このIssueに \`承認\` または \`APPROVE\` とコメントしてください
3. または \`approved\` ラベルを追加してください

## 却下方法

\`却下\` または \`REJECT\` とコメントしてください。

---

⚠️ **この操作は明示的な承認なしには実行されません。**
`,
    // Agent Progress
    'agent.progress.title': '🤖 エージェント進捗更新',
    'agent.progress.status.in_progress': '進行中',
    'agent.progress.status.completed': '完了',
    'agent.progress.status.failed': '失敗',
    'agent.progress.body': `## {statusEmoji} **ステータス**: {status}

### 進捗
{progressBar}
**{completed}/{total}** タスク完了

{currentTaskLine}

---
*更新: {timestamp}*
`,
    // PR Creation
    'agent.pr.comment': '🤖 エージェントが{draftText}PRを作成しました: #{prNumber}',
    'agent.pr.draft': 'ドラフト',
    'agent.pr.quality.title': '📊 品質レポート',
    // Observability Report
    'observability.thread.title': '[オブザーバビリティ] 日次/週次レポートスレッド',
    'observability.thread.body': `# オブザーバビリティレポートスレッド

このIssueには自動化された日次・週次のオブザーバビリティレポートが投稿されます。

## レポート
- **日次**: 24時間のメトリクスを毎日投稿
- **週次**: 7日間のトレンドを毎週投稿

## アラートレベル
- 🔴 **CRITICAL**: 即時対応が必要
- 🟡 **WARNING**: 調査を推奨
- ✅ **OK**: 全システム正常

---
_オブザーバビリティシステムによって作成_`,
    'observability.report.body': `## {periodLabel} レポート

**ステータス:** {alertSummary}

<details>
<summary>詳細レポート</summary>

{markdown}

</details>

---
_自動生成: {timestamp}_`,
    // Environment Check
    'env.missing.github_token': `⚠️ GITHUB_TOKEN が未設定です

GitHubとの連携機能を使用するには、GITHUB_TOKENの設定が必要です。

### 設定手順
1. GitHub Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)" をクリック
3. 必要なスコープを選択: repo, workflow
4. トークンを生成してコピー
5. .env ファイルに追加: GITHUB_TOKEN=your_token_here

詳細: docs/getting-started-ja.md#github認証
`,
    'env.missing.gh_cli': `⚠️ GitHub CLI (gh) が見つかりません

GitHub CLIをインストールしてログインしてください。

### インストール
- macOS: brew install gh
- Windows: winget install GitHub.cli
- Linux: https://github.com/cli/cli/releases

### ログイン
gh auth login

詳細: docs/getting-started-ja.md#github-cli導入
`,
    'env.missing.gh_login': `⚠️ GitHub CLI がログインされていません

以下のコマンドでログインしてください:
gh auth login

詳細: docs/getting-started-ja.md#github-cli導入
`,
    'env.missing.node_version': `⚠️ Node.js バージョンが不足しています

現在のバージョン: {current}
必要なバージョン: {required} 以上

### 更新方法
- nvm: nvm install {required} && nvm use {required}
- nodenv: nodenv install {required} && nodenv global {required}
- 直接: https://nodejs.org/ からダウンロード

詳細: docs/getting-started-ja.md#前提条件
`,
};
exports.jaTemplates = jaTemplates;
/**
 * Template strings for English
 */
const enTemplates = {
    // Supervisor RUNLOG
    'supervisor.runlog.title': '[SUPERVISOR] {runId}',
    'supervisor.runlog.body': `## Supervisor Run: {runId}

**Input:** {inputPreview}

**Started:** {startedAt}

**Status:** {step}

---

This issue tracks the supervisor run. Updates will be posted as comments.
`,
    // Supervisor Approval
    'supervisor.approval.title': '[APPROVAL] {runId}',
    'supervisor.approval.body': `## Approval Required

**Run ID:** {runId}

**Input:** {inputPreview}

**Risk Level:** {riskLevel}

**Reason:** {reason}

### Planned Steps

{stepsText}

---

## How to Approve

1. Review the planned steps above
2. Comment \`APPROVE\` on this issue to proceed
3. Or add the \`approved\` label

## How to Reject

Comment \`REJECT\` to abort the operation.

---

⚠️ **This operation will not proceed without explicit approval.**
`,
    // Agent Progress
    'agent.progress.title': '🤖 Agent Progress Update',
    'agent.progress.status.in_progress': 'IN PROGRESS',
    'agent.progress.status.completed': 'COMPLETED',
    'agent.progress.status.failed': 'FAILED',
    'agent.progress.body': `## {statusEmoji} **Status**: {status}

### Progress
{progressBar}
**{completed}/{total}** tasks completed

{currentTaskLine}

---
*Updated: {timestamp}*
`,
    // PR Creation
    'agent.pr.comment': '🤖 Agent has created a {draftText}PR: #{prNumber}',
    'agent.pr.draft': 'draft ',
    'agent.pr.quality.title': '📊 Quality Report',
    // Observability Report
    'observability.thread.title': '[Observability] Daily/Weekly Report Thread',
    'observability.thread.body': `# Observability Report Thread

This issue receives automated daily and weekly observability reports.

## Reports
- **Daily**: Posted every day with 24h metrics
- **Weekly**: Posted every week with 7d trends

## Alert Levels
- 🔴 **CRITICAL**: Immediate action required
- 🟡 **WARNING**: Investigation recommended
- ✅ **OK**: All systems operational

---
_Created by observability system_`,
    'observability.report.body': `## {periodLabel} Report

**Status:** {alertSummary}

<details>
<summary>Full Report</summary>

{markdown}

</details>

---
_Auto-generated at {timestamp}_`,
    // Environment Check
    'env.missing.github_token': `⚠️ GITHUB_TOKEN is not set

GITHUB_TOKEN is required for GitHub integration features.

### Setup
1. GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select required scopes: repo, workflow
4. Generate and copy the token
5. Add to .env file: GITHUB_TOKEN=your_token_here

Details: docs/getting-started-ja.md#github-authentication
`,
    'env.missing.gh_cli': `⚠️ GitHub CLI (gh) not found

Please install GitHub CLI and login.

### Install
- macOS: brew install gh
- Windows: winget install GitHub.cli
- Linux: https://github.com/cli/cli/releases

### Login
gh auth login

Details: docs/getting-started-ja.md#github-cli
`,
    'env.missing.gh_login': `⚠️ GitHub CLI is not logged in

Please login with:
gh auth login

Details: docs/getting-started-ja.md#github-cli
`,
    'env.missing.node_version': `⚠️ Node.js version is insufficient

Current version: {current}
Required version: {required} or higher

### Update
- nvm: nvm install {required} && nvm use {required}
- nodenv: nodenv install {required} && nodenv global {required}
- Direct: Download from https://nodejs.org/

Details: docs/getting-started-ja.md#prerequisites
`,
};
exports.enTemplates = enTemplates;
/**
 * Get template string for current locale
 */
function getTemplate(key) {
    const locale = getLocale();
    const templates = locale === 'ja' ? jaTemplates : enTemplates;
    return templates[key] || key;
}
/**
 * Translate a template key with parameters
 */
function t(key, params = {}) {
    let template = getTemplate(key);
    // Replace placeholders
    for (const [param, value] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
    }
    return template;
}
exports.t = t;
/**
 * Get status emoji for progress
 */
function getStatusEmoji(status) {
    const emojis = {
        in_progress: '🔄',
        completed: '✅',
        failed: '❌',
    };
    return emojis[status] || '❓';
}
exports.getStatusEmoji = getStatusEmoji;
/**
 * Format step list for approval issue
 */
function formatSteps(steps) {
    return steps
        .map((s, i) => `${i + 1}. **${s.action}** (${s.risk} risk)${s.target ? ` - ${s.target}` : ''}`)
        .join('\n');
}
exports.formatSteps = formatSteps;
/**
 * Create progress bar
 */
function createProgressBar(completed, total) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const filled = Math.round(percentage / 5); // 20 blocks
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
}
exports.createProgressBar = createProgressBar;
