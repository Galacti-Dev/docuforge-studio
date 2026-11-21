export type ToolCategory =
  | 'organize'
  | 'convert'
  | 'graphics'
  | 'optimize'
  | 'security'
  | 'advanced';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  route: string;
  supportedInputTypes: string[];
  outputType: string;
}

export interface BatchTask {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  toolId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultFileName?: string;
  errorMessage?: string;
}
