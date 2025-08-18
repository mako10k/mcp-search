#!/usr/bin/env node

// STDIOモードをデフォルトとして起動
// コマンドライン引数で --http を指定するとHTTPモードで起動
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const useHttp = args.includes('--http');

  if (useHttp) {
    // HTTPモードで起動
    await import('./http.js');
  } else {
    // STDIOモード（デフォルト）で起動
    await import('./stdio.js');
  }
}

main().catch((error) => {
  console.error('Failed to start MCP Search Server:', error);
  process.exit(1);
});
