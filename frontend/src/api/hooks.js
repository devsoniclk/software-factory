import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';

const PAGE_SIZE = 20;

/* ─── Projects ─── */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => client.get('/projects').then((r) => r.data),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.post('/projects', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.delete(`/projects/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useProductOverview(projectId) {
  return useQuery({
    queryKey: ['product-overview', projectId],
    queryFn: () => client.get(`/projects/${projectId}/overview`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useGenerateProductOverview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, interview_answers }) =>
      client.post(`/projects/${projectId}/overview/generate`, { project_id: projectId, interview_answers }).then((r) => r.data),
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ['product-overview', projectId] }),
  });
}

export function useSaveProductOverview(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.put(`/projects/${projectId}/overview`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-overview', projectId] }),
  });
}

export function useProjectAnalytics(projectId) {
  return useQuery({
    queryKey: ['analytics', projectId],
    queryFn: () => client.get(`/analytics/project/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

/* ─── Requirements ─── */
export function useRequirements(projectId, page = 0) {
  return useQuery({
    queryKey: ['requirements', projectId, page],
    queryFn: () =>
      client
        .get(`/projects/${projectId}/requirements`, {
          params: { skip: page * PAGE_SIZE, limit: PAGE_SIZE },
        })
        .then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useUpdateRequirement(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqId, ...data }) =>
      client.put(`/projects/${projectId}/requirements/${reqId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements', projectId] }),
  });
}

export function useCreateRequirement(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      client.post(`/projects/${projectId}/requirements`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements', projectId] }),
  });
}

export function useUpdateRequirementStatus(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqId, status }) =>
      client.patch(`/projects/${projectId}/requirements/${reqId}/status?new_status=${status}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements', projectId] }),
  });
}

/* ─── Blueprints ─── */
export function useBlueprints(projectId, page = 0) {
  return useQuery({
    queryKey: ['blueprints', projectId, page],
    queryFn: () =>
      client
        .get(`/projects/${projectId}/blueprints`, {
          params: { skip: page * PAGE_SIZE, limit: PAGE_SIZE },
        })
        .then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateBlueprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      client.post(`/projects/${projectId}/blueprints`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blueprints', projectId] }),
  });
}

export function useUpdateBlueprint(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bpId, ...data }) =>
      client.put(`/projects/${projectId}/blueprints/${bpId}`, data).then((r) => r.data),
    onSuccess: (_, { bpId }) => {
      qc.invalidateQueries({ queryKey: ['blueprints', projectId] });
      // Re-fetch parsed nodes after blueprint update (Fix 15)
      qc.invalidateQueries({ queryKey: ['blueprint-parsed', projectId, bpId] });
    },
  });
}

export function useParsedBlueprint(projectId, bpId) {
  return useQuery({
    queryKey: ['blueprint-parsed', projectId, bpId],
    queryFn: () => client.get(`/projects/${projectId}/blueprints/${bpId}/parsed`).then((r) => r.data),
    enabled: !!projectId && !!bpId,
  });
}

/* ─── Work Orders ─── */
export function useWorkOrders(blueprintId, page = 0) {
  return useQuery({
    queryKey: ['work-orders', blueprintId, page],
    queryFn: () =>
      client
        .get(`/blueprints/${blueprintId}/work-orders`, {
          params: { skip: page * PAGE_SIZE, limit: PAGE_SIZE },
        })
        .then((r) => r.data),
    enabled: !!blueprintId,
  });
}

export function useCreateWorkOrder(blueprintId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      client.post(`/blueprints/${blueprintId}/work-orders`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders', blueprintId] }),
  });
}

