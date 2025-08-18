import { cacheManager } from "./cache";
import { GetSearchResultParams } from "./types";
import { logger } from "./logger";

// using simple stderr logger

export async function getSearchResult(params: GetSearchResultParams) {
    const { resultId } = params;

    try {
        logger.info(`Retrieving search result for resultId: ${resultId}`);
        const result = cacheManager.getByResultId(resultId);
        
        if (!result) {
            return {
                error: true,
                message: "Search result not found or expired. The result ID may be invalid or the cache may have expired.",
            };
        }
        
        return result;
    } catch (error) {
        logger.error("Error retrieving search result:", error);
        return {
            error: true,
            message: "Failed to retrieve search result",
        };
    }
}
