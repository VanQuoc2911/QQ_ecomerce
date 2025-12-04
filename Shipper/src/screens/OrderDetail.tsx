import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// There is no @types/react-native-geolocation-service package.
// The types are bundled with the library as of v5+.
// If you need types, you can use the built-in ones or declare minimal types as needed.
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as shipperApi from '../api/shipper';
import Geolocation from '../shims/geolocation';
import { Order, TimelineEvent } from '../types';
import { enqueueUpdate } from '../utils/offlineQueue';
import { getSocket } from '../utils/socket';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const SHIPPING_STATUS_META: Record<string, { label: string; color: string; hint?: string }> = {
  unassigned: { label: 'Chờ phân công', color: '#94a3b8', hint: 'Đơn chưa có shipper' },
  assigned: { label: 'Đã phân công', color: '#6366f1', hint: 'Chuẩn bị nhận hàng' },
  pickup_pending: { label: 'Đến kho lấy', color: '#0ea5e9', hint: 'Xác nhận đã tới điểm lấy hàng' },
  picked_up: { label: 'Đã lấy hàng', color: '#2563eb', hint: 'Sẵn sàng giao cho khách' },
  delivering: { label: 'Đang giao', color: '#f97316', hint: 'Trên đường tới khách' },
  delivered: { label: 'Đã giao xong', color: '#22c55e', hint: 'Hoàn tất, chuẩn bị đối soát' },
  failed: { label: 'Giao thất bại', color: '#ef4444', hint: 'Cần xử lý sự cố' },
  returned: { label: 'Đã hoàn', color: '#b45309', hint: 'Đơn đã trả về' },
};

const STATUS_FLOW: Record<string, string[]> = {
  unassigned: ['assigned'],
  assigned: ['pickup_pending', 'picked_up'],
  pickup_pending: ['picked_up'],
  picked_up: ['delivering'],
  delivering: ['delivered', 'failed', 'returned'],
  failed: ['pickup_pending'],
  returned: [],
  delivered: [],
};

