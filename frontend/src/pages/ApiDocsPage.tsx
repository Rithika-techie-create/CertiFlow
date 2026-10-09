import React, { useState } from 'react';
import { ExternalLink, Code2, Copy, Check } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/jobs/',
      description: 'Submit a bulk certificate generation job with multiple recipients.',
      requestBody: `{
  "event_name": "Python Development Workshop",
  "issuer_name": "CertiFlow Academy",
  "issue_date": "2026-10-09",
  "expiry_date": null,
  "recipients": [
    {
      "name": "Ananya Rao",
      "email": "ananya@example.com",
      "organization": "Example University"
    },
    {
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "organization": "Tech Institute"
    }
  ]
}`,
      responseBody: `{
  "id": "e4a7b210-9c1a-4d2b-89ef-304bfa612d90",
  "event_name": "Python Development Workshop",
  "issuer_name": "CertiFlow Academy",
  "issue_date": "2026-10-09",
  "expiry_date": null,
  "status": "PENDING",
  "total_count": 2,
  "processed_count": 0,
  "successful_count": 0,
  "failed_count": 0,
  "created_at": "2026-10-09T05:46:00Z"
}`
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/{job_id}/',
      description: 'Retrieve job execution details, progress counters, and recipient statuses.',
      responseBody: `{
  "id": "e4a7b210-9c1a-4d2b-89ef-304bfa612d90",
  "status": "COMPLETED",
  "total_count": 2,
  "processed_count": 2,
  "successful_count": 2,
  "failed_count": 0,
  "recipients": [
    {
      "id": "a1b2c3d4-0000-1111-2222-333344445555",
      "recipient_name": "Ananya Rao",
      "recipient_email": "ananya@example.com",
      "status": "SUCCESS",
      "certificate_id": "a1b2c3d4-0000-1111-2222-333344445555"
    }
  ]
}`
    },
    {
      method: 'POST',
      path: '/api/v1/jobs/{job_id}/retry-failed/',
      description: 'Retry failed recipients for a job without re-generating successful certificates.',
      responseBody: `{
  "job_id": "e4a7b210-9c1a-4d2b-89ef-304bfa612d90",
  "status": "PROCESSING",
  "retried_count": 1,
  "message": "Successfully re-queued 1 failed recipients for processing."
}`
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/{job_id}/download/',
      description: 'Download a ZIP archive containing all successful certificates and a manifest.json file.'
    },
    {
      method: 'GET',
      path: '/api/v1/certificates/{certificate_id}/download/',
      description: 'Download or inline stream an individual PDF certificate.'
    }
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">API Documentation & Swagger UI</h2>
          <p className="text-xs text-slate-500 mt-1">
            Integrate CertiFlow REST APIs directly into your backend pipelines or LMS webhooks.
          </p>
        </div>

        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition shrink-0"
        >
          <Code2 className="w-4 h-4" />
          <span>Open Interactive Swagger Docs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Endpoints List */}
      <div className="space-y-6">
        {endpoints.map((ep, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                  ep.method === 'POST' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {ep.method}
                </span>
                <code className="text-sm font-bold text-slate-900 font-mono">{ep.path}</code>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium">{ep.description}</p>

              {ep.requestBody && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Sample Request Payload (JSON)</span>
                    <button
                      onClick={() => handleCopy(ep.requestBody!, idx * 2)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800"
                    >
                      {copiedIndex === idx * 2 ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === idx * 2 ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-indigo-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                    {ep.requestBody}
                  </pre>
                </div>
              )}

              {ep.responseBody && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Sample Response Payload (JSON)</span>
                    <button
                      onClick={() => handleCopy(ep.responseBody!, idx * 2 + 1)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800"
                    >
                      {copiedIndex === idx * 2 + 1 ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === idx * 2 + 1 ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                    {ep.responseBody}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
