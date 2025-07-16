#!/usr/bin/env node

import * as path from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

// メイン実行ファイルのパス
const mainScript = path.join(__dirname, 'index.js');

// 引数の処理
const args = process.argv.slice(2);

// ヘルプメッセージ
function showHelp() {
    console.log(`
MCP Search Server

Usage:
  npx mcp-search [options]

Options:
  --http           Start in HTTP mode (default: STDIO mode)
  --port <port>    Set server port for HTTP mode (default: 3000)
  --help           Show this help message
  --version        Show version

Transport Modes:
  STDIO (default)  Model Context Protocol via standard input/output
  HTTP             HTTP server mode with /mcp endpoint

Environment Variables:
  GOOGLE_API_KEY           Google Custom Search API key (required)
  GOOGLE_CX               Google Custom Search Engine ID (required)
  PORT                    Server port (default: 3000)
  MAX_FILE_SIZE           Max file size per fetch (default: 4MB)
  MAX_TOTAL_CACHE_SIZE    Max total cache size (default: 100MB)

Examples:
  npx mcp-search                    # Start in STDIO mode (default)
  npx mcp-search --http             # Start in HTTP mode
  npx mcp-search --http --port 8080 # HTTP mode with custom port
  PORT=8080 npx mcp-search --http   # HTTP mode with environment port

MCP Client Configuration (STDIO):
  {
    "command": "npx",
    "args": ["mcp-search"],
    "type": "stdio"
  }

MCP Client Configuration (HTTP):
  {
    "url": "http://localhost:3000/mcp",
    "type": "http"
  }

Tools available:
  - google-search: Execute Google Custom Search with caching
  - list-search-cache: List cached search history
  - get-search-result: Get individual search results
  - fetch: Fetch web content with caching
  - list-fetch-cache: List cached fetch requests
  - get-fetch-cache: Get cached fetch data with pagination

Setup:
  1. Copy .env.example to .env
  2. Configure your Google API credentials
  3. Run the server

For more information, visit: https://github.com/mako10k/mcp-search
`);
}

// バージョン表示
function showVersion() {
    try {
        const packageJsonPath = path.join(__dirname, '../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`mcp-search v${packageJson.version}`);
    } catch (error) {
        console.log('mcp-search');
    }
}

// 引数解析
if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
}

// ポート設定とHTTPモード判定
let portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
    process.env.PORT = args[portIndex + 1];
}

const httpMode = args.includes('--http');

// メインスクリプトが存在するかチェック
if (!fs.existsSync(mainScript)) {
    console.error('Error: Server script not found. Please run "npm run build" first.');
    process.exit(1);
}

// 環境設定チェック
if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    console.warn('Warning: GOOGLE_API_KEY and GOOGLE_CX environment variables are required.');
    console.warn('Please create a .env file based on .env.example');
    console.warn('');
}

if (httpMode) {
    console.log('Starting MCP Search Server in HTTP mode...');
    console.log(`Port: ${process.env.PORT || 3000}`);
} else {
    console.log('Starting MCP Search Server in STDIO mode...');
}
console.log('');

// 引数を準備（--httpがある場合は渡す）
const serverArgs = httpMode ? ['--http'] : [];

// メインスクリプトを実行
const child = spawn('node', [mainScript, ...serverArgs], {
    stdio: 'inherit',
    env: process.env
});

// プロセス終了処理
child.on('close', (code) => {
    process.exit(code || 0);
});

// シグナルハンドリング
process.on('SIGINT', () => {
    child.kill('SIGINT');
});

process.on('SIGTERM', () => {
    child.kill('SIGTERM');
});
