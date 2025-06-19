import { fetchCacheManager } from "./fetchCache";
import { FetchParams } from "./types";
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

export async function fetchUrl(params: FetchParams) {
    const { 
        url, 
        method, 
        headers, 
        windowSize, 
        timeout, 
        includeResponseHeaders 
    } = params;

    try {
        logger.info(`Fetch requested: ${method} ${url}`);
        
        const result = await fetchCacheManager.fetchAndCache(
            url,
            method,
            headers,
            windowSize,
            timeout,
            includeResponseHeaders
        );

        logger.info(`Fetch completed: ${result.requestId}`);
        return result;

    } catch (error) {
        logger.error("Error executing fetch:", error);
        return {
            error: true,
            message: "Failed to execute fetch request",
        };
    }
}
