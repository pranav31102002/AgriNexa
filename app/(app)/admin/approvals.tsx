import { AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminApprovals } from '@/hooks/useAdminApprovals';
import { useAuthStore } from '@/store/use-auth-store';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export default function AdminApprovalsScreen() {
  const { palette } = useAdminTheme();
  const authUser = useAuthStore((state) => state.user);
  const {
    approvals,
    isLoading,
    dataHealth,
    rejectApproval,
    rejectingApproval,
    delegateApproval,
    delegatingApproval,
    reRequestApproval,
    reRequestingApproval,
  } = useAdminApprovals();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'executed' | 'rejected'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'EMERGENCY_STOP_ALL' | 'DISABLE_FARMER_ACCOUNT'>('all');
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      approvals.filter((approval) => {
        if (statusFilter !== 'all' && approval.status !== statusFilter) return false;
        if (actionFilter !== 'all' && approval.actionType !== actionFilter) return false;
        return true;
      }),
    [approvals, statusFilter, actionFilter]
  );

  const pendingCount = approvals.filter((approval) => approval.status === 'pending').length;

  return (
    <AdminMobileShell title="Approvals Queue" subtitle="Two-step control history for high-risk admin actions." dataHealth={dataHealth}>
      <AdminSectionHeader title="Action Approvals" subtitle="Pending approvals must be reviewed before high-risk execution." />

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold" style={{ color: palette.text }}>
            Pending Requests
          </Text>
          <StatusBadge text={`${pendingCount}`} tone={pendingCount > 0 ? 'warn' : 'ok'} />
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {(['all', 'pending', 'executed', 'rejected'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={statusFilter === value} onPress={() => setStatusFilter(value)} />
          ))}
        </View>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(['all', 'EMERGENCY_STOP_ALL', 'DISABLE_FARMER_ACCOUNT'] as const).map((value) => (
            <FilterChip
              key={value}
              label={value === 'EMERGENCY_STOP_ALL' ? 'STOP ALL' : value === 'DISABLE_FARMER_ACCOUNT' ? 'DISABLE USER' : 'ALL ACTIONS'}
              active={actionFilter === value}
              onPress={() => setActionFilter(value)}
            />
          ))}
        </View>
      </GlassCard>

      {!filtered.length && !isLoading ? <EmptyState title="No approvals found" subtitle="No approval records match the current filters." /> : null}

      {filtered.map((approval) => (
        <GlassCard key={approval.id}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-black" style={{ color: palette.text }}>
                {approval.actionType === 'EMERGENCY_STOP_ALL' ? 'Emergency Stop All Routes' : 'Disable Farmer Account'}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: palette.muted }}>
                {approval.summary || 'No summary'}
              </Text>
            </View>
            <StatusBadge
              text={approval.status.toUpperCase()}
              tone={approval.status === 'executed' ? 'ok' : approval.status === 'rejected' ? 'error' : 'warn'}
            />
          </View>

          <View className="mt-4 gap-3">
            <DetailRow label="Target" value={approval.targetId || 'N/A'} />
            <DetailRow label="Requested By" value={approval.requestedByName || approval.requestedByUid || 'Unknown'} />
            <DetailRow label="Requested At" value={approval.createdAt ? new Date(approval.createdAt * 1000).toLocaleString() : 'N/A'} />
            <DetailRow label="Approved By" value={approval.approvedByName || approval.approvedByUid || 'Not approved'} />
            <DetailRow label="Approved At" value={approval.approvedAt ? new Date(approval.approvedAt * 1000).toLocaleString() : 'Pending'} />
            <DetailRow label="Executed At" value={approval.executedAt ? new Date(approval.executedAt * 1000).toLocaleString() : 'Pending'} />
            <DetailRow label="Delegated To" value={approval.delegatedToName || approval.delegatedToUid || 'Not delegated'} />
            <DetailRow label="Rejected By" value={approval.rejectedByName || approval.rejectedByUid || 'Not rejected'} />
            <DetailRow label="Reject Reason" value={approval.rejectReason || 'N/A'} />
            <DetailRow label="Parent Approval" value={approval.parentApprovalId || 'N/A'} />
          </View>

          {approval.status === 'pending' ? (
            <View className="mt-4 gap-2">
              <TextInput
                value={rejectReasonById[approval.id] ?? ''}
                onChangeText={(value) => setRejectReasonById((prev) => ({ ...prev, [approval.id]: value }))}
                placeholder="Reason if you reject this request"
                placeholderTextColor={palette.muted}
                className="rounded-[16px] border px-3 py-2"
                style={{ borderColor: palette.border, color: palette.text, backgroundColor: palette.bgSecondary }}
              />
              <View className="flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-full px-4 py-3"
                  style={{ backgroundColor: '#5B6B8C' }}
                  disabled={delegatingApproval}
                  onPress={() => {
                    void delegateApproval({
                      approval,
                      delegateToUid: authUser?.uid ?? 'unknown_admin',
                      delegateToName: authUser?.displayName || 'Current Admin',
                    });
                  }}>
                  <Text className="text-center text-xs font-bold text-white">{delegatingApproval ? 'Delegating...' : 'Delegate To Me'}</Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-full px-4 py-3"
                  style={{ backgroundColor: '#7F1D1D' }}
                  disabled={rejectingApproval}
                  onPress={() => {
                    void rejectApproval({
                      approval,
                      reason: rejectReasonById[approval.id] ?? '',
                    });
                  }}>
                  <Text className="text-center text-xs font-bold text-white">{rejectingApproval ? 'Rejecting...' : 'Reject Request'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {approval.status === 'rejected' ? (
            <Pressable
              className="mt-4 rounded-full px-4 py-3"
              style={{ backgroundColor: '#1B9C5A' }}
              disabled={reRequestingApproval}
              onPress={() => {
                void reRequestApproval({ approval });
              }}>
              <Text className="text-center text-xs font-bold text-white">{reRequestingApproval ? 'Re-requesting...' : 'Re-request Approval'}</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      ))}
    </AdminMobileShell>
  );
}
