import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps
} from 'react-native';
// @ts-ignore react-native-image-picker ships without full TS support in some setups
import { launchCamera } from 'react-native-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as addressService from '../api/addressService';
import * as shipperApi from '../api/shipper';
import { AuthContext } from '../context/AuthContext';
import type { ShipperApplication } from '../types';

type MapPressEvent = {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
};

declare module 'react-native-maps' {
  interface MapViewProps {
    onRegionChangeComplete?: (region: Region) => void;
    onPress?: (event: MapPressEvent) => void;
  }
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [addressMode, setAddressMode] = useState<'manual' | 'map'>('manual');
  const [mapVisible, setMapVisible] = useState(false);
  const defaultRegion = useMemo<Region>(() => ({ latitude: 10.762622, longitude: 106.660172, latitudeDelta: 0.02, longitudeDelta: 0.02 }), []);
  const [mapRegion, setMapRegion] = useState<Region>(defaultRegion);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [wardError, setWardError] = useState<string | null>(null);
  const [autoLocateLoading, setAutoLocateLoading] = useState(false);
  const [autoLocateError, setAutoLocateError] = useState<string | null>(null);
  const provinceRequestId = useRef(0);
  const districtRequestId = useRef(0);
  const wardRequestId = useRef(0);
  const provinceRef = useRef('');
  const districtRef = useRef('');
  const pendingLocationRef = useRef<{ province?: string; district?: string; ward?: string } | null>(null);
  const { signIn, refreshUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    provinceRef.current = province;
  }, [province]);

  useEffect(() => {
    districtRef.current = district;
  }, [district]);

  const loadProvinces = useCallback(async () => {
    const requestId = ++provinceRequestId.current;
    setLoadingProvinces(true);
    try {
      const data = await addressService.getProvinces();
      if (provinceRequestId.current === requestId) {
        setProvinceOptions(data);
        setProvinceError(null);
      }
    } catch (error) {
      if (provinceRequestId.current === requestId) {
        setProvinceOptions([]);
        setProvinceError('Không thể tải dữ liệu. Thử lại');
        const msg = error instanceof Error ? error.message : 'Không thể tải danh sách tỉnh/thành.';
        Alert.alert('Không thể tải tỉnh/thành', `${msg}\nBạn có thể thử lại.`);
      }
    } finally {
      if (provinceRequestId.current === requestId) {
        setLoadingProvinces(false);
      }
    }
  }, []);

  const loadDistricts = useCallback(async (targetProvince: string) => {
    if (!targetProvince) return;
    const requestId = ++districtRequestId.current;
    setLoadingDistricts(true);
    try {
      const data = await addressService.getDistricts(targetProvince);
      if (districtRequestId.current === requestId && provinceRef.current === targetProvince) {
        setDistrictOptions(data);
        setDistrictError(null);
        const pending = pendingLocationRef.current;
        if (pending && pending.province === targetProvince) {
          if (pending.district) {
            setDistrict(pending.district);
          }
          if (!pending.ward) {
            pendingLocationRef.current = null;
          }
        }
      }
    } catch (error) {
      if (districtRequestId.current === requestId && provinceRef.current === targetProvince) {
        setDistrictOptions([]);
        setDistrictError('Không thể tải dữ liệu. Thử lại');
        const msg = error instanceof Error ? error.message : 'Không thể tải danh sách quận/huyện.';
        Alert.alert('Không thể tải quận/huyện', `${msg}\nBạn có thể thử lại.`);
        pendingLocationRef.current = null;
      }
    } finally {
      if (districtRequestId.current === requestId) {
        setLoadingDistricts(false);
      }
    }
  }, []);

  const loadWards = useCallback(async (targetProvince: string, targetDistrict: string) => {
    if (!targetProvince || !targetDistrict) return;
    const requestId = ++wardRequestId.current;
    setLoadingWards(true);
    try {
      const data = await addressService.getWards(targetProvince, targetDistrict);
      if (
        wardRequestId.current === requestId &&
        provinceRef.current === targetProvince &&
        districtRef.current === targetDistrict
      ) {
        setWardOptions(data);
        setWardError(null);
        const pending = pendingLocationRef.current;
        if (pending && pending.province === targetProvince && pending.district === targetDistrict) {
          if (pending.ward) {
            setWard(pending.ward);
          }
          pendingLocationRef.current = null;
        }
      }
    } catch (error) {
      if (
        wardRequestId.current === requestId &&
        provinceRef.current === targetProvince &&
        districtRef.current === targetDistrict
      ) {
        setWardOptions([]);
        setWardError('Không thể tải dữ liệu. Thử lại');
        const msg = error instanceof Error ? error.message : 'Không thể tải danh sách phường/xã.';
        Alert.alert('Không thể tải phường/xã', `${msg}\nBạn có thể thử lại.`);
        pendingLocationRef.current = null;
      }
    } finally {
      if (wardRequestId.current === requestId) {
        setLoadingWards(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadProvinces();
  }, [loadProvinces]);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Quyền truy cập vị trí',
          message: 'Ứng dụng cần quyền vị trí để tự động tìm vị trí của bạn.',
          buttonPositive: 'Đồng ý',
          buttonNegative: 'Hủy',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert('Không thể yêu cầu quyền vị trí', msg);
      return false;
    }
  }, []);

  const getCurrentPositionAsync = useCallback(() => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      try {
        Geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords || {};
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              resolve({ latitude, longitude });
            } else {
              reject(new Error('Tọa độ không hợp lệ từ thiết bị.'));
            }
          },
          (error) => reject(new Error(error?.message || 'Không thể lấy vị trí hiện tại.')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }, []);

  useEffect(() => {
    setDistrict('');
    setWard('');
    setDistrictOptions([]);
    setWardOptions([]);
    setDistrictError(null);
    setWardError(null);
    districtRequestId.current += 1;
    wardRequestId.current += 1;
    setLoadingDistricts(false);
    setLoadingWards(false);
    if (!province) return;
    void loadDistricts(province);
  }, [province, loadDistricts]);

  useEffect(() => {
    setWard('');
    setWardOptions([]);
    setWardError(null);
    wardRequestId.current += 1;
    setLoadingWards(false);
    if (!province || !district) return;
    void loadWards(province, district);
  }, [district, province, loadWards]);

  useEffect(() => {
    if (addressMode === 'manual') {
      setSelectedCoords(null);
      setMapVisible(false);
    }
    setAutoLocateError(null);
  }, [addressMode]);

  const handleMapPress = (event: MapPressEvent) => {
    setSelectedCoords(event.nativeEvent.coordinate);
  };

  const handleMapConfirm = () => {
    if (selectedCoords) {
      setMapRegion((prev) => ({
        ...prev,
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
      }));
    }
    setMapVisible(false);
  };

  const handleUseCurrentLocation = useCallback(async () => {
    if (autoLocateLoading) return;
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Thiếu quyền', 'Hãy bật quyền vị trí để sử dụng tính năng tự động.');
      return;
    }
    setAddressMode('map');
    setAutoLocateLoading(true);
    setAutoLocateError(null);
    try {
      const { latitude, longitude } = await getCurrentPositionAsync();
      setSelectedCoords({ latitude, longitude });
      setMapRegion((prev) => ({ ...prev, latitude, longitude }));

      let resolvedProvince = '';
      let resolvedDistrict = '';
      let resolvedWard = '';
      let resolvedDetail = '';

      try {
        const reverse = await addressService.reverseGeocode(latitude, longitude);
        resolvedProvince = reverse.oldProvince || reverse.province || '';
        resolvedDistrict = reverse.oldDistrict || reverse.district || '';
        resolvedWard = reverse.ward || '';
        resolvedDetail = reverse.detail || '';

        if (reverse.province || reverse.district || reverse.ward) {
          const matched = await addressService.matchLocation(
            reverse.oldProvince || reverse.province || '',
            reverse.oldDistrict || reverse.district || '',
            reverse.ward || ''
          );
          resolvedProvince = matched.province || resolvedProvince;
          resolvedDistrict = matched.district || resolvedDistrict;
          resolvedWard = matched.ward || resolvedWard;
        }
      } catch (reverseError) {
        console.warn('[Register] reverse geocode failed', reverseError);
      }

      if (resolvedDetail) {
        setAddress(resolvedDetail);
      }

      if (resolvedProvince) {
        if (resolvedProvince !== province) {
          pendingLocationRef.current = {
            province: resolvedProvince,
            district: resolvedDistrict || undefined,
            ward: resolvedWard || undefined,
          };
          setProvince(resolvedProvince);
        } else {
          pendingLocationRef.current = null;
          if (resolvedDistrict) setDistrict(resolvedDistrict);
          if (resolvedWard) setWard(resolvedWard);
        }
      } else {
        pendingLocationRef.current = null;
      }

      setAutoLocateError(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setAutoLocateError(msg || 'Không thể lấy vị trí hiện tại.');
      Alert.alert('Không thể lấy vị trí', msg || 'Vui lòng thử lại.');
    } finally {
      setAutoLocateLoading(false);
    }
  }, [autoLocateLoading, getCurrentPositionAsync, province, requestLocationPermission]);

  const captureAvatarAfterRegister = async () => {
    if (typeof launchCamera !== 'function') {
      Alert.alert('Không thể mở camera', 'Thiết bị chưa hỗ trợ chụp ảnh tự động. Hãy cập nhật avatar trong mục Hồ sơ.');
      return;
    }

    try {
      const result = await launchCamera({ mediaType: 'photo', cameraType: 'front', saveToPhotos: false, quality: 0.8 });
      if (result.didCancel) {
        Alert.alert('Bỏ qua ảnh đại diện', 'Bạn có thể chụp lại trong mục Hồ sơ bất cứ lúc nào.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Không tìm thấy ảnh', 'Vui lòng thử lại hoặc cập nhật thủ công trong Hồ sơ.');
        return;
      }
      const normalizedUri = normalizeUploadUri(asset.uri);
      const uploadRes = await shipperApi.uploadDocument({ uri: normalizedUri, name: asset.fileName || 'avatar.jpg', type: asset.type || 'image/jpeg' });
      const avatarUrl = uploadRes?.url || uploadRes?.data?.url || String(uploadRes);
      await shipperApi.updateProfile({ avatar: avatarUrl });
      await refreshUser();
      Alert.alert('Hoàn tất', 'Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert('Không thể chụp ảnh', `${msg}\nBạn có thể thử lại trong mục Hồ sơ.`);
    }
  };

  const onSubmit = async () => {
    if (loading) return;
    const trimmed = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      nationalId: nationalId.trim(),
      address: address.trim(),
      vehicleType: vehicleType.trim(),
      licensePlate: licensePlate.trim(),
      licenseNumber: licenseNumber.trim(),
    };
    const missing: string[] = [];
    if (!trimmed.name) missing.push('Họ và tên');
    if (!trimmed.email) missing.push('Email');
    if (!password) missing.push('Mật khẩu');
    if (!trimmed.phone) missing.push('Số điện thoại');
    if (!trimmed.nationalId) missing.push('CMND/CCCD');
    if (addressMode === 'manual') {
      if (!province) missing.push('Tỉnh/Thành phố');
      if (!district) missing.push('Quận/Huyện');
      if (!ward) missing.push('Phường/Xã');
      if (!trimmed.address) missing.push('Địa chỉ cụ thể');
    }
    if (!trimmed.vehicleType) missing.push('Loại phương tiện');
    if (!trimmed.licensePlate) missing.push('Biển số');
    if (!trimmed.licenseNumber) missing.push('Số giấy phép');
    if (addressMode === 'map' && !selectedCoords) missing.push('Vị trí bản đồ');
    if (missing.length) {
      Alert.alert('Thiếu thông tin', `Vui lòng bổ sung: ${missing.join(', ')}`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng kiểm tra lại mật khẩu và xác nhận.');
      return;
    }
    const composedAddress = composeFullAddress(trimmed.address, ward, district, province);
    setLoading(true);
    try {
      const res = await shipperApi.register({
        name: trimmed.name,
        email: trimmed.email,
        password,
        phone: trimmed.phone,
        address: composedAddress,
        nationalId: trimmed.nationalId,
        vehicleType: trimmed.vehicleType,
        licensePlate: trimmed.licensePlate,
        licenseNumber: trimmed.licenseNumber,
      });
      if (res && res.token) {
        // After successful registration, sign in using credentials to persist token
        await signIn(trimmed.email, password);
        const addressesPayload = (addressMode === 'map' && selectedCoords) || province || district || ward || trimmed.address
          ? [{
              id: 'primary-address',
              name: trimmed.name,
              phone: trimmed.phone,
              detail: trimmed.address,
              province: province || undefined,
              district: district || undefined,
              ward: ward || undefined,
              lat: selectedCoords?.latitude,
              lng: selectedCoords?.longitude,
              type: 'home',
              isDefault: true,
              createdAt: new Date().toISOString(),
            }]
          : undefined;

        await Promise.all([
          shipperApi.updateProfile({ name: trimmed.name, phone: trimmed.phone, address: composedAddress, addresses: addressesPayload }),
          shipperApi.upsertMyApplication(buildApplicationPayload({
            name: trimmed.name,
            email: trimmed.email,
            phone: trimmed.phone,
            nationalId: trimmed.nationalId,
            address: composedAddress,
            province,
            district,
            ward,
            vehicleType: trimmed.vehicleType,
            licensePlate: trimmed.licensePlate,
            licenseNumber: trimmed.licenseNumber,
            coords: selectedCoords || undefined,
          })),
        ]);
        await refreshUser();
        await captureAvatarAfterRegister();
      } else {
        throw new Error(res?.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Register failed', msg || 'Kiểm tra thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Tạo tài khoản shipper</Text>
          <Text style={styles.subtitle}>Kết nối với hệ thống để nhận đơn và quản lý hiệu suất</Text>

          <View style={styles.sectionBlock}>
            <SectionHeading title="Thông tin đăng nhập" description="Dùng để truy cập ứng dụng" />
            <LabeledInput label="Họ và tên" value={name} onChangeText={setName} placeholder="Nguyễn Văn A" autoCapitalize="words" />
            <LabeledInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="shipper@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <LabeledInput label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="••••••" secureTextEntry />
            <LabeledInput
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••"
              secureTextEntry
            />
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeading title="Thông tin liên hệ" description="Giúp đội ngũ xác minh hồ sơ" />
            <LabeledInput label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="0901 234 567" keyboardType="phone-pad" />
            <LabeledInput label="CMND/CCCD" value={nationalId} onChangeText={setNationalId} placeholder="123456789" keyboardType="number-pad" />
            <View style={styles.modeToggleRow}>
              {(
                [
                  { key: 'manual', label: 'Nhập tay' },
                  { key: 'map', label: 'Chọn bản đồ' },
                ] as const
              ).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.modeToggleButton, addressMode === option.key && styles.modeToggleButtonActive]}
                  onPress={() => setAddressMode(option.key)}
                >
                  <Text style={[styles.modeToggleText, addressMode === option.key && styles.modeToggleTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {addressMode === 'manual' ? (
              <>
                <SelectField
                  label="Tỉnh/Thành phố"
                  value={province}
                  placeholder="Chọn tỉnh"
                  options={provinceOptions}
                  onSelect={setProvince}
                  loading={loadingProvinces}
                  emptyLabel={provinceError || 'Không có dữ liệu'}
                  onRetry={() => { void loadProvinces(); }}
                />
                <SelectField
                  label="Quận/Huyện"
                  value={district}
                  placeholder={province ? 'Chọn quận/huyện' : 'Chọn tỉnh trước'}
                  options={districtOptions}
                  onSelect={setDistrict}
                  disabled={!province}
                  loading={loadingDistricts}
                  emptyLabel={province ? (districtError || 'Không có dữ liệu') : 'Chọn tỉnh trước'}
                  onRetry={province ? () => { void loadDistricts(province); } : undefined}
                />
                <SelectField
                  label="Phường/Xã"
                  value={ward}
                  placeholder={district ? 'Chọn phường/xã' : 'Chọn quận/huyện trước'}
                  options={wardOptions}
                  onSelect={setWard}
                  disabled={!district}
                  loading={loadingWards}
                  emptyLabel={district ? (wardError || 'Không có dữ liệu') : 'Chọn quận/huyện trước'}
                  onRetry={district ? () => { void loadWards(province, district); } : undefined}
                />
                <LabeledInput
                  label="Địa chỉ cụ thể"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Số nhà, tên đường, mô tả"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            ) : (
              <View style={styles.mapPickerBlock}>
                <Text style={styles.inputLabel}>Vị trí trên bản đồ</Text>
                <TouchableOpacity style={styles.mapPickerButton} onPress={() => setMapVisible(true)}>
                  <Text style={styles.mapPickerButtonText}>Chọn vị trí trên Google Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapLocateButton, autoLocateLoading && styles.mapLocateButtonDisabled]}
                  onPress={handleUseCurrentLocation}
                  disabled={autoLocateLoading}
                >
                  {autoLocateLoading ? <ActivityIndicator color={palette.accent} /> : <Text style={styles.mapLocateButtonText}>Dùng vị trí hiện tại</Text>}
                </TouchableOpacity>
                {autoLocateError ? <Text style={styles.mapErrorText}>{autoLocateError}</Text> : null}
                {selectedCoords ? (
                  <View style={styles.coordsPreview}>
                    <Text style={styles.coordsText}>Lat: {selectedCoords.latitude.toFixed(5)}</Text>
                    <Text style={styles.coordsText}>Lng: {selectedCoords.longitude.toFixed(5)}</Text>
                  </View>
                ) : (
                  <Text style={styles.coordsHint}>Chưa chọn vị trí</Text>
                )}
                <LabeledInput
                  label="Mô tả địa chỉ"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Tên tòa nhà, tầng, mô tả ngắn"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionHeading title="Phương tiện & giấy phép" description="Đảm bảo bạn đủ điều kiện nhận đơn" />
            <LabeledInput label="Loại phương tiện" value={vehicleType} onChangeText={setVehicleType} placeholder="Xe máy, xe tải..." />
            <LabeledInput label="Biển số" value={licensePlate} onChangeText={setLicensePlate} placeholder="59X3-123.45" autoCapitalize="characters" />
            <LabeledInput label="Số giấy phép lái xe" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="A123456789" />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Đang đăng ký…' : 'Đăng ký và cập nhật hồ sơ'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>Đã có tài khoản?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.footerLink}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <MapPickerModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        onConfirm={handleMapConfirm}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        selected={selectedCoords}
        onSelect={handleMapPress}
      />
    </KeyboardAvoidingView>
  );
}

const palette = {
  background: '#E6F0FF',
  card: '#FFFFFF',
  primary: '#2563EB',
  accent: '#1D4ED8',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E0E7FF',
  placeholder: '#94A3B8',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '600', color: palette.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: palette.muted, textAlign: 'center', marginBottom: 20 },
  sectionBlock: { marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 14, color: palette.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: palette.text,
    backgroundColor: '#F8FAFF',
  },
  inputMultiline: { minHeight: 90 },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footerCard: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
  },
  footerText: { color: palette.muted, marginBottom: 4 },
  footerLink: { color: palette.accent, fontWeight: '600' },
  modeToggleRow: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, backgroundColor: '#EEF2FF', padding: 4 },
  modeToggleButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  modeToggleButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  modeToggleText: { color: palette.muted, fontWeight: '500' },
  modeToggleTextActive: { color: palette.accent },
  mapPickerBlock: { marginBottom: 12 },
  mapPickerButton: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
  },
  mapPickerButtonText: { color: palette.accent, fontWeight: '600' },
  mapLocateButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
  },
  mapLocateButtonDisabled: { opacity: 0.6 },
  mapLocateButtonText: { color: palette.accent, fontWeight: '600' },
  mapErrorText: { marginTop: 8, color: '#DC2626', fontSize: 13 },
  coordsPreview: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  coordsText: { color: palette.text, fontSize: 14, fontWeight: '500' },
  coordsHint: { marginTop: 10, color: palette.muted },
  mapModalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  map: { flex: 1 },
  mapModalHeader: { paddingTop: Platform.select({ ios: 20, android: 10 }), paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  mapModalTitle: { fontSize: 18, fontWeight: '600', color: palette.text },
  mapModalActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  mapActionButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  mapActionCancel: { borderWidth: 1, borderColor: '#CBD5F5', marginRight: 8 },
  mapActionConfirm: { backgroundColor: palette.accent, marginLeft: 8 },
  mapActionText: { fontSize: 15, fontWeight: '600' },
  mapActionTextCancel: { color: palette.muted },
  mapActionTextConfirm: { color: '#FFFFFF' },
  selectDisplay: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFF',
  },
  selectDisplayDisabled: { opacity: 0.6 },
  selectValue: { color: palette.text, fontSize: 15, fontWeight: '600' },
  selectPlaceholder: { color: palette.placeholder, fontSize: 15 },
  selectModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  selectModal: {
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  selectModalTitle: { fontSize: 16, fontWeight: '600', color: palette.text, marginBottom: 12 },
  selectList: { maxHeight: 320 },
  selectOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2FF' },
  selectOptionText: { fontSize: 15, color: palette.text },
  selectLoadingContainer: { alignItems: 'center', paddingVertical: 24 },
  selectLoadingText: { marginTop: 8, color: palette.muted },
  selectEmptyWrapper: { alignItems: 'center', paddingVertical: 16 },
  selectEmptyText: { textAlign: 'center', color: palette.muted, paddingVertical: 16 },
  selectRetryButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  selectRetryText: { color: palette.accent, fontWeight: '600' },
  selectCloseButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectCloseText: { color: palette.accent, fontWeight: '600' },
});

