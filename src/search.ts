import axios from "axios";
import dotenv from "dotenv";
import { z } from "zod";
import winston from "winston";

dotenv.config();

const SearchParamsSchema = z.object({
    q: z.string()
        .describe("The search query to perform"),
    lr: z.enum(["en", "ja", "es", "fr", "de", "zh", "ru", "ar", "pt", "it"])
        .optional()
        .describe("The language for the search results (ISO 639-1 codes). Should only be used if explicitly requested by the user or deemed necessary by the AI model."),
    cr: z.enum(["US", "JP", "ES", "FR", "DE", "CN", "RU", "AR", "BR", "IT"])
        .optional()
        .describe("The region for the search results (ISO 3166-1 alpha-2 codes). Should only be used for region-specific software development or when explicitly requested by the user."),
    num: z.number()
        .optional()
        .describe("The number of search results to return (1..10)."),
    start: z.number()
        .optional()
        .describe("The starting index for search results (1..(100-num))."),
    searchType: z.enum(["web", "image"])
        .optional()
        .describe("Specify the type of search to perform (web or image)."),
    imgSize: z.enum(["small", "medium", "large"])
        .optional()
        .describe("Specify the size of images to return (small, medium, large)."),
    imgType: z.enum(["clipart", "photo", "lineart"])
        .optional()
        .describe("Specify the type of images to return (clipart, photo, lineart)."),
    imgColorType: z.enum(["black", "white", "red", "blue", "green", "yellow"])
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

export async function searchEngine(params: z.infer<typeof SearchParamsSchema>): Promise<any[] | { error: boolean; status?: number; message: string }> {
    const { q, lr, cr, num, start, searchType, imgSize, imgType, imgColorType } = params;

    // Input validation
    if (!q || typeof q !== "string" || q.trim() === "") {
        throw new Error("Query parameter is required and must be a non-empty string.");
    }

    if (num && (num < 1 || num > 10)) {
        throw new Error("num must be between 1 and 10.");
    }

    if (start && (start < 1 || start > 100 - (num || 10))) {
        throw new Error("start must be between 1 and (100 - num). Ensure the value is within the valid range.");
    }

    if (imgSize && !["small", "medium", "large"].includes(imgSize)) {
        throw new Error("Invalid imgSize parameter. Allowed values are 'small', 'medium', 'large'.");
    }

    if (imgType && !["clipart", "photo", "lineart"].includes(imgType)) {
        throw new Error("Invalid imgType parameter. Allowed values are 'clipart', 'photo', 'lineart'.");
    }

    if (imgColorType && !["black", "white", "red", "blue", "green", "yellow"].includes(imgColorType)) {
        throw new Error("Invalid imgColorType parameter. Allowed values are 'black', 'white', 'red', 'blue', 'green', 'yellow'.");
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCx = process.env.GOOGLE_CX;

    if (!googleApiKey || !googleCx) {
        throw new Error("Google API key or CX is not set in environment variables.");
    }

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.append("q", q);
    url.searchParams.append("key", googleApiKey);
    url.searchParams.append("cx", googleCx);

    if (lr) {
        url.searchParams.append("lr", `lang_${lr}`);
    }

    if (cr) {
        url.searchParams.append("cr", `country${cr}`);
    }

    if (num) {
        url.searchParams.append("num", num.toString());
    }

    if (start) {
        url.searchParams.append("start", start.toString());
    }

    if (searchType) {
        url.searchParams.append("searchType", searchType);
    }

    if (imgSize) {
        url.searchParams.append("imgSize", imgSize);
    }

    if (imgType) {
        url.searchParams.append("imgType", imgType);
    }

    if (imgColorType) {
        url.searchParams.append("imgColorType", imgColorType);
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

        return response.data.items;
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
