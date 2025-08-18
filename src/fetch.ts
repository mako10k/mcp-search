import { fetchCacheManager } from "./fetchCache";
import { FetchParams } from "./types";
import { logger } from "./logger";

// using simple stderr logger

export async function fetchUrl(params: FetchParams) {
    const {
        url,
        method,
        headers,
        timeout,
        includeResponseHeaders,
        outputSize,
        process,
        summarize,
        summaryMaxSentences,
        summaryMaxChars,
        search,
        searchIsRegex,
        caseSensitive,
        context,
        before,
        after,
        maxMatches,
        includeRawPreview,
        rawPreviewSize,
    } = params;

    logger.info(`Fetch requested: ${method} ${url}`);
    const result = await fetchCacheManager.fetchAndCache(
        url,
        method,
        headers,
        outputSize,
        timeout,
        includeResponseHeaders,
        {
            process,
            summarize,
            summaryMaxSentences,
            summaryMaxChars,
            search,
            searchIsRegex,
            caseSensitive,
            context,
            before,
            after,
            maxMatches,
            includeRawPreview,
            rawPreviewSize,
        }
    );

    // fetchCacheManagerは詳細なエラー情報を返すため、そのまま返却
    logger.info(`Fetch completed (or errored): ${result.requestId}`);
    return result;
}
