import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Award, 
  Code2, 
  Settings, 
  Sparkles
} from 'lucide-react';

export type NavTab = 'overview' | 'create-job' | 'job-detail' | 'certificates' | 'docs' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  backendHealthy: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, backendHealthy }) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'create-job' as NavTab, label: 'Create Job', icon: PlusCircle },
    { id: 'certificates' as NavTab, label: 'Certificate Library', icon: Award },
    { id: 'docs' as NavTab, label: 'API Documentation', icon: Code2 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              CertiFlow
            </h1>
            <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Bulk Certificate Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id || (item.id === 'overview' && currentTab === 'job-detail');
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-medium">Backend API</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