export function useUpdateWorkOrderStatus(blueprintId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ woId, status }) =>
      client.patch(`/blueprints/${blueprintId}/work-orders/${woId}/status?new_status=${status}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders', blueprintId] }),
  });
}

/* ─── Feedback ─── */
export function useFeedback(projectId) {
  return useQuery({
    queryKey: ['feedback', projectId],
    queryFn: () => client.get(`/projects/${projectId}/feedbacks`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateFeedback(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      client.post(`/projects/${projectId}/feedbacks`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', projectId] }),
  });
}

/* ─── Tests ─── */
export function useTestCases(requirementId) {
  return useQuery({
    queryKey: ['tests', requirementId],
    queryFn: () =>
      client.get(`/requirements/${requirementId}/tests`).then((r) => r.data),
    enabled: !!requirementId,
  });
}

export function useCreateTestCase(requirementId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      client.post(`/requirements/${requirementId}/tests`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests', requirementId] }),
  });
}

/* ─── Version History ─── */
export function useVersionHistory(entityType, entityId) {
  return useQuery({
    queryKey: ['versions', entityType, entityId],
    queryFn: () => client.get(`/versions/${entityType}/${entityId}`).then((r) => r.data),
    enabled: !!entityType && !!entityId,
  });
}

export function useVersionContent(entityType, entityId, versionNumber) {
  return useQuery({
    queryKey: ['version-content', entityType, entityId, versionNumber],
    queryFn: () => client.get(`/versions/${entityType}/${entityId}/${versionNumber}`).then((r) => r.data),
    enabled: !!entityType && !!entityId && versionNumber != null,
  });
}

/* ─── Audit ─── */
export function useAuditLogs(filters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => client.get('/audit', { params: filters }).then((r) => r.data),
  });
}

/* ─── Knowledge Graph ─── */
export function useProjectGraph(projectId) {
  return useQuery({
    queryKey: ['graph', projectId],
    queryFn: () => client.get(`/knowledge-graph/project/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useGraphNode(nodeId) {
  return useQuery({
    queryKey: ['graph-node', nodeId],
    queryFn: () => client.get(`/knowledge-graph/neighbors/${nodeId}`).then((r) => r.data),
    enabled: !!nodeId,
  });
}

/* ─── AI Actions ─── */
export function useGenerateRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, project_description }) =>
      client.post('/ai/generate-requirements', { project_id: projectId, project_description }).then((r) => r.data),
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ['requirements', projectId] }),
  });
}

export function useGenerateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, project_description }) =>
      client.post('/ai/generate-blueprint', { project_id: projectId, project_description }).then((r) => r.data),
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ['blueprints', projectId] }),
  });
}

export function useGenerateWorkOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blueprintId }) =>
      client.post('/ai/generate-work-orders', { blueprint_id: blueprintId }).then((r) => r.data),
    onSuccess: (_, { blueprintId }) => qc.invalidateQueries({ queryKey: ['work-orders', blueprintId] }),
  });
}

export function useGenerateTests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requirementId }) =>
      client.post('/ai/generate-tests', { requirement_id: requirementId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  });
}

export function useParseFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, feedback_text, source = 'manual' }) =>
      client.post('/ai/parse-feedback', { project_id: projectId, feedback_text, source }).then((r) => r.data),
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ['feedback', projectId] }),
  });
}

/* ─── Models / Ollama ─── */
export function useOllamaStatus() {
  return useQuery({
    queryKey: ['ollama-status'],
    queryFn: () => client.get('/ollama/status').then((r) => r.data),
    refetchInterval: 10000,
  });
}

export function useModelsList() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => client.get('/ollama/models').then((r) => r.data),
  });
}

export function useSwitchProvider() {
  return useMutation({
    mutationFn: (data) => client.post('/ollama/switch', data).then((r) => r.data),
  });
}

export function usePullModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name }) => client.post('/ollama/pull', { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  });
}

export function useBenchmark() {
  return useMutation({
    mutationFn: () => client.post('/ollama/benchmark').then((r) => r.data),
  });
}

/* ─── Export ─── */
export function useExportMarkdown(projectId) {
  return useQuery({
    queryKey: ['export-md', projectId],
    queryFn: () => client.get(`/export/project/${projectId}/markdown`).then((r) => r.data),
    enabled: false, // manual trigger
  });
}

/* ─── Token Usage ─── */
export function useTokenUsage(projectId) {
  return useQuery({
    queryKey: ['token-usage', projectId || 'global'],
    queryFn: () =>
      projectId
        ? client.get(`/token-usage/project/${projectId}`).then((r) => r.data)
        : client.get('/token-usage/global').then((r) => r.data),
  });
}

