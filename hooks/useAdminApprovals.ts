import { firebasePaths } from '@/constants/firebase-paths';
import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { HighRiskActionType, HighRiskApproval } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ApprovalMap = Record<string, Partial<HighRiskApproval>>;

function toText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toTimestamp(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toApproval(id: string, raw: Partial<HighRiskApproval>): HighRiskApproval {
  const status = raw.status === 'executed' || raw.status === 'rejected' ? raw.status : 'pending';
  const actionType = raw.actionType === 'DISABLE_FARMER_ACCOUNT' ? raw.actionType : 'EMERGENCY_STOP_ALL';
  return {
    id,
    actionType,
    targetId: toText(raw.targetId),
    summary: toText(raw.summary),
    status,
    requestedByUid: toText(raw.requestedByUid),
    requestedByName: toText(raw.requestedByName),
    approvedByUid: toText(raw.approvedByUid),
    approvedByName: toText(raw.approvedByName),
    rejectedByUid: toText(raw.rejectedByUid),
    rejectedByName: toText(raw.rejectedByName),
    rejectReason: toText(raw.rejectReason),
    delegatedToUid: toText(raw.delegatedToUid),
    delegatedToName: toText(raw.delegatedToName),
    createdAt: toTimestamp(raw.createdAt),
    approvedAt: toTimestamp(raw.approvedAt),
    rejectedAt: toTimestamp(raw.rejectedAt),
    delegatedAt: toTimestamp(raw.delegatedAt),
    executedAt: toTimestamp(raw.executedAt),
    parentApprovalId: toText(raw.parentApprovalId),
  };
}

export function useAdminApprovals() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const profile = useAppStore((state) => state.profile);
  const snapshot = useAdminSnapshot();

  const approvalsQuery = useQuery({
    queryKey: ['admin-approvals'],
    queryFn: async () => {
      const raw = await getRealtimeOnce<ApprovalMap>(firebasePaths.adminApprovals);
      return Object.entries(raw ?? {})
        .map(([id, value]) => toApproval(id, value))
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    refetchInterval: 5000,
    refetchOnReconnect: true,
    staleTime: 2000,
  });

  const requestApprovalMutation = useMutation({
    mutationFn: async (params: { actionType: HighRiskActionType; targetId: string; summary: string }) => {
      const now = Math.floor(Date.now() / 1000);
      const uid = authUser?.uid ?? 'unknown_admin';
      const name = profile.name || authUser?.displayName || 'Admin';
      const id = `${Date.now()}_${uid}_${params.actionType}`;
      const payload: HighRiskApproval = {
        id,
        actionType: params.actionType,
        targetId: params.targetId,
        summary: params.summary,
        status: 'pending',
        requestedByUid: uid,
        requestedByName: name,
        approvedByUid: '',
        approvedByName: '',
        rejectedByUid: '',
        rejectedByName: '',
        rejectReason: '',
        delegatedToUid: '',
        delegatedToName: '',
        createdAt: now,
        approvedAt: 0,
        rejectedAt: 0,
        delegatedAt: 0,
        executedAt: 0,
        parentApprovalId: '',
      };
      const saved = await setRealtime(`${firebasePaths.adminApprovals}/${id}`, payload);
      if (!saved) throw new Error('Could not create approval request.');
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });

  const executeApprovalMutation = useMutation({
    mutationFn: async (params: { approval: HighRiskApproval; executor: () => Promise<void> }) => {
      const now = Math.floor(Date.now() / 1000);
      const uid = authUser?.uid ?? 'unknown_admin';
      const name = profile.name || authUser?.displayName || 'Admin';
      await params.executor();
      const updates: Array<[string, unknown]> = [
        [`${firebasePaths.adminApprovals}/${params.approval.id}/status`, 'executed'],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/approvedByUid`, uid],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/approvedByName`, name],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/approvedAt`, now],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/executedAt`, now],
      ];
      const saved = await Promise.all(updates.map(([path, value]) => setRealtime(path, value)));
      if (saved.some((ok) => !ok)) throw new Error('Action executed but approval status update failed.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });

  const rejectApprovalMutation = useMutation({
    mutationFn: async (params: { approval: HighRiskApproval; reason: string }) => {
      const now = Math.floor(Date.now() / 1000);
      const uid = authUser?.uid ?? 'unknown_admin';
      const name = profile.name || authUser?.displayName || 'Admin';
      const updates: Array<[string, unknown]> = [
        [`${firebasePaths.adminApprovals}/${params.approval.id}/status`, 'rejected'],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/rejectedByUid`, uid],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/rejectedByName`, name],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/rejectReason`, params.reason.trim() || 'No reason provided'],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/rejectedAt`, now],
      ];
      const saved = await Promise.all(updates.map(([path, value]) => setRealtime(path, value)));
      if (saved.some((ok) => !ok)) throw new Error('Could not reject approval.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });

  const delegateApprovalMutation = useMutation({
    mutationFn: async (params: { approval: HighRiskApproval; delegateToUid: string; delegateToName: string }) => {
      const now = Math.floor(Date.now() / 1000);
      const updates: Array<[string, unknown]> = [
        [`${firebasePaths.adminApprovals}/${params.approval.id}/delegatedToUid`, params.delegateToUid],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/delegatedToName`, params.delegateToName],
        [`${firebasePaths.adminApprovals}/${params.approval.id}/delegatedAt`, now],
      ];
      const saved = await Promise.all(updates.map(([path, value]) => setRealtime(path, value)));
      if (saved.some((ok) => !ok)) throw new Error('Could not delegate approval.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });

  const reRequestMutation = useMutation({
    mutationFn: async (params: { approval: HighRiskApproval }) => {
      const now = Math.floor(Date.now() / 1000);
      const uid = authUser?.uid ?? 'unknown_admin';
      const name = profile.name || authUser?.displayName || 'Admin';
      const id = `${Date.now()}_${uid}_${params.approval.actionType}_R`;
      const payload: HighRiskApproval = {
        id,
        actionType: params.approval.actionType,
        targetId: params.approval.targetId,
        summary: `${params.approval.summary} (Re-requested)`,
        status: 'pending',
        requestedByUid: uid,
        requestedByName: name,
        approvedByUid: '',
        approvedByName: '',
        rejectedByUid: '',
        rejectedByName: '',
        rejectReason: '',
        delegatedToUid: '',
        delegatedToName: '',
        createdAt: now,
        approvedAt: 0,
        rejectedAt: 0,
        delegatedAt: 0,
        executedAt: 0,
        parentApprovalId: params.approval.id,
      };
      const saved = await setRealtime(`${firebasePaths.adminApprovals}/${id}`, payload);
      if (!saved) throw new Error('Could not create re-request approval.');
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });

  return {
    ...approvalsQuery,
    dataHealth: snapshot.dataHealth,
    approvals: approvalsQuery.data ?? [],
    requestApproval: requestApprovalMutation.mutateAsync,
    requestingApproval: requestApprovalMutation.isPending,
    executeApproval: executeApprovalMutation.mutateAsync,
    executingApproval: executeApprovalMutation.isPending,
    rejectApproval: rejectApprovalMutation.mutateAsync,
    rejectingApproval: rejectApprovalMutation.isPending,
    delegateApproval: delegateApprovalMutation.mutateAsync,
    delegatingApproval: delegateApprovalMutation.isPending,
    reRequestApproval: reRequestMutation.mutateAsync,
    reRequestingApproval: reRequestMutation.isPending,
  };
}
