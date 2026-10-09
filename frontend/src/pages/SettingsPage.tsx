import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Server, Cpu, HardDrive } from 'lucide-react';
import type { HealthResponse } from '../types';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch((err) => console.error('Health check failed', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">System Health & Backend Status</h3>
              <p className="text-xs text-slate-500">Live database connectivity and runtime environment status</p>
            </div>
          </div>

          {loading ? (
            <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
          ) : health?.database_connected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Healthy & Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
              Database Unhealthy
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500" /> Database Engine
            </span>
            <span className="font-semibold text-slate-900 text-sm block">SQLite 3 (Local Development ORM)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Background Worker
            </span>
            <span className="font-semibold text-slate-900 text-sm block">FastAPI BackgroundTasks (In-Process)</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" /> Maximum Recipient Limit
            </span>
            <span className="font-semibold text-slate-900 text-sm block">500 Recipients per Job</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> PDF Engine
            </span>
            <span className="font-semibold text-slate-900 text-sm block">ReportLab 5.0 (Landscape A4 Template)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-3">
          Default Issuer Parameters
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Default Issuer Name</span>
            <span className="font-bold text-slate-900">CertiFlow Academy</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Certificate Page Orientation</span>
            <span className="font-bold text-slate-900">Landscape A4 (841.89 x 595.27 pt)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-600 font-medium">Security & Storage Path Isolation</span>
            <span className="font-bold text-emerald-600">Enabled (Path Traversal Protected)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
