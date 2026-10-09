import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import type { RecipientCreate, CSVRowValidation } from '../types';
import { api } from '../services/api';

interface CreateJobPageProps {
  onJobCreated: (jobId: string) => void;
}

export const CreateJobPage: React.FC<CreateJobPageProps> = ({ onJobCreated }) => {
  // Form State
  const [eventName, setEventName] = useState('');
  const [issuerName, setIssuerName] = useState('CertiFlow Academy');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');

  // Recipients State
  const [recipients, setRecipients] = useState<RecipientCreate[]>([
    { name: 'Ananya Rao', email: 'ananya@example.com', organization: 'Example University' },
    { name: 'Rahul Sharma', email: 'rahul@example.com', organization: 'Tech Institute' }
  ]);

  // Editing recipient form inputs
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOrg, setNewOrg] = useState('');

  // Validation & UI State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csvErrorMessages, setCsvErrorMessages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Validate single email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Compute row-level validation status
  const validateRecipientsList = (list: RecipientCreate[]): CSVRowValidation[] => {
    const emailCounts: Record<string, number> = {};
    list.forEach(r => {
      const e = r.email.trim().toLowerCase();
      emailCounts[e] = (emailCounts[e] || 0) + 1;
    });

    return list.map((r, idx) => {
      const errors: string[] = [];
      if (!r.name.trim()) errors.push('Name is required');
      if (!r.email.trim()) errors.push('Email is required');
      else if (!isValidEmail(r.email.trim())) errors.push('Invalid email format');
      else if (emailCounts[r.email.trim().toLowerCase()] > 1) errors.push('Duplicate email');

      return {
        rowNumber: idx + 1,
        name: r.name,
        email: r.email,
        organization: r.organization || '',
        isValid: errors.length === 0,
        errors
      };
    });
  };

  const validations = validateRecipientsList(recipients);
  const hasInvalidRows = validations.some(v => !v.isValid);
  const invalidCount = validations.filter(v => !v.isValid).length;

  // CSV Template Downloader
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,email,organization\nAnanya Rao,ananya@example.com,Example University\nRahul Sharma,rahul@example.com,Tech Institute\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "certiflow_recipients_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file upload & parsing
  const parseCSVText = (text: string) => {
    setCsvErrorMessages([]);
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setCsvErrorMessages(['CSV file is empty.']);
      return;
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const orgIdx = header.indexOf('organization');

    if (nameIdx === -1 || emailIdx === -1) {
      setCsvErrorMessages(['CSV header missing required columns: "name" and "email"']);
      return;
    }

    const parsedRecipients: RecipientCreate[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
      const name = row[nameIdx] || '';
      const email = row[emailIdx] || '';
      const org = orgIdx !== -1 ? row[orgIdx] || '' : '';

      if (!name && !email) continue; // Skip completely blank lines

      parsedRecipients.push({
        name,
        email,
        organization: org
      });
    }

    if (parsedRecipients.length === 0) {
      setCsvErrorMessages(['No valid data rows found in CSV file.']);
      return;
    }

    setRecipients(parsedRecipients);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setCsvErrorMessages(['Unsupported file type. Please upload a .csv file.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Add single recipient manually
  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    setRecipients([...recipients, {
      name: newName.trim(),
      email: newEmail.trim(),
      organization: newOrg.trim() || undefined
    }]);

    setNewName('');
    setNewEmail('');
    setNewOrg('');
  };

  const handleDeleteRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  // Bulk Job Submission
  const handleSubmitJob = async () => {
    if (!eventName.trim()) {
      setErrorMessage('Event/Course name is required');
      return;
    }
    if (!issuerName.trim()) {
      setErrorMessage('Issuer name is required');
      return;
    }
    if (recipients.length === 0) {
      setErrorMessage('At least one recipient is required');
      return;
    }
    if (hasInvalidRows) {
      setErrorMessage(`Please fix or remove the ${invalidCount} invalid row(s) before submitting.`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await api.createJob({
        event_name: eventName.trim(),
        issuer_name: issuerName.trim(),
        issue_date: issueDate,
        expiry_date: expiryDate ? expiryDate : null,
        recipients: recipients
      });

      onJobCreated(created.id);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to submit bulk generation job.';
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create Generation Job</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure certificate metadata and import attendee recipient lists.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV Template</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form Section 1: Event & Issuer Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-3">
          1. Event & Certificate Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Event or Course Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Python Backend & Architecture Masterclass"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Issuer Organization <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CertiFlow Academy"
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Issue Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Optional Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Form Section 2: CSV Import & Drag and Drop */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-3">
          2. Import Recipients (CSV File)
        </h3>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Drag & drop your CSV file here</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Supports CSV format with column headers: <code className="bg-slate-200 px-1 py-0.5 rounded">name</code>, <code className="bg-slate-200 px-1 py-0.5 rounded">email</code>, <code className="bg-slate-200 px-1 py-0.5 rounded">organization</code>
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer shadow-xs transition">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Browse CSV File</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>

        {csvErrorMessages.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
            {csvErrorMessages.map((msg, i) => (
              <p key={i}>• {msg}</p>
            ))}
          </div>
        )}
      </div>

      {/* Form Section 3: Editable Recipient Preview & Manual Input */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
            3. Recipient Preview & Manual Entry ({recipients.length})
          </h3>
          {hasInvalidRows && (
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              {invalidCount} invalid row(s) detected
            </span>
          )}
        </div>

        {/* Add recipient inline form */}
        <form onSubmit={handleAddRecipient} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <input
            type="text"
            placeholder="Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <input
            type="email"
            placeholder="Email Address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Organization (Optional)"
            value={newOrg}
            onChange={(e) => setNewOrg(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Recipient</span>
          </button>
        </form>

        {/* Recipients Table */}
        <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Recipient Name</th>
                <th className="px-4 py-2.5">Email Address</th>
                <th className="px-4 py-2.5">Organization</th>
                <th className="px-4 py-2.5">Validation</th>
                <th className="px-4 py-2.5 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {validations.map((v, idx) => (
                <tr key={idx} className={!v.isValid ? 'bg-rose-50/70' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-2.5 font-mono text-slate-400">{v.rowNumber}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{v.name || <span className="text-rose-500 italic">Empty</span>}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{v.email || <span className="text-rose-500 italic">Empty</span>}</td>
                  <td className="px-4 py-2.5 text-slate-500">{v.organization || '—'}</td>
                  <td className="px-4 py-2.5">
                    {v.isValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> {v.errors.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDeleteRecipient(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Footer */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
        <div>
          <h4 className="font-bold text-sm">Ready to Generate Batch</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Will dispatch <strong className="text-white">{recipients.length} PDF certificates</strong> for asynchronous background generation.
          </p>
        </div>

        <button
          onClick={handleSubmitJob}
          disabled={submitting || recipients.length === 0 || hasInvalidRows}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition ${
            submitting || recipients.length === 0 || hasInvalidRows
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Batch Job...</span>
            </>
          ) : (
            <>
              <span>Submit Generation Job</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
