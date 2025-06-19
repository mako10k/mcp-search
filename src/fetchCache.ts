import { v4 as uuidv4 } from "uuid";
import winston from "winston";
import { MAX_FILE_SIZE, MAX_TOTAL_CACHE_SIZE } from "./config";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// フェッチキャッシュのインターフェース
export interface FetchCache {
    requestId: string;
    url: string;
    method: string;
    headers?: Record<string, string>;
    timestamp: Date;
    expiresAt: Date;
    status: "InProgress" | "Completed" | "Error";
    httpStatus?: number;
    statusText?: string;
    expectedSize?: number;
    fetchedSize: number;
    responseHeaders?: Record<string, string>;
    data: Buffer;
    error?: string;
}

// フェッチリクエストの結果
export interface FetchResult {
    requestId: string;
    status: number;
    statusText: string;
    contentSize?: number;
    actualSize: number;
    data: string;
    isComplete: boolean;
    responseHeaders?: Record<string, string>;
    error?: string;
}

// フェッチキャッシュマネージャー
class FetchCacheManager {
    private cache = new Map<string, FetchCache>();
    private accessOrder: string[] = [];
    private readonly maxCacheSize = 1000;
    private readonly cacheExpiryMs = 60 * 60 * 1000; // 1時間
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // 5分ごとにクリーンアップを実行
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
        
