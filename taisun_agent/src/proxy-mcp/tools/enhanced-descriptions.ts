/**
 * Enhanced Tool Descriptions
 *
 * Based on Anthropic's SWE-bench best practices:
 * "Tool specifications should emphasize descriptions over input schemas"
 *
 * Each tool description includes:
 * - Purpose and use cases
 * - Requirements and constraints
 * - Common mistakes to avoid
 * - Examples of correct usage
 *
 * @see https://www.anthropic.com/engineering/swe-bench-sonnet
 */

export interface EnhancedToolDescription {
  name: string;
  description: string;
  requirements: string[];
  commonMistakes: string[];
  examples: {
    correct: string[];
    incorrect: string[];
  };
}

/**
 * Enhanced descriptions for core file operations
 */
export const FILE_TOOLS: EnhancedToolDescription[] = [
  {
    name: 'file_read',
    description: `Read file contents from the filesystem.

PURPOSE:
- Read source code files for analysis
- Examine configuration files
- Review existing implementations before modifications

REQUIREMENTS:
- Path MUST be absolute (starts with /)
- File must exist (returns error otherwise)
- Binary files return base64 encoded content
- Maximum file size: 10MB

BEHAVIOR:
- Returns file content as string
- Includes line numbers in output
- Handles UTF-8 encoding by default`,
    requirements: [
      'Path must be absolute (e.g., /Users/project/src/file.ts)',
      'File must exist and be readable',
      'File size must be under 10MB',
    ],
    commonMistakes: [
      'Using relative paths like ./src/file.ts or src/file.ts',
      'Reading directories instead of files (use list_directory)',
      'Not checking if file exists before reading',
    ],
    examples: {
      correct: [
        '/Users/project/src/index.ts',
        '/home/user/app/config/settings.json',
        '/var/log/app.log',
      ],
      incorrect: [
        'src/index.ts (relative path)',
        './config.json (relative with ./)',
        '../parent/file.ts (path traversal)',
      ],
    },
  },
  {
    name: 'file_write',
    description: `Write content to a file, creating it if it doesn't exist.

PURPOSE:
- Create new source files
- Generate configuration files
- Write test files
- Create documentation

REQUIREMENTS:
- Path MUST be absolute (starts with /)
- Parent directory must exist
- Will overwrite existing files without warning
- Content must be valid UTF-8 string

BEHAVIOR:
- Creates file if it doesn't exist
- Overwrites existing file completely
- Creates with default permissions (644)
- Does NOT create parent directories automatically`,
    requirements: [
      'Path must be absolute',
      'Parent directory must exist',
      'Content must be UTF-8 encoded',
    ],
    commonMistakes: [
      'Using relative paths',
      'Assuming parent directories will be created',
      'Not backing up existing files before overwrite',
      'Writing binary content as string',
    ],
    examples: {
      correct: [
        '/Users/project/src/new-component.tsx',
        '/home/user/app/tests/unit/auth.test.ts',
      ],
      incorrect: [
        'src/new-file.ts (relative)',
        '/nonexistent/parent/file.ts (parent does not exist)',
      ],
    },
  },
  {
    name: 'file_edit',
    description: `Edit a file by replacing specific text with new content.

PURPOSE:
- Modify existing code without rewriting entire files
- Fix bugs in specific locations
- Update function implementations
- Add imports or exports

REQUIREMENTS:
- Path MUST be absolute
- File must exist
- old_string must exactly match content in file (including whitespace)
- old_string must be unique in file (or use replace_all for multiple)

BEHAVIOR:
- Finds exact match of old_string in file
- Replaces with new_string
- Preserves file encoding and line endings
- Fails if old_string not found or not unique

IMPORTANT:
- Preserve exact indentation (tabs/spaces)
- Include enough context for unique match
- Do not include line numbers in old_string`,
    requirements: [
      'Path must be absolute',
      'File must exist',
      'old_string must exactly match (including whitespace)',
      'old_string must be unique or use replace_all',
    ],
    commonMistakes: [
      'Using relative paths',
      'Including line numbers in old_string',
      'Not preserving exact indentation',
      'old_string too short (matches multiple locations)',
      'old_string includes invisible characters',
    ],
    examples: {
      correct: [
        'old_string: "function add(a, b) {\\n  return a + b;\\n}"',
        'new_string: "function add(a: number, b: number): number {\\n  return a + b;\\n}"',
      ],
      incorrect: [
        'old_string: "123: function add" (includes line number)',
        'old_string: "return" (too generic, matches multiple)',
      ],
    },
  },
];

/**
 * Enhanced descriptions for search operations
 */
