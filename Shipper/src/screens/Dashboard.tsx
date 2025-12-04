import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as shipperApi from '../api/shipper';
import { AuthContext } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import type { ShipperSummary } from '../types';

type IncomePeriod = 'day' | 'month' | 'year';

export default function DashboardScreen() {
  const { user, signOut } = useContext(AuthContext);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Dashboard'>>();
  const [summary, setSummary] = useState<ShipperSummary | null>(null);
  const [incomePeriod, setIncomePeriod] = useState<IncomePeriod>('day');

  useEffect(() => {
    (async () => {
      try {
        const res = await shipperApi.getSummary();
        setSummary(res.stats || null);
      } catch {
        // ignore
      }
    })();
  }, []);

  const incomeFigures = useMemo<Record<IncomePeriod, number>>(
    () => ({
      day: Number(summary?.incomeToday ?? 0),
      month: Number(
        summary?.incomeMonth ?? summary?.incomeThisMonth ?? summary?.incomeMonthly ?? summary?.income30Days ?? 0,
      ),
      year: Number(summary?.incomeYear ?? summary?.incomeThisYear ?? summary?.income12Months ?? 0),
    }),
    [summary],
  );

  const walletBalance = Number(summary?.walletBalance ?? summary?.walletTotal ?? summary?.totalIncome ?? 0);
  const walletHold = Number(summary?.walletHold ?? summary?.walletPending ?? summary?.pendingPayout ?? 0);
  const walletAvailable = Math.max(walletBalance - walletHold, 0);

  const handleWalletAction = (intent: 'topup' | 'withdraw') => {
    const messages = {
      topup: 'Tính năng nạp tiền sẽ sớm khả dụng. Vui lòng liên hệ CSKH để được hỗ trợ.',
      withdraw: 'Bạn có thể yêu cầu rút tiền khi số dư khả dụng đạt hạn mức tối thiểu.',
    };
    Alert.alert('Ví thu nhập', messages[intent]);
  };

  const formatCurrency = (value: number) => `${value.toLocaleString()} ₫`;

  const incomeLabels: Record<IncomePeriod, string> = {
    day: 'Theo ngày',
    month: 'Theo tháng',
    year: 'Theo năm',
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.welcome}>Chào, {user?.name || user?.email || 'Shipper'}</Text>

        <View style={styles.summaryWrapper}>
          {summary ? (
            <>
              <SummaryCard label="Đơn đang xử lý" value={summary.active} highlight />
              <SummaryCard label="Đã giao hôm nay" value={summary.deliveredToday} />
              <SummaryCard
                label="Tổng thu nhập"
                value={`${Number(summary.totalIncome || 0).toLocaleString()} ₫`}
              />
              <SummaryCard
                label="Thu nhập hôm nay"
                value={`${Number(summary.incomeToday || 0).toLocaleString()} ₫`}
              />
            </>
          ) : (
            <View style={styles.emptySummary}>
              <Text style={styles.emptySummaryTitle}>Đang tải thống kê…</Text>
              <Text style={styles.emptySummarySubtitle}>Vui lòng kiểm tra kết nối mạng.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thống kê thu nhập</Text>
            <Text style={styles.sectionSubtitle}>Theo dõi hiệu suất theo chu kỳ</Text>
          </View>
          <View style={styles.tabRow}>
            {(Object.keys(incomeLabels) as IncomePeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setIncomePeriod(period)}
                style={[
                  styles.tabButton,
                  period !== 'year' && styles.tabButtonSpacing,
                  incomePeriod === period && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[styles.tabButtonText, incomePeriod === period && styles.tabButtonTextActive]}
                >
                  {incomeLabels[period]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.incomeValue}>{formatCurrency(incomeFigures[incomePeriod])}</Text>
          <Text style={styles.incomeHint}>Tổng thu nhập {incomeLabels[incomePeriod].toLowerCase()}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ví thu nhập</Text>
            <Text style={styles.sectionSubtitle}>Quản lý tiền về - ra nhanh chóng</Text>
          </View>
          <View style={styles.walletRow}>
            <View style={styles.walletColumn}>
              <Text style={styles.walletLabel}>Số dư khả dụng</Text>
              <Text style={styles.walletValue}>{formatCurrency(walletAvailable)}</Text>
            </View>
            <View style={styles.walletDivider} />
            <View style={styles.walletColumn}>
              <Text style={styles.walletLabel}>Đang xử lý</Text>
              <Text style={styles.walletValueMuted}>{formatCurrency(walletHold)}</Text>
              <Text style={styles.walletHint}>Sẽ cộng vào ví khi hoàn tất</Text>
            </View>
          </View>
          <View style={styles.walletActions}>
            <TouchableOpacity
              style={[styles.walletActionButton, styles.walletActionPositive]}
              onPress={() => handleWalletAction('topup')}
            >
              <Text style={styles.walletActionText}>+ Nạp vào ví</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.walletActionButton, styles.walletActionNegative]}
              onPress={() => handleWalletAction('withdraw')}
            >
              <Text style={[styles.walletActionText, styles.walletActionTextNegative]}>- Rút khỏi ví</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionsWrapper}>
          <ActionButton label="Xem đơn hàng" onPress={() => navigation.navigate('Orders')} />
          <ActionButton
            label="Đơn chờ nhận"
            onPress={() => navigation.navigate('Orders', { available: true })}
          />
          <ActionButton label="Hồ sơ" onPress={() => navigation.navigate('Profile')} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type SummaryCardProps = {
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
};

function SummaryCard({ label, value, highlight }: SummaryCardProps) {
  const displayValue = value ?? '-';
  return (
    <View style={[styles.summaryCard, highlight && styles.summaryCardHighlight]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{displayValue}</Text>
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
};

function ActionButton({ label, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const palette = {
  background: '#E6F0FF',
  card: '#FFFFFF',
  accent: '#3B82F6',
  accentSoft: '#EBF2FF',
  textPrimary: '#0F172A',
  textSecondary: '#4B5563',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 4, color: palette.textPrimary },
  welcome: { fontSize: 16, textAlign: 'center', color: palette.textSecondary, marginBottom: 24 },
  summaryWrapper: {},
  summaryCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1F2933',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 12,
  },
  summaryCardHighlight: { backgroundColor: palette.accentSoft, borderWidth: 1, borderColor: palette.accent },
  summaryLabel: { fontSize: 14, color: '#6B7280', marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: '600', color: palette.textPrimary },
  summaryValueHighlight: { color: palette.accent },
  emptySummary: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: palette.card,
    alignItems: 'center',
  },
  emptySummaryTitle: { fontSize: 16, fontWeight: '500', color: palette.textPrimary },
  emptySummarySubtitle: { fontSize: 14, color: palette.textSecondary, textAlign: 'center', marginTop: 4 },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
    shadowColor: '#1F2933',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: palette.textPrimary },
  sectionSubtitle: { fontSize: 14, color: palette.textSecondary, marginTop: 2 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.accentSoft,
  },
  tabButtonSpacing: { marginRight: 8 },
  tabButtonActive: { backgroundColor: palette.accent },
  tabButtonText: { textAlign: 'center', fontSize: 14, color: palette.accent },
  tabButtonTextActive: { color: '#FFFFFF', fontWeight: '600' },
  incomeValue: { fontSize: 32, fontWeight: '700', color: palette.textPrimary, textAlign: 'center' },
  incomeHint: { fontSize: 14, color: palette.textSecondary, textAlign: 'center', marginTop: 4 },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  walletColumn: { flex: 1 },
  walletDivider: { width: 1, height: '80%', backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  walletLabel: { fontSize: 14, color: palette.textSecondary, marginBottom: 6 },
  walletValue: { fontSize: 26, fontWeight: '700', color: palette.accent },
  walletValueMuted: { fontSize: 20, fontWeight: '600', color: '#94A3B8' },
  walletHint: { fontSize: 12, color: palette.textSecondary, marginTop: 4 },
  walletActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  walletActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.accent,
  },
  walletActionPositive: { backgroundColor: palette.accent },
  walletActionNegative: { marginLeft: 12, backgroundColor: '#FFFFFF' },
  walletActionText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  walletActionTextNegative: { color: palette.accent },
  actionsWrapper: { marginTop: 32 },
  actionButton: {
    backgroundColor: palette.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  logoutButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoutButtonText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
});
