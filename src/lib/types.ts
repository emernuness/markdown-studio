export type ViewMode = "rich" | "source";

export type ExportFormat = "html" | "pdf" | "docx" | "rtf";

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}
