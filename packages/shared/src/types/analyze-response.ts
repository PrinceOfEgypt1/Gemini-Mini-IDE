export interface AnalyzeResponse {
  summary: string;
  inputLength: number;
  outputLength: number;
  requestId: string;
  timestamp: string;
  budgetUsed?: number;
  budgetRemaining?: number;
}
