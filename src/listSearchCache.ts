import { cacheManager } from "./cache";
import { ListSearchCacheParams } from "./types";
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

export async function listSearchCache(params: ListSearchCacheParams) {
    try {
        const { keyword, page = 1, limit = 10 } = params;
        
        logger.info(`Retrieving search cache list: keyword="${keyword || 'none'}", page=${page}, limit=${limit}`);
        
        const result = cacheManager.listSearchHistory({
            keyword,
            page,
            limit
        });
        
        return result;
    } catch (error) {
        logger.error("Error retrieving search cache:", error);
        return {
            error: true,
            message: "Failed to retrieve search cache",
        };
    }
}
