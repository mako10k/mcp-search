import { cacheManager } from "./cache";
import { ListSearchCacheParams } from "./types";
import { logger } from "./logger";

// using simple stderr logger

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
