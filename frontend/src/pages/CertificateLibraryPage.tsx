import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Eye, 
  Award, 
  Calendar, 
  Building2, 
  RefreshCw
} from 'lucide-react';
import type { Certificate } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { PDFPreviewModal } from '../components/PDFPreviewModal';

export const CertificateLibraryPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('SUCCESS');
  const [page] = useState(1);

  // PDF Preview modal state
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const data = await api.getCertificates(page, 15, statusFilter || undefined, search || undefined);
      setCertificates(data.certificates);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch certificates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [page, statusFilter, search]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Certificate Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, preview, and download generated certificates. Total persisted: {total}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['SUCCESS', 'FAILED', ''].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'SUCCESS' ? 'Success' : st === 'FAILED' ? 'Failed' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchCertificates}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition shadow-xs"
            title="Refresh Catalog"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View of Certificates */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No matching certificates found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or status filter to locate issued certificates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-indigo-300 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition">
                    {cert.recipient_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{cert.recipient_email}</p>
                </div>
                <StatusBadge status={cert.status} size="sm" />
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{cert.event_name || 'Certificate'}</span>
                </div>
                {cert.organization && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cert.organization}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>ID: {cert.id.substring(0, 8)}...</span>
                </div>
              </div>

              {cert.status === 'SUCCESS' ? (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setPreviewId(cert.id);
                      setPreviewName(cert.recipient_name);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-200 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <a
                    href={api.getCertificateDownloadUrl(cert.id)}
                    download
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700 text-[11px] font-mono border border-rose-200 truncate">
                  Error: {cert.error_message || 'Generation failed'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PDF Modal */}
      <PDFPreviewModal
        certificateId={previewId}
        recipientName={previewName}
        onClose={() => setPreviewId(null)}
      />
    </div>
  );
};
