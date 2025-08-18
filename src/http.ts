#!/usr/bin/env node

import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, logger } from './server.js';
import './env.js';

async function main() {
  // 環境変数のチェック
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    logger.warn('Warning: GOOGLE_API_KEY and GOOGLE_CX environment variables are required.');
    logger.warn('Please create a .env file based on .env.example');
    logger.warn('');
  }

  const app = express();
  app.use(express.json());

  // MCPサーバーを作成
  const server = createMcpServer();

  app.use((req, res, next) => {
    logger.info(`Access log: ${req.method} ${req.url}`);
    next();
  });

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close();
    });

    logger.info('MCP request received:', req.body);

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      logger.info('MCP response sent successfully.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.info('MCP request error:', msg);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  });

  const port = process.env.PORT || 3000;

  app
    .listen(port, () => {
      logger.info(`MCP Search Server is running in HTTP mode on port ${port}`);
    })
    .on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to bind server on port ${port}:`, msg);
      process.exit(1);
    });
}

// プロセス終了時のクリーンアップ
import { registerSignalHandlers } from './signals.js';
registerSignalHandlers();

// メイン関数を実行
main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error('Unexpected error in main:', msg);
  process.exit(1);
});
