import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { api } from '../services/api';

interface PDFPreviewModalProps {
  certificateId: string | null;
  recipientName: string;
  onClose: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  certificateId,
  recipientName,
  onClose,
}) => {
  if (!certificateId) return null;

  const inlineUrl = api.getCertificateDownloadUrl(certificateId, true);
  const downloadUrl = api.getCertificateDownloadUrl(certificateId, false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Certificate Preview</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{recipientName} • ID: {certificateId}</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </a>
            <a
              href={inlineUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open New Tab
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Iframe view */}
        <div className="flex-1 bg-slate-200 relative">
          <iframe
            src={inlineUrl}
            className="w-full h-full border-0"
            title={`Certificate - ${recipientName}`}
          />
        </div>
      </div>
    </div>
  );
};