/* ─── Referrals ─── */
export function useReferralStats() {
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => client.get('/referrals/my-stats').then((r) => r.data),
  });
}

export function useReferralCode() {
  return useQuery({
    queryKey: ['referral-code'],
    queryFn: () => client.get('/referrals/my-code').then((r) => r.data),
  });
}

export function useReferralLeaderboard() {
  return useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: () => client.get('/referrals/leaderboard').then((r) => r.data),
  });
}

export function useRedeemReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code) => client.post(`/referrals/redeem/${code}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral-stats'] }),
  });
}

/* ─── Git Export ─── */
export function useGitExport() {
  return useMutation({
    mutationFn: (projectId) => client.post(`/export/project/${projectId}/git-init`).then((r) => r.data),
  });
}

/* ─── Templates ─── */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => client.get('/templates').then((r) => r.data),
  });
}

export function useTemplate(templateId) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: () => client.get(`/templates/${templateId}`).then((r) => r.data),
    enabled: !!templateId,
  });
}

export function useApplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, project_name, project_description }) =>
      client.post(`/templates/${templateId}/apply`, { project_name, project_description }).then((r) => r.data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (projectId) {
        qc.invalidateQueries({ queryKey: ['requirements', projectId] });
        qc.invalidateQueries({ queryKey: ['blueprints', projectId] });
      }
    },
  });
}

/* ─── Traceability ─── */
export function useTraceability(projectId) {
  return useQuery({
    queryKey: ['traceability', projectId],
    queryFn: () => client.get(`/projects/${projectId}/traceability`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useGaps(projectId) {
  return useQuery({
    queryKey: ['gaps', projectId],
    queryFn: () => client.get(`/projects/${projectId}/gaps`).then((r) => r.data),
    enabled: !!projectId,
  });
}

/* ─── ER Diagram ─── */
export function useERDiagram(projectId) {
  return useQuery({
    queryKey: ['er-diagram', projectId],
    queryFn: () => client.get(`/er-diagram/project/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useBlueprintERDiagram(blueprintId) {
  return useQuery({
    queryKey: ['er-diagram-bp', blueprintId],
    queryFn: () => client.get(`/er-diagram/blueprint/${blueprintId}`).then((r) => r.data),
    enabled: !!blueprintId,
  });
}

/* ─── Analytics ─── */
export function useGlobalSummary() {
  return useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => client.get('/analytics/summary').then((r) => r.data),
  });
}

/* ─── Feedback link ─── */
export function useLinkFeedback(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fbId, workOrderId }) =>
      client.patch(`/projects/${projectId}/feedbacks/${fbId}/link`, { work_order_id: workOrderId, status: 'linked' }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', projectId] }),
  });
}

export function useWorkOrdersForProject(projectId) {
  const { data: blueprints } = useBlueprints(projectId);
  const bpList = Array.isArray(blueprints) ? blueprints : blueprints?.items || [];
  return useQuery({
    queryKey: ['all-work-orders', projectId],
    queryFn: async () => {
      const all = [];
      for (const bp of bpList) {
        const r = await client.get(`/blueprints/${bp.id || bp.blueprint_id}/work-orders`);
        all.push(...(r.data || []).map((wo) => ({ ...wo, blueprint_name: bp.name })));
      }
      return all;
    },
    enabled: !!projectId && bpList.length > 0,
  });
}

/* ─── Blueprint Mermaid ─── */
export function useBlueprintMermaid(blueprintId) {
  return useQuery({
    queryKey: ['blueprint-mermaid', blueprintId],
    queryFn: () => client.get(`/blueprints/${blueprintId}/mermaid`).then((r) => r.data),
    enabled: false,
  });
}

