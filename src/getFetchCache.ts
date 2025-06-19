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
    const { requestId, includeHeaders, startPosition, size } = params;

    try {
        logger.info(`Retrieving fetch cache data: ${requestId}`, { 
            startPosition, 
            size, 
            includeHeaders 
        });
        
        const result = fetchCacheManager.getFetchData(
            requestId,
            includeHeaders,
            startPosition,
            size
        );

        if (!result) {
            return {
                error: true,
                message: "Fetch cache not found or expired. The request ID may be invalid or the cache may have expired.",
            };
        }

        logger.info(`Fetch cache data retrieved: ${result.dataSize} bytes from position ${result.startPosition}`);
        return result;

    } catch (error) {
        logger.error("Error retrieving fetch cache data:", error);
        return {
            error: true,
            message: "Failed to retrieve fetch cache data",
        };
    }
}
