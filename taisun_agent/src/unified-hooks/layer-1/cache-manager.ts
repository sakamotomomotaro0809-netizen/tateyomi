/**
 * LRU Cache Manager
 *
 * LRU (Least Recently Used) キャッシュマネージャー
 * - 最大1000エントリ
 * - TTL 5秒
 * - O(1) 操作 (get, set, delete)
 */

import { CacheEntry } from '../types';

export class LRUCacheManager<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 5000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * キャッシュから値を取得
   * TTL が切れている場合は削除して null を返す
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTL チェック
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU: アクセスされたエントリを最新に
    this.cache.delete(key);
    this.cache.set(key, { ...entry, timestamp: now });

    return entry.value;
  }

  /**
   * キャッシュに値を設定
   * maxSize を超える場合は最も古いエントリを削除
   */
  set(key: string, value: T, ttl?: number): void {
    // 既存エントリがあれば削除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // maxSize チェック
    if (this.cache.size >= this.maxSize) {
      // 最も古いエントリ (Map の最初のエントリ) を削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // 新しいエントリを追加
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュヒット率を計算 (統計用)
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * 期限切れエントリをクリーンアップ (定期実行用)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}