/* ─── Code Index ─── */
export function useRepositories(projectId) {
  return useQuery({
    queryKey: ['repositories', projectId],
    queryFn: () => client.get(`/repositories/project/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateRepository(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => client.post(`/repositories/project/${projectId}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repositories', projectId] }),
  });
}

export function useDeleteRepository(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId) => client.delete(`/repositories/${repoId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repositories', projectId] }),
  });
}

export function useTriggerIndex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId) => client.post(`/repositories/${repoId}/index`).then((r) => r.data),
    onSuccess: (_, repoId) => {
      const poll = setInterval(() => qc.invalidateQueries({ queryKey: ['repo-status', repoId] }), 2000);
      setTimeout(() => clearInterval(poll), 30000);
    },
  });
}

export function useRepoStatus(repoId) {
  return useQuery({
    queryKey: ['repo-status', repoId],
    queryFn: () => client.get(`/repositories/${repoId}/status`).then((r) => r.data),
    enabled: !!repoId,
    refetchInterval: (data) => (data?.status === 'indexing' ? 2000 : false),
  });
}

export function useCodeSearch(repoId, query) {
  return useQuery({
    queryKey: ['code-search', repoId, query],
    queryFn: () => client.get(`/repositories/${repoId}/search`, { params: { q: query } }).then((r) => r.data),
    enabled: !!repoId && !!query && query.length > 1,
  });
}

/* ─── Drift Engine ─── */
export function useDriftAlerts(projectId, status = 'open') {
  return useQuery({
    queryKey: ['drift', projectId, status],
    queryFn: () => client.get(`/drift/project/${projectId}`, { params: { status } }).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useScanDrift(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.post(`/drift/project/${projectId}/scan`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drift', projectId] }),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, status, resolution_note }) =>
      client.patch(`/drift/alerts/${alertId}`, { status, resolution_note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drift'] }),
  });
}

/* ─── Simulator ─── */
export function useSimulatorRuns(projectId) {
  return useQuery({
    queryKey: ['simulator-runs', projectId],
    queryFn: () => client.get(`/simulator/project/${projectId}/runs`).then(r => r.data),
    enabled: !!projectId,
  });
}
export function useSimulatorScreens(runId) {
  return useQuery({
    queryKey: ['simulator-screens', runId],
    queryFn: () => client.get(`/simulator/runs/${runId}/screens`).then(r => r.data),
    enabled: !!runId,
  });
}
export function useCreateSimulatorRun(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => client.post(`/simulator/project/${projectId}/runs`, body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simulator-runs', projectId] }),
  });
}
export function useDeleteSimulatorRun(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId) => client.delete(`/simulator/runs/${runId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simulator-runs', projectId] }),
  });
}

/* ─── QA Flows ─── */
export function useQAFlows(projectId) {
  return useQuery({
    queryKey: ['qa-flows', projectId],
    queryFn: () => client.get(`/qa-flows/project/${projectId}`).then(r => r.data),
    enabled: !!projectId,
  });
}
export function useGenerateQAFlow(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => client.post(`/qa-flows/project/${projectId}/generate`, body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-flows', projectId] }),
  });
}
export function useRunQAFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flowId) => client.post(`/qa-flows/${flowId}/run`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-flows'] }),
  });
}
export function useDeleteQAFlow(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flowId) => client.delete(`/qa-flows/${flowId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-flows', projectId] }),
  });
}

/* ─── Live Assistance ─── */
export function useFrictionEvents(projectId, status) {
  return useQuery({
    queryKey: ['friction-events', projectId, status],
    queryFn: () => client.get(`/live-assist/project/${projectId}/events`, { params: { status } }).then(r => r.data),
    enabled: !!projectId,
    refetchInterval: 15000,
  });
}
export function useDismissEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId) => client.patch(`/live-assist/events/${eventId}/dismiss`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friction-events'] }),
  });
}
export function usePromoteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, blueprint_id, title }) =>
      client.post(`/live-assist/events/${eventId}/promote`, { blueprint_id, title }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friction-events'] }),
  });
}
export function useWidgetSnippet(projectId) {
  return useQuery({
    queryKey: ['widget-snippet', projectId],
    queryFn: () => client.get(`/live-assist/project/${projectId}/widget-snippet`).then(r => r.data),
    enabled: !!projectId,
  });
}

// ── Section 16: Config ────────────────────────────────────────────────────────
export const useAgentInstructions = (projectId) =>
  useQuery({ queryKey: ['agent-instructions', projectId], queryFn: () => client.get(`/config/project/${projectId}/instructions`).then(r => r.data), enabled: !!projectId });
export const useUpsertInstruction = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => client.put(`/config/project/${projectId}/instructions/${data.module}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries(['agent-instructions', projectId]) });
};
export const useDocTemplates = (projectId) =>
  useQuery({ queryKey: ['doc-templates', projectId], queryFn: () => client.get('/config/doc-templates', { params: projectId ? { project_id: projectId } : {} }).then(r => r.data), enabled: true });
