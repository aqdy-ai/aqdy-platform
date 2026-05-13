export interface Contract {
  id: string;
  name: string;
  uploadDate: string;
  status: 'pending' | 'analyzed' | 'failed';
  riskScore?: number;
}

export interface AnalysisResult {
  contractId: string;
  summary: string;
  risks: {
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
}