        logger.info(`FetchCacheManager initialized with limits: MAX_FILE_SIZE: ${MAX_FILE_SIZE} bytes (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB), MAX_TOTAL_CACHE: ${MAX_TOTAL_CACHE_SIZE} bytes (${(MAX_TOTAL_CACHE_SIZE / 1024 / 1024).toFixed(1)}MB)`);
    }

    async fetchAndCache(
        url: string,
        method: string = "GET",
        headers?: Record<string, string>,
        windowSize: number = 4096,
        timeout: number = 30000,
        includeResponseHeaders: boolean = false
    ): Promise<FetchResult> {
        const requestId = uuidv4();
        const timestamp = new Date();
        const expiresAt = new Date(timestamp.getTime() + this.cacheExpiryMs);

        // 初期キャッシュエントリを作成
        const cacheEntry: FetchCache = {
            requestId,
            url,
            method,
            headers,
            timestamp,
            expiresAt,
            status: "InProgress",
            fetchedSize: 0,
            data: Buffer.alloc(0)
        };

        this.cache.set(requestId, cacheEntry);
        this.updateAccessOrder(requestId);

        try {
            logger.info(`Starting fetch: ${method} ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                method,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const httpStatus = response.status;
            const statusText = response.statusText;
            const responseHeaders = includeResponseHeaders ? 
                Object.fromEntries(response.headers.entries()) : undefined;

            // Content-Lengthからサイズを取得
            const contentLength = response.headers.get('content-length');
            const expectedSize = contentLength ? parseInt(contentLength, 10) : undefined;

            // レスポンスを読み取り
            const reader = response.body?.getReader();
            const chunks: Uint8Array[] = [];
            let fetchedSize = 0;

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        // ファイルサイズ制限チェック
                        if (fetchedSize + value.length > MAX_FILE_SIZE) {
                            logger.warn(`File size limit exceeded for ${requestId}: ${fetchedSize + value.length} > ${MAX_FILE_SIZE}`);
                            // 制限まで読み取り
                            const remainingSize = MAX_FILE_SIZE - fetchedSize;
                            if (remainingSize > 0) {
                                const truncatedChunk = value.slice(0, remainingSize);
                                chunks.push(truncatedChunk);
                                fetchedSize += truncatedChunk.length;
                            }
                            break;
                        }
                        
                        chunks.push(value);
                        fetchedSize += value.length;
                        
                        // プログレス更新
                        const updatedEntry = this.cache.get(requestId);
                        if (updatedEntry) {
                            updatedEntry.fetchedSize = fetchedSize;
                            updatedEntry.expectedSize = expectedSize;
                            updatedEntry.httpStatus = httpStatus;
                            updatedEntry.statusText = statusText;
                            updatedEntry.responseHeaders = responseHeaders;
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            }

            // 全データを結合
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const allData = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                allData.set(chunk, offset);
                offset += chunk.length;
            }

            // 総量制限をチェック（設定前に）
            this.enforceStorageLimit(fetchedSize);

            // キャッシュエントリを完了状態で更新
            const finalEntry: FetchCache = {
                ...cacheEntry,
                status: httpStatus >= 200 && httpStatus < 300 ? "Completed" : "Error",
                httpStatus,
                statusText,
                expectedSize,
                fetchedSize,
                responseHeaders,
                data: Buffer.from(allData),
                error: httpStatus >= 400 ? `HTTP ${httpStatus}: ${statusText}` : undefined
            };

            this.cache.set(requestId, finalEntry);

            // エントリ数制限をチェック
            if (this.cache.size > this.maxCacheSize) {
                this.evictOldest();
            }

            // 総キャッシュサイズをログ出力
            const totalCacheSize = this.getTotalCacheSize();
            logger.info(`Cache updated. Total size: ${totalCacheSize} bytes (${(totalCacheSize / 1024 / 1024).toFixed(1)}MB), Entries: ${this.cache.size}`);

            // レスポンスデータの一部を返す（windowSizeまで）
            const dataToReturn = allData.slice(0, windowSize);
            const isComplete = dataToReturn.length === allData.length;

            const result: FetchResult = {
                requestId,
                status: httpStatus,
                statusText,
                contentSize: expectedSize,
                actualSize: fetchedSize,
                data: Buffer.from(dataToReturn).toString('utf-8'),
                isComplete,
                responseHeaders: includeResponseHeaders ? responseHeaders : undefined,
                error: httpStatus >= 400 ? `HTTP ${httpStatus}: ${statusText}` : undefined
            };

            logger.info(`Fetch completed: ${requestId}, status: ${httpStatus}, size: ${fetchedSize}`);
            return result;

        } catch (error: any) {
            logger.error(`Fetch error for ${requestId}:`, error.message);

            // エラー状態でキャッシュを更新
            const errorEntry: FetchCache = {
                ...cacheEntry,
                status: "Error",
                error: error.message,
                data: Buffer.alloc(0)
            };

            this.cache.set(requestId, errorEntry);

            return {
                requestId,
                status: 0,
                statusText: "Error",
                actualSize: 0,
                data: "",
                isComplete: true,
                error: error.message
            };
        }
    }

    getByRequestId(requestId: string): FetchCache | null {
        const cache = this.cache.get(requestId);
        if (!cache) {
            logger.info(`Cache miss: requestId ${requestId}`);
            return null;
        }

        if (this.isExpired(cache)) {
            logger.info(`Cache expired: requestId ${requestId}`);
            this.removeCache(requestId);
            return null;
        }

        this.updateAccessOrder(requestId);
        logger.info(`Cache hit: requestId ${requestId}`);
        return cache;
    }

    listFetchHistory(requestId?: string, page: number = 1, limit: number = 10): {
        requests: Array<{
            requestId: string;
            url: string;
            method: string;
            status: "InProgress" | "Completed" | "Error";
            httpStatus?: number;
            expectedSize?: number;
            fetchedSize: number;
            timestamp: string;
            expiresAt: string;
        }>;
        totalCount: number;
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    } {
        let history = [];
        
        for (const [id, cache] of this.cache.entries()) {
            if (!this.isExpired(cache)) {
                if (!requestId || id === requestId) {
                    history.push({
                        requestId: cache.requestId,
                        url: cache.url,
                        method: cache.method,
                        status: cache.status,
                        httpStatus: cache.httpStatus,
                        expectedSize: cache.expectedSize,
                        fetchedSize: cache.fetchedSize,
                        timestamp: cache.timestamp.toISOString(),
                        expiresAt: cache.expiresAt.toISOString()
                    });
                }
            }
        }

        // タイムスタンプでソート（新しい順）
        history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const totalCount = history.length;
        const totalPages = Math.ceil(totalCount / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedHistory = history.slice(startIndex, endIndex);

        logger.info(`Retrieved fetch history: ${paginatedHistory.length}/${totalCount} entries`);

        return {
            requests: paginatedHistory,
            totalCount,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        };
    }

    getFetchData(
        requestId: string,
        includeHeaders: boolean = false,
        startPosition: number = 0,
        size: number = 4096
    ): {
        requestId: string;
        url: string;
        httpStatus?: number;
        contentSize: number;
        startPosition: number;
        dataSize: number;
        data: string;
        hasMore: boolean;
        responseHeaders?: Record<string, string>;
        metadata: {
            method: string;
            timestamp: string;
            status: string;
            error?: string;
        };
    } | null {
        const cache = this.getByRequestId(requestId);
        if (!cache) {
            return null;
        }

        const totalSize = cache.data.length;
        const endPosition = Math.min(startPosition + size, totalSize);
        const dataChunk = cache.data.slice(startPosition, endPosition);
        const hasMore = endPosition < totalSize;

        return {
            requestId: cache.requestId,
            url: cache.url,
            httpStatus: cache.httpStatus,
            contentSize: totalSize,
            startPosition,
            dataSize: dataChunk.length,
            data: dataChunk.toString('utf-8'),
            hasMore,
            responseHeaders: includeHeaders ? cache.responseHeaders : undefined,
            metadata: {
                method: cache.method,
                timestamp: cache.timestamp.toISOString(),
                status: cache.status,
                error: cache.error
            }
        };
    }

    private isExpired(cache: FetchCache): boolean {
        return new Date() > cache.expiresAt;
    }

    private removeCache(requestId: string): void {
        this.cache.delete(requestId);
        const index = this.accessOrder.indexOf(requestId);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    private updateAccessOrder(requestId: string): void {
        const index = this.accessOrder.indexOf(requestId);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(requestId);
    }

    private evictOldest(): void {
        while (this.cache.size > this.maxCacheSize && this.accessOrder.length > 0) {
            const oldestRequestId = this.accessOrder.shift();
            if (oldestRequestId) {
                logger.info(`Cache eviction: removing oldest entry ${oldestRequestId}`);
                this.removeCache(oldestRequestId);
            }
        }
    }

    // 総キャッシュサイズを計算
    private getTotalCacheSize(): number {
        let totalSize = 0;
        for (const cache of this.cache.values()) {
            totalSize += cache.data.length;
        }
        return totalSize;
    }

    // 総量制限をチェックして必要に応じて古いエントリを削除
    private enforceStorageLimit(newDataSize: number): void {
        const currentTotal = this.getTotalCacheSize();
        const projectedTotal = currentTotal + newDataSize;
        
        if (projectedTotal > MAX_TOTAL_CACHE_SIZE) {
            logger.info(`Total cache size would exceed limit: ${projectedTotal} > ${MAX_TOTAL_CACHE_SIZE}. Evicting old entries.`);
            
            // 必要な分だけ古いエントリを削除
            const excessSize = projectedTotal - MAX_TOTAL_CACHE_SIZE;
            let freedSize = 0;
            
            while (freedSize < excessSize && this.accessOrder.length > 0) {
                const oldestRequestId = this.accessOrder.shift();
                if (oldestRequestId && this.cache.has(oldestRequestId)) {
                    const oldCache = this.cache.get(oldestRequestId)!;
                    freedSize += oldCache.data.length;
                    this.cache.delete(oldestRequestId);
                    logger.info(`Evicted cache entry ${oldestRequestId} (${oldCache.data.length} bytes) for storage limit`);
                }
            }
        }
    }

    cleanup(): void {
        const beforeSize = this.cache.size;
        
        for (const [requestId, cache] of this.cache.entries()) {
            if (this.isExpired(cache)) {
                this.removeCache(requestId);
            }
        }

        const afterSize = this.cache.size;
        if (beforeSize !== afterSize) {
            logger.info(`Fetch cache cleanup: removed ${beforeSize - afterSize} expired entries`);
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// シングルトンインスタンス
export const fetchCacheManager = new FetchCacheManager();
