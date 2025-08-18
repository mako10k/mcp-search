# MCP Search

A powerful Google Custom Search and Web Fetch MCP (Model Context Protocol) server that provides search functionality and web fetch capabilities using MCP.

## Quick Start

### STDIO Mode (Default - Recommended for MCP)

The easiest way to get started with MCP clients is using STDIO mode:

```bash
# Set up environment variables first
export GOOGLE_API_KEY="your_google_api_key"
export GOOGLE_CX="your_google_cx_id"

# Run the MCP server (STDIO mode is default)
npx @mako10k/mcp-search
```

### HTTP Mode (Alternative)

For HTTP-based integration:

```bash
# Start in HTTP mode
npx @mako10k/mcp-search --http

# Or with custom port
npx @mako10k/mcp-search --http --port 8080
```

### MCP Client Configuration

**For STDIO transport (recommended):**
```json
{
  "command": "npx",
  "args": ["@mako10k/mcp-search"],
  "type": "stdio"
}
```

**For HTTP transport:**
```json
{
  "url": "http://localhost:3000/mcp",
  "type": "http"
}
```

For command help:
```bash
npx @mako10k/mcp-search --help
```

### Command Options

The `mcp-search` package can be run directly using npx without installation:

```bash
npx @mako10k/mcp-search [options]
```

**Transport Options:**
- Default: STDIO mode (recommended for MCP clients)
- `--http`: Enable HTTP mode with /mcp endpoint

**Configuration Options:**
- `--port <number>`: Specify the server port for HTTP mode (default: 3000)
- `--help`: Show help information
- `--version`: Show version information

**Examples:**
```bash
# STDIO mode (default)
npx @mako10k/mcp-search

# HTTP mode
npx @mako10k/mcp-search --http

# HTTP mode with custom port
npx @mako10k/mcp-search --http --port 8080

# One-liner with environment variables
GOOGLE_API_KEY="your_key" GOOGLE_CX="your_cx" npx @mako10k/mcp-search
```

Note: The server listens on a port only in HTTP mode. In STDIO mode (default), no port is used.

## Features

### Google Search Tools
- **google-search**: Execute Google Custom Search with caching
- **list-search-cache**: List cached search history with keyword filtering and pagination
- **get-search-result**: Retrieve individual search results by ID

### Web Fetch Tools
- **fetch**: Fetch web content with customizable options and caching
- **list-fetch-cache**: List cached fetch requests
- **get-fetch-cache**: Retrieve cached fetch data with pagination

## MCP Configuration Examples

### VS Code MCP Configuration

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "mcp-search": {
      "command": "npx",
  "args": ["@mako10k/mcp-search"],
      "type": "stdio",
      "env": {
        "GOOGLE_API_KEY": "your_google_api_key",
        "GOOGLE_CX": "your_google_cx_id"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "mcp-search": {
      "command": "npx",
  "args": ["@mako10k/mcp-search"],
      "env": {
        "GOOGLE_API_KEY": "your_google_api_key",
        "GOOGLE_CX": "your_google_cx_id"
      }
    }
  }
}
```

### Cursor IDE Configuration

Add to your MCP configuration:

```json
{
  "servers": {
    "search": {
      "command": "npx",
  "args": ["@mako10k/mcp-search"],
      "type": "stdio"
    }
  }
}
```

## Installation & Setup

### Option 1: Using npx (Recommended)

1. Set up environment variables:
   ```bash
   export GOOGLE_API_KEY="your_google_api_key"
   export GOOGLE_CX="your_google_cx_id"
   ```

2. Run the server:
   ```bash
   # STDIO mode (default - recommended for MCP clients)
  npx @mako10k/mcp-search
   
   # OR HTTP mode (for custom integrations)
  npx @mako10k/mcp-search --http
   ```

### Option 2: Local Development

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/mako10k/mcp-search
   cd mcp-search
   npm install
   ```

2. Set up environment variables by copying the example file:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your actual values:
   ```
   GOOGLE_API_KEY=your_actual_google_api_key
   GOOGLE_CX=your_actual_google_cx_id
   PORT=3000
   MAX_FILE_SIZE=4194304
   MAX_TOTAL_CACHE_SIZE=104857600
   ```

3. Build and run:
   ```bash
   npm run build
   npm start
   ```

### Environment Variables

- `GOOGLE_API_KEY`: Your Google Custom Search API key (required)
  - Get from: https://developers.google.com/custom-search/v1/introduction
- `GOOGLE_CX`: Your Google Custom Search Engine ID (required)
  - Create and get from: https://cse.google.com/
- `PORT`: Server port for HTTP mode only (default: 3000). Not used in STDIO mode.
- `MAX_FILE_SIZE`: Maximum size per fetch request in bytes (default: 4MB = 4194304 bytes)
- `MAX_TOTAL_CACHE_SIZE`: Maximum total cache size in bytes (default: 100MB = 104857600 bytes)

Note: These control internal cache limits, separate from model data window sizes.

## Package Information

This package is published to npm as `@mako10k/mcp-search`.