export const SEARCH_TOOLS: EnhancedToolDescription[] = [
  {
    name: 'grep',
    description: `Search for patterns in files using regular expressions.

PURPOSE:
- Find function/class definitions
- Locate usages of variables or imports
- Search for TODO/FIXME comments
- Find error handling patterns

REQUIREMENTS:
- Pattern is a regular expression (ripgrep syntax)
- Path is optional (defaults to current directory)
- Use glob to filter file types

OUTPUT MODES:
- files_with_matches: Returns list of matching files (default)
- content: Returns matching lines with context
- count: Returns match count per file

REGEX TIPS:
- Escape special chars: \\. \\( \\) \\[ \\]
- Word boundary: \\b
- Case insensitive: use -i flag`,
    requirements: [
      'Pattern must be valid regex',
      'Escape special characters properly',
      'Use appropriate output_mode for your needs',
    ],
    commonMistakes: [
      'Not escaping special characters (. matches any char)',
      'Searching too broad (no glob filter)',
      'Using content mode for large codebases (slow)',
      'Forgetting multiline mode for cross-line patterns',
    ],
    examples: {
      correct: [
        'pattern: "class\\s+User" (find class definitions)',
        'pattern: "import.*from.*react" (find React imports)',
        'pattern: "TODO|FIXME" (find todos)',
      ],
      incorrect: [
        'pattern: "function()" (unescaped parens)',
        'pattern: "." (matches everything)',
      ],
    },
  },
  {
    name: 'glob',
    description: `Find files matching a pattern.

PURPOSE:
- List all files of a specific type
- Find files by naming convention
- Locate configuration files
- Discover test files

REQUIREMENTS:
- Pattern uses glob syntax (not regex)
- ** matches any directory depth
- * matches any characters in filename

COMMON PATTERNS:
- **/*.ts: All TypeScript files
- src/**/*.test.ts: All test files in src
- **/package.json: All package.json files
- **/*.{ts,tsx}: TypeScript and TSX files`,
    requirements: [
      'Use glob syntax (not regex)',
      '** for recursive directory matching',
      '* for filename wildcards',
    ],
    commonMistakes: [
      'Using regex syntax instead of glob',
      'Forgetting ** for recursive search',
      'Too specific pattern missing files',
    ],
    examples: {
      correct: [
        'src/**/*.ts (all TS files in src)',
        '**/test/*.test.ts (test files)',
        '**/*.{js,ts} (JS and TS files)',
      ],
      incorrect: [
        'src/*.ts (only top-level, not recursive)',
        '.*\\.ts$ (regex, not glob)',
      ],
    },
  },
];

/**
 * Enhanced descriptions for shell operations
 */
export const SHELL_TOOLS: EnhancedToolDescription[] = [
  {
    name: 'bash',
    description: `Execute shell commands in a persistent bash session.

PURPOSE:
- Run build commands (npm, yarn, make)
- Execute tests (jest, pytest)
- Git operations (status, diff, commit)
- Package management (npm install)

REQUIREMENTS:
- Command must be a single string
- Use && for sequential commands
- Quote paths with spaces
- Avoid interactive commands (-i flags)

RESTRICTIONS:
- No sudo by default
- Timeout: 2 minutes (configurable)
- Output truncated at 30000 chars

BEST PRACTICES:
- Check command availability first
- Use absolute paths when possible
- Capture errors with 2>&1
- Use --json for parseable output`,
    requirements: [
      'Non-interactive commands only',
      'Quote paths with spaces',
      'Use && for sequential commands',
    ],
    commonMistakes: [
      'Using interactive commands (git add -i)',
      'Forgetting to quote paths with spaces',
      'Running long commands without timeout',
      'Not checking command exit status',
    ],
    examples: {
      correct: [
        'npm test -- --coverage',
        'git status && git diff',
        'cd "/path with spaces" && ls',
      ],
      incorrect: [
        'git add -i (interactive)',
        'npm install & npm test (background, not sequential)',
        'cd /path with spaces (unquoted)',
      ],
    },
  },
];

/**
 * Enhanced descriptions for agent operations
 */
export const AGENT_TOOLS: EnhancedToolDescription[] = [
  {
    name: 'task',
    description: `Launch a specialized agent to handle complex tasks.

PURPOSE:
- Delegate to domain experts (backend, frontend, security)
- Parallelize independent tasks
- Handle multi-step workflows
- Quality assurance via specialized agents

REQUIREMENTS:
- subagent_type must be valid agent name
- prompt should be detailed and specific
- Include all necessary context in prompt

AGENT TYPES:
- backend-developer: API, database, business logic
- frontend-developer: UI, React, styling
- code-reviewer: Quality analysis
- security-scanner: Vulnerability detection
- test-generator: Test creation

EXECUTION:
- Agents run autonomously
- Results returned as single message
- Can run multiple agents in parallel`,
    requirements: [
      'Valid subagent_type',
      'Detailed prompt with context',
      'Clear success criteria',
    ],
    commonMistakes: [
      'Too vague prompt',
      'Missing context (files, requirements)',
      'Wrong agent type for task',
      'Launching dependent tasks in parallel',
    ],
    examples: {
      correct: [
        'subagent_type: backend-developer, prompt: "Implement REST API for user authentication with JWT"',
        'subagent_type: code-reviewer, prompt: "Review src/auth/*.ts for security issues"',
      ],
      incorrect: [
        'prompt: "Fix it" (too vague)',
        'subagent_type: backend-developer for UI work',
      ],
    },
  },
];

/**
 * Get enhanced description for a tool
 */
export function getEnhancedDescription(toolName: string): EnhancedToolDescription | undefined {
  const allTools = [...FILE_TOOLS, ...SEARCH_TOOLS, ...SHELL_TOOLS, ...AGENT_TOOLS];
  return allTools.find(t => t.name === toolName);
}

/**
 * Format enhanced description for display
 */
export function formatToolDescription(tool: EnhancedToolDescription): string {
  let output = `${tool.description}\n\n`;

  output += `REQUIREMENTS:\n`;
  tool.requirements.forEach(req => {
    output += `- ${req}\n`;
  });

  output += `\nCOMMON MISTAKES:\n`;
  tool.commonMistakes.forEach(mistake => {
    output += `- ${mistake}\n`;
  });

  output += `\nEXAMPLES:\n`;
  output += `Correct:\n`;
  tool.examples.correct.forEach(ex => {
    output += `  ✓ ${ex}\n`;
  });
  output += `Incorrect:\n`;
  tool.examples.incorrect.forEach(ex => {
    output += `  ✗ ${ex}\n`;
  });

  return output;
}

/**
 * Export all enhanced descriptions
 */
export const ALL_ENHANCED_DESCRIPTIONS: EnhancedToolDescription[] = [
  ...FILE_TOOLS,
  ...SEARCH_TOOLS,
  ...SHELL_TOOLS,
  ...AGENT_TOOLS,
];
