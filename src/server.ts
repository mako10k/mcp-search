import { searchEngine, SearchParamsSchema } from './search';
import { getSearchResult } from './getSearchResult';
import { listSearchCache } from './listSearchCache';
import { fetchUrl } from './fetch';
import { listFetchCache } from './listFetchCache';
import { getFetchCache } from './getFetchCache';
import type { SearchResponse } from './cache';
import type { FetchResult } from './fetchCache';
import {
  GetSearchResultParamsSchema,
  ListSearchCacheParamsSchema,
  FetchParamsSchema,
  ListFetchCacheParamsSchema,
  GetFetchCacheParamsSchema,
} from './types';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger';
import { cacheManager } from './cache';
import { fetchCacheManager } from './fetchCache';

// use simple stderr logger

// Helper: extract ID from uri/variables
function getIdFromUri(uri: unknown, variables: unknown, varKey: string, scheme: string): string {
  const vars = (variables as Record<string, unknown>) || {};
  const raw = vars[varKey];
  let varVal: string | string[] | undefined;
  if (typeof raw === 'string') varVal = raw;
  else if (Array.isArray(raw) && typeof raw[0] === 'string') varVal = raw as string[];
  if (Array.isArray(varVal)) return varVal[0];
  if (typeof varVal === 'string' && varVal) return varVal;
  try {
    const u = typeof uri === 'string' ? new URL(uri) : (uri as URL);
    const host = u?.host ?? '';
    const path = (u?.pathname ?? '').toString();
    return host || path.replace(/^\/+/, '');
  } catch {
    const s = String(uri);
    const re = new RegExp(`^${scheme}:\\/\\/`);
    return s.replace(re, '').replace(/^\/+/, '');
  }
}

function parseFetchQuery(uri: unknown): {
  view: string | null;
  mode: string | null;
  opts: Record<string, string>;
} {
  let view: string | null = null;
  let mode: string | null = null;
  const opts: Record<string, string> = {};
  try {
    const u = typeof uri === 'string' ? new URL(uri) : (uri as URL);
    if (u?.searchParams) {
      view = u.searchParams.get('view');
      mode = u.searchParams.get('mode');
      for (const key of [
        'outputSize',
        'summarize',
        'summaryMaxSentences',
        'summaryMaxChars',
        'search',
        'searchIsRegex',
        'caseSensitive',
        'context',
        'before',
        'after',
        'maxMatches',
        'includeHeaders',
        'startPosition',
        'size',
      ]) {
        const v = u.searchParams.get(key);
        if (v !== null) opts[key] = v;
      }
    }
  } catch {
    // ignore parse errors
  }
  return { view, mode, opts };
}

function buildFetchMetaContents(id: string) {
  const cache = fetchCacheManager.getByRequestId(id);
  if (!cache) {
    throw new McpError(ErrorCode.InvalidRequest, `Fetch cache not found: ${id}`);
  }
  const body = JSON.stringify({
    requestId: cache.requestId,
    url: cache.url,
    method: cache.method,
    status: cache.httpStatus,
    contentType: cache.contentType,
    expectedSize: cache.expectedSize,
    fetchedSize: cache.fetchedSize,
    timestamp: cache.timestamp,
    expiresAt: cache.expiresAt,
  });
  return {
    contents: [
      {
        uri: `fetch://${cache.requestId}`,
        mimeType: 'application/json',
        text: body,
      },
    ],
  };
}

function buildFetchRawChunkContents(id: string, opts: Record<string, string>) {
  const includeHeaders = opts.includeHeaders === '1' || opts.includeHeaders === 'true';
  const startPosition = opts.startPosition ? parseInt(opts.startPosition, 10) : 0;
  const size = opts.size ? parseInt(opts.size, 10) : 4096;
  const raw = fetchCacheManager.getFetchData(id, includeHeaders, startPosition, size);
  if (!raw) {
    throw new McpError(ErrorCode.InvalidRequest, `Fetch cache not found: ${id}`);
  }
  return {
    contents: [
      {
        uri: `fetch://${raw.requestId}?mode=rawChunk&startPosition=${startPosition}&size=${size}${includeHeaders ? '&includeHeaders=1' : ''}`,
        mimeType: 'application/json',
        text: JSON.stringify(raw),
      },
    ],
  };
}

