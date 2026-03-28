/**
 * Japanese Tokenizer
 *
 * kuromoji を使用した日本語形態素解析
 */

import kuromoji from 'kuromoji';
import { Token } from '../types';

/**
 * Tokenizer クラス
 */
export class Tokenizer {
  private tokenizer: any = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * kuromoji の初期化
   */
  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err: Error | null, tokenizer: any) => {
        if (err) {
          reject(err);
        } else {
          this.tokenizer = tokenizer;
          resolve();
        }
      });
    });
  }

  /**
   * テキストをトークン化
   *
   * @param text - 入力テキスト
   * @returns トークン配列
   */
  async tokenize(text: string): Promise<Token[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      await this.initPromise;

      if (!this.tokenizer) {
        throw new Error('Tokenizer not initialized');
      }

      const result = this.tokenizer.tokenize(text);

      return result.map((token: any) => ({
        surface: token.surface_form || '',
        pos: token.pos || 'unknown',
        base: token.basic_form || token.surface_form,
        reading: token.reading || undefined,
      }));
    } catch (error) {
      console.error('Tokenization error:', error);
      // フォールバック: シンプルな分割
      return this.simpleSplit(text);
    }
  }

  /**
   * シンプルな分割（フォールバック）
   *
   * @param text - 入力テキスト
   * @returns トークン配列
   */
  private simpleSplit(text: string): Token[] {
    const words = text.split(/\s+/);
    return words.map((word) => ({
      surface: word,
      pos: 'unknown',
      base: word,
    }));
  }

  /**
   * 名詞のみ抽出
   *
   * @param text - 入力テキスト
   * @returns 名詞トークン配列
   */
  async extractNouns(text: string): Promise<Token[]> {
    const tokens = await this.tokenize(text);
    return tokens.filter((token) => token.pos.startsWith('名詞'));
  }

  /**
   * 動詞のみ抽出
   *
   * @param text - 入力テキスト
   * @returns 動詞トークン配列
   */
  async extractVerbs(text: string): Promise<Token[]> {
    const tokens = await this.tokenize(text);
    return tokens.filter((token) => token.pos.startsWith('動詞'));
  }

  /**
   * キーワード抽出（名詞 + 動詞）
   *
   * @param text - 入力テキスト
   * @returns キーワードトークン配列
   */
  async extractKeywords(text: string): Promise<Token[]> {
    const tokens = await this.tokenize(text);
    return tokens.filter((token) => token.pos.startsWith('名詞') || token.pos.startsWith('動詞'));
  }

  /**
   * トークンを正規化（基本形に変換）
   *
   * @param tokens - トークン配列
   * @returns 正規化されたテキスト
   */
  normalize(tokens: Token[]): string {
    return tokens.map((token) => token.base || token.surface).join(' ');
  }
}

/**
 * シングルトンインスタンス
 */
let tokenizerInstance: Tokenizer | null = null;

/**
 * Tokenizer インスタンスを取得
 *
 * @returns Tokenizer インスタンス
 */
export function getTokenizer(): Tokenizer {
  if (!tokenizerInstance) {
    tokenizerInstance = new Tokenizer();
  }
  return tokenizerInstance;
}
