import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// @ts-ignore: react-native-image-picker ships without typing
import { launchImageLibrary } from 'react-native-image-picker';
import * as shipperApi from '../api/shipper';
import type {
  ContactInfo,
  DocumentBundle,
  OperationArea,
  PersonalInfo,
  ShipperApplication,
  TrainingInfo,
  VehicleInfo,
} from '../types';

const stringifyOperationAreas = (areas?: OperationArea[]) => {
  if (!areas?.length) return '';
  return areas.map((area) => [area.province || '', area.district || '', area.ward || '', area.description || ''].join(',')).join('\n');
};

type ProfileForm = {
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  vehicleInfo: VehicleInfo;
  documents: DocumentBundle;
  training: TrainingInfo;
  operationAreasInput: string;
};

const emptyForm: ProfileForm = {
  personalInfo: {
    firstName: '',
    lastName: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
  },
  contactInfo: {
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    address: '',
    emailVerified: false,
    phoneVerified: false,
  },
  vehicleInfo: {
    vehicleType: '',
    brand: '',
    vehicleModel: '',
    vehicleColor: '',
    licensePlate: '',
    licenseNumber: '',
  },
  documents: {
    portraitUrl: '',
    nationalIdFrontUrl: '',
    nationalIdBackUrl: '',
    driverLicenseUrl: '',
    vehicleRegistrationUrl: '',
  },
  training: {
    completed: false,
    courseId: '',
  },
  operationAreasInput: '',
};

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState<ShipperApplication | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const hydrateForm = useCallback((application: ShipperApplication) => {
    setForm({
      personalInfo: {
        firstName: application.personalInfo?.firstName || '',
        lastName: application.personalInfo?.lastName || '',
        fullName: application.personalInfo?.fullName || '',
        dateOfBirth: application.personalInfo?.dateOfBirth ? String(application.personalInfo.dateOfBirth).slice(0, 10) : '',
        gender: application.personalInfo?.gender || '',
      },
      contactInfo: {
        fullName: application.contactInfo?.fullName || '',
        phone: application.contactInfo?.phone || '',
        email: application.contactInfo?.email || '',
        nationalId: application.contactInfo?.nationalId || '',
        address: application.contactInfo?.address || '',
        emailVerified: Boolean(application.contactInfo?.emailVerified),
        phoneVerified: Boolean(application.contactInfo?.phoneVerified),
      },
      vehicleInfo: {
        vehicleType: application.vehicleInfo?.vehicleType || '',
        brand: application.vehicleInfo?.brand || '',
        vehicleModel: application.vehicleInfo?.vehicleModel || '',
        vehicleColor: application.vehicleInfo?.vehicleColor || application.vehicleInfo?.color || '',
        licensePlate: application.vehicleInfo?.licensePlate || '',
        licenseNumber: application.vehicleInfo?.licenseNumber || '',
      },
      documents: {
        portraitUrl: application.documents?.portraitUrl || '',
        nationalIdFrontUrl: application.documents?.nationalIdFrontUrl || '',
        nationalIdBackUrl: application.documents?.nationalIdBackUrl || '',
        driverLicenseUrl: application.documents?.driverLicenseUrl || '',
        vehicleRegistrationUrl: application.documents?.vehicleRegistrationUrl || '',
      },
      training: {
        completed: Boolean(application.training?.completed),
        courseId: application.training?.courseId || '',
      },
      operationAreasInput: stringifyOperationAreas(application.operationAreas),
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await shipperApi.getMyApplication();
      if (res?.application) {
        setApp(res.application);
        setMissingFields([]);
        hydrateForm(res.application);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [hydrateForm]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const parseOperationAreasInput = useCallback((): OperationArea[] => (
    form.operationAreasInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return { province: parts[0] || '', district: parts[1] || '', ward: parts[2] || '', description: parts[3] || '' };
      })
  ), [form.operationAreasInput]);

  const validatePayload = (payload: ShipperApplication) => {
    const missing: string[] = [];
    if (!payload.contactInfo?.fullName) missing.push('Họ và tên');
    if (!payload.contactInfo?.phone) missing.push('Số điện thoại');
    if (!payload.contactInfo?.nationalId) missing.push('Số CMND/CCCD');
    if (!payload.contactInfo?.address) missing.push('Địa chỉ');
    if (!payload.vehicleInfo?.licensePlate) missing.push('Biển số');
    if (!payload.vehicleInfo?.licenseNumber) missing.push('Số giấy tờ/ bằng lái');
    if (!payload.operationAreas?.length) missing.push('Khu vực hoạt động');
    const docs = payload.documents || {};
    if (!docs.portraitUrl) missing.push('Ảnh chân dung');
    if (!docs.nationalIdFrontUrl) missing.push('CCCD mặt trước');
    if (!docs.driverLicenseUrl) missing.push('Giấy phép lái xe');
    if (!docs.vehicleRegistrationUrl) missing.push('Đăng ký xe');
    if (!payload.training?.completed) missing.push('Đào tạo (chưa hoàn thành)');
    return missing;
  };

  const buildApplicationPayload = useCallback((): ShipperApplication => {
    const payload: ShipperApplication = {
      personalInfo: { ...form.personalInfo },
      contactInfo: { ...form.contactInfo },
      vehicleInfo: { ...form.vehicleInfo },
      documents: { ...form.documents },
      training: { ...form.training },
    };
    const areas = parseOperationAreasInput();
    if (areas.length) payload.operationAreas = areas;
    return payload;
  }, [form, parseOperationAreasInput]);

  const save = async () => {
    try {
      setLoading(true);
      const payload = buildApplicationPayload();
      const missing = validatePayload(payload);
      if (missing.length) {
        setMissingFields(missing);
        Alert.alert('Thiếu thông tin', 'Vui lòng bổ sung các mục trước khi lưu: ' + missing.join(', '));
        setLoading(false);
        return;
      }
      const res = await shipperApi.upsertMyApplication(payload);
      if (res?.application) {
        Alert.alert('Lưu thành công', 'Hồ sơ đã được lưu');
        setApp(res.application);
        setMissingFields([]);
        hydrateForm(res.application);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as { missing?: string[]; message?: string };
        if (data?.missing?.length) {
          setMissingFields(data.missing.map(String));
          Alert.alert('Thiếu thông tin', 'Vui lòng bổ sung các mục: ' + data.missing.join(', '));
          return;
        }
        Alert.alert('Lỗi', String(data?.message || err.message));
        return;
      }
      Alert.alert('Lỗi', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    try {
      setLoading(true);
      const payload = buildApplicationPayload();
      const missingBefore = validatePayload(payload);
      if (missingBefore.length) {
        setMissingFields(missingBefore);
        Alert.alert('Thiếu thông tin', 'Vui lòng bổ sung các mục trước khi nộp: ' + missingBefore.join(', '));
        setLoading(false);
        return;
      }
      const res = await shipperApi.submitMyApplication();
      if (res?.application) {
        Alert.alert('Đã nộp', 'Hồ sơ đã được nộp chờ xét duyệt');
        setApp(res.application);
        setMissingFields([]);
        hydrateForm(res.application);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const data = err.response.data as { missing?: string[]; message?: string };
        if (data?.missing?.length) {
          setMissingFields(data.missing.map(String));
          Alert.alert('Thiếu thông tin', 'Vui lòng bổ sung các mục: ' + data.missing.join(', '));
          return;
        }
        Alert.alert('Lỗi', String(data?.message || err.message));
        return;
      }
      Alert.alert('Lỗi', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const updatePersonal = useCallback((patch: Partial<PersonalInfo>) => {
    setForm((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, ...patch } }));
  }, []);

  const updateContact = useCallback((patch: Partial<ContactInfo>) => {
    setForm((prev) => ({ ...prev, contactInfo: { ...prev.contactInfo, ...patch } }));
  }, []);

  const updateVehicle = useCallback((patch: Partial<VehicleInfo>) => {
    setForm((prev) => ({ ...prev, vehicleInfo: { ...prev.vehicleInfo, ...patch } }));
  }, []);

  const updateDocuments = useCallback((patch: Partial<DocumentBundle>) => {
    setForm((prev) => ({ ...prev, documents: { ...prev.documents, ...patch } }));
  }, []);

  const updateTraining = useCallback((patch: Partial<TrainingInfo>) => {
    setForm((prev) => ({ ...prev, training: { ...prev.training, ...patch } }));
  }, []);

  const updateAreasInput = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, operationAreasInput: value }));
  }, []);

  const handlePickAndUpload = async (
    target: 'portraitUrl' | 'nationalIdFrontUrl' | 'nationalIdBackUrl' | 'driverLicenseUrl' | 'vehicleRegistrationUrl',
  ) => {
    if (typeof launchImageLibrary !== 'function') {
      Alert.alert(
        'Image picker unavailable',
        'The native image-picker module is not available.\n\nPlease cài đặt `react-native-image-picker` và rebuild ứng dụng. Hoặc tạm thời dán URL ảnh vào ô tương ứng.',
      );
      return;
    }

    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setLoading(true);
      const normalizedUri = Platform.OS === 'android' && asset.uri.startsWith('file://') ? asset.uri : asset.uri.replace('file://', '');
      const uploadRes = await shipperApi.uploadDocument({ uri: normalizedUri, name: asset.fileName, type: asset.type });
      const url = uploadRes?.url || uploadRes?.data?.url || String(uploadRes);
      updateDocuments({ [target]: url } as Partial<DocumentBundle>);
      Alert.alert('Upload thành công');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const serverMsg = error.response?.data?.message || error.message;
        if (status === 404) {
          Alert.alert('Upload thất bại (404)', 'Kiểm tra lại backend `/api/upload`. Server: ' + String(serverMsg));
          return;
        }
        Alert.alert('Lỗi upload', `Status ${status || 'unknown'} - ${String(serverMsg)}`);
        return;
      }
      Alert.alert('Lỗi upload', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const status = app?.status ?? 'Chưa có';
  const readonly = status === 'pending' || status === 'approved';

  const statusMeta = useMemo(() => {
    const normalized = status?.toLowerCase?.() || '';
    if (normalized === 'approved') return { label: 'Đã duyệt', color: '#22c55e' };
    if (normalized === 'pending') return { label: 'Đang chờ duyệt', color: '#f97316' };
    if (normalized === 'rejected') return { label: 'Bị từ chối', color: '#ef4444' };
    if (normalized === 'draft') return { label: 'Bản nháp', color: '#6366f1' };
    return { label: status || 'Chưa có', color: '#94a3b8' };
  }, [status]);

  const completionSections = useMemo(() => {
    const hasText = (value?: string | null) => Boolean(value && value.trim());
    const docsFilled = Boolean(
      form.documents.portraitUrl &&
        form.documents.nationalIdFrontUrl &&
        form.documents.driverLicenseUrl &&
        form.documents.vehicleRegistrationUrl,
    );
    return [
      { key: 'personal', label: 'Cá nhân', status: hasText(form.personalInfo.firstName) && hasText(form.personalInfo.lastName) ? 'complete' : 'warning' },
      {
        key: 'contact',
        label: 'Liên hệ',
        status:
          hasText(form.contactInfo.fullName) && hasText(form.contactInfo.phone) && hasText(form.contactInfo.nationalId) && hasText(form.contactInfo.address)
            ? 'complete'
            : 'warning',
      },
      { key: 'vehicle', label: 'Phương tiện', status: hasText(form.vehicleInfo.vehicleType) && hasText(form.vehicleInfo.licensePlate) && hasText(form.vehicleInfo.licenseNumber) ? 'complete' : 'warning' },
      { key: 'areas', label: 'Khu vực', status: parseOperationAreasInput().length ? 'complete' : 'warning' },
      { key: 'documents', label: 'Tài liệu', status: docsFilled ? 'complete' : 'warning' },
      { key: 'training', label: 'Đào tạo', status: form.training.completed ? 'complete' : 'warning' },
    ] as const;
  }, [form, parseOperationAreasInput]);

  const completionPercent = useMemo(() => {
    if (!completionSections.length) return 0;
    const completed = completionSections.filter((section) => section.status === 'complete').length;
    return Math.round((completed / completionSections.length) * 100);
  }, [completionSections]);

  const sectionStatus = useCallback((key: (typeof completionSections)[number]['key']) => completionSections.find((section) => section.key === key)?.status, [completionSections]);

  const lastUpdatedText = useMemo(() => {
    const timestamp = app?.updatedAt || app?.createdAt;
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString('vi-VN');
    } catch {
      return '';
    }
  }, [app]);

  const reviewNote = app?.review?.note || app?.reviewNote || '';

  const isMissing = useCallback(
    (keywords: string[]) => missingFields.some((item) => {
      const lower = item.toLowerCase();
      return keywords.some((kw) => lower.includes(kw.toLowerCase()));
    }),
    [missingFields],
  );

  const renderMissingBox = () => {
    if (!missingFields.length) return null;
    return (
      <View style={styles.missingBox}>
        <Text style={styles.missingTitle}>Cần bổ sung</Text>
        {missingFields.map((item) => (
          <Text key={item} style={styles.missingItem}>
            • {item}
          </Text>
        ))}
      </View>
    );
  };

  const actionDisabled = loading || readonly;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Hồ sơ Shipper</Text>
          <Text style={styles.subtitle}>Hoàn thiện 100% để được duyệt nhận đơn</Text>
        </View>
        {loading ? <ActivityIndicator /> : null}
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Mức độ hoàn thiện</Text>
          <Text style={styles.progressPercent}>{completionPercent}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
        </View>
        <View style={styles.progressChipRow}>
          {completionSections.map((section) => (
            <View
              key={section.key}
              style={[styles.progressChip, section.status === 'complete' ? styles.progressChipComplete : styles.progressChipWarning]}
            >
              <Text
                style={[styles.progressChipText, section.status === 'complete' ? styles.progressChipTextComplete : styles.progressChipTextWarning]}
              >
                {section.label}
              </Text>
            </View>
          ))}
        </View>
        {lastUpdatedText ? <Text style={styles.progressHint}>Cập nhật gần nhất: {lastUpdatedText}</Text> : null}
      </View>

      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>Trạng thái</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.color }]}>
            <Text style={styles.statusBadgeText}>{statusMeta.label}</Text>
          </View>
          {reviewNote ? <Text style={styles.reviewNote}>Ghi chú từ bộ phận duyệt: {reviewNote}</Text> : null}
        </View>
        <View>
          <Text style={styles.statusHint}>Mỗi lần cập nhật hãy nhấn Lưu trước khi Nộp hồ sơ.</Text>
        </View>
      </View>

      {renderMissingBox()}

      <Section title="Thông tin cá nhân" status={sectionStatus('personal')}>
        <Field label="Họ và tên" value={form.personalInfo.fullName || ''} onChangeText={(text) => updatePersonal({ fullName: text })} editable={!readonly} placeholder="Nguyễn Văn A" />
        <Field label="Tên đệm" value={form.personalInfo.firstName || ''} onChangeText={(text) => updatePersonal({ firstName: text })} editable={!readonly} placeholder="Ví dụ: Văn" />
        <Field label="Họ" value={form.personalInfo.lastName || ''} onChangeText={(text) => updatePersonal({ lastName: text })} editable={!readonly} placeholder="Nguyễn" />
        <Field label="Ngày sinh" value={form.personalInfo.dateOfBirth || ''} onChangeText={(text) => updatePersonal({ dateOfBirth: text })} editable={!readonly} placeholder="1990-01-01" />
        <Field label="Giới tính" value={form.personalInfo.gender || ''} onChangeText={(text) => updatePersonal({ gender: text })} editable={!readonly} placeholder="Nam/Nữ/Khác" />
      </Section>

      <Section title="Liên hệ & định danh" status={sectionStatus('contact')}>
        <ToggleChips
          leftLabel={form.contactInfo.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
          rightLabel={form.contactInfo.phoneVerified ? 'SĐT đã xác thực' : 'SĐT chưa xác thực'}
          onLeftPress={() => !readonly && updateContact({ emailVerified: !form.contactInfo.emailVerified })}
          onRightPress={() => !readonly && updateContact({ phoneVerified: !form.contactInfo.phoneVerified })}
          disabled={readonly}
        />
        <Field
          label="Tên người liên hệ"
          value={form.contactInfo.fullName || ''}
          onChangeText={(text) => updateContact({ fullName: text })}
          editable={!readonly}
          placeholder="Tên giống trên CMND/CCCD"
          error={isMissing(['họ và tên', 'full name'])}
        />
        <Field
          label="Email"
          value={form.contactInfo.email || ''}
          onChangeText={(text) => updateContact({ email: text })}
          editable={!readonly}
          keyboardType="email-address"
          placeholder="you@example.com"
          error={isMissing(['email'])}
        />
        <Field
          label="Số điện thoại"
          value={form.contactInfo.phone || ''}
          onChangeText={(text) => updateContact({ phone: text })}
          editable={!readonly}
          keyboardType="phone-pad"
          error={isMissing(['số điện thoại', 'phone'])}
        />
        <Field
          label="Số CMND/CCCD"
          value={form.contactInfo.nationalId || ''}
          onChangeText={(text) => updateContact({ nationalId: text })}
          editable={!readonly}
          placeholder="111222333"
          error={isMissing(['cccd', 'cmnd', 'nationalid'])}
        />
        <Field
          label="Địa chỉ cư trú"
          value={form.contactInfo.address || ''}
          onChangeText={(text) => updateContact({ address: text })}
          editable={!readonly}
          multiline
          placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
          error={isMissing(['địa chỉ', 'address'])}
        />
      </Section>

      <Section title="Phương tiện" status={sectionStatus('vehicle')}>
        <Field label="Loại phương tiện" value={form.vehicleInfo.vehicleType || ''} onChangeText={(text) => updateVehicle({ vehicleType: text })} editable={!readonly} placeholder="Xe máy, Ô tô..." />
        <Field label="Hãng xe" value={form.vehicleInfo.brand || ''} onChangeText={(text) => updateVehicle({ brand: text })} editable={!readonly} placeholder="Honda" />
        <Field label="Dòng xe" value={form.vehicleInfo.vehicleModel || ''} onChangeText={(text) => updateVehicle({ vehicleModel: text })} editable={!readonly} placeholder="Vision 2021" />
        <Field label="Màu xe" value={form.vehicleInfo.vehicleColor || ''} onChangeText={(text) => updateVehicle({ vehicleColor: text })} editable={!readonly} placeholder="Đen" />
        <Field label="Biển số" value={form.vehicleInfo.licensePlate || ''} onChangeText={(text) => updateVehicle({ licensePlate: text })} editable={!readonly} placeholder="30F-123.45" error={isMissing(['biển số', 'licenseplate'])} />
        <Field label="Số giấy phép" value={form.vehicleInfo.licenseNumber || ''} onChangeText={(text) => updateVehicle({ licenseNumber: text })} editable={!readonly} placeholder="Số GPLX" error={isMissing(['giấy phép', 'license number'])} />
      </Section>

      <Section
        title="Khu vực hoạt động"
        status={sectionStatus('areas')}
        subtitle="Mỗi dòng tương ứng 1 khu vực theo định dạng: Tỉnh/TP, Quận/Huyện, Phường/Xã, Ghi chú"
      >
        <Field
          label="Danh sách khu vực"
          value={form.operationAreasInput}
          onChangeText={updateAreasInput}
          editable={!readonly}
          multiline
          placeholder={"Hà Nội, Cầu Giấy, Dịch Vọng, giao giờ hành chính"}
        />
        <Text style={styles.progressHint}>Ví dụ: Hồ Chí Minh, Quận 1, Bến Nghé, chạy ca tối</Text>
      </Section>

      <Section title="Ảnh & giấy tờ" status={sectionStatus('documents')} subtitle="Ảnh rõ nét, không che góc. Có thể tải ảnh từ thư viện hoặc dán URL.">
        <DocumentField
          label="Ảnh chân dung"
          value={form.documents.portraitUrl || ''}
          onChangeText={(text) => updateDocuments({ portraitUrl: text })}
          onPick={() => handlePickAndUpload('portraitUrl')}
          disabled={readonly}
          error={isMissing(['ảnh chân dung', 'portrait'])}
        />
        <DocumentField
          label="CCCD mặt trước"
          value={form.documents.nationalIdFrontUrl || ''}
          onChangeText={(text) => updateDocuments({ nationalIdFrontUrl: text })}
          onPick={() => handlePickAndUpload('nationalIdFrontUrl')}
          disabled={readonly}
          error={isMissing(['cccd mặt trước', 'front'])}
        />
        <DocumentField
          label="CCCD mặt sau"
          value={form.documents.nationalIdBackUrl || ''}
          onChangeText={(text) => updateDocuments({ nationalIdBackUrl: text })}
          onPick={() => handlePickAndUpload('nationalIdBackUrl')}
          disabled={readonly}
          error={isMissing(['cccd mặt sau', 'back'])}
        />
        <DocumentField
          label="Giấy phép lái xe"
          value={form.documents.driverLicenseUrl || ''}
          onChangeText={(text) => updateDocuments({ driverLicenseUrl: text })}
          onPick={() => handlePickAndUpload('driverLicenseUrl')}
          disabled={readonly}
          error={isMissing(['giấy phép', 'driverlicense'])}
        />
        <DocumentField
          label="Đăng ký xe"
          value={form.documents.vehicleRegistrationUrl || ''}
          onChangeText={(text) => updateDocuments({ vehicleRegistrationUrl: text })}
          onPick={() => handlePickAndUpload('vehicleRegistrationUrl')}
          disabled={readonly}
          error={isMissing(['đăng ký xe'])}
        />
      </Section>

      <Section title="Đào tạo" status={sectionStatus('training')}>
        <TouchableOpacity
          style={[styles.trainingToggle, form.training.completed && styles.trainingToggleActive, readonly && styles.disabledTouchable]}
          onPress={() => !readonly && updateTraining({ completed: !form.training.completed })}
        >
          <Text style={[styles.trainingToggleText, form.training.completed && styles.trainingToggleTextActive]}>
            {form.training.completed ? 'Đã hoàn thành khóa đào tạo' : 'Chưa hoàn thành'}
          </Text>
        </TouchableOpacity>
        <Field
          label="Mã khóa học (nếu có)"
          value={form.training.courseId || ''}
          onChangeText={(text) => updateTraining({ courseId: text })}
          editable={!readonly}
          placeholder="VD: SHIPPER-2025-01"
        />
      </Section>

      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton, actionDisabled && styles.buttonDisabled]} onPress={save} disabled={actionDisabled}>
          <Text style={styles.secondaryText}>Lưu bản nháp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton, actionDisabled && styles.buttonDisabled]} onPress={submit} disabled={actionDisabled}>
          <Text style={styles.primaryText}>Nộp hồ sơ</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footerStatus}>Trạng thái hiện tại: {statusMeta.label}</Text>
    </ScrollView>
  );
}

type FieldProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  error?: boolean;
};

const Field = ({ label, value, onChangeText, editable, placeholder, keyboardType = 'default', multiline, error }: FieldProps) => (
  <View style={styles.fieldWrapper}>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'auto'}
    />
  </View>
);

type SectionProps = { title: string; subtitle?: string; status?: 'complete' | 'warning'; children: React.ReactNode };

const Section = ({ title, subtitle, status, children }: SectionProps) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {status ? (
        <View style={[styles.sectionChip, status === 'complete' ? styles.sectionChipComplete : styles.sectionChipWarning]}>
          <Text style={[styles.sectionChipText, status === 'complete' ? styles.sectionChipTextComplete : styles.sectionChipTextWarning]}>
            {status === 'complete' ? 'Đủ' : 'Thiếu'}
          </Text>
        </View>
      ) : null}
    </View>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

type DocumentFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onPick: () => void;
  disabled: boolean;
  error?: boolean;
};

const DocumentField = ({ label, value, onChangeText, onPick, disabled, error }: DocumentFieldProps) => (
  <View style={styles.docWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.docRow}>
      <TextInput
        style={[styles.input, styles.inputFlex, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholder="https://..."
      />
      <TouchableOpacity style={[styles.uploadBtn, disabled && styles.disabledTouchable]} onPress={onPick} disabled={disabled}>
        <Text style={styles.uploadBtnText}>Chọn</Text>
      </TouchableOpacity>
    </View>
  </View>
);

type ToggleChipsProps = {
  leftLabel: string;
  rightLabel: string;
  onLeftPress: () => void;
  onRightPress: () => void;
  disabled: boolean;
};

const ToggleChips = ({ leftLabel, rightLabel, onLeftPress, onRightPress, disabled }: ToggleChipsProps) => (
  <View style={styles.toggleRow}>
    <TouchableOpacity style={[styles.toggleChip, disabled && styles.disabledTouchable]} onPress={onLeftPress} disabled={disabled}>
      <Text style={styles.toggleChipText}>{leftLabel}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.toggleChip, disabled && styles.disabledTouchable]} onPress={onRightPress} disabled={disabled}>
      <Text style={styles.toggleChipText}>{rightLabel}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#f3f4f6' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  progressCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { color: '#f1f5f9', fontWeight: '600' },
  progressPercent: { color: '#fbbf24', fontWeight: '700', fontSize: 18 },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: '#374151', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#38bdf8' },
  progressChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  progressChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  progressChipComplete: { backgroundColor: '#15803d' },
  progressChipWarning: { backgroundColor: '#b91c1c' },
  progressChipText: { fontSize: 12, fontWeight: '600' },
  progressChipTextComplete: { color: '#dcfce7' },
  progressChipTextWarning: { color: '#fee2e2' },
  progressHint: { color: '#94a3b8', marginTop: 10, fontSize: 12 },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statusLabel: { fontWeight: '600', marginBottom: 8, color: '#374151' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { color: '#fff', fontWeight: '700' },
  statusHint: { color: '#6b7280', fontSize: 12 },
  reviewNote: { marginTop: 8, color: '#b91c1c' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sectionChipComplete: { backgroundColor: '#dcfce7' },
  sectionChipWarning: { backgroundColor: '#fee2e2' },
  sectionChipText: { fontWeight: '700', fontSize: 12 },
  sectionChipTextComplete: { color: '#15803d' },
  sectionChipTextWarning: { color: '#b91c1c' },
  sectionSubtitle: { marginTop: 4, marginBottom: 12, color: '#6b7280' },
  fieldWrapper: { marginTop: 10 },
  fieldLabel: { fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  inputMultiline: { minHeight: 96 },
  inputError: { borderColor: '#f87171', backgroundColor: '#fef2f2' },
  inputFlex: { flex: 1 },
  missingBox: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, marginBottom: 16 },
  missingTitle: { fontWeight: '700', color: '#9a3412', marginBottom: 6 },
  missingItem: { color: '#b45309', lineHeight: 18 },
  toggleRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  toggleChip: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: '#e0e7ff', alignItems: 'center' },
  toggleChipText: { color: '#312e81', fontWeight: '600' },
  docWrapper: { marginTop: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  uploadBtn: { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#111827' },
  uploadBtnText: { color: '#fff', fontWeight: '600' },
  trainingToggle: { padding: 12, borderRadius: 12, backgroundColor: '#e5e7eb', marginBottom: 12 },
  trainingToggleActive: { backgroundColor: '#dcfce7' },
  trainingToggleText: { textAlign: 'center', fontWeight: '600', color: '#374151' },
  trainingToggleTextActive: { color: '#166534' },
  actionBar: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#2563eb' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#e0e7ff' },
  secondaryText: { color: '#1d4ed8', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  disabledTouchable: { opacity: 0.4 },
  footerStatus: { textAlign: 'center', color: '#6b7280', marginBottom: 32 },
});
