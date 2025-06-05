import express from "express";
import { googleSearch } from "./google-search";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const app = express();
app.use(express.json());

const server = new McpServer({
    name: "google-search-server",
    version: "1.0.0",
});

server.tool(
    "googleSearch",
    "Perform a Google search",
    {
        query: z.string().describe("The search query to perform on Google"),
    },
    async (params) => {
        const { query } = params;
        const results = await googleSearch(query);
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
