/**
 * Entity Extractor
 *
 * テキストからエンティティ（スキル名、ファイルパス等）を抽出
 */

import { Entity, Token } from '../types';
import { getTokenizer } from './tokenizer';

/**
 * Entity Extractor クラス
 */
export class EntityExtractor {
  /**
   * スキル名を抽出
   *
   * @param text - 入力テキスト
   * @returns スキル名エンティティ配列
   */
  async extractSkills(text: string): Promise<Entity[]> {
    const skillPattern = /([a-z\-]+)(スキル|skill)/gi;
    const entities: Entity[] = [];
    let match: RegExpExecArray | null;

    while ((match = skillPattern.exec(text)) !== null) {
      entities.push({
        type: 'skill',
        value: match[1],
        confidence: 90,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    // / で始まるスキル呼び出しも検出
    const slashPattern = /\/([a-z\-]+)/gi;
    let slashMatch: RegExpExecArray | null;

    while ((slashMatch = slashPattern.exec(text)) !== null) {
      entities.push({
        type: 'skill',
        value: slashMatch[1],
        confidence: 95,
        position: {
          start: slashMatch.index,
          end: slashMatch.index + slashMatch[0].length,
        },
      });
    }

    return entities;
  }

  /**
   * ファイルパスを抽出
   *
   * @param text - 入力テキスト
   * @returns ファイルパスエンティティ配列
   */
  extractFilePaths(text: string): Entity[] {
    const filePattern = /([a-zA-Z0-9_\-\.\/]+\.(ts|js|tsx|jsx|json|md|txt|yml|yaml|css|scss|html))/gi;
    const entities: Entity[] = [];
    let match: RegExpExecArray | null;

    while ((match = filePattern.exec(text)) !== null) {
      entities.push({
        type: 'file',
        value: match[1],
        confidence: 85,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    return entities;
  }

  /**
   * アクション（動詞）を抽出
   *
   * @param text - 入力テキスト
   * @returns アクションエンティティ配列
   */
  async extractActions(text: string): Promise<Entity[]> {
    const tokenizer = getTokenizer();
    const verbs = await tokenizer.extractVerbs(text);

    return verbs.map((token, index) => ({
      type: 'action',
      value: token.base || token.surface,
      confidence: 75,
      position: {
        start: index * 10, // 仮の位置
        end: (index + 1) * 10,
      },
    }));
  }

  /**
   * ターゲット（名詞）を抽出
   *
   * @param text - 入力テキスト
   * @returns ターゲットエンティティ配列
   */
  async extractTargets(text: string): Promise<Entity[]> {
    const tokenizer = getTokenizer();
    const nouns = await tokenizer.extractNouns(text);

    return nouns.map((token, index) => ({
      type: 'target',
      value: token.base || token.surface,
      confidence: 70,
      position: {
        start: index * 10, // 仮の位置
        end: (index + 1) * 10,
      },
    }));
  }

  /**
   * 数値を抽出
   *
   * @param text - 入力テキスト
   * @returns 数値エンティティ配列
   */
  extractNumbers(text: string): Entity[] {
    const numberPattern = /\d+(\.\d+)?/g;
    const entities: Entity[] = [];
    let match: RegExpExecArray | null;

    while ((match = numberPattern.exec(text)) !== null) {
      entities.push({
        type: 'number',
        value: match[0],
        confidence: 95,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    return entities;
  }

  /**
   * URL を抽出
   *
   * @param text - 入力テキスト
   * @returns URL エンティティ配列
   */
  extractUrls(text: string): Entity[] {
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const entities: Entity[] = [];
    let match: RegExpExecArray | null;

    while ((match = urlPattern.exec(text)) !== null) {
      entities.push({
        type: 'url',
        value: match[1],
        confidence: 98,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    return entities;
  }

  /**
   * すべてのエンティティを抽出
   *
   * @param text - 入力テキスト
   * @returns 全エンティティ配列
   */
  async extractAll(text: string): Promise<Entity[]> {
    const [skills, files, actions, targets, numbers, urls] = await Promise.all([
      this.extractSkills(text),
      Promise.resolve(this.extractFilePaths(text)),
      this.extractActions(text),
      this.extractTargets(text),
      Promise.resolve(this.extractNumbers(text)),
      Promise.resolve(this.extractUrls(text)),
    ]);

    return [...skills, ...files, ...actions, ...targets, ...numbers, ...urls].sort(
      (a, b) => b.confidence - a.confidence
    );
  }

  /**
   * エンティティタイプでフィルタ
   *
   * @param entities - エンティティ配列
   * @param type - エンティティタイプ
   * @returns フィルタされたエンティティ配列
   */
  filterByType(entities: Entity[], type: string): Entity[] {
    return entities.filter((e) => e.type === type);
  }

  /**
   * 信頼度でフィルタ
   *
   * @param entities - エンティティ配列
   * @param threshold - 信頼度しきい値
   * @returns フィルタされたエンティティ配列
   */
  filterByConfidence(entities: Entity[], threshold: number): Entity[] {
    return entities.filter((e) => e.confidence >= threshold);
  }

  /**
   * 重複を除去
   *
   * @param entities - エンティティ配列
   * @returns 重複除去されたエンティティ配列
   */
  deduplicateEntities(entities: Entity[]): Entity[] {
    const seen = new Set<string>();
    return entities.filter((entity) => {
      const key = `${entity.type}:${entity.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

/**
 * シングルトンインスタンス
 */
let extractorInstance: EntityExtractor | null = null;

/**
 * Entity Extractor インスタンスを取得
 *
 * @returns EntityExtractor インスタンス
 */
export function getEntityExtractor(): EntityExtractor {
  if (!extractorInstance) {
    extractorInstance = new EntityExtractor();
  }
  return extractorInstance;
}
