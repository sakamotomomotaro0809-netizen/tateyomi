/**
 * Step 2: Project Information
 *
 * Collects basic project information:
 * - Project name
 * - Description
 * - Author email
 */

import { validateProjectName, validateEmail } from '../../validators';

export interface ProjectInfo {
  projectName: string;
  description: string;
  author: string;
}

export interface ProjectInfoPrompt {
  type: 'input';
  name: string;
  message: string;
  validate?: (input: string) => boolean | string;
  default?: string;
}

/**
 * Get project info prompts
 */
export function getProjectInfoPrompts(): ProjectInfoPrompt[] {
  return [
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (kebab-case):',
      validate: (input: string) => {
        const result = validateProjectName(input);
        return result.valid ? true : result.error || 'Invalid project name';
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A new project'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author email:',
      validate: (input: string) => {
        const result = validateEmail(input);
        return result.valid ? true : result.error || 'Invalid email';
      }
    }
  ];
}

/**
 * Validate project info
 */
export function validateProjectInfo(info: Partial<ProjectInfo>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!info.projectName) {
    errors.push('Project name is required');
  } else {
    const nameValidation = validateProjectName(info.projectName);
    if (!nameValidation.valid) {
      errors.push(nameValidation.error || 'Invalid project name');
    }
  }

  if (!info.author) {
    errors.push('Author email is required');
  } else {
    const emailValidation = validateEmail(info.author);
    if (!emailValidation.valid) {
      errors.push(emailValidation.error || 'Invalid email');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