const ACTION_META: Record<string, { label: string; confirm?: string; danger?: boolean }> = {
  pickup_pending: { label: 'Đã tới điểm lấy' },
  picked_up: { label: 'Đã nhận hàng' },
  delivering: { label: 'Bắt đầu giao' },
  delivered: { label: 'Giao thành công' },
  failed: { label: 'Giao thất bại', confirm: 'Xác nhận giao thất bại? Thông tin sẽ được gửi cho điều phối.', danger: true },
  returned: { label: 'Đã hoàn đơn', confirm: 'Xác nhận đã hoàn hàng?', danger: true },
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number') return '—';
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} đ`;
  }
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch {
    return String(value);
  }
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  cod: 'COD (thu hộ)',
  payos: 'PayOS',
  banking: 'Chuyển khoản ngân hàng',
  momo: 'MoMo',
  qr: 'QR Banking',
  vnpay: 'VNPay',
};

export default function OrderDetail({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [sendingCheckpoint, setSendingCheckpoint] = useState(false);

  const load = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await shipperApi.getOrder(orderId);
      setOrder(res);
    } catch (err) {
      console.warn(err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404) {
          setOrder(null);
          Alert.alert(
            'Không tìm thấy đơn',
            'Đơn hàng đã bị xoá hoặc không thuộc quyền của bạn.',
            [
              { text: 'Đóng', style: 'cancel' },
              { text: 'Quay lại', onPress: () => navigation.goBack?.() },
            ],
          );
          return;
        }
        const msg = String(err.response.data?.message || 'Không tải được đơn hàng');
        Alert.alert('Lỗi tải đơn', msg);
        return;
      }
      Alert.alert('Error', err instanceof Error ? err.message : 'Không tải được đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // join order room for realtime updates
  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    try {
      sock.emit('joinOrder', { orderId });
    } catch (err) { console.warn(err); }
    return () => {
      try {
        sock.emit('leaveOrder', { orderId });
      } catch (err) { console.warn(err); }
    };
  }, [orderId]);

  const updateStatus = async (status: string): Promise<void> => {
    const meta = ACTION_META[status];
    if (meta?.confirm) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert('Xác nhận', meta.confirm || 'Tiếp tục?', [
          { text: 'Huỷ', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Đồng ý', style: meta.danger ? 'destructive' : 'default', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }
    try {
      setActionStatus(status);
      await shipperApi.updateStatus(orderId, { status });
      await load();
    } catch (err) {
      // enqueue offline and inform user
      const errMsg = err instanceof Error ? err.message : String(err);
      try {
        await enqueueUpdate({ type: 'status', orderId, status, note: String(errMsg || ''), clientRequestId: String(Date.now()) });
        Alert.alert('Offline', 'Không thể cập nhật ngay. Đã lưu vào hàng đợi offline');
      } catch (qe) {
        console.warn(qe);
        Alert.alert('Error', errMsg || 'Không cập nhật được');
      }
    } finally {
      setActionStatus(null);
    }
  };

  const hasLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission',
          message: 'App needs access to your location to send checkpoints',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const sendCheckpoint = async (): Promise<void> => {
    try {
      const ok = await hasLocationPermission();
      if (!ok) {
        Alert.alert('Permission', 'Location permission denied');
        return;
      }
      setSendingCheckpoint(true);
      Geolocation.getCurrentPosition(
        async (pos: { coords: { latitude: number; longitude: number; accuracy?: number } }) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          try {
            await shipperApi.addCheckpoint(orderId, { location: { lat, lng, accuracy }, note: 'Checkin' });
            await load();
          } catch (err) {
            console.warn(err);
            // enqueue offline
            await enqueueUpdate({ type: 'checkpoint', orderId, location: { lat, lng, accuracy }, note: 'Checkin', clientRequestId: String(Date.now()) });
            Alert.alert('Offline', 'Không gửi được, đã lưu checkpoint offline');
          }
        },
        (err: { code?: number; message?: string }) => {
          Alert.alert('Location error', err.message || '');
          setSendingCheckpoint(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Không gửi checkpoint');
    } finally {
      setSendingCheckpoint(false);
    }
  };

  const currentStatus = order?.shippingStatus || 'unassigned';
  const statusMeta = useMemo(() => SHIPPING_STATUS_META[currentStatus] || SHIPPING_STATUS_META.unassigned, [currentStatus]);
  const availableTransitions = useMemo(() => STATUS_FLOW[currentStatus] || [], [currentStatus]);
  const timeline = Array.isArray(order?.shippingTimeline) ? order?.shippingTimeline : [];
  const products = Array.isArray(order?.products) ? order?.products : [];
  const customer = (order?.shippingAddress?.name && order?.shippingAddress?.phone)
    ? { name: order.shippingAddress.name, phone: order.shippingAddress.phone }
    : (typeof order?.userId === 'object' ? order.userId : null);
  const paymentMethod = (order?.paymentMethod || 'cod').toLowerCase();
  const paymentLabel = PAYMENT_METHOD_MAP[paymentMethod] || order?.paymentMethod || '—';
  const shouldCollectCod = paymentMethod === 'cod';
  const paymentInstruction = shouldCollectCod ? 'Đơn COD - thu đủ tiền từ khách.' : 'Đã thanh toán trực tuyến - KHÔNG thu tiền khách.';
  const shippingFee = typeof order?.shippingFee === 'number' ? order.shippingFee : 0;
  const serviceFee = typeof order?.serviceFee === 'number' ? order.serviceFee : 0;
  const serviceFeePercent = typeof order?.serviceFeePercent === 'number' ? order.serviceFeePercent : undefined;
  const netShippingFee = Math.max(shippingFee - serviceFee, 0);
  const formattedServiceFee = serviceFee > 0 ? `−${formatCurrency(serviceFee)}` : '0 ₫';

  const callNumber = (phone?: string) => {
    if (!phone) return;
    try {
      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      Alert.alert('Không thể gọi', String(err instanceof Error ? err.message : err));
    }
  };

  if (loading && !order) return <ActivityIndicator style={styles.centered} />;

  if (!order) return <View style={styles.centered}><Text>Không tìm thấy đơn</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.subtle}>Mã đơn</Text>
          <Text style={styles.orderId}>#{order._id}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusMeta.color }]}> 
          <Text style={styles.statusChipText}>{statusMeta.label}</Text>
        </View>
      </View>
      <Text style={styles.statusHint}>{statusMeta.hint}</Text>

      {(order.shippingAddress?.lat || order.shippingLocation?.lat) ? (
        <View style={styles.mapCard}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={(() => {
              const dest = order.shippingAddress || {};
              const shipLoc = order.shippingLocation || {};
              const lat = shipLoc.lat || dest.lat || 10.762622;
              const lng = shipLoc.lng || dest.lng || 106.660172;
              return {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              };
            })()}
          >
            {order.shippingAddress?.lat && order.shippingAddress?.lng && (
              <Marker
                coordinate={{ latitude: order.shippingAddress.lat, longitude: order.shippingAddress.lng }}
                title={order.shippingAddress.name || 'Khách nhận'}
                description={order.shippingAddress.detail || ''}
              />
            )}
            {order.shippingLocation?.lat && order.shippingLocation?.lng && (
              <Marker
                coordinate={{ latitude: order.shippingLocation.lat, longitude: order.shippingLocation.lng }}
                pinColor="blue"
                title="Vị trí shipper"
                description={`Cập nhật ${formatDateTime(order.shippingLocation.updatedAt || new Date())}`}
              />
            )}
          </MapView>
        </View>
      ) : null}

      <SectionCard title="Thông tin giao hàng" subtitle="Lộ trình & phương thức giao">
        <InfoRow label="Trạng thái nội bộ" value={order.status || '—'} />
        <InfoRow label="Phương thức" value={order.shippingMethod || '—'} />
        <InfoRow label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
        <InfoRow label="Chiều dài tuyến" value={order.shippingDistanceKm ? `${order.shippingDistanceKm} km` : '—'} />
        <InfoRow label="Cập nhật" value={formatDateTime(order.updatedAt)} />
      </SectionCard>

      <SectionCard title="Khách nhận" subtitle="Thông tin liên hệ khách hàng" actionLabel={customer?.phone ? 'Gọi' : undefined} onActionPress={() => callNumber(customer?.phone)}>
        <InfoRow label="Tên" value={customer?.name || order.shippingAddress?.name || order.fullName || '—'} />
        <InfoRow label="SĐT" value={order.shippingAddress?.phone || customer?.phone || '—'} />
        <InfoRow
          label="Địa chỉ"
          value={[order.shippingAddress?.detail, order.shippingAddress?.ward, order.shippingAddress?.district, order.shippingAddress?.province].filter(Boolean).join(', ') || '—'}
        />
      </SectionCard>

      <SectionCard title="Người bán" subtitle="Thông tin cửa hàng">
        <InfoRow
          label="Tên"
          value={(typeof order.sellerId === 'object' ? (order.sellerId?.name || '') : '') || order.shipperSnapshot?.name || '—'}
        />
        <InfoRow
          label="SĐT"
          value={(typeof order.sellerId === 'object' ? (order.sellerId?.phone || '') : '') || order.shipperSnapshot?.phone || '—'}
        />
      </SectionCard>

      <SectionCard title="Giá trị đơn" subtitle="Chi tiết thanh toán & ưu đãi">
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Giá trị đơn</Text>
            <Text style={styles.statValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>COD cần thu</Text>
            <Text style={styles.statValue}>{shouldCollectCod ? formatCurrency(order.totalAmount) : '0 ₫'}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Voucher</Text>
            <Text style={styles.statValue}>{order.voucherCode ? `${order.voucherCode} (−${formatCurrency(order.voucherDiscount || 0)})` : 'Không áp dụng'}</Text>
          </View>
          <View style={[styles.statCard, styles.paymentNoteCard]}>
            <Text style={styles.statLabel}>Lưu ý thu tiền</Text>
            <Text style={styles.paymentNote}>{paymentInstruction}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Phí ship khách trả</Text>
            <Text style={styles.statValue}>{formatCurrency(shippingFee)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Phí dịch vụ{serviceFeePercent != null ? ` (${serviceFeePercent}%)` : ''}</Text>
            <Text style={styles.statValue}>{formattedServiceFee}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statCard, styles.highlightCard]}>
            <Text style={styles.statLabel}>Thu nhập dự kiến</Text>
            <Text style={styles.statValue}>{formatCurrency(netShippingFee)}</Text>
          </View>
        </View>
        <InfoRow label="Phương thức thanh toán" value={paymentLabel} />
        <InfoRow label="Trạng thái thanh toán" value={shouldCollectCod ? 'Chưa thu (COD)' : 'Đã thanh toán'} />
      </SectionCard>

      {products.length ? (
        <SectionCard title="Sản phẩm" subtitle={`Có ${products.length} mặt hàng`}>
          {products.map((product, index) => (
            <View key={`${product.productId || index}`} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title || 'Sản phẩm'}</Text>
                <Text style={styles.productMeta}>x{product.quantity || 1}</Text>
              </View>
              <Text style={styles.productPrice}>{formatCurrency((product.price || 0) * (product.quantity || 1))}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title="Thao tác" subtitle="Cập nhật trạng thái cho điều phối">
        <View style={styles.actionRow}>
          {availableTransitions.length === 0 ? (
            <Text style={styles.subtle}>Không có bước tiếp theo</Text>
          ) : (
            availableTransitions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.actionButton, ACTION_META[status]?.danger && styles.actionButtonDanger, actionStatus === status && styles.actionButtonLoading]}
                onPress={() => updateStatus(status)}
                disabled={Boolean(actionStatus)}
              >
                <Text style={styles.actionButtonText}>{ACTION_META[status]?.label || status}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        <TouchableOpacity style={[styles.checkpointButton, sendingCheckpoint && styles.actionButtonLoading]} onPress={sendCheckpoint} disabled={sendingCheckpoint}>
          <Text style={styles.checkpointText}>{sendingCheckpoint ? 'Đang gửi vị trí...' : 'Gửi checkpoint hiện tại'}</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Timeline" subtitle="Lịch sử cập nhật" collapsible={false}>
        {timeline.length ? (
          timeline.map((t: TimelineEvent, idx: number) => (
            <View key={t.clientRequestId || `${t.code}-${idx}`} style={styles.timelineRow}>
              <View style={styles.timelineBadge}>
                <Text style={styles.timelineBadgeText}>{t.label || t.code}</Text>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>{formatDateTime(t.at)}</Text>
                {t.note ? <Text style={styles.timelineNote}>{t.note}</Text> : null}
                {t.location ? (
                  <Text style={styles.timelineLocation}>({t.location.lat?.toFixed?.(4)}, {t.location.lng?.toFixed?.(4)})</Text>
                ) : null}
                {t.offline ? <Text style={styles.timelineOffline}>Đồng bộ offline</Text> : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.subtle}>Chưa có cập nhật nào</Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  page: { padding: 16, paddingBottom: 32, gap: 16 },
  headerCard: { backgroundColor: '#111827', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtle: { color: '#6b7280', fontSize: 12 },
  orderId: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  statusChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusChipText: { color: '#fff', fontWeight: '700' },
  statusHint: { color: '#94a3b8', marginTop: -8, marginBottom: 8 },
  mapCard: { height: 220, borderRadius: 16, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sectionSubtitle: { color: '#6b7280', marginTop: 4 },
  infoRow: { marginBottom: 10 },
  infoLabel: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: '#0f172a', fontSize: 15, marginTop: 2 },
  actionLink: { color: '#2563eb', fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12 },
  highlightCard: { backgroundColor: '#ecfccb' },
  statLabel: { color: '#475569', marginBottom: 4 },
  statValue: { fontWeight: '700', color: '#0f172a' },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  productInfo: { flex: 1 },
  productTitle: { fontWeight: '600', color: '#0f172a' },
  productMeta: { color: '#475569', fontSize: 12, marginTop: 2 },
  productPrice: { fontWeight: '700', color: '#111827', marginLeft: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { flexGrow: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#2563eb' },
  actionButtonDanger: { backgroundColor: '#dc2626' },
  actionButtonLoading: { opacity: 0.6 },
  actionButtonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  checkpointButton: { marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2563eb' },
  checkpointText: { textAlign: 'center', color: '#2563eb', fontWeight: '600' },
  paymentNoteCard: { backgroundColor: '#eef2ff' },
  paymentNote: { color: '#312e81', fontWeight: '600' },
  timelineRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  timelineBadge: { width: 90 },
  timelineBadgeText: { fontWeight: '700', color: '#0f172a' },
  timelineContent: { flex: 1 },
  timelineTime: { fontSize: 12, color: '#475569', marginBottom: 4 },
  timelineNote: { color: '#0f172a' },
  timelineLocation: { color: '#475569', fontSize: 12, marginTop: 4 },
  timelineOffline: { color: '#d97706', fontSize: 12, marginTop: 4 },
  sectionAction: { color: '#2563eb', fontWeight: '600' },
});

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  collapsible?: boolean;
};

const SectionCard = ({ title, subtitle, children, actionLabel, onActionPress }: SectionCardProps) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.actionLink}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    {children}
  </View>
);

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value && value.length ? value : '—'}</Text>
  </View>
);
