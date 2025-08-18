import { cacheManager } from './cache';
import type { GetSearchResultParams } from './types';
import { logger } from './logger';

// using simple stderr logger

export async function getSearchResult(params: GetSearchResultParams & { resourceUri?: unknown }) {
  let { resultId } = params;
  // Allow resourceUri like search-result://{resultId}
  if (!resultId && params.resourceUri) {
    const uri = String(params.resourceUri as string);
    try {
      const u = new URL(uri);
      // If scheme is search-result, use host or path
      if (u.protocol.startsWith('search-result')) {
        resultId = u.host || u.pathname.replace(/^\/+/, '');
      }
    } catch {
      // Fallback simple parse
      resultId = uri.replace(/^search-result:\/\//, '').replace(/^\/+/, '');
    }
  }

  try {
    logger.info(`Retrieving search result for resultId: ${resultId}`);
    const result = cacheManager.getByResultId(resultId);

    if (!result) {
      return {
        error: true,
        message:
          'Search result not found or expired. The result ID may be invalid or the cache may have expired.',
      };
    }

    return result;
  } catch (error) {
    logger.error('Error retrieving search result:', error);
    return {
      error: true,
      message: 'Failed to retrieve search result',
    };
  }
}
