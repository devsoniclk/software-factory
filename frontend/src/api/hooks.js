import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';

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

/* ─── Requirements ─── */
export function useRequirements(projectId) {
  return useQuery({
    queryKey: ['requirements', projectId],
    queryFn: () => client.get(`/projects/${projectId}/requirements`).then((r) => r.data),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements'] }),
  });
}

/* ─── Blueprints ─── */
export function useBlueprints(projectId) {
  return useQuery({
    queryKey: ['blueprints', projectId],
    queryFn: () => client.get(`/projects/${projectId}/blueprints`).then((r) => r.data),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blueprints', projectId] }),
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
export function useWorkOrders(blueprintId) {
  return useQuery({
    queryKey: ['work-orders', blueprintId],
    queryFn: () => client.get(`/blueprints/${blueprintId}/work-orders`).then((r) => r.data),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements'] }),
  });
}

export function useGenerateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, project_description }) =>
      client.post('/ai/generate-blueprint', { project_id: projectId, project_description }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blueprints'] }),
  });
}

export function useGenerateWorkOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blueprintId }) =>
      client.post('/ai/generate-work-orders', { blueprint_id: blueprintId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
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
