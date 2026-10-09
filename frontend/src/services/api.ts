import axios from 'axios';
import type {
  JobCreatePayload,
  GenerationJob,
  JobListResponse,
  CertificateListResponse,
  HealthResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Jobs
  createJob: async (payload: JobCreatePayload): Promise<GenerationJob> => {
    const response = await apiClient.post<GenerationJob>('/jobs/', payload);
    return response.data;
  },

  getJobs: async (page = 1, pageSize = 10, status?: string, search?: string): Promise<JobListResponse> => {
    const response = await apiClient.get<JobListResponse>('/jobs/', {
      params: { page, page_size: pageSize, status, search }
    });
    return response.data;
  },

  getJobDetail: async (jobId: string): Promise<GenerationJob> => {
    const response = await apiClient.get<GenerationJob>(`/jobs/${jobId}/`);
    return response.data;
  },

  retryFailedRecipients: async (jobId: string): Promise<{ retried_count: number; message: string }> => {
    const response = await apiClient.post<{ retried_count: number; message: string }>(`/jobs/${jobId}/retry-failed/`);
    return response.data;
  },

  getJobDownloadUrl: (jobId: string): string => {
    return `${API_BASE_URL}/jobs/${jobId}/download/`;
  },

  // Certificates
  getCertificates: async (
    page = 1,
    pageSize = 10,
    status?: string,
    search?: string,
    eventName?: string
  ): Promise<CertificateListResponse> => {
    const response = await apiClient.get<CertificateListResponse>('/certificates/', {
      params: { page, page_size: pageSize, status, search, event_name: eventName }
    });
    return response.data;
  },

  getCertificateDownloadUrl: (certificateId: string, inline = false): string => {
    return `${API_BASE_URL}/certificates/${certificateId}/download/${inline ? '?inline=true' : ''}`;
  },

  // Health
  getHealth: async (): Promise<HealthResponse> => {
    // Health is served at root /health/ on host
    const response = await axios.get<HealthResponse>('http://localhost:8000/health/');
    return response.data;
  }
};
