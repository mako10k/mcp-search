import axios from "axios";
import dotenv from "dotenv";
import { z } from "zod";

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

export async function searchEngine(params: z.infer<typeof SearchParamsSchema>): Promise<any[]> {
    const { query, language, region, numResults, startIndex, imageSearch, imageSize, imageType, imageColor } = params;
    if (numResults && (numResults < 1 || numResults > 10)) {
        throw new Error("numResults must be between 1 and 10.");
    }
    if (startIndex && (startIndex < 1 || startIndex > 100 - (numResults || 10))) {
        throw new Error("startIndex must be between 1 and (100 - numResults).");
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
        return response.data.items;
    } catch (error: any) {
        throw new Error(`Failed to fetch search results: ${error.message}`);
    }
}

export { SearchParamsSchema };
