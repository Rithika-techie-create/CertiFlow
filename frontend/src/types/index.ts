export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export type CertificateStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface RecipientCreate {
  name: string;
  email: string;
  organization?: string;
}

export interface JobCreatePayload {
  event_name: string;
  issuer_name: string;
  issue_date: string;
  expiry_date?: string | null;
  recipients: RecipientCreate[];
}

export interface RecipientResult {
  id: string;
  recipient_name: string;
  recipient_email: string;
  organization?: string | null;
  status: CertificateStatus;
  certificate_id?: string | null;
  error_message?: string | null;
}

export interface GenerationJob {
  id: string;
  event_name: string;
  issuer_name: string;
  issue_date: string;
  expiry_date?: string | null;
  status: JobStatus;
  total_count: number;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_summary?: string | null;
  recipients?: RecipientResult[];
}

export interface Certificate {
  id: string;
  job_id: string;
  recipient_name: string;
  recipient_email: string;
  organization?: string | null;
  status: CertificateStatus;
  event_name?: string;
  issuer_name?: string;
  issue_date?: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobListResponse {
  total: number;
  page: number;
  page_size: number;
  jobs: GenerationJob[];
}

export interface CertificateListResponse {
  total: number;
  page: number;
  page_size: number;
  certificates: Certificate[];
}

export interface HealthResponse {
  status: string;
  database_connected: boolean;
  database_error?: string | null;
  app_name: string;
  version: string;
}

export interface CSVRowValidation {
  rowNumber: number;
  name: string;
  email: string;
  organization: string;
  isValid: boolean;
  errors: string[];
}
