import express from "express";
import { searchEngine, SearchParamsSchema } from "./search";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const server = new McpServer({
    name: "google-search-server",
    version: "1.0.0",
});

server.tool(
    "google-search",
    "Perform a web search using Google Custom Search API for efficient results.",
    SearchParamsSchema.shape, // Revert to using .shape for compatibility
    async (params) => {
        const validatedParams = SearchParamsSchema.parse(params);
        const results = await searchEngine(validatedParams);
        return {
            content: results.map((item) => ({
                type: "text",
                text: JSON.stringify(item),
            })),
        };
    }
);

app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    res.on("close", () => {
        transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Streamable HTTP MCP Server is running on port ${port}`);
});
