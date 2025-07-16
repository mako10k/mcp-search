#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer, logger } from "./server.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    // 環境変数のチェック
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
        logger.warn('Warning: GOOGLE_API_KEY and GOOGLE_CX environment variables are required.');
        logger.warn('Please create a .env file based on .env.example');
        // STDIOモードではプロセスを継続（エラーが起きたときに具体的なエラーが返る）
    }

    try {
        // MCPサーバーを作成
        const server = createMcpServer();
        
        // STDIOトランスポートを作成
        const transport = new StdioServerTransport();
        
        logger.info("MCP Search Server starting in STDIO mode...");
        
        // サーバーに接続
        await server.connect(transport);
        
        logger.info("MCP Search Server is ready and listening on STDIO");
        
    } catch (error: any) {
        logger.error("Failed to start MCP Search Server:", error.message);
        process.exit(1);
    }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// メイン関数を実行
main().catch((error) => {
    logger.error("Unexpected error in main:", error);
    process.exit(1);
});
