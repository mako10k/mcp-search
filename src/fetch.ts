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

    logger.info(`Fetch requested: ${method} ${url}`);
    const result = await fetchCacheManager.fetchAndCache(
        url,
        method,
        headers,
        windowSize,
        timeout,
        includeResponseHeaders
    );

    // fetchCacheManagerは詳細なエラー情報を返すため、そのまま返却
    logger.info(`Fetch completed (or errored): ${result.requestId}`);
    return result;
}
