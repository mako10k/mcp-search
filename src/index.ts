import express from "express";
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
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import winston from "winston";
import { z } from "zod";

dotenv.config();

const app = express();
app.use(express.json());

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

const server = new McpServer({
    name: "google-search-server",
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

// 検索結果取得ツール（resultIdのみ）
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
    "List all cached search queries with their metadata (search ID, query, timestamp, result count). Supports keyword filtering and pagination.",
    {
        keyword: ListSearchCacheParamsSchema.shape.keyword,
        page: ListSearchCacheParamsSchema.shape.page,
        limit: ListSearchCacheParamsSchema.shape.limit,
    },
    async (params) => {
        logger.info("Search cache list requested", params);
        
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
            logger.info(`Search cache retrieved: ${(result as any).searches?.length || 0}/${(result as any).totalCount || 0} entries`);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result),
                }],
            };
        }
    }
);

// ウェブフェッチツール
server.tool(
    "fetch",
    "Fetch content from a specified URL with customizable options and caching.",
    {
        url: FetchParamsSchema.shape.url,
        method: FetchParamsSchema.shape.method,
        headers: FetchParamsSchema.shape.headers,
        windowSize: FetchParamsSchema.shape.windowSize,
        timeout: FetchParamsSchema.shape.timeout,
        includeResponseHeaders: FetchParamsSchema.shape.includeResponseHeaders,
    },
    async (params) => {
        logger.info("Fetch requested:", { url: params.url, method: params.method });
        
        const validatedParams = FetchParamsSchema.parse(params);
        const result = await fetchUrl(validatedParams);

        if ("error" in result && result.error) {
            logger.info("Fetch error:", (result as any).message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${(result as any).message}`,
                }],
            };
        } else {
            logger.info(`Fetch completed: ${(result as any).requestId}, status: ${(result as any).status}`);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result),
                }],
            };
        }
    }
);

// フェッチキャッシュ一覧ツール
server.tool(
    "list-fetch-cache",
    "List cached fetch requests with their status and progress information.",
    {
        requestId: ListFetchCacheParamsSchema.shape.requestId,
        page: ListFetchCacheParamsSchema.shape.page,
        limit: ListFetchCacheParamsSchema.shape.limit,
    },
    async (params) => {
        logger.info("Fetch cache list requested", params);
        
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
            logger.info(`Fetch cache retrieved: ${(result as any).requests?.length || 0}/${(result as any).totalCount || 0} entries`);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result),
                }],
            };
        }
    }
);

// フェッチキャッシュデータ取得ツール
server.tool(
    "get-fetch-cache",
    "Retrieve cached fetch data with byte-level pagination support.",
    {
        requestId: GetFetchCacheParamsSchema.shape.requestId,
        includeHeaders: GetFetchCacheParamsSchema.shape.includeHeaders,
        startPosition: GetFetchCacheParamsSchema.shape.startPosition,
        size: GetFetchCacheParamsSchema.shape.size,
    },
    async (params) => {
        logger.info("Fetch cache data requested:", params);
        
        const validatedParams = GetFetchCacheParamsSchema.parse(params);
        const result = await getFetchCache(validatedParams);

        if ("error" in result && result.error) {
            logger.info("Fetch cache data error:", result.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${result.message}`,
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

app.use((req, res, next) => {
    logger.info(`Access log: ${req.method} ${req.url}`);
    next();
});

app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    res.on("close", () => {
        transport.close();
    });

    logger.info("MCP request received:", req.body);

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        logger.info("MCP response sent successfully.");
    } catch (error: any) {
        logger.info("MCP request error:", error.message);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    logger.info(`Streamable HTTP MCP Server is running on port ${port}`);
}).on("error", (err) => {
    logger.error(`Failed to bind server on port ${port}:`, err.message);
});
