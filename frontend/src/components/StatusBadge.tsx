import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { JobStatus, CertificateStatus } from '../types';

interface StatusBadgeProps {
  status: JobStatus | CertificateStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  switch (status) {
    case 'COMPLETED':
    case 'SUCCESS':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${sizeClasses}`}>
          <CheckCircle2 className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>{status === 'COMPLETED' ? 'Completed' : 'Success'}</span>
        </span>
      );

    case 'PROCESSING':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 ${sizeClasses}`}>
          <Loader2 className={`animate-spin ${isSm ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
          <span>Processing</span>
        </span>
      );

    case 'PENDING':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <Clock className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Pending</span>
        </span>
      );

    case 'COMPLETED_WITH_ERRORS':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
          <AlertTriangle className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Partial Errors</span>
        </span>
      );

    case 'FAILED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <XCircle className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span>Failed</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
