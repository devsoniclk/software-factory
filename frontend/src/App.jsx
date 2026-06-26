import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { useTheme } from './hooks/useTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  useTheme();
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}
