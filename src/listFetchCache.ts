import { fetchCacheManager } from './fetchCache';
import type { ListFetchCacheParams } from './types';
import { logger } from './logger';

// using simple stderr logger

export async function listFetchCache(params: ListFetchCacheParams) {
  const { requestId, page, limit } = params;

  try {
    logger.info('Retrieving fetch cache list', { requestId, page, limit });

    const result = fetchCacheManager.listFetchHistory(requestId, page, limit);

    logger.info(
      `Fetch cache list retrieved: ${result.requests.length}/${result.totalCount} entries`,
    );
    return result;
  } catch (error) {
    logger.error('Error retrieving fetch cache list:', error);
    return {
      error: true,
      message: 'Failed to retrieve fetch cache list',
    };
  }
}
