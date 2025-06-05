import express from "express";
import { searchEngine, SearchParamsSchema } from "./search";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import winston from "winston";

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

        if (Array.isArray(results)) {
            return {
                content: results.map((item) => ({
                    type: "text",
                    text: JSON.stringify(item),
                })),
            };
        } else if (results.error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${results.message} (Status: ${results.status || "unknown"})`,
                }],
            };
        } else {
            throw new Error("Unexpected response format.");
        }
    }
);

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

app.use((req, res, next) => {
    logger.info(`Access log: ${req.method} ${req.url}`);
    next();
});

app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    res.on("close", () => {
        transport.close();
    });

    logger.info("MCP request received:", req.body);

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        logger.info("MCP response sent successfully.");
    } catch (error: any) {
        logger.info("MCP request error:", error.message);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Streamable HTTP MCP Server is running on port ${port}`);
}).on("error", (err) => {
    logger.error(`Failed to bind server on port ${port}:`, err.message);
});
