import axios from "axios";
import dotenv from "dotenv";
import { z } from "zod";
import winston from "winston";
import { cacheManager, SearchResponse } from "./cache";

dotenv.config();

const SearchParamsSchema = z.object({
    query: z.string()
        .describe("The search query to perform"),
    language: z.enum(["en", "ja", "es", "fr", "de", "zh", "ru", "ar", "pt", "it"])
        .optional()
        .describe("The language for the search results (ISO 639-1 codes). Should only be used if explicitly requested by the user or deemed necessary by the AI model."),
    region: z.enum(["US", "JP", "ES", "FR", "DE", "CN", "RU", "AR", "BR", "IT"])
        .optional()
        .describe("The region for the search results (ISO 3166-1 alpha-2 codes). Should only be used for region-specific software development or when explicitly requested by the user."),
    numResults: z.number()
        .optional()
        .describe("The number of search results to return (1..10)."),
    startIndex: z.number()
        .optional()
        .describe("The starting index for search results (1..(100-numResults))."),
    imageSearch: z.boolean()
        .optional()
        .describe("Enable image search mode. If true, the search will return image results."),
    imageSize: z.enum(["small", "medium", "large"])
        .optional()
        .describe("Specify the size of images to return (small, medium, large)."),
    imageType: z.enum(["clipart", "photo", "lineart"])
        .optional()
        .describe("Specify the type of images to return (clipart, photo, lineart)."),
    imageColor: z.enum(["black", "white", "red", "blue", "green", "yellow"])
        .optional()
        .describe("Specify the dominant color of images to return (e.g., black, white, red)."),
});

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

export async function searchEngine(params: z.infer<typeof SearchParamsSchema>): Promise<SearchResponse | { error: boolean; status?: number; message: string }> {
    const { query, language, region, numResults, startIndex, imageSearch, imageSize, imageType, imageColor } = params;

    // Input validation
    if (!query || typeof query !== "string" || query.trim() === "") {
        throw new Error("Query parameter is required and must be a non-empty string.");
    }

    if (numResults && (numResults < 1 || numResults > 10)) {
        throw new Error("numResults must be between 1 and 10.");
    }

    if (startIndex && (startIndex < 1 || startIndex > 100 - (numResults || 10))) {
        throw new Error("startIndex must be between 1 and (100 - numResults). Ensure the value is within the valid range.");
    }

    if (imageSize && !["small", "medium", "large"].includes(imageSize)) {
        throw new Error("Invalid imageSize parameter. Allowed values are 'small', 'medium', 'large'.");
    }

    if (imageType && !["clipart", "photo", "lineart"].includes(imageType)) {
        throw new Error("Invalid imageType parameter. Allowed values are 'clipart', 'photo', 'lineart'.");
    }

    if (imageColor && !["black", "white", "red", "blue", "green", "yellow"].includes(imageColor)) {
        throw new Error("Invalid imageColor parameter. Allowed values are 'black', 'white', 'red', 'blue', 'green', 'yellow'.");
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCx = process.env.GOOGLE_CX;

    if (!googleApiKey || !googleCx) {
        throw new Error("Google API key or CX is not set in environment variables.");
    }

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.append("q", query);
    url.searchParams.append("key", googleApiKey);
    url.searchParams.append("cx", googleCx);

    if (language) {
        url.searchParams.append("lr", `lang_${language}`);
    }

    if (region) {
        url.searchParams.append("cr", `country${region}`);
    }

    if (numResults) {
        url.searchParams.append("num", numResults.toString());
    }

    if (startIndex) {
        url.searchParams.append("start", startIndex.toString());
    }

    if (imageSearch) {
        url.searchParams.append("searchType", "image");
    }

    if (imageSize) {
        url.searchParams.append("imgSize", imageSize);
    }

    if (imageType) {
        url.searchParams.append("imgType", imageType);
    }

    if (imageColor) {
        url.searchParams.append("imgColorType", imageColor);
    }

    try {
        const response = await axios.get(url.toString());

        // Check if response format is valid
        if (!response.data.items || !Array.isArray(response.data.items)) {
            logger.debug("Invalid response format detected:", {
                status: response.status,
                data: response.data,
            });

            if (response.data.searchInformation?.totalResults === "0") {
                logger.info("No results found for the query.");
                return {
                    error: true,
                    status: response.status,
                    message: "No results found for the query. Consider refining your search terms.",
                };
            }

            if (response.data.spelling?.correctedQuery) {
                logger.info(`No results found. Did you mean: ${response.data.spelling.correctedQuery}?`);
                return {
                    error: true,
                    status: response.status,
                    message: `No results found. Did you mean: ${response.data.spelling.correctedQuery}?`,
                };
            }

            logger.warn("Invalid response format: items must be an array.");
            return {
                error: true,
                status: response.status,
                message: "Invalid response format: items must be an array. Please verify the query parameters and ensure the Programmable Search Engine is correctly configured.",
            };
        }

        // キャッシュに保存して概要応答を返す
        const searchResponse = cacheManager.store(query, response.data.items);
        logger.info(`Search completed: ${searchResponse.resultCount} results cached with ID ${searchResponse.searchId}`);
        
        return searchResponse;
    } catch (error: any) {
        if (error.response) {
            logger.warn("API error response:", {
                status: error.response.status,
                data: error.response.data,
            });
            return {
                error: true,
                status: error.response.status,
                message: error.response.data.error?.message || "Unknown error from API. Please check the API key, CX, and query parameters.",
            };
        } else {
            logger.error("Network or server error:", error.message);
            return {
                error: true,
                message: `Network or server error: ${error.message}. Please ensure the server is reachable and the network connection is stable.`,
            };
        }
    }
}

export { SearchParamsSchema };
