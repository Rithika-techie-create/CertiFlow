import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  RotateCcw, 
  AlertTriangle, 
  Eye, 
  Loader2
} from 'lucide-react';
import type { GenerationJob } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { PDFPreviewModal } from '../components/PDFPreviewModal';

interface JobDetailPageProps {
  jobId: string;
  onBack: () => void;
}

export const JobDetailPage: React.FC<JobDetailPageProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  // PDF Preview Modal State
  const [previewCertId, setPreviewCertId] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');

  const fetchJobDetail = async () => {
    try {
      const data = await api.getJobDetail(jobId);
      setJob(data);
    } catch (err) {
      console.error('Failed to fetch job detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  // Live polling every 2s while job is PROCESSING or PENDING
  useEffect(() => {
    if (!job) return;
    if (job.status === 'PROCESSING' || job.status === 'PENDING') {
      const interval = setInterval(() => {
        fetchJobDetail();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [job?.status]);

  const handleRetryFailed = async () => {
    if (!job) return;
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await api.retryFailedRecipients(job.id);
      setRetryMessage(res.message);
      await fetchJobDetail();
    } catch (err: any) {
      setRetryMessage(err.response?.data?.detail || 'Failed to retry recipients');
    } finally {
      setRetrying(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const recipients = job.recipients || [];
  const filteredRecipients = recipients.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const progressPercent = job.total_count > 0 
    ? Math.round((job.processed_count / job.total_count) * 100) 
    : 0;

  const isCompleted = job.status === 'COMPLETED' || job.status === 'COMPLETED_WITH_ERRORS' || job.status === 'FAILED';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Nav Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobDetail}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Refresh Job Progress"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {job.successful_count > 0 && (
            <a
              href={api.getJobDownloadUrl(job.id)}
              download
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All (ZIP)</span>
            </a>
          )}
        </div>
      </div>

      {retryMessage && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center justify-between">
          <span>{retryMessage}</span>
          <button onClick={() => setRetryMessage(null)} className="text-indigo-600 font-bold">Dismiss</button>
        </div>
      )}

      {/* Main Job Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{job.event_name}</h2>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono">Job ID: {job.id}</p>
          </div>

          {job.failed_count > 0 && isCompleted && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition shadow-xs"
            >
              {retrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Retry {job.failed_count} Failed Item(s)</span>
            </button>
          )}
        </div>

        {/* Real Progress Bar */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              {job.status === 'PROCESSING' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
              Processing Progress: {job.processed_count} of {job.total_count} recipients
            </span>
            <span className="font-mono">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                job.status === 'COMPLETED' ? 'bg-emerald-500' :
                job.status === 'COMPLETED_WITH_ERRORS' ? 'bg-amber-500' :
                job.status === 'FAILED' ? 'bg-rose-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block font-medium">Issuer Name</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{job.issuer_name}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block font-medium">Issue Date</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{job.issue_date}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
            <span className="text-emerald-700 block font-medium">Successful</span>
            <span className="font-bold text-emerald-800 text-sm mt-0.5 block">{job.successful_count}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/60">
            <span className="text-rose-700 block font-medium">Failed</span>
            <span className="font-bold text-rose-800 text-sm mt-0.5 block">{job.failed_count}</span>
          </div>
        </div>

        {job.error_summary && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Execution Warning: </strong>
              {job.error_summary}
            </div>
          </div>
        )}
      </div>

      {/* Recipient Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recipient Execution Logs</h3>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {['ALL', 'SUCCESS', 'FAILED'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setFilterStatus(statusKey)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  filterStatus === statusKey
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {statusKey === 'ALL' ? 'All' : statusKey === 'SUCCESS' ? 'Successful' : 'Failed'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Recipient Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Verification ID / Trace</th>
                <th className="px-6 py-3.5 text-right">Download / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecipients.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{r.recipient_name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono">{r.recipient_email}</td>
                  <td className="px-6 py-4 text-slate-500">{r.organization || '—'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    {r.status === 'SUCCESS' && r.certificate_id ? (
                      <span className="font-mono text-slate-500">{r.certificate_id.substring(0, 8)}...</span>
                    ) : r.error_message ? (
                      <span className="text-rose-600 font-mono text-[11px] truncate block max-w-xs" title={r.error_message}>
                        {r.error_message}
                      </span>
                    ) : (
                      <span className="text-slate-400">Processing...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.status === 'SUCCESS' && r.certificate_id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setPreviewCertId(r.certificate_id || null);
                            setPreviewName(r.recipient_name);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Preview PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={api.getCertificateDownloadUrl(r.certificate_id)}
                          download
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Modal */}
      <PDFPreviewModal
        certificateId={previewCertId}
        recipientName={previewName}
        onClose={() => setPreviewCertId(null)}
      />
    </div>
  );
};
