import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function googleSearch(query: string): Promise<any[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!apiKey || !cx) {
        throw new Error("Google API key or CX is not set in environment variables.");
    }

    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;
    const response = await axios.get(url);

    return response.data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
    }));
}
