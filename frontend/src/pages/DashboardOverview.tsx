import React from 'react';
import { 
  FileStack, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight, 
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { GenerationJob } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardOverviewProps {
  jobs: GenerationJob[];
  loading: boolean;
  onSelectJob: (jobId: string) => void;
  onNavigateCreateJob: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  jobs,
  loading,
  onSelectJob,
  onNavigateCreateJob
}) => {
  // Real stats calculation
  const totalJobs = jobs.length;
  const totalCertificates = jobs.reduce((acc, job) => acc + job.successful_count, 0);
  const totalFailed = jobs.reduce((acc, job) => acc + job.failed_count, 0);
  const totalProcessed = jobs.reduce((acc, job) => acc + job.processed_count, 0);
  
  const successRate = totalProcessed > 0 
    ? Math.round((totalCertificates / totalProcessed) * 100) 
    : 100;

  // Real chart data aggregated from jobs by date
  const chartDataMap: Record<string, { date: string; successful: number; failed: number }> = {};
  
  jobs.slice().reverse().forEach((job) => {
    const d = job.issue_date || job.created_at.split('T')[0];
    if (!chartDataMap[d]) {
      chartDataMap[d] = { date: d, successful: 0, failed: 0 };
    }
    chartDataMap[d].successful += job.successful_count;
    chartDataMap[d].failed += job.failed_count;
  });

  const chartData = Object.values(chartDataMap);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Tagline */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            CertiFlow Platform
          </div>
          <h2 className="text-xl font-bold tracking-tight">From attendee lists to certified achievements.</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            High-throughput PDF certificate engine with failure isolation, status tracking, and instant ZIP exports.
          </p>
        </div>

        <button
          onClick={onNavigateCreateJob}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Batch Job</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Jobs</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalJobs}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <FileStack className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Certificates Issued</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalCertificates}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Failed Certificates</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{totalFailed}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Success Rate</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{successRate}%</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart & Activity Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Generation Activity Trend</h3>
            <p className="text-xs text-slate-500">Real-time breakdown of successful vs. failed certificate generation</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#FFF' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="successful" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" name="Successful" />
                <Area type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
            No generation activity recorded yet. Create your first job to see live charts.
          </div>
        )}
      </div>

      {/* Recent Jobs Table / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent Generation Jobs</h3>
          {jobs.length > 0 && (
            <span className="text-xs text-slate-500 font-medium">Showing top {Math.min(5, jobs.length)} jobs</span>
          )}
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <PlusCircle className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">No generation jobs created yet</h4>
              <p className="text-xs text-slate-500">
                Start by uploading a CSV recipient list or entering attendee details to generate your first batch of PDF certificates.
              </p>
            </div>
            <button
              onClick={onNavigateCreateJob}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Job</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Event Name</th>
                  <th className="px-6 py-3.5">Issuer</th>
                  <th className="px-6 py-3.5">Recipients</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Progress</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.slice(0, 5).map((job) => {
                  const percent = job.total_count > 0 
                    ? Math.round((job.processed_count / job.total_count) * 100) 
                    : 0;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {job.event_name}
                        <div className="text-xs font-mono font-normal text-slate-400 mt-0.5">
                          ID: {job.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{job.issuer_name}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{job.total_count}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                            <span>{job.processed_count} / {job.total_count}</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                job.status === 'COMPLETED' ? 'bg-emerald-500' :
                                job.status === 'COMPLETED_WITH_ERRORS' ? 'bg-amber-500' :
                                job.status === 'FAILED' ? 'bg-rose-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onSelectJob(job.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
