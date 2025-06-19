# MCP Search

A powerful Google Custom Search and Web Fetch MCP (Model Context Protocol) server that provides search functionality and web fetch capabilities using MCP.

## Quick Start

The easiest way to get started is using npx:

```bash
# Set up environment variables first
export GOOGLE_API_KEY="your_google_api_key"
export GOOGLE_CX="your_google_cx_id"

# Run the MCP server
npx mcp-search
```

You can also specify a custom port:
```bash
npx mcp-search --port 8080
```

Or start with verbose logging:
```bash
npx mcp-search --verbose
```

For command help:
```bash
npx mcp-search --help
```

### Using npx Command

The `mcp-search` package can be run directly using npx without installation:

```bash
npx mcp-search [options]
```

**Command Options:**
- `--port <number>`: Specify the server port (default: 3000)
- `--verbose`: Enable verbose logging
- `--help`: Show help information
- `--version`: Show version information

**Examples:**
```bash
# Basic usage with environment variables
export GOOGLE_API_KEY="your_key"
export GOOGLE_CX="your_cx"
npx mcp-search

# Custom port with verbose logging
npx mcp-search --port 8080 --verbose

# One-liner with environment variables
GOOGLE_API_KEY="your_key" GOOGLE_CX="your_cx" npx mcp-search
```

The server will start and listen for MCP connections on the specified port.

## Features

### Google Search Tools
- **google-search**: Execute Google Custom Search with caching
- **list-search-cache**: List cached search history with keyword filtering and pagination
- **get-search-result**: Retrieve individual search results by ID

### Web Fetch Tools
- **fetch**: Fetch web content with customizable options and caching
- **list-fetch-cache**: List cached fetch requests
- **get-fetch-cache**: Retrieve cached fetch data with pagination

## Installation & Setup

### Option 1: Using npx (Recommended)

1. Set up environment variables:
   ```bash
   export GOOGLE_API_KEY="your_google_api_key"
   export GOOGLE_CX="your_google_cx_id"
   ```

2. Run the server:
   ```bash
   npx mcp-search
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
- `PORT`: Server port (default: 3000)
- `MAX_FILE_SIZE`: Maximum size per fetch request in bytes (default: 4MB = 4194304 bytes)
- `MAX_TOTAL_CACHE_SIZE`: Maximum total cache size in bytes (default: 100MB = 104857600 bytes)

Note: These control internal cache limits, separate from model data window sizes.

## Package Information

This package is published to npm as `google-search-mcp` and can be used in the following ways:

- **Direct execution with npx**: `npx mcp-search`
- **Global installation**: `npm install -g google-search-mcp && mcp-search`
- **Local dependency**: `npm install google-search-mcp`

The package includes TypeScript definitions and supports both CommonJS and ES modules.

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
- `windowSize` (number, optional): Response data window size in bytes for model consumption (max: 1MB, default: 4096)
- `timeout` (number, optional): Request timeout in milliseconds (default: 30000)
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
- `error` (string, optional): Error message for non-200 responses

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
