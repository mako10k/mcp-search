import { fetchCacheManager } from "./fetchCache";
import { ListFetchCacheParams } from "./types";
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

export async function listFetchCache(params: ListFetchCacheParams) {
    const { requestId, page, limit } = params;

    try {
        logger.info("Retrieving fetch cache list", { requestId, page, limit });
        
        const result = fetchCacheManager.listFetchHistory(requestId, page, limit);
        
        logger.info(`Fetch cache list retrieved: ${result.requests.length}/${result.totalCount} entries`);
        return result;

    } catch (error) {
        logger.error("Error retrieving fetch cache list:", error);
        return {
            error: true,
            message: "Failed to retrieve fetch cache list",
        };
    }
}