Ways to use:
- Direct execution with npx: `npx @mako10k/mcp-search`
- Global installation: `npm install -g @mako10k/mcp-search` then run `mcp-search`
- Local dependency: `npm install @mako10k/mcp-search`

The CLI binary name is `mcp-search`. The package includes TypeScript definitions and supports both CommonJS and ES modules.

## Development

Use the following command for development:
```bash
npm run dev
```

## API Specification

### Google Search Tools

#### google-search
Execute a Google Custom Search query and cache the results.

**Parameters:**
- `query` (string, required): Search query
- `language` (string, optional): Language for search results (ISO 639-1)
- `region` (string, optional): Region for search results (ISO 3166-1 alpha-2)
- `numResults` (number, optional): Number of results (1-10, default: 10)
- `startIndex` (number, optional): Starting index for results
- `imageSearch` (boolean, optional): Enable image search mode
- `imageSize`, `imageType`, `imageColor` (string, optional): Image search filters

**Response:**
- Search summary with searchId, resultCount, timestamp, and result previews
- Full results cached for detailed retrieval

#### list-search-cache
List cached search queries with filtering and pagination.

**Parameters:**
- `keyword` (string, optional): Filter searches by keyword (case-insensitive)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (1-100, default: 10)

**Response:**
- Array of search metadata (searchId, query, timestamp, resultCount, expiresAt)
- Pagination information (totalCount, currentPage, totalPages, hasNextPage, hasPreviousPage)

#### get-search-result
Retrieve a specific search result by result ID.

**Parameters:**
- `resultId` (string, required): Unique identifier for the search result

**Response:**
- Complete search result data including title, link, snippet, and raw data

### Web Fetch Tools

#### fetch
Fetch content from a specified URL with customizable options and caching.

**Parameters:**
- `url` (string, required): Target URL to fetch
- `method` (string, optional): HTTP method (GET, POST, PUT, DELETE, etc. - default: GET)
- `headers` (object, optional): Custom HTTP headers
- `windowSize` (number, optional): Response data window size in bytes for model consumption (max: 32KB = 32768, default: 4096)
- `timeout` (number, optional): Request timeout in milliseconds (min: 100, max: 600000, default: 30000)
- `includeResponseHeaders` (boolean, optional): Include response headers in output (default: false)

**Response:**
- `requestId` (string): Unique identifier for this fetch request
- `status` (number): HTTP status code
- `statusText` (string): HTTP status message
- `contentSize` (number): Total content size if known from Content-Length header
- `actualSize` (number): Actual size of fetched data
- `data` (string): Response content (up to windowSize bytes)
- `isComplete` (boolean): Whether the entire response was fetched
- `responseHeaders` (object, optional): Response headers if requested
- `error` (string, optional): Error message for errors (network/timeout/HTTP>=400)
- `errorCode` (string, optional): Platform error code for network/connection issues (e.g., ENOTFOUND, ECONNREFUSED, ETIMEDOUT)

Notes:
- On redirects, if the final response host differs from the requested host, statusText includes a warning suffix: `(warning: host mismatch)`.

**Caching Behavior:**
- All responses are cached regardless of status code
- Cache includes full response data and metadata
- Cache entries have 1-hour expiry with LRU eviction
- Non-200 responses are cached with error information

#### list-fetch-cache
List cached fetch requests with their status and progress information.

**Parameters:**
- `requestId` (string, optional): Filter by specific request ID
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (1-100, default: 10)

**Response:**
- Array of fetch metadata:
  - `requestId` (string): Unique request identifier
  - `url` (string): Original request URL
  - `method` (string): HTTP method used
  - `status` (string): Cache status ("Completed" or "InProgress")
  - `httpStatus` (number): HTTP response status code
  - `expectedSize` (number): Expected content size from headers
  - `fetchedSize` (number): Actually fetched data size
  - `timestamp` (string): Request timestamp
  - `expiresAt` (string): Cache expiry timestamp
- Pagination information

#### get-fetch-cache
Retrieve cached fetch data with byte-level pagination support.

**Parameters:**
- `requestId` (string, required): Request ID to retrieve
- `includeHeaders` (boolean, optional): Include response headers (default: false)
- `startPosition` (number, optional): Starting byte position (default: 0)
- `size` (number, optional): Number of bytes to retrieve for model consumption (max: 1MB, default: 4096)

**Response:**
- `requestId` (string): Request identifier
- `url` (string): Original request URL
- `httpStatus` (number): HTTP response status
- `contentSize` (number): Total content size
- `startPosition` (number): Starting position of returned data
- `dataSize` (number): Size of returned data chunk
- `data` (string): Response content chunk
- `hasMore` (boolean): Whether more data is available
- `responseHeaders` (object, optional): Response headers if requested
- `metadata` (object): Additional fetch metadata (method, timestamp, etc.)

**Byte-level Pagination:**
- Data can be retrieved in chunks using `startPosition` and `size` parameters
- Supports efficient access to large responses without loading entire content
- Default chunk size is 4096 bytes for model consumption
- Maximum chunk size is 1MB for model data
- Internal cache can store up to MAX_FETCH_SIZE bytes (configurable via environment variable)
