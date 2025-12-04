/* eslint-disable react-native/no-inline-styles */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as shipperApi from '../api/shipper';
import { AuthContext } from '../context/AuthContext';
import RootNavigation from '../navigation/RootNavigation';
import type { RootStackParamList } from '../navigation/types';
import type { Order, ShipperSummary, ShippingEventPayload } from '../types';
import { flushQueue, getQueue } from '../utils/offlineQueue';

const STATUS_FILTERS: Array<{ key: 'active' | 'completed' | 'failed' | 'all'; label: string }> = [
  { key: 'active', label: 'Đang giao' },
  { key: 'completed', label: 'Đã giao' },
  { key: 'failed', label: 'Hoàn / Trả' },
  { key: 'all', label: 'Tất cả' },
];

const SHIPPING_STATUS_META: Record<string, { label: string; color: string }> = {
  awaiting_shipment: { label: 'Chờ nhận', color: '#6f42c1' },
  unassigned: { label: 'Chờ phân công', color: '#9ca3af' },
  assigned: { label: 'Đã gán', color: '#4098d7' },
  pickup_pending: { label: 'Chờ lấy', color: '#009688' },
  picked_up: { label: 'Đã lấy', color: '#1976d2' },
  delivering: { label: 'Đang giao', color: '#0288d1' },
  delivered: { label: 'Hoàn tất', color: '#2e7d32' },
  failed: { label: 'Thất bại', color: '#c62828' },
  returned: { label: 'Đã hoàn', color: '#ef6c00' },
  location: { label: 'Cập nhật vị trí', color: '#546e7a' },
  reassigned: { label: 'Đổi shipper', color: '#8e24aa' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'COD (thu hộ)',
  payos: 'PayOS',
  banking: 'Chuyển khoản ngân hàng',
  momo: 'MoMo',
  qr: 'QR Banking',
  vnpay: 'VNPay',
};

type OrderMode = 'assigned' | 'available';

type OrdersResponse = { orders?: Order[]; nextCursor?: string | null };

type StatCardProps = { label: string; value: string | number; accent: string; large?: boolean };

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [mode, setMode] = useState<OrderMode>('assigned');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'failed' | 'all'>('active');
  const [summary, setSummary] = useState<ShipperSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Orders'>>();
  const { signOut, refreshUser } = useContext(AuthContext);
  const { shippingEvent, user } = useContext(AuthContext) as { shippingEvent: ShippingEventPayload | null; user: Record<string, unknown> | null };
  const route = useRoute<RouteProp<RootStackParamList, 'Orders'>>();
  const latestEventRef = useRef<{ clientRequestId?: string } | null>(null);
  const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'));

  useEffect(() => {
    if (route.params?.available) {
      setMode('available');
    }
  }, [route.params?.available]);

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined;
  const isShipperRole = Boolean(userRole === 'shipper' || userRole === 'approved');
  const isShipperApproved = Boolean((user as Record<string, unknown> | null)?.shipperApproved === true);
  const isApproved = isShipperRole || isShipperApproved;
  const assignedLocked = !isApproved;

  const loadPending = useCallback(async () => {
    try {
      const q = await getQueue();
      setPendingCount(q?.length || 0);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!isApproved) {
      setSummary(null);
      return;
    }
    try {
      const res = await shipperApi.getSummary();
      setSummary(res?.stats ? res.stats : res);
    } catch (err) {
      if (isDev) console.debug('[Shipper] fetchSummary failed', err);
    }
  }, [isApproved, isDev]);

  const fetchOrders = useCallback(
    async (reset = false) => {
      if (mode === 'assigned' && !isApproved) {
        setOrders([]);
        return;
      }
      const shouldShowBlockingLoader = !reset && orders.length === 0;
      if (shouldShowBlockingLoader) {
        setLoading(true);
      }
      if (reset) setRefreshing(true);
      setErrorMessage(null);
      try {
        if (isDev) {
          console.debug('[Shipper] fetchOrders', { mode, statusFilter, cursor: reset ? 'reset' : cursor });
        }
        const params: { limit: number; cursor?: string; status?: string } = { limit: 20 };
        if (!reset && cursor) params.cursor = cursor;
        if (reset) delete params.cursor;
        if (mode === 'assigned' && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const res: OrdersResponse = mode === 'available' ? await shipperApi.listAvailableOrders(params) : await shipperApi.listOrders(params);
        const newOrders: Order[] = Array.isArray(res?.orders) ? res.orders : [];
        setOrders((prev) => (reset ? newOrders : [...prev, ...newOrders]));
        setCursor(res?.nextCursor || null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng';
        setErrorMessage(msg);
        if (isDev) console.debug('[Shipper] fetchOrders failed', err);
        try {
          if (axios.isAxiosError(err) && err.response) {
            if (err.response.status === 401) {
              try {
                await signOut();
              } catch {}
              try {
                RootNavigation.resetRoot('Login');
              } catch {}
              Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại');
              return;
            }
            const respMsg = String(err.response.data?.message || JSON.stringify(err.response.data));
            if (err.response.status === 403 && /access\s*denied|denied|forbidden/i.test(respMsg)) {
              Alert.alert('Truy cập bị từ chối', 'Tài khoản của bạn chưa được phép xem dữ liệu. Vui lòng hoàn thiện hồ sơ hoặc liên hệ quản trị.', [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Mở hồ sơ', onPress: () => RootNavigation.navigate('Profile') },
              ]);
            } else {
              Alert.alert('Lỗi tải đơn', `HTTP ${err.response.status}: ${respMsg}`);
            }
          } else if (axios.isAxiosError(err) && err.request) {
            Alert.alert('Lỗi tải đơn', 'Không nhận được phản hồi từ server. Kiểm tra kết nối mạng và địa chỉ backend.');
          } else {
            Alert.alert('Lỗi tải đơn', msg);
          }
        } catch (e) {
          if (isDev) console.debug('[Shipper] fetchOrders error while handling error', e);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cursor, isApproved, isDev, mode, orders.length, signOut, statusFilter],
  );

  useEffect(() => {
    setOrders([]);
    setCursor(null);
  }, [mode, statusFilter]);

  useEffect(() => {
    if (mode === 'assigned') fetchSummary();
    fetchOrders(true);
    loadPending();
  }, [fetchOrders, fetchSummary, loadPending, mode, statusFilter]);

  useEffect(() => {
    if (!shippingEvent) return;
    if (latestEventRef.current && latestEventRef.current.clientRequestId === shippingEvent.timelineEvent?.clientRequestId) return;
    latestEventRef.current = { clientRequestId: shippingEvent.timelineEvent?.clientRequestId ?? undefined };

    if (shippingEvent.shippingStatus === 'awaiting_shipment') {
      Alert.alert('Đơn mới', 'Có đơn hàng chờ nhận — danh sách sẽ được làm mới');
      fetchOrders(true);
      loadPending();
      return;
    }

    try {
      const evtShipper = shippingEvent.shipperId || (shippingEvent.order && (shippingEvent.order as Partial<Order>).shipperId) || null;
      const currentShipperId = (user as Record<string, unknown> | null)?._id || (user as Record<string, unknown> | null)?.id || null;
      if (!currentShipperId || !evtShipper || evtShipper.toString() !== currentShipperId.toString()) {
        return;
      }
    } catch {
      // ignore parse errors
    }

    Alert.alert('Đơn được cập nhật', 'Danh sách đơn sẽ được làm mới');
    fetchOrders(true);
    loadPending();
  }, [fetchOrders, loadPending, shippingEvent, user]);

  const handleSyncNow = async () => {
    if (pendingCount === 0 || syncing) return;
    setSyncing(true);
    try {
      const res = await flushQueue();
      Alert.alert('Đồng bộ', `Đã gửi ${res?.successCount ?? 0} bản cập nhật lên server`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Sync thất bại', msg || 'Không thể đồng bộ');
    } finally {
      setSyncing(false);
      loadPending();
      fetchOrders(true);
    }
  };

  const handleClaim = (order: Order) => {
    Alert.alert('Nhận đơn', 'Bạn chắc chắn muốn nhận đơn này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Nhận đơn',
        onPress: async () => {
          setClaimingOrderId(order._id);
          try {
            await shipperApi.claimOrder(order._id);
            Alert.alert('Thành công', 'Bạn đã nhận đơn');
            fetchOrders(true);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            const lower = (msg || '').toLowerCase();
            if (lower.includes('application') || lower.includes('approve') || lower.includes('profile') || lower.includes('vehicle') || lower.includes('phone')) {
              Alert.alert('Cần cập nhật hồ sơ', 'Vui lòng hoàn thành hồ sơ trước khi nhận đơn', [
                { text: 'Huỷ' },
                { text: 'Mở hồ sơ', onPress: () => navigation.navigate('Profile') },
              ]);
            } else {
              Alert.alert('Không thể nhận đơn', msg || 'Có lỗi xảy ra');
            }
          } finally {
            setClaimingOrderId(null);
          }
        },
      },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mode === 'assigned') fetchSummary();
    await fetchOrders(true);
    setRefreshing(false);
  }, [fetchOrders, fetchSummary, mode]);

  const handleModeChange = (nextMode: OrderMode) => {
    if (nextMode === 'assigned' && assignedLocked) {
      Alert.alert('Chưa được phê duyệt', 'Vui lòng hoàn thiện hồ sơ shipper để xem đơn được phân công.', [
        { text: 'Huỷ' },
        { text: 'Mở hồ sơ', onPress: () => RootNavigation.navigate('Profile') },
      ]);
      return;
    }
    setMode(nextMode);
  };

  const getStatusMeta = (status?: string) => {
    if (!status) return { label: 'Chưa rõ', color: '#9e9e9e' };
    return SHIPPING_STATUS_META[status] || { label: status, color: '#9e9e9e' };
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '—';
    try {
      return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
    } catch {
      return `${value} đ`;
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('vi-VN', { hour12: false });
    } catch {
      return value;
    }
  };

  const buildAddress = (order: Order) => {
    const addr = order.shippingAddress;
    if (addr) {
      const segments = [addr.detail, addr.ward, addr.district, addr.province].filter(Boolean);
      if (segments.length > 0) {
        return segments.join(', ');
      }
    }
    return order.address || 'Chưa có địa chỉ';
  };

  const summaryCards = useMemo(() => {
    if (!summary || mode !== 'assigned') return null;
    return (
      <View style={styles.statsGrid}>
        <StatCard label="Đang giao" value={summary.active ?? 0} accent="#0077b6" />
        <StatCard label="Giao hôm nay" value={summary.deliveredToday ?? 0} accent="#2a9d8f" />
        <StatCard label="Thu nhập hôm nay" value={formatCurrency(summary.incomeToday)} accent="#f9844a" large />
        <StatCard label="Tổng thu nhập" value={formatCurrency(summary.totalIncome)} accent="#6d31ed" large />
      </View>
    );
  }, [summary, mode]);

  const renderItem = ({ item }: { item: Order }) => {
    const statusMeta = getStatusMeta(mode === 'available' ? item.status || item.shippingStatus : item.shippingStatus);
    const lastTimeline = item.shippingTimeline && item.shippingTimeline[item.shippingTimeline.length - 1];
    const navigable = mode === 'assigned';
    const paymentMethod = (item.paymentMethod || 'cod').toLowerCase();
    const shouldCollectCod = paymentMethod === 'cod';
    const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethod] || item.paymentMethod || 'Không rõ';
    const paymentNote = shouldCollectCod ? 'Thu tiền mặt từ khách.' : 'Đã trả PayOS • Không thu tiền khách.';
    const shippingFee = typeof item.shippingFee === 'number' ? item.shippingFee : 0;
    const serviceFee = typeof item.serviceFee === 'number' ? item.serviceFee : 0;
    const serviceFeePercent = typeof item.serviceFeePercent === 'number' ? item.serviceFeePercent : null;
    const netShippingFee = Math.max(shippingFee - serviceFee, 0);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={navigable ? 0.9 : 1}
        onPress={() => {
          if (!navigable) return;
          navigation.navigate('OrderDetail', { orderId: item._id });
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardLabel}>Mã đơn</Text>
            <Text style={styles.orderId}>#{String(item._id).slice(-6)}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: statusMeta.color }]}>
            <Text style={styles.statusChipText}>{statusMeta.label}</Text>
          </View>
        </View>
        <Text style={styles.cardAddress}>{buildAddress(item)}</Text>
        <View style={styles.cardMetaRow}>
          <View>
            <Text style={styles.cardLabel}>{shouldCollectCod ? 'Cần thu COD' : 'Thu tiền khách'}</Text>
            <Text style={styles.cardValue}>{shouldCollectCod ? formatCurrency(item.totalAmount) : '0 ₫'}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Cập nhật</Text>
            <Text style={styles.cardValue}>{formatDateTime(item.updatedAt || item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.cardMetaRow}>
          <View>
            <Text style={styles.cardLabel}>Thanh toán</Text>
            <Text style={styles.cardValue}>{paymentLabel}</Text>
          </View>
          <View style={styles.paymentPillWrapper}>
            <Text style={[styles.paymentPill, !shouldCollectCod && styles.paymentPillPaid]}>{paymentNote}</Text>
          </View>
        </View>
        <View style={styles.cardMetaRow}>
          <View>
            <Text style={styles.cardLabel}>Phí ship khách trả</Text>
            <Text style={styles.cardValue}>{formatCurrency(shippingFee)}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Thực nhận dự kiến</Text>
            <Text style={styles.cardValue}>{formatCurrency(netShippingFee)}</Text>
          </View>
        </View>
        {serviceFee > 0 ? (
          <Text style={styles.serviceFeeNote}>
            {serviceFeePercent != null ? `Phí dịch vụ ${serviceFeePercent}%` : 'Phí dịch vụ'}: {formatCurrency(serviceFee)}
          </Text>
        ) : null}
        {lastTimeline?.note ? <Text style={styles.timelineNote}>Ghi chú gần nhất: {lastTimeline.note}</Text> : null}
        {mode === 'available' ? (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}>
              <Text style={styles.secondaryButtonText}>Xem chi tiết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, claimingOrderId === item._id && styles.primaryButtonDisabled]}
              disabled={claimingOrderId === item._id}
              onPress={() => handleClaim(item)}
            >
              <Text style={styles.primaryButtonText}>{claimingOrderId === item._id ? 'Đang xử lý...' : 'Nhận đơn'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardFooter}>
            <Text style={styles.scopeText}>{item.shippingMethod || item.shippingScope || 'Giao tiêu chuẩn'}</Text>
            <Text style={styles.feeText}>Thu nhập dự kiến: {formatCurrency(netShippingFee)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      {summaryCards}
      <View style={styles.queueCard}>
        <View>
          <Text style={styles.queueTitle}>Đồng bộ ngoại tuyến</Text>
          <Text style={styles.queueSubtitle}>{pendingCount} bản ghi chưa gửi</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, (pendingCount === 0 || syncing) && styles.primaryButtonDisabled]}
          onPress={handleSyncNow}
          disabled={pendingCount === 0 || syncing}
        >
          <Text style={styles.primaryButtonText}>{syncing ? 'Đang sync...' : 'Đồng bộ ngay'}</Text>
        </TouchableOpacity>
      </View>
      {mode === 'assigned' ? (
        <View style={styles.filtersRow}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, statusFilter === filter.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter.key && styles.filterChipTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.availableBanner}>
          <Text style={styles.availableBannerText}>Những đơn dưới đây đang chờ shipper nhận. Nhấn "Nhận đơn" để được phân công.</Text>
        </View>
      )}
      {assignedLocked && mode === 'assigned' ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Tài khoản chưa được phê duyệt</Text>
          <Text style={styles.noticeText}>Bạn cần hoàn thiện hồ sơ và chờ quản trị duyệt để xem và nhận đơn.</Text>
          <View style={styles.noticeActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => RootNavigation.navigate('Profile')}>
              <Text style={styles.secondaryButtonText}>Mở hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={async () => { await refreshUser(); loadPending(); }}>
              <Text style={styles.primaryButtonText}>Kiểm tra lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );

  const listEmptyComponent = (
    <View style={styles.emptyState}>
      {loading ? <ActivityIndicator size="small" /> : <Text style={styles.emptyText}>{mode === 'available' ? 'Chưa có đơn nào chờ nhận' : 'Không tìm thấy đơn phù hợp bộ lọc'}</Text>}
      {!loading && (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => fetchOrders(true)}>
          <Text style={styles.secondaryButtonText}>Thử tải lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Đơn hàng</Text>
          <Text style={styles.pageSubtitle}>{mode === 'available' ? 'Đơn chờ nhận' : 'Đơn được phân công'}</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => signOut()}>
          <Text style={styles.secondaryButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'assigned' && styles.tabActive, assignedLocked && styles.tabDisabled]}
          onPress={() => handleModeChange('assigned')}
        >
          <Text style={[styles.tabText, mode === 'assigned' && styles.tabTextActive]}>Đơn của tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'available' && styles.tabActive]} onPress={() => handleModeChange('available')}>
          <Text style={[styles.tabText, mode === 'available' && styles.tabTextActive]}>Đơn chờ nhận</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        onEndReached={() => {
          if (cursor) fetchOrders();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={loading && orders.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
      />
    </View>
  );
}

const StatCard = ({ label, value, accent, large }: StatCardProps) => (
  <View style={[stylesStat.card, { borderColor: accent }]}> 
    <Text style={[stylesStat.label, { color: accent }]}>{label}</Text>
    <Text style={[stylesStat.value, large && stylesStat.valueLarge]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8', paddingHorizontal: 16, paddingTop: 12 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111' },
  pageSubtitle: { color: '#6b7280', marginTop: 2 },
  tabs: { flexDirection: 'row', borderRadius: 10, backgroundColor: '#e8eaf0', padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabDisabled: { opacity: 0.5 },
  tabText: { fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#111' },
  listContent: { paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderId: { fontSize: 18, fontWeight: '700', color: '#111' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  cardAddress: { marginTop: 10, color: '#374151', lineHeight: 20 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  cardValue: { fontSize: 16, fontWeight: '600', color: '#111' },
  paymentPillWrapper: { justifyContent: 'center', alignItems: 'flex-end', flex: 1 },
  paymentPill: { backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: '600', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, textAlign: 'center' },
  paymentPillPaid: { backgroundColor: '#dcfce7', color: '#166534' },
  serviceFeeNote: { marginTop: 8, color: '#b45309', fontSize: 12, fontStyle: 'italic' },
  timelineNote: { marginTop: 12, color: '#4b5563', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  scopeText: { fontWeight: '600', color: '#4c1d95' },
  feeText: { color: '#374151', fontWeight: '500' },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#eef2ff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  secondaryButtonText: { color: '#111', fontWeight: '600' },
  queueCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  queueTitle: { fontWeight: '700', color: '#111' },
  queueSubtitle: { color: '#6b7280', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e5e7eb', marginRight: 8, marginBottom: 8 },
  filterChipActive: { backgroundColor: '#1d4ed8' },
  filterChipText: { color: '#1f2937', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  availableBanner: { backgroundColor: '#ecfccb', padding: 12, borderRadius: 10, marginBottom: 12 },
  availableBannerText: { color: '#3f6212' },
  noticeCard: { backgroundColor: '#fff7ed', padding: 16, borderRadius: 12, marginBottom: 12 },
  noticeTitle: { fontWeight: '700', color: '#9a3412', marginBottom: 6 },
  noticeText: { color: '#92400e', marginBottom: 12 },
  noticeActions: { flexDirection: 'row', gap: 12 },
  errorBanner: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 10, marginBottom: 12 },
  errorBannerText: { color: '#b91c1c' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#6b7280', marginBottom: 12 },
});

const stylesStat = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, width: '48%' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  value: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  valueLarge: { fontSize: 22 },
});
