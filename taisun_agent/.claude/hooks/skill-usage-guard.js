#!/usr/bin/env node
/**
 * Skill Usage Guard - スキル使用指示の検出と自動マッピング強制
 *
 * UserPromptSubmit 時に実行され、
 * 1. 「〇〇のスキルを使って」という明示的指示を検出
 * 2. タスク種別から必須スキルを自動推定して強制
 *
 * v3.0: skill-mapping.json による自動マッピング機能追加
 *       スキル名を明示しなくても、タスク種別から必須スキルを強制
 *
 * 防止する問題:
 * - スキル使用の指示を無視する
 * - 手動で同等の処理を実装してしまう
 * - 正しいスキルを使わずに古いワークフローを使ってしまう
 */

const fs = require('fs');
const path = require('path');
const stateManager = require('./workflow-state-manager.js');
const { readStdin } = require('./utils/read-stdin');

// スキルマッピング設定ファイルのパス
const SKILL_MAPPING_PATH = path.join(__dirname, 'config', 'skill-mapping.json');

async function main() {
  let input = {};

  try {
    const stdinData = await readStdin();
    if (stdinData) {
      input = JSON.parse(stdinData);
    }
  } catch (e) {
    process.exit(0);
    return;
  }

  const prompt = input.prompt || '';
  const context = [];

  // スキル使用パターンを検出（明示的指示）
  const skillPatterns = [
    /([a-zA-Z0-9_-]+)\s*(?:の)?スキルを使(?:って|用)/gi,
    /(?:use|using)\s+(?:the\s+)?([a-zA-Z0-9_-]+)\s+skill/gi,
    /\/([a-zA-Z0-9_-]+)/g,  // スラッシュコマンド
  ];

  const detectedSkills = [];

  skillPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      detectedSkills.push(match[1]);
    }
  });

  // 「同じワークフロー」パターンを検出
  const sameWorkflowPatterns = [
    /同じ(?:ワークフロー|スクリプト|方法|手順)で/gi,
    /(?:same|identical)\s+(?:workflow|script|method)/gi,
    /前回と同じ/gi,
    /既存の(?:スクリプト|ワークフロー)を/gi,
  ];

  let requiresSameWorkflow = false;
  sameWorkflowPatterns.forEach(pattern => {
    if (pattern.test(prompt)) {
      requiresSameWorkflow = true;
    }
  });

  // ===== 新機能: タスク種別から自動マッピング =====
  const autoMappedSkills = detectAutoMappedSkills(prompt);

  // コンテキストを追加
  const hasExplicitSkills = detectedSkills.length > 0;
  const hasAutoMappedSkills = autoMappedSkills.length > 0;
  const hasAnyRequirement = hasExplicitSkills || hasAutoMappedSkills || requiresSameWorkflow;

  if (hasAnyRequirement) {
    context.push('');
    context.push('=== SKILL USAGE GUARD (v3.0) ===');
    context.push('');

    // 自動マッピングされたスキル（最優先）
    if (hasAutoMappedSkills) {
      context.push('**MANDATORY: タスク種別から必須スキルが自動検出されました**');
      context.push('');
      autoMappedSkills.forEach(mapping => {
        context.push(`【${mapping.name}】`);
        context.push(`  説明: ${mapping.description}`);
        context.push(`  必須スキル: ${mapping.required_skills.join(', ')}`);
        if (mapping.skill_path) {
          context.push(`  スキルパス: ${mapping.skill_path}`);
        }
        if (mapping.strict) {
          context.push(`  **STRICT MODE**: このスキルを使わない実装はブロックされます`);
        }
        context.push('');
      });
      context.push('**WARNING**: 上記スキルを呼び出さずに手動実装することは禁止です。');
      context.push('必ず Skill ツールまたは /スキル名 コマンドを使用してください。');
      context.push('');
    }

    // 明示的に指定されたスキル
    if (hasExplicitSkills) {
      context.push('**MANDATORY: ユーザーが明示的に指定したスキル**');
      context.push('');
      context.push('検出されたスキル:');
      [...new Set(detectedSkills)].forEach(skill => {
        context.push(`  - ${skill}`);
      });
      context.push('');
      context.push('**WARNING**: 上記スキルを呼び出さずに手動実装することは禁止です。');
      context.push('必ず Skill ツールまたは /スキル名 コマンドを使用してください。');
      context.push('');
    }

    if (requiresSameWorkflow) {
      context.push('**CRITICAL: 「同じワークフロー」の指示を検出しました**');
      context.push('');
      context.push('以下の手順を必ず実行してください:');
      context.push('1. 既存のスクリプト/ワークフローファイルを特定する');
      context.push('2. Read ツールでそのファイルの内容を確認する');
      context.push('3. 確認した内容を元に作業を進める');
      context.push('4. 新しいスクリプトを作成する場合は、ユーザーに確認を取る');
      context.push('');
      context.push('**禁止事項**:');
      context.push('- 既存ファイルを確認せずに新しいスクリプトを作成すること');
      context.push('- 「シンプルにする」「最適化する」と称して異なる実装をすること');
      context.push('');
    }

    context.push('=== END SKILL USAGE GUARD ===');
    context.push('');
  }

  // スキル要求を .workflow_state.json に記録
  const allRequiredSkills = [
    ...detectedSkills,
    ...autoMappedSkills.flatMap(m => m.required_skills)
  ];

  if (allRequiredSkills.length > 0 || requiresSameWorkflow) {
    const cwd = input.cwd || process.cwd();
    let state = stateManager.loadState(cwd);

    if (!state) {
      // 状態がない場合は新規作成
      state = stateManager.createInitialState('user_request', true);
    }

    // 要求されたスキルを記録（evidence.required_skills）
    if (!state.evidence.required_skills) {
      state.evidence.required_skills = {};
    }

    allRequiredSkills.forEach(skill => {
      state.evidence.required_skills[skill] = {
        requestedAt: new Date().toISOString(),
        used: false,
        autoMapped: !detectedSkills.includes(skill)
      };
    });

    // 自動マッピング情報を記録
    if (autoMappedSkills.length > 0) {
      state.meta.autoMappedSkills = autoMappedSkills.map(m => ({
        name: m.name,
        required_skills: m.required_skills,
        strict: m.strict
      }));
    }

    // 「同じワークフロー」要求を記録
    if (requiresSameWorkflow) {
      state.meta.requiresSameWorkflow = true;
      state.meta.sameWorkflowRequestedAt = new Date().toISOString();
    }

    stateManager.saveState(state, cwd);
  }

  if (context.length > 0) {
    console.log(context.join('\n'));
  }

  process.exit(0);
}

