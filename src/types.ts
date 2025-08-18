import { z } from "zod";
import { MAX_FILE_SIZE } from "./config";

// get-search-result tool用のパラメータ（resultIdのみ）
export const GetSearchResultParamsSchema = z.object({
    resultId: z.string()
        .describe("The result ID to retrieve a specific search result"),
});

export type GetSearchResultParams = z.infer<typeof GetSearchResultParamsSchema>;

// list-search-cache tool用のパラメータ
export const ListSearchCacheParamsSchema = z.object({
    keyword: z.string()
        .optional()
        .describe("Keyword to filter search queries (case-insensitive partial match)"),
    page: z.number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Page number for pagination (1-based)"),
    limit: z.number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe("Number of results per page (max 100, default 10)"),
});

export type ListSearchCacheParams = z.infer<typeof ListSearchCacheParamsSchema>;

// fetch tool用のパラメータ
export const FetchParamsSchema = z.object({
    url: z.string()
        .url()
        .describe("Target URL to fetch"),
    method: z.string()
        .optional()
        .default("GET")
        .describe("HTTP method (GET, POST, PUT, DELETE, etc.)"),
    headers: z.record(z.string())
        .optional()
        .describe("Custom HTTP headers"),
    windowSize: z.number()
        .int()
        .min(1)
        .max(32768) // モデル消費用なので32KB上限
        .optional()
        .default(4096)
        .describe("Response data window size in bytes (max 32KB for model consumption)"),
    timeout: z.number()
        .int()
        .min(100)
        .max(600000) // 10 minutes max
        .optional()
        .default(30000)
        .describe("Request timeout in milliseconds (min 100ms, max 600000ms)"),
    includeResponseHeaders: z.boolean()
        .optional()
        .default(false)
        .describe("Include response headers in output"),
});

export type FetchParams = z.infer<typeof FetchParamsSchema>;

// list-fetch-cache tool用のパラメータ
export const ListFetchCacheParamsSchema = z.object({
    requestId: z.string()
        .optional()
        .describe("Filter by specific request ID"),
    page: z.number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Page number for pagination (1-based)"),
    limit: z.number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe("Number of results per page (max 100, default 10)"),
});

export type ListFetchCacheParams = z.infer<typeof ListFetchCacheParamsSchema>;

// get-fetch-cache tool用のパラメータ
export const GetFetchCacheParamsSchema = z.object({
    requestId: z.string()
        .describe("Request ID to retrieve"),
    includeHeaders: z.boolean()
        .optional()
        .default(false)
        .describe("Include response headers"),
    startPosition: z.number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("Starting byte position"),
    size: z.number()
        .int()
        .min(1)
        .max(1024 * 1024) // モデル消費用なので1MB上限
        .optional()
        .default(4096)
        .describe("Number of bytes to retrieve (max 1MB for model consumption)"),
});

export type GetFetchCacheParams = z.infer<typeof GetFetchCacheParamsSchema>;