import dotenv from 'dotenv';

dotenv.config();

// 環境変数から1ファイル当たりの最大フェッチサイズを取得（デフォルト: 4MB）
export const getMaxFileSize = (): number => {
  const envValue = process.env.MAX_FILE_SIZE;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 4 * 1024 * 1024; // 4MB default
};

// 環境変数から全データの総量制限を取得（デフォルト: 100MB）
export const getMaxTotalCacheSize = (): number => {
  const envValue = process.env.MAX_TOTAL_CACHE_SIZE;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 100 * 1024 * 1024; // 100MB default
};

export const MAX_FILE_SIZE = getMaxFileSize();
export const MAX_TOTAL_CACHE_SIZE = getMaxTotalCacheSize();