export const useCreateDocTemplate = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => client.post('/config/doc-templates', data, { params: projectId ? { project_id: projectId } : {} }).then(r => r.data), onSuccess: () => qc.invalidateQueries(['doc-templates', projectId]) });
};
export const useWOStrategies = () =>
  useQuery({ queryKey: ['wo-strategies'], queryFn: () => client.get('/config/wo-strategies').then(r => r.data) });

// ── Section 16: Artifacts ─────────────────────────────────────────────────────
export const useArtifacts = (projectId) =>
  useQuery({ queryKey: ['artifacts', projectId], queryFn: () => client.get(`/artifacts/project/${projectId}`).then(r => r.data), enabled: !!projectId });
export const useDeleteArtifact = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.delete(`/artifacts/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['artifacts', projectId]) });
};

// ── Section 16: Hooks ─────────────────────────────────────────────────────────
export const useAgentHooks = (projectId) =>
  useQuery({ queryKey: ['agent-hooks', projectId], queryFn: () => client.get(`/hooks/project/${projectId}`).then(r => r.data), enabled: !!projectId });
export const useCreateAgentHook = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => client.post(`/hooks/project/${projectId}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries(['agent-hooks', projectId]) });
};
export const useDeleteAgentHook = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.delete(`/hooks/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['agent-hooks', projectId]) });
};
export const useTriggerHook = () =>
  useMutation({ mutationFn: (id) => client.post(`/hooks/${id}/trigger`).then(r => r.data) });

// ── Section 16: Notifications ─────────────────────────────────────────────────
export const useNotifications = (projectId) =>
  useQuery({ queryKey: ['notifications', projectId], queryFn: () => client.get('/notifications', { params: { project_id: projectId } }).then(r => r.data), enabled: !!projectId });
export const useUnreadCount = (projectId) =>
  useQuery({ queryKey: ['notif-unread', projectId], queryFn: () => client.get('/notifications/unread-count', { params: { project_id: projectId } }).then(r => r.data), refetchInterval: 30000, enabled: !!projectId });
export const useMarkNotifRead = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.patch(`/notifications/${id}/read`).then(r => r.data), onSuccess: () => { qc.invalidateQueries(['notifications', projectId]); qc.invalidateQueries(['notif-unread', projectId]); } });
};
export const useMarkAllRead = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => client.post('/notifications/mark-all-read', {}, { params: { project_id: projectId } }).then(r => r.data), onSuccess: () => { qc.invalidateQueries(['notifications', projectId]); qc.invalidateQueries(['notif-unread', projectId]); } });
};

// ── Section 16: Feedback Themes ───────────────────────────────────────────────
export const useFeedbackThemes = (projectId) =>
  useQuery({ queryKey: ['feedback-themes', projectId], queryFn: () => client.get(`/feedback-themes/project/${projectId}`).then(r => r.data), enabled: !!projectId });
export const useGroomThemes = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => client.post(`/feedback-themes/project/${projectId}/groom`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['feedback-themes', projectId]) });
};
export const useDeleteFeedbackTheme = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.delete(`/feedback-themes/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['feedback-themes', projectId]) });
};

// ── Section 16: Lifecycle ─────────────────────────────────────────────────────
export const useCopyProject = () =>
  useMutation({ mutationFn: ({ projectId, name }) => client.post(`/lifecycle/project/${projectId}/copy`, { new_name: name }).then(r => r.data) });
