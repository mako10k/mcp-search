import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// using simple stderr logger

export interface SearchResult {
  resultId: string;
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  htmlTitle?: string;
  htmlSnippet?: string;
  rawData: Record<string, unknown>;
}

export interface SearchCache {
  searchId: string;
  query: string;
  results: SearchResult[];
  timestamp: Date;
  expiresAt: Date;
}

export interface SearchResponse {
  searchId: string;
  resultCount: number;
  timestamp: Date;
  expiresAt: Date;
  results: SearchResultSummary[];
}

export interface SearchResultSummary {
  resultId: string;
  title: string;
  link: string;
  snippet: string; // 最初の100文字
}

type GoogleSearchItem = {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
  htmlTitle?: string;
  htmlSnippet?: string;
  [key: string]: unknown;
};

export class CacheManager {
  private cache: Map<string, SearchCache> = new Map();
  private resultIndex: Map<string, string> = new Map(); // resultId -> searchId
  private accessOrder: string[] = []; // LRU管理用
  private readonly maxCacheSize = 1000;
  private readonly cacheValidityHours = 1;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 10分間隔でクリーンアップを実行
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      10 * 60 * 1000,
    );
  }

  store(query: string, googleResults: GoogleSearchItem[]): SearchResponse {
    const searchId = uuidv4();
    const timestamp = new Date();
    const expiresAt = new Date(timestamp.getTime() + this.cacheValidityHours * 60 * 60 * 1000);

    const results: SearchResult[] = googleResults.map((item) => {
      const resultId = uuidv4();
      this.resultIndex.set(resultId, searchId);

      return {
        resultId,
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        displayLink: item.displayLink,
        htmlTitle: item.htmlTitle,
        htmlSnippet: item.htmlSnippet,
        rawData: item,
      };
    });

    const searchCache: SearchCache = {
      searchId,
      query,
      results,
      timestamp,
      expiresAt,
    };

    this.cache.set(searchId, searchCache);
    this.updateAccessOrder(searchId);

    // キャッシュサイズ制限をチェック
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldest();
    }

    logger.info(`Search cached: ${searchId}, results: ${results.length}`);

    const response: SearchResponse = {
      searchId,
      resultCount: results.length,
      timestamp,
      expiresAt,
      results: results.map((result) => ({
        resultId: result.resultId,
        title: result.title,
        link: result.link,
        snippet: result.snippet.substring(0, 100) + (result.snippet.length > 100 ? '...' : ''),
      })),
    };

    return response;
  }

  getBySearchId(searchId: string): SearchCache | null {
    const cache = this.cache.get(searchId);
    if (!cache) {
      logger.info(`Cache miss: searchId ${searchId}`);
      return null;
    }

    if (this.isExpired(cache)) {
      logger.info(`Cache expired: searchId ${searchId}`);
      this.removeCache(searchId);
      return null;
    }

    logger.info(`Cache hit: searchId ${searchId}`);
    this.updateAccessOrder(searchId);
    return cache;
  }

  getByResultId(resultId: string): SearchResult | null {
    const searchId = this.resultIndex.get(resultId);
    if (!searchId) {
      logger.info(`Cache miss: resultId ${resultId}`);
      return null;
    }

    const cache = this.getBySearchId(searchId);
    if (!cache) {
      this.resultIndex.delete(resultId);
      return null;
    }

    const result = cache.results.find((r) => r.resultId === resultId);
    if (!result) {
      logger.warn(`Result not found in cache: resultId ${resultId}`);
      this.resultIndex.delete(resultId);
      return null;
    }

    logger.info(`Cache hit: resultId ${resultId}`);
    return result;
  }

  cleanup(): void {
    const beforeSize = this.cache.size;

    for (const [, cache] of this.cache.entries()) {
      if (this.isExpired(cache)) {
        this.removeCache(cache.searchId);
      }
    }

    const afterSize = this.cache.size;
    if (beforeSize !== afterSize) {
      logger.info(`Cache cleanup: removed ${beforeSize - afterSize} expired entries`);
    }
  }

  // 検索履歴一覧を取得（キーワード検索とページング対応）
  listSearchHistory(options?: { keyword?: string; page?: number; limit?: number }): {
    searches: Array<{
      searchId: string;
      query: string;
      timestamp: string;
      resultCount: number;
      expiresAt: string;
    }>;
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const { keyword, page = 1, limit = 10 } = options || {};

    let allHistory = [];

    for (const [, cache] of this.cache.entries()) {
      if (!this.isExpired(cache)) {
        allHistory.push({
          searchId: cache.searchId,
          query: cache.query,
          timestamp: cache.timestamp.toISOString(),
          resultCount: cache.results.length,
          expiresAt: cache.expiresAt.toISOString(),
        });
      }
    }

    // タイムスタンプでソート（新しい順）
    allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // キーワードフィルタリング
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      allHistory = allHistory.filter((item) => item.query.toLowerCase().includes(lowerKeyword));
    }

    const totalCount = allHistory.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const searches = allHistory.slice(startIndex, endIndex);

    logger.info(
      `Retrieved search history: ${searches.length}/${totalCount} entries (page ${page}/${totalPages})`,
    );

    return {
      searches,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private isExpired(cache: SearchCache): boolean {
    return new Date() > cache.expiresAt;
  }

  private removeCache(searchId: string): void {
    const cache = this.cache.get(searchId);
    if (cache) {
      // resultIndexからも削除
      cache.results.forEach((result) => {
        this.resultIndex.delete(result.resultId);
      });
      this.cache.delete(searchId);

      // アクセス順序からも削除
      const index = this.accessOrder.indexOf(searchId);
      if (index !== -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  private updateAccessOrder(searchId: string): void {
    const index = this.accessOrder.indexOf(searchId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(searchId);
  }

  private evictOldest(): void {
    while (this.cache.size > this.maxCacheSize && this.accessOrder.length > 0) {
      const oldestSearchId = this.accessOrder.shift();
      if (oldestSearchId) {
        logger.info(`Cache eviction: removing oldest entry ${oldestSearchId}`);
        this.removeCache(oldestSearchId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// シングルトンインスタンス
export const cacheManager = new CacheManager();