type SectionHeadingProps = {
  title: string;
  description?: string;
};

function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: palette.text }}>{title}</Text>
      {description ? <Text style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>{description}</Text> : null}
    </View>
  );
}

type ExtraDetails = {
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  vehicleType: string;
  licensePlate: string;
  licenseNumber: string;
  coords?: { latitude: number; longitude: number };
};

const buildApplicationPayload = (details: ExtraDetails): ShipperApplication => ({
  personalInfo: { fullName: details.name },
  contactInfo: {
    fullName: details.name,
    phone: details.phone,
    email: details.email,
    nationalId: details.nationalId,
    address: details.address,
    province: details.province,
    district: details.district,
    ward: details.ward,
    addressLocation: details.coords ? { lat: details.coords.latitude, lng: details.coords.longitude } : undefined,
  },
  vehicleInfo: {
    vehicleType: details.vehicleType,
    licensePlate: details.licensePlate,
    licenseNumber: details.licenseNumber,
  },
});

type LabeledInputProps = TextInputProps & {
  label: string;
};

function LabeledInput({ label, style, ...inputProps }: LabeledInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.inputMultiline, style]}
        placeholderTextColor={palette.placeholder}
      />
    </View>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  onRetry?: () => void;
};

function SelectField({ label, value, placeholder, options, onSelect, disabled, loading, emptyLabel, onRetry }: SelectFieldProps) {
  const [visible, setVisible] = useState(false);
  const displayText = value || placeholder;
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectDisplay, disabled && styles.selectDisplayDisabled]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>{displayText}</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.selectModalBackdrop}>
          <View style={styles.selectModal}>
            <Text style={styles.selectModalTitle}>{label}</Text>
            <ScrollView style={styles.selectList}>
              {loading ? (
                <View style={styles.selectLoadingContainer}>
                  <ActivityIndicator color={palette.accent} />
                  <Text style={styles.selectLoadingText}>Đang tải dữ liệu…</Text>
                </View>
              ) : options.length ? (
                options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.selectOption}
                    onPress={() => {
                      onSelect(option);
                      setVisible(false);
                    }}
                  >
                    <Text style={styles.selectOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.selectEmptyWrapper}>
                  <Text style={styles.selectEmptyText}>{emptyLabel || 'Không có dữ liệu'}</Text>
                  {onRetry ? (
                    <TouchableOpacity
                      style={styles.selectRetryButton}
                      onPress={() => {
                        onRetry();
                      }}
                    >
                      <Text style={styles.selectRetryText}>Thử lại</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.selectCloseButton} onPress={() => setVisible(false)}>
              <Text style={styles.selectCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const normalizeUploadUri = (uri: string) => {
  if (!uri) return uri;
  if (Platform.OS === 'android') return uri;
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
};

const composeFullAddress = (detail: string, ward?: string, district?: string, province?: string) => {
  const parts = [detail, ward, district, province].filter(Boolean);
  return parts.join(', ');
};

const MapPickerModal = ({
  visible,
  onClose,
  onConfirm,
  region,
  onRegionChangeComplete,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  region: Region;
  onRegionChangeComplete: (region: Region) => void;
  selected: { latitude: number; longitude: number } | null;
  onSelect: (event: MapPressEvent) => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.mapModalContainer}>
      <View style={styles.mapModalHeader}>
        <Text style={styles.mapModalTitle}>Chọn vị trí trên bản đồ</Text>
      </View>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={onSelect}
      >
        {selected ? <Marker coordinate={selected} /> : null}
      </MapView>
      <View style={styles.mapModalActions}>
        <TouchableOpacity style={[styles.mapActionButton, styles.mapActionCancel]} onPress={onClose}>
          <Text style={[styles.mapActionText, styles.mapActionTextCancel]}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapActionButton, styles.mapActionConfirm, !selected && { opacity: 0.5 }]}
          onPress={onConfirm}
          disabled={!selected}
        >
          <Text style={[styles.mapActionText, styles.mapActionTextConfirm]}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