/**
 * タスク種別からスキルを自動マッピング
 */
function detectAutoMappedSkills(prompt) {
  const mappings = loadSkillMappings();
  if (!mappings || !mappings.mappings) {
    return [];
  }

  const settings = mappings.settings || {};
  const caseInsensitive = settings.case_insensitive !== false;

  const normalizedPrompt = caseInsensitive ? prompt.toUpperCase() : prompt;
  const matched = [];

  for (const mapping of mappings.mappings) {
    const { when_contains_all, when_contains_any, priority } = mapping;

    // when_contains_all: 全てのキーワードが含まれている必要がある
    let allMatch = true;
    if (when_contains_all && when_contains_all.length > 0) {
      for (const keyword of when_contains_all) {
        const normalizedKeyword = caseInsensitive ? keyword.toUpperCase() : keyword;
        if (!normalizedPrompt.includes(normalizedKeyword)) {
          allMatch = false;
          break;
        }
      }
    }

    if (!allMatch) continue;

    // when_contains_any: いずれかのキーワードが含まれている必要がある
    let anyMatch = false;
    if (!when_contains_any || when_contains_any.length === 0) {
      anyMatch = true; // anyが指定されていなければOK
    } else {
      for (const keyword of when_contains_any) {
        const normalizedKeyword = caseInsensitive ? keyword.toUpperCase() : keyword;
        if (normalizedPrompt.includes(normalizedKeyword)) {
          anyMatch = true;
          break;
        }
      }
    }

    if (allMatch && anyMatch) {
      matched.push({ ...mapping, matchedPriority: priority || 0 });
    }
  }

  // 優先度でソート（高い順）
  matched.sort((a, b) => (b.matchedPriority || 0) - (a.matchedPriority || 0));

  return matched;
}

/**
 * スキルマッピング設定を読み込む
 */
function loadSkillMappings() {
  try {
    if (fs.existsSync(SKILL_MAPPING_PATH)) {
      const content = fs.readFileSync(SKILL_MAPPING_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error(`Warning: Failed to load skill mappings: ${e.message}`);
  }
  return null;
}

main().catch(() => process.exit(0));
