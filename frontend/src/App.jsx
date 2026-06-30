import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RequirementsPage from './pages/RequirementsPage';
import BlueprintsPage from './pages/BlueprintsPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import TestsPage from './pages/TestsPage';
import FeedbackPage from './pages/FeedbackPage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TraceabilityPage from './pages/TraceabilityPage';
import ERDiagramPage from './pages/ERDiagramPage';
import AuditPage from './pages/AuditPage';
import ModelManagerPage from './pages/ModelManagerPage';
import SettingsPage from './pages/SettingsPage';
import TokenUsagePage from './pages/TokenUsagePage';
import TemplatesPage from './pages/TemplatesPage';
import PluginsPage from './pages/PluginsPage';
import CodeIndexPage from './pages/CodeIndexPage';
import DriftPage from './pages/DriftPage';
import SimulatorPage from './pages/SimulatorPage';
import QAFlowsPage from './pages/QAFlowsPage';
import LiveAssistancePage from './pages/LiveAssistancePage';
import ConfigPage from './pages/ConfigPage';
import ArtifactsPage from './pages/ArtifactsPage';
import HooksPage from './pages/HooksPage';
import NotificationsPage from './pages/NotificationsPage';
import FeedbackThemesPage from './pages/FeedbackThemesPage';
import GlobalSearchPage from './pages/GlobalSearchPage';
import AgentChatPage from './pages/AgentChatPage';
import MindmapPage from './pages/MindmapPage';
import ExternalAPIKeysPage from './pages/ExternalAPIKeysPage';
import ReportingPage from './pages/ReportingPage';
import { useTheme } from './hooks/useTheme';
import { useProjects } from './api/hooks';
import FirstLaunchWizard from './components/FirstLaunchWizard';
import { useState, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, color: 'var(--text-primary)' }}>
          <div style={{ fontSize: 48 }}>💥</div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 400, textAlign: 'center' }}>{this.state.error.message}</p>
          <button className="btn-primary" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}>Go Home</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-primary)' }}>
      <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--text-tertiary)' }}>404</div>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Page not found</p>
      <a href="/" className="btn-ghost" style={{ fontSize: 13, textDecoration: 'none' }}>← Back to Overview</a>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  useTheme();
  const { data: projects } = useProjects();
  const projectList = Array.isArray(projects) ? projects : projects?.items || projects?.projects || [];
  const [wizardDismissed, setWizardDismissed] = useState(() => localStorage.getItem('wizard_dismissed') === '1');

  const showWizard = !wizardDismissed && projectList.length === 0 && projects !== undefined;

  function handleWizardComplete() {
    localStorage.setItem('wizard_dismissed', '1');
    setWizardDismissed(true);
  }

  return (
    <BrowserRouter>
      {showWizard && <FirstLaunchWizard onComplete={handleWizardComplete} />}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Project-scoped routes */}
          <Route path="/project/:projectId/requirements" element={<RequirementsPage />} />
          <Route path="/project/:projectId/blueprints" element={<BlueprintsPage />} />
          <Route path="/project/:projectId/blueprints/:blueprintId/work-orders" element={<WorkOrdersPage />} />
          <Route path="/project/:projectId/work-orders" element={<WorkOrdersPage />} />
          <Route path="/project/:projectId/tests" element={<TestsPage />} />
          <Route path="/project/:projectId/feedback" element={<FeedbackPage />} />
          <Route path="/project/:projectId/graph" element={<KnowledgeGraphPage />} />
          <Route path="/project/:projectId/analytics" element={<AnalyticsPage />} />
          <Route path="/project/:projectId/traceability" element={<TraceabilityPage />} />
          <Route path="/project/:projectId/er-diagram" element={<ERDiagramPage />} />

          {/* Backward-compat redirects — keep old paths working */}
          <Route path="/requirements" element={<RequirementsPage />} />
          <Route path="/blueprints" element={<BlueprintsPage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />

          {/* Non-project routes */}
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/models" element={<ModelManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/tokens" element={<TokenUsagePage />} />
          <Route path="/traceability" element={<TraceabilityPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/er-diagram" element={<ERDiagramPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/code-index" element={<CodeIndexPage />} />
          <Route path="/project/:projectId/code-index" element={<CodeIndexPage />} />
          <Route path="/drift" element={<DriftPage />} />
          <Route path="/project/:projectId/drift" element={<DriftPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/project/:projectId/simulator" element={<SimulatorPage />} />
          <Route path="/qa-flows" element={<QAFlowsPage />} />
          <Route path="/project/:projectId/qa-flows" element={<QAFlowsPage />} />
          <Route path="/live-assist" element={<LiveAssistancePage />} />
          <Route path="/project/:projectId/live-assist" element={<LiveAssistancePage />} />
          <Route path="/project/:projectId/config" element={<ConfigPage />} />
          <Route path="/project/:projectId/artifacts" element={<ArtifactsPage />} />
          <Route path="/project/:projectId/hooks" element={<HooksPage />} />
          <Route path="/project/:projectId/notifications" element={<NotificationsPage />} />
          <Route path="/project/:projectId/feedback-themes" element={<FeedbackThemesPage />} />
          <Route path="/search" element={<GlobalSearchPage />} />
          <Route path="/project/:projectId/agent-chat" element={<AgentChatPage />} />
          <Route path="/project/:projectId/mindmap" element={<MindmapPage />} />
          <Route path="/api-keys" element={<ExternalAPIKeysPage />} />
          <Route path="/project/:projectId/reporting" element={<ReportingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRoutes />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
