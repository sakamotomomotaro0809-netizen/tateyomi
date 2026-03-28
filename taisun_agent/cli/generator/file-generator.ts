/**
 * File generator
 *
 * Generates project files based on templates and configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { TemplateRenderer } from './template-renderer';

export interface GeneratorConfig {
  projectName: string;
  description: string;
  author: string;
  framework: any;
  features: any[];
  apiKeys: Record<string, boolean>;
  outputDir: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  success: boolean;
  error?: string;
}

/**
 * File generator class
 */
export class FileGenerator {
  private renderer: TemplateRenderer;
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.renderer = new TemplateRenderer();
    this.templatesDir = templatesDir || path.join(__dirname, '../templates');
  }

  /**
   * Generate all project files
   *
   * @param config - Generator configuration
   * @returns Array of generated files with status
   */
  async generateAll(config: GeneratorConfig): Promise<GeneratedFile[]> {
    const results: GeneratedFile[] = [];

    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Prepare template context
    const context = this.buildContext(config);

    // Generate package.json (for JS/TS projects)
    if (config.framework.language === 'typescript' || config.framework.language === 'javascript') {
      results.push(await this.generateFile('package.json.hbs', 'package.json', context, config.outputDir));
    }

    // Generate tsconfig.json (for TS projects)
    if (config.framework.language === 'typescript') {
      results.push(await this.generateFile('tsconfig.json.hbs', 'tsconfig.json', context, config.outputDir));
    }

    // Generate .env.example
    results.push(await this.generateFile('env.example.hbs', '.env.example', context, config.outputDir));

    // Generate source file
    if (config.framework.language === 'typescript') {
      const srcDir = path.join(config.outputDir, 'src');
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }
      results.push(await this.generateFile('src/index.ts.hbs', 'src/index.ts', context, config.outputDir));
    }

    // Generate .gitignore
    results.push(this.generateGitignore(config));

    // Generate README.md
    results.push(this.generateReadme(config));

    // Generate .clauderc.json
    results.push(this.generateClauderc(config));

    return results;
  }

  /**
   * Generate a single file from template
   */
  private async generateFile(
    templateName: string,
    outputName: string,
    context: Record<string, any>,
    outputDir: string
  ): Promise<GeneratedFile> {
    try {
      const templatePath = path.join(this.templatesDir, templateName);
      const outputPath = path.join(outputDir, outputName);

      // Ensure output directory exists
      const outputDirPath = path.dirname(outputPath);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      // Render template
      const content = this.renderer.render(templatePath, context);

      // Write file
      fs.writeFileSync(outputPath, content, 'utf8');

      return {
        path: outputPath,
        content,
        success: true
      };
    } catch (error: any) {
      return {
        path: path.join(outputDir, outputName),
        content: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build template context from config
   */
  private buildContext(config: GeneratorConfig): Record<string, any> {
    // Merge dependencies from framework and features
    const dependencies: Record<string, string> = {
      ...config.framework.dependencies
    };

    const devDependencies: Record<string, string> = {
      ...config.framework.devDependencies
    };

    const scripts: Record<string, string> = {
      ...config.framework.scripts
    };

    // Add feature dependencies
    for (const feature of config.features) {
      Object.assign(dependencies, feature.dependencies || {});
      Object.assign(devDependencies, feature.devDependencies || {});
      Object.assign(scripts, feature.scripts || {});
    }

    return {
      projectName: config.projectName,
      description: config.description,
      author: config.author,
      framework: config.framework,
      typescript: config.framework.language === 'typescript',
      dependencies,
      devDependencies,
      scripts,
      apiKeys: config.apiKeys,
      port: 3000,
      engines: {
        node: '>=18.0.0'
      }
    };
  }

  /**
   * Generate .gitignore file
   */
  private generateGitignore(config: GeneratorConfig): GeneratedFile {
    const lines = [
      '# Dependencies',
      'node_modules/',
      'venv/',
      '__pycache__/',
      '*.pyc',
      '',
      '# Build output',
      'dist/',
      'build/',
      '.next/',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '',
      '# IDE',
      '.vscode/',
      '.idea/',
      '*.swp',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
      '',
      '# Logs',
      'logs/',
      '*.log',
      'npm-debug.log*',
      '',
      '# Testing',
      'coverage/',
      '.pytest_cache/'
    ];

    const content = lines.join('\n');
    const outputPath = path.join(config.outputDir, '.gitignore');

    try {
      fs.writeFileSync(outputPath, content, 'utf8');
      return { path: outputPath, content, success: true };
    } catch (error: any) {
      return { path: outputPath, content: '', success: false, error: error.message };
    }
  }

  /**
   * Generate README.md file
   */
  private generateReadme(config: GeneratorConfig): GeneratedFile {
    const lines = [
      `# ${config.projectName}`,
      '',
      config.description,
      '',
      '## Setup',
      '',
      '```bash',
      '# Install dependencies',
      config.framework.language === 'python' ? 'pip install -r requirements.txt' : 'npm install',
      '',
      '# Copy environment variables',
      'cp .env.example .env',
      '',
      '# Start development server',
      config.framework.language === 'python' ? 'python src/main.py' : 'npm run dev',
      '```',
      '',
      '## Features',
      '',
      `- Framework: ${config.framework.name}`,
      `- Language: ${config.framework.language}`,
      ...config.features.map(f => `- ${f.name}`),
      '',
      '## License',
      '',
      'MIT'
    ];

    const content = lines.join('\n');
    const outputPath = path.join(config.outputDir, 'README.md');

    try {
      fs.writeFileSync(outputPath, content, 'utf8');
      return { path: outputPath, content, success: true };
    } catch (error: any) {
      return { path: outputPath, content: '', success: false, error: error.message };
    }
  }

  /**
   * Generate .clauderc.json file
   */
  private generateClauderc(config: GeneratorConfig): GeneratedFile {
    const clauderc = {
      name: config.projectName,
      description: config.description,
      framework: config.framework.id,
      features: config.features.map(f => f.id),
      createdBy: 'taisun-cli',
      createdAt: new Date().toISOString()
    };

    const content = JSON.stringify(clauderc, null, 2);
    const outputPath = path.join(config.outputDir, '.clauderc.json');

    try {
      fs.writeFileSync(outputPath, content, 'utf8');
      return { path: outputPath, content, success: true };
    } catch (error: any) {
      return { path: outputPath, content: '', success: false, error: error.message };
    }
  }
}