function buildFetchProcessedContents(id: string, view: string, opts: Record<string, string>) {
  const outputSizeParam = opts.outputSize ? parseInt(opts.outputSize, 10) : undefined;
  const bool = (v?: string | null) => v === '1' || v === 'true';
  const num = (v?: string | null) => (v ? parseInt(v, 10) : undefined);

  const processed = fetchCacheManager.getProcessedView(id, {
    outputSize: view === 'full' ? Number.MAX_SAFE_INTEGER : outputSizeParam,
    summarize: view === 'summary' ? true : bool(opts.summarize),
    summaryMaxSentences: num(opts.summaryMaxSentences),
    summaryMaxChars: num(opts.summaryMaxChars),
    search: opts.search,
    searchIsRegex: bool(opts.searchIsRegex),
    caseSensitive: bool(opts.caseSensitive),
    context: num(opts.context),
    before: num(opts.before),
    after: num(opts.after),
    maxMatches: num(opts.maxMatches),
  });

  if (!processed) {
    throw new McpError(ErrorCode.InvalidRequest, `Fetch cache not found: ${id}`);
  }

  const body = JSON.stringify(processed);
  return {
    contents: [
      {
        uri: `fetch://${processed.requestId}?view=${encodeURIComponent(view)}`,
        mimeType: 'application/json',
        text: body,
      },
    ],
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-search',
    version: '1.0.0',
  });

  // Resources: expose search and fetch caches as MCP resources
  // search://{searchId}
  server.resource(
    'search-cache',
    new ResourceTemplate('search://{searchId}', {
      list: async () => {
        const { searches } = cacheManager.listSearchHistory({ page: 1, limit: 50 });
        return {
          resources: searches.map((s) => ({
            uri: `search://${s.searchId}`,
            name: `search:${s.searchId}`,
            description: `Search query: ${s.query} (${s.resultCount} results)`,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (uri: any, variables: any) => {
      const varId = variables?.searchId as string | string[] | undefined;
      const id = Array.isArray(varId)
        ? varId[0]
        : typeof varId === 'string' && varId
          ? varId
          : (() => {
              try {
                const u = typeof uri === 'string' ? new URL(uri) : uri;
                const host = u?.host ?? '';
                const path = (u?.pathname ?? '').toString();
                return host || path.replace(/^\/+/, '');
              } catch {
                const s = String(uri);
                return s.replace(/^search:\/\//, '').replace(/^\/+/, '');
              }
            })();
      const cache = cacheManager.getBySearchId(id);
      if (!cache) {
        throw new McpError(ErrorCode.InvalidRequest, `Search cache not found: ${id}`);
      }
      const body = JSON.stringify({
        searchId: cache.searchId,
        query: cache.query,
        timestamp: cache.timestamp,
        expiresAt: cache.expiresAt,
        results: cache.results,
      });
      return {
        contents: [
          {
            uri: `search://${cache.searchId}`,
            mimeType: 'application/json',
            text: body,
          },
        ],
      };
    },
  );

  // search-result://{resultId}
  server.resource(
    'search-result',
    new ResourceTemplate('search-result://{resultId}', {
      list: async () => {
        // Collect recent results from recent searches (cap total to 50)
        const { searches } = cacheManager.listSearchHistory({ page: 1, limit: 20 });
        const resources: Array<{
          uri: string;
          name: string;
          description?: string;
          mimeType: string;
        }> = [];
        for (const s of searches) {
          const cache = cacheManager.getBySearchId(s.searchId);
          if (!cache) continue;
          for (const r of cache.results) {
            resources.push({
              uri: `search-result://${r.resultId}`,
              name: `search-result:${r.resultId}`,
              description: `${r.title} (${r.link})`,
              mimeType: 'application/json',
            });
            if (resources.length >= 50) break;
          }
          if (resources.length >= 50) break;
        }
        return { resources };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (uri: any, variables: any) => {
      const varId = variables?.resultId as string | string[] | undefined;
      const id = Array.isArray(varId)
        ? varId[0]
        : typeof varId === 'string' && varId
          ? varId
          : (() => {
              try {
                const u = typeof uri === 'string' ? new URL(uri) : uri;
                const host = u?.host ?? '';
                const path = (u?.pathname ?? '').toString();
                return host || path.replace(/^\/+/, '');
              } catch {
                const s = String(uri);
                return s.replace(/^search-result:\/\//, '').replace(/^\/+/, '');
              }
            })();
      const result = cacheManager.getByResultId(id);
      if (!result) {
        throw new McpError(ErrorCode.InvalidRequest, `Search result not found: ${id}`);
      }
      const body = JSON.stringify(result);
      return {
        contents: [
          {
            uri: `search-result://${result.resultId}`,
            mimeType: 'application/json',
            text: body,
          },
        ],
      };
    },
  );

  // fetch://{requestId}
  server.resource(
    'fetch-cache',
    new ResourceTemplate('fetch://{requestId}', {
      list: async () => {
        const { requests } = fetchCacheManager.listFetchHistory(undefined, 1, 50);
        return {
          resources: requests.map((r) => ({
            uri: `fetch://${r.requestId}`,
            name: `fetch:${r.requestId}`,
            description: `Fetch ${r.method} ${r.url} (${r.fetchedSize}/${r.expectedSize ?? 0} bytes)`,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (uri: unknown, variables: unknown) => {
      const id = getIdFromUri(uri, variables, 'requestId', 'fetch');
      const { view, mode, opts } = parseFetchQuery(uri);

      if (mode === 'rawChunk' || mode === 'raw') {
        return buildFetchRawChunkContents(id, opts);
      }

      if (!view || view === 'meta') {
        return buildFetchMetaContents(id);
      }

      return buildFetchProcessedContents(id, view, opts);
    },
  );

  // Google検索ツール
  server.tool(
    'google-search',
    'Perform a web search using Google Custom Search API for efficient results.',
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
      logger.info('Google search requested:', { query: params.query });

      const validatedParams = SearchParamsSchema.parse(params);
      const results = await searchEngine(validatedParams);

      if ('error' in results && results.error) {
        logger.info('Search error:', results.message);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${results.message} (Status: ${results.status || 'unknown'})`,
            },
          ],
        };
      } else {
        const sres = results as SearchResponse;
        logger.info(`Search completed: ${sres.resultCount} results found`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sres),
            },
          ],
        };
      }
    },
  );

  // 検索結果取得ツール
  server.tool(
    'get-search-result',
    'Retrieve a specific search result by result ID.',
    {
      resultId: GetSearchResultParamsSchema.shape.resultId,
    },
    async (params) => {
      logger.info('Search result retrieval requested:', params);

      const validatedParams = GetSearchResultParamsSchema.parse(params);
      const result = await getSearchResult(validatedParams);

      if ('error' in result && result.error) {
        logger.info('Search result retrieval error:', result.message);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.message}`,
            },
          ],
        };
      } else {
        logger.info('Search result retrieved successfully');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    },
  );

  // 検索キャッシュ一覧ツール
  server.tool(
    'list-search-cache',
    'List cached search queries with filtering and pagination.',
    {
      keyword: ListSearchCacheParamsSchema.shape.keyword,
      page: ListSearchCacheParamsSchema.shape.page,
      limit: ListSearchCacheParamsSchema.shape.limit,
    },
    async (params) => {
      logger.info('Search cache list requested:', params);

      const validatedParams = ListSearchCacheParamsSchema.parse(params);
      const result = await listSearchCache(validatedParams);

      if ('error' in result && result.error) {
        logger.info('Search cache list error:', result.message);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.message}`,
            },
          ],
        };
      } else {
        logger.info('Search cache list retrieved');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    },
  );

  // Web fetchツール
  server.tool(
    'fetch',
    'Fetch content from a specified URL with customizable options and caching.',
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
      logger.info('Fetch requested:', { url: params.url });

      const validatedParams = FetchParamsSchema.parse(params);
      const result: FetchResult = await fetchUrl(validatedParams);

      if (result.error) {
        const err = result.error;
        const httpStatus = result.status ?? 0;
        const errCode = result.errorCode;
        logger.info('Fetch error:', { error: err, status: httpStatus, code: errCode });
        const details = [
          `Error: ${err}`,
          httpStatus ? `status=${httpStatus}` : undefined,
          errCode ? `code=${errCode}` : undefined,
        ]
          .filter(Boolean)
          .join(' ');
        return {
          content: [
            {
              type: 'text',
              text: details,
            },
          ],
        };
      }

      logger.info(`Fetch completed: ${result.actualSize} bytes fetched`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );

  // Fetchキャッシュ一覧ツール
  server.tool(
    'list-fetch-cache',
    'List cached fetch requests with their status and progress information.',
    {
      requestId: ListFetchCacheParamsSchema.shape.requestId,
      page: ListFetchCacheParamsSchema.shape.page,
      limit: ListFetchCacheParamsSchema.shape.limit,
    },
    async (params) => {
      logger.info('Fetch cache list requested:', params);

      const validatedParams = ListFetchCacheParamsSchema.parse(params);
      const result = await listFetchCache(validatedParams);

      if ('error' in result && result.error) {
        logger.info('Fetch cache list error:', result.message);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.message}`,
            },
          ],
        };
      } else {
        logger.info('Fetch cache list retrieved');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    },
  );

  // Fetchキャッシュデータ取得ツール
  server.tool(
    'get-fetch-cache',
    'Retrieve cached fetch data with byte-level pagination support.',
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
      logger.info('Fetch cache data requested:', params);

      const validatedParams = GetFetchCacheParamsSchema.parse(params);
      const result = await getFetchCache(validatedParams);

      if ('error' in result && result.error) {
        const msg = result.message || 'unknown error';
        logger.info('Fetch cache data error:', msg);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${msg}`,
            },
          ],
        };
      } else {
        logger.info('Fetch cache data retrieved');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    },
  );

  return server;
}

export { logger };
