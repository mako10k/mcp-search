import { fetchCacheManager } from "./fetchCache";
import { GetFetchCacheParams } from "./types";
import winston from "winston";

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

export async function getFetchCache(params: GetFetchCacheParams) {
    const {
        requestId,
        includeHeaders,
        mode = "text",
        startPosition,
        size,
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
    } = params;

    try {
        logger.info(`Retrieving fetch cache data: ${requestId}`, { 
            startPosition, 
            size, 
            includeHeaders 
        });
        
        const result = mode === 'rawChunk'
            ? fetchCacheManager.getFetchData(requestId, includeHeaders, startPosition, size)
            : fetchCacheManager.getProcessedView(requestId, {
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
            });

        if (!result) {
            return {
                error: true,
                message: "Fetch cache not found or expired. The request ID may be invalid or the cache may have expired.",
            };
        }

        if (mode === 'rawChunk') {
            logger.info(`Fetch cache raw chunk retrieved: ${(result as any).dataSize} bytes from position ${(result as any).startPosition}`);
            return result;
        } else {
            logger.info(`Fetch cache processed view retrieved: requestId=${(result as any).requestId}`);
            return result;
        }

    } catch (error) {
        logger.error("Error retrieving fetch cache data:", error);
        return {
            error: true,
            message: "Failed to retrieve fetch cache data",
        };
    }
}
