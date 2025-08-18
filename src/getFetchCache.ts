import { fetchCacheManager } from './fetchCache';
import type { GetFetchCacheParams } from './types';
import { logger } from './logger';

// using simple stderr logger

export async function getFetchCache(
  params: GetFetchCacheParams & { resourceUri?: unknown; viewMode?: 'summary' | 'full' },
) {
  const {
    requestId: requestIdRaw,
    includeHeaders,
    mode = 'text',
    startPosition,
    size,
    outputSize,
    process,
    summarize,
    summaryMaxSentences,
    summaryMaxChars,
    search,
    searchIsRegex,
    caseSensitive,
    context,
    before,
    after,
    maxMatches,
    viewMode,
  } = params;

  // Derive requestId from resourceUri if provided and requestId missing
  let requestId = requestIdRaw;
  if (!requestId && params.resourceUri) {
    const uri = String(params.resourceUri as string);
    try {
      const u = new URL(uri);
      if (u.protocol.startsWith('fetch')) {
        requestId = u.host || u.pathname.replace(/^\/+/, '');
      }
    } catch {
      requestId = uri.replace(/^fetch:\/\//, '').replace(/^\/+/, '');
    }
  }

  try {
    logger.info(`Retrieving fetch cache data: ${requestId}`, {
      startPosition,
      size,
      includeHeaders,
    });

    const result =
      mode === 'rawChunk'
        ? fetchCacheManager.getFetchData(requestId, includeHeaders, startPosition, size)
        : fetchCacheManager.getProcessedView(requestId, {
            outputSize: viewMode === 'full' ? Number.MAX_SAFE_INTEGER : outputSize,
            process,
            summarize: viewMode === 'summary' ? true : summarize,
            summaryMaxSentences,
            summaryMaxChars,
            search,
            searchIsRegex,
            caseSensitive,
            context,
            before,
            after,
            maxMatches,
          });

    if (!result) {
      return {
        error: true,
        message:
          'Fetch cache not found or expired. The request ID may be invalid or the cache may have expired.',
      };
    }

    if (mode === 'rawChunk') {
      const raw = result as {
        requestId: string;
        url: string;
        httpStatus?: number;
        contentSize: number;
        startPosition: number;
        dataSize: number;
        data: string;
        hasMore: boolean;
      };
      logger.info(
        `Fetch cache raw chunk retrieved: ${raw.dataSize} bytes from position ${raw.startPosition}`,
      );
      return raw;
    } else {
      const view = result as {
        requestId: string;
      };
      logger.info(`Fetch cache processed view retrieved: requestId=${view.requestId}`);
      return view;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Error retrieving fetch cache data:', msg);
    return {
      error: true,
      message: 'Failed to retrieve fetch cache data',
    };
  }
}
