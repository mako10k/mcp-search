import { z } from 'zod';

// get-search-result tool用のパラメータ（resultIdのみ）
export const GetSearchResultParamsSchema = z.object({
  resultId: z.string().describe('The result ID to retrieve a specific search result'),
});

export type GetSearchResultParams = z.infer<typeof GetSearchResultParamsSchema>;

// list-search-cache tool用のパラメータ
export const ListSearchCacheParamsSchema = z.object({
  keyword: z
    .string()
    .optional()
    .describe('Keyword to filter search queries (case-insensitive partial match)'),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe('Page number for pagination (1-based)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe('Number of results per page (max 100, default 10)'),
});

export type ListSearchCacheParams = z.infer<typeof ListSearchCacheParamsSchema>;

// fetch tool用のパラメータ
export const FetchParamsSchema = z.object({
  url: z.string().url().describe('Target URL to fetch'),
  method: z
    .string()
    .optional()
    .default('GET')
    .describe('HTTP method (GET, POST, PUT, DELETE, etc.)'),
  headers: z.record(z.string()).optional().describe('Custom HTTP headers'),
  timeout: z
    .number()
    .int()
    .min(100)
    .max(600000)
    .optional()
    .default(30000)
    .describe('Request timeout in milliseconds (min 100ms, max 600000ms)'),
  includeResponseHeaders: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include response headers in output'),

  // New processing & output controls (breaking change)
  outputSize: z
    .number()
    .int()
    .min(1)
    .max(32768)
    .optional()
    .default(4096)
    .describe('Max bytes of processed text to return (replaces windowSize)'),
  process: z
    .boolean()
    .optional()
    .default(true)
    .describe('Process content automatically by Content-Type (HTML->text, JSON pretty, etc.)'),
  summarize: z
    .boolean()
    .optional()
    .default(true)
    .describe('Generate a short extractive summary of processed text'),
  summaryMaxSentences: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Max number of sentences in summary'),
  summaryMaxChars: z
    .number()
    .int()
    .min(50)
    .max(2000)
    .optional()
    .default(500)
    .describe('Max characters in summary'),
  search: z
    .string()
    .optional()
    .describe('Search pattern (string or regex depending on searchIsRegex)'),
  searchIsRegex: z
    .boolean()
    .optional()
    .default(false)
    .describe('Interpret search as regular expression'),
  caseSensitive: z.boolean().optional().default(false).describe('Case-sensitive search'),
  context: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(2)
    .describe('Lines of context around matches (-C)'),
  before: z
    .number()
    .int()
    .min(0)
    .max(50)
    .optional()
    .describe('Lines of context before match (-B). Overrides context when set'),
  after: z
    .number()
    .int()
    .min(0)
    .max(50)
    .optional()
    .describe('Lines of context after match (-A). Overrides context when set'),
  maxMatches: z
    .number()
    .int()
    .min(1)
    .max(2000)
    .optional()
    .default(20)
    .describe('Maximum number of matches to return'),
  includeRawPreview: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include a small preview of raw bytes'),
  rawPreviewSize: z
    .number()
    .int()
    .min(1)
    .max(8192)
    .optional()
    .default(1024)
    .describe('Raw preview size in bytes'),
});

export type FetchParams = z.infer<typeof FetchParamsSchema>;

// list-fetch-cache tool用のパラメータ
export const ListFetchCacheParamsSchema = z.object({
  requestId: z.string().optional().describe('Filter by specific request ID'),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe('Page number for pagination (1-based)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe('Number of results per page (max 100, default 10)'),
});

export type ListFetchCacheParams = z.infer<typeof ListFetchCacheParamsSchema>;

// get-fetch-cache tool用のパラメータ
export const GetFetchCacheParamsSchema = z.object({
  requestId: z.string().describe('Request ID to retrieve'),
  includeHeaders: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include response headers (rawChunk mode only)'),
  mode: z
    .enum(['text', 'rawChunk'])
    .optional()
    .default('text')
    .describe('View mode: processed text view or raw byte chunk view'),

  // rawChunk mode
  startPosition: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Starting byte position (rawChunk mode)'),
  size: z
    .number()
    .int()
    .min(1)
    .max(1024 * 1024)
    .optional()
    .default(4096)
    .describe('Number of bytes to retrieve (rawChunk mode, max 1MB)'),

  // text mode processing options (mirror FetchParams)
  outputSize: z
    .number()
    .int()
    .min(1)
    .max(32768)
    .optional()
    .default(4096)
    .describe('Max bytes of processed text to return'),
  process: z
    .boolean()
    .optional()
    .default(true)
    .describe('Process content automatically by Content-Type'),
  summarize: z.boolean().optional().default(true).describe('Generate a short extractive summary'),
  summaryMaxSentences: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Max number of sentences in summary'),
  summaryMaxChars: z
    .number()
    .int()
    .min(50)
    .max(2000)
    .optional()
    .default(500)
    .describe('Max characters in summary'),
  search: z.string().optional().describe('Search pattern'),
  searchIsRegex: z
    .boolean()
    .optional()
    .default(false)
    .describe('Interpret search as regular expression'),
  caseSensitive: z.boolean().optional().default(false).describe('Case-sensitive search'),
  context: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(2)
    .describe('Lines of context around matches (-C)'),
  before: z
    .number()
    .int()
    .min(0)
    .max(50)
    .optional()
    .describe('Lines of context before match (-B). Overrides context when set'),
  after: z
    .number()
    .int()
    .min(0)
    .max(50)
    .optional()
    .describe('Lines of context after match (-A). Overrides context when set'),
  maxMatches: z
    .number()
    .int()
    .min(1)
    .max(2000)
    .optional()
    .default(20)
    .describe('Maximum number of matches to return'),
});

export type GetFetchCacheParams = z.infer<typeof GetFetchCacheParamsSchema>;
