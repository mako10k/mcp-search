import { z } from "zod";

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
