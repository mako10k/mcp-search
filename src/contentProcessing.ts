import { htmlToText } from 'html-to-text';

export type DetectedKind = 'html' | 'text' | 'json' | 'xml' | 'binary';

export function detectKind(contentType?: string | null): DetectedKind {
  if (!contentType) return 'binary';
  const ct = contentType.toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/xhtml+xml')) return 'html';
  if (ct.startsWith('text/')) return 'text';
  if (ct.includes('application/json')) return 'json';
  if (ct.includes('application/xml') || ct.includes('text/xml')) return 'xml';
  return 'binary';
}

// Removed unused helper bufferToUtf8 (dead code)

export function toText(buffer: Buffer, kind: DetectedKind): string {
  try {
    if (kind === 'html') {
      // Convert HTML to text, stripping scripts/styles
      return htmlToText(buffer.toString('utf-8'), {
        wordwrap: false,
        selectors: [
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
        ],
      });
    }
    if (kind === 'json') {
      const raw = buffer.toString('utf-8');
      try {
        const obj = JSON.parse(raw);
        return JSON.stringify(obj, null, 2);
      } catch {
        return raw; // Fallback to raw text if parse fails
      }
    }
    if (kind === 'text' || kind === 'xml') {
      return buffer.toString('utf-8');
    }
    // binary or unknown
    return '';
  } catch {
    return '';
  }
}

export function summarizeText(
  text: string,
  opts: { maxSentences: number; maxChars: number },
): string {
  const { maxSentences, maxChars } = opts;
  if (!text) return '';

  // Simple sentence split supporting JP punctuation
  const parts = text
    .split(/(?<=[。．！？!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const selected: string[] = [];
  for (const s of parts) {
    if (selected.length >= maxSentences) break;
    // Skip overly short/noisy lines
    const compact = s.replace(/\s+/g, '');
    if (compact.length < 3) continue;
    selected.push(s);
  }

  let summary = selected.join(' ');
  if (summary.length > maxChars) {
    summary = summary.slice(0, maxChars - 1) + '…';
  }
  return summary;
}

export type GrepMatch = {
  line: number;
  preview: string;
  before: string[];
  match: string;
  after: string[];
  ranges?: Array<{ start: number; end: number }>;
};

function collectRanges(
  lineText: string,
  re: RegExp,
  maxMatches: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  if (!lineText.length || maxMatches <= 0) return ranges;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lineText)) && ranges.length < 2000) {
    const start = m.index;
    const end = start + (m[0]?.length ?? 0);
    if (end > start) ranges.push({ start, end });
    if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loops
  }
  return ranges;
}

function buildPreview(
  lines: string[],
  idx: number,
  before: number,
  after: number,
): { beforeLines: string[]; afterLines: string[]; preview: string } {
  const startIdx = Math.max(0, idx - before);
  const endIdx = Math.min(lines.length - 1, idx + after);
  const beforeLines = lines.slice(startIdx, idx);
  const afterLines = lines.slice(idx + 1, endIdx + 1);
  const preview = [...beforeLines, lines[idx], ...afterLines].join('\n');
  return { beforeLines, afterLines, preview };
}

export function grepLike(
  text: string,
  pattern: string,
  opts: {
    isRegex?: boolean;
    caseSensitive?: boolean;
    before?: number;
    after?: number;
    context?: number;
    maxMatches?: number;
  } = {},
): GrepMatch[] {
  const {
    isRegex = false,
    caseSensitive = false,
    before,
    after,
    context = 2,
    maxMatches = 20,
  } = opts;

  if (!text || !pattern) return [];

  const lines = text.split(/\r?\n/);
  const flags = caseSensitive ? 'g' : 'gi';
  let re: RegExp;
  try {
    re = isRegex ? new RegExp(pattern, flags) : new RegExp(escapeRegex(pattern), flags);
  } catch (e) {
    // invalid regex -> no matches; caller should surface error separately if needed
    return [];
  }

  const b = before ?? context;
  const a = after ?? context;
  const matches: GrepMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    re.lastIndex = 0;
    if (!re.test(lineText)) continue;

    const ranges = collectRanges(lineText, re, maxMatches);
    const { beforeLines, afterLines, preview } = buildPreview(lines, i, b, a);

    matches.push({
      line: i + 1,
      preview,
      before: beforeLines,
      match: lineText,
      after: afterLines,
      ranges: ranges.length ? ranges : undefined,
    });

    if (matches.length >= maxMatches) break;
  }

  return matches;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
