import { searchEngine, SearchParamsSchema } from "./search";
import { getSearchResult } from "./getSearchResult";
import { listSearchCache } from "./listSearchCache";
import { fetchUrl } from "./fetch";
import { listFetchCache } from "./listFetchCache";
import { getFetchCache } from "./getFetchCache";
import { 
    GetSearchResultParamsSchema, 
    ListSearchCacheParamsSchema,
    FetchParamsSchema,
    ListFetchCacheParamsSchema,
    GetFetchCacheParamsSchema
} from "./types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger";

// use simple stderr logger

export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: "mcp-search",
        version: "1.0.0",
    });

    // Google検索ツール
    server.tool(
        "google-search",
        "Perform a web search using Google Custom Search API for efficient results.",
        {
            query: SearchParamsSchema.shape.query,
            language: SearchParamsSchema.shape.language,
            region: SearchParamsSchema.shape.region,
            numResults: SearchParamsSchema.shape.numResults,
            startIndex: SearchParamsSchema.shape.startIndex,
            imageSearch: SearchParamsSchema.shape.imageSearch,
            imageSize: SearchParamsSchema.shape.imageSize,
            imageType: SearchParamsSchema.shape.imageType,
            imageColor: SearchParamsSchema.shape.imageColor,
        },
        async (params) => {
            logger.info("Google search requested:", { query: params.query });
            
            const validatedParams = SearchParamsSchema.parse(params);
            const results = await searchEngine(validatedParams);

            if ("error" in results && results.error) {
                logger.info("Search error:", results.message);
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${results.message} (Status: ${results.status || "unknown"})`,
                    }],
                };
            } else {
                logger.info(`Search completed: ${(results as any).resultCount} results found`);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results),
                    }],
                };
            }
        }
    );

    // 検索結果取得ツール
    server.tool(
        "get-search-result",
        "Retrieve a specific search result by result ID.",
        {
            resultId: GetSearchResultParamsSchema.shape.resultId,
        },
        async (params) => {
            logger.info("Search result retrieval requested:", params);
            
            const validatedParams = GetSearchResultParamsSchema.parse(params);
            const result = await getSearchResult(validatedParams);

            if ("error" in result && result.error) {
                logger.info("Search result retrieval error:", result.message);
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${result.message}`,
                    }],
                };
            } else {
                logger.info("Search result retrieved successfully");
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result),
                    }],
                };
            }
        }
    );

    // 検索キャッシュ一覧ツール
    server.tool(
        "list-search-cache",
        "List cached search queries with filtering and pagination.",
        {
            keyword: ListSearchCacheParamsSchema.shape.keyword,
            page: ListSearchCacheParamsSchema.shape.page,
            limit: ListSearchCacheParamsSchema.shape.limit,
        },
        async (params) => {
            logger.info("Search cache list requested:", params);
            
            const validatedParams = ListSearchCacheParamsSchema.parse(params);
            const result = await listSearchCache(validatedParams);

            if ("error" in result && result.error) {
                logger.info("Search cache list error:", result.message);
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${result.message}`,
                    }],
                };
            } else {
                logger.info(`Search cache list retrieved: ${(result as any).searches.length} entries`);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result),
                    }],
                };
            }
        }
    );

    // Web fetchツール
    server.tool(
        "fetch",
        "Fetch content from a specified URL with customizable options and caching.",
        {
            url: FetchParamsSchema.shape.url,
            method: FetchParamsSchema.shape.method,
            headers: FetchParamsSchema.shape.headers,
            timeout: FetchParamsSchema.shape.timeout,
            includeResponseHeaders: FetchParamsSchema.shape.includeResponseHeaders,
            outputSize: FetchParamsSchema.shape.outputSize,
            process: FetchParamsSchema.shape.process,
            summarize: FetchParamsSchema.shape.summarize,
            summaryMaxSentences: FetchParamsSchema.shape.summaryMaxSentences,
            summaryMaxChars: FetchParamsSchema.shape.summaryMaxChars,
            search: FetchParamsSchema.shape.search,
            searchIsRegex: FetchParamsSchema.shape.searchIsRegex,
            caseSensitive: FetchParamsSchema.shape.caseSensitive,
            context: FetchParamsSchema.shape.context,
            before: FetchParamsSchema.shape.before,
            after: FetchParamsSchema.shape.after,
            maxMatches: FetchParamsSchema.shape.maxMatches,
            includeRawPreview: FetchParamsSchema.shape.includeRawPreview,
            rawPreviewSize: FetchParamsSchema.shape.rawPreviewSize,
        },
        async (params) => {
            logger.info("Fetch requested:", { url: params.url });
            
            const validatedParams = FetchParamsSchema.parse(params);
            const result = await fetchUrl(validatedParams);

            if ((result as any).error) {
                const err = (result as any).error;
                const httpStatus = (result as any).status ?? 0;
                const errCode = (result as any).errorCode;
                logger.info("Fetch error:", { error: err, status: httpStatus, code: errCode });
                const details = [
                    `Error: ${err}`,
                    httpStatus ? `status=${httpStatus}` : undefined,
                    errCode ? `code=${errCode}` : undefined,
                ].filter(Boolean).join(" ");
                return {
                    content: [{
                        type: "text",
                        text: details,
                    }],
                };
            }

            logger.info(`Fetch completed: ${(result as any).actualSize} bytes fetched`);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result),
                }],
            };
        }
    );

    // Fetchキャッシュ一覧ツール
    server.tool(
        "list-fetch-cache",
        "List cached fetch requests with their status and progress information.",
        {
            requestId: ListFetchCacheParamsSchema.shape.requestId,
            page: ListFetchCacheParamsSchema.shape.page,
            limit: ListFetchCacheParamsSchema.shape.limit,
        },
        async (params) => {
            logger.info("Fetch cache list requested:", params);
            
            const validatedParams = ListFetchCacheParamsSchema.parse(params);
            const result = await listFetchCache(validatedParams);

            if ("error" in result && result.error) {
                logger.info("Fetch cache list error:", result.message);
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${result.message}`,
                    }],
                };
            } else {
                logger.info(`Fetch cache list retrieved: ${(result as any).requests.length} entries`);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result),
                    }],
                };
            }
        }
    );

    // Fetchキャッシュデータ取得ツール
    server.tool(
        "get-fetch-cache",
        "Retrieve cached fetch data with byte-level pagination support.",
        {
            requestId: GetFetchCacheParamsSchema.shape.requestId,
            includeHeaders: GetFetchCacheParamsSchema.shape.includeHeaders,
            mode: GetFetchCacheParamsSchema.shape.mode,
            startPosition: GetFetchCacheParamsSchema.shape.startPosition,
            size: GetFetchCacheParamsSchema.shape.size,
            outputSize: GetFetchCacheParamsSchema.shape.outputSize,
            process: GetFetchCacheParamsSchema.shape.process,
            summarize: GetFetchCacheParamsSchema.shape.summarize,
            summaryMaxSentences: GetFetchCacheParamsSchema.shape.summaryMaxSentences,
            summaryMaxChars: GetFetchCacheParamsSchema.shape.summaryMaxChars,
            search: GetFetchCacheParamsSchema.shape.search,
            searchIsRegex: GetFetchCacheParamsSchema.shape.searchIsRegex,
            caseSensitive: GetFetchCacheParamsSchema.shape.caseSensitive,
            context: GetFetchCacheParamsSchema.shape.context,
            before: GetFetchCacheParamsSchema.shape.before,
            after: GetFetchCacheParamsSchema.shape.after,
            maxMatches: GetFetchCacheParamsSchema.shape.maxMatches,
        },
        async (params) => {
            logger.info("Fetch cache data requested:", params);
            
            const validatedParams = GetFetchCacheParamsSchema.parse(params);
            const result = await getFetchCache(validatedParams);

            if ((result as any).error) {
                const msg = (result as any).message || 'unknown error';
                logger.info("Fetch cache data error:", msg);
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${msg}`,
                    }],
                };
            } else {
                logger.info(`Fetch cache data retrieved: ${(result as any).dataSize} bytes`);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result),
                    }],
                };
            }
        }
    );

    return server;
}

export { logger };
