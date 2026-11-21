export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  buffer?: ArrayBuffer;
  pageCount?: number;
}

export interface DocumentPage {
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  width: number;
  height: number;
  rotation: number;
  thumbnailUrl?: string;
}

export interface PageAction {
  originalIndex: number; // 0-based
  rotate?: 0 | 90 | 180 | 270;
  delete?: boolean;
  duplicate?: number;
}
