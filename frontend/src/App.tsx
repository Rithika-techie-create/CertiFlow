import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './pages/DashboardOverview';
import { CreateJobPage } from './pages/CreateJobPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { CertificateLibraryPage } from './pages/CertificateLibraryPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { GenerationJob } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Real backend data state
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [backendHealthy, setBackendHealthy] = useState(true);

  const fetchDashboardJobs = async () => {
    setLoadingJobs(true);
    try {
      const data = await api.getJobs(1, 20);
      setJobs(data.jobs);
      setBackendHealthy(true);
    } catch (err) {
      console.error('Failed to connect to backend API', err);
      setBackendHealthy(false);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchDashboardJobs();
    api.getHealth().then(() => setBackendHealthy(true)).catch(() => setBackendHealthy(false));
  }, []);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentTab('job-detail');
  };

  const handleJobCreated = (jobId: string) => {
    fetchDashboardJobs();
    setSelectedJobId(jobId);
    setCurrentTab('job-detail');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Dark Navy Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'overview') fetchDashboardJobs();
        }}
        backendHealthy={backendHealthy}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onNavigateCreateJob={() => setCurrentTab('create-job')}
          onRefresh={currentTab === 'overview' ? fetchDashboardJobs : undefined}
        />

        <main className="flex-1 pb-16">
          {currentTab === 'overview' && (
            <DashboardOverview
              jobs={jobs}
              loading={loadingJobs}
              onSelectJob={handleSelectJob}
              onNavigateCreateJob={() => setCurrentTab('create-job')}
            />
          )}

          {currentTab === 'create-job' && (
            <CreateJobPage onJobCreated={handleJobCreated} />
          )}

          {currentTab === 'job-detail' && selectedJobId && (
            <JobDetailPage
              jobId={selectedJobId}
              onBack={() => {
                setCurrentTab('overview');
                fetchDashboardJobs();
              }}
            />
          )}

          {currentTab === 'certificates' && (
            <CertificateLibraryPage />
          )}

          {currentTab === 'docs' && (
            <ApiDocsPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