export const useArchiveProject = () =>
  useMutation({ mutationFn: (projectId) => client.post(`/lifecycle/project/${projectId}/archive`).then(r => r.data) });
export const useRestoreProject = () =>
  useMutation({ mutationFn: (projectId) => client.post(`/lifecycle/project/${projectId}/restore`).then(r => r.data) });

// ── Section 16: External API Keys ─────────────────────────────────────────────
export const useExternalAPIKeys = () =>
  useQuery({ queryKey: ['external-api-keys'], queryFn: () => client.get('/api-keys').then(r => r.data) });
export const useCreateExternalAPIKey = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => client.post('/api-keys', data).then(r => r.data), onSuccess: () => qc.invalidateQueries(['external-api-keys']) });
};
export const useDeleteExternalAPIKey = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.delete(`/api-keys/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['external-api-keys']) });
};

// ── Section 16: Reporting ─────────────────────────────────────────────────────
export const useProjectReport = (projectId) =>
  useQuery({ queryKey: ['project-report', projectId], queryFn: () => client.get(`/reporting/project/${projectId}/summary`).then(r => r.data), enabled: !!projectId });

// ── Section 16: Search ────────────────────────────────────────────────────────
export const useGlobalSearch = (q) =>
  useQuery({ queryKey: ['global-search', q], queryFn: () => client.get('/search', { params: { q } }).then(r => r.data), enabled: !!q && q.length > 1 });

// ── Section 16: Agent Chat ────────────────────────────────────────────────────
export const useAgentChatHistory = (projectId) =>
  useQuery({ queryKey: ['agent-chat', projectId], queryFn: () => client.get(`/agent-chat/project/${projectId}`).then(r => r.data), enabled: !!projectId });
export const useSendAgentChat = (projectId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => client.post(`/agent-chat/project/${projectId}/message`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries(['agent-chat', projectId]) });
};

// ── Section 16: Comments & Flags ──────────────────────────────────────────────
export const useCommentThreads = (entityType, entityId) =>
  useQuery({ queryKey: ['comment-threads', entityType, entityId], queryFn: () => client.get('/comments/threads', { params: { entity_type: entityType, entity_id: entityId } }).then(r => r.data), enabled: !!entityType && !!entityId });
export const useCreateThread = (entityType, entityId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => client.post('/comments/threads', data).then(r => r.data), onSuccess: () => qc.invalidateQueries(['comment-threads', entityType, entityId]) });
};
export const useDocumentFlags = (entityType, entityId) =>
  useQuery({ queryKey: ['flags', entityType, entityId], queryFn: () => client.get('/flags', { params: { entity_type: entityType, entity_id: entityId } }).then(r => r.data), enabled: !!entityType && !!entityId });

// ── Section 16: Tracked Changes ───────────────────────────────────────────────
export const useTrackedChanges = (entityType, entityId) =>
  useQuery({ queryKey: ['tracked-changes', entityType, entityId], queryFn: () => client.get('/tracked-changes', { params: { entity_type: entityType, entity_id: entityId } }).then(r => r.data), enabled: !!entityType && !!entityId });
export const useAcceptChange = (entityType, entityId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.post(`/tracked-changes/${id}/accept`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['tracked-changes', entityType, entityId]) });
};
export const useRejectChange = (entityType, entityId) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => client.post(`/tracked-changes/${id}/reject`).then(r => r.data), onSuccess: () => qc.invalidateQueries(['tracked-changes', entityType, entityId]) });
};

// ── Section 16: WO Extras ────────────────────────────────────────────────────
export const useWODedup = (projectId) =>
  useMutation({ mutationFn: () => client.post(`/wo-extras/project/${projectId}/dedup`).then(r => r.data) });
export const usePhaseReview = (projectId) =>
  useMutation({ mutationFn: () => client.post(`/wo-extras/project/${projectId}/phase-review`).then(r => r.data) });

// ── Section 16: Mindmap ───────────────────────────────────────────────────────
export const useMindmap = (projectId) =>
  useQuery({ queryKey: ['mindmap', projectId], queryFn: () => client.get(`/mindmap/project/${projectId}`).then(r => r.data), enabled: !!projectId });
