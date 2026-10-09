import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onNavigateCreateJob: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigateCreateJob, onRefresh }) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Dashboard Overview',
      subtitle: 'Monitor generation jobs, certificate issuance metrics, and system status.'
    },
    'create-job': {
      title: 'Create Generation Job',
      subtitle: 'Upload recipient lists, validate records, and dispatch bulk PDF certificate generation.'
    },
    'job-detail': {
      title: 'Job Execution Details',
      subtitle: 'Track recipient-level progress, download archives, and retry failed items.'
    },
    certificates: {
      title: 'Certificate Library',
      subtitle: 'Search, filter, preview, and download all generated certificates across events.'
    },
    docs: {
      title: 'API Reference & Documentation',
      subtitle: 'Explore REST endpoints, schemas, sample cURL requests, and OpenAPI specifications.'
    },
    settings: {
      title: 'Platform Settings',
      subtitle: 'View default configurations, processing boundaries, and database parameters.'
    }
  };

  const currentInfo = titles[currentTab] || titles.overview;

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentInfo.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{currentInfo.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {currentTab !== 'create-job' && (
          <button
            onClick={onNavigateCreateJob}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Generation Job</span>
          </button>
        )}
      </div>
    </header>
  );
};
