/**
 * Pomocnicze funkcje dla operacji znaku wodnego, numeracji stron i podpisu (M8).
 */

export function cleanTextForPdf(text: string): string {
  if (!text) return '';
  const diacriticsMap: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
  };
  return text
    .split('')
    .map((char) => diacriticsMap[char] || char)
    .join('')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 0.2, g: 0.2, b: 0.2 };
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 0.2, g: 0.2, b: 0.2 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export function parsePageSelection(pagesParam: string | null | undefined, totalPages: number): number[] {
  if (!pagesParam || pagesParam.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const selected = new Set<number>();
  const parts = pagesParam.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        selected.add(i - 1);
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        selected.add(pageNum - 1);
      }
    }
  }
  return Array.from(selected).sort((a, b) => a - b);
}
