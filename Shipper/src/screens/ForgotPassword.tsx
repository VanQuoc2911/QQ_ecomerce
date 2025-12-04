import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as shipperApi from '../api/shipper';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const onSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await shipperApi.forgotPassword(email.trim());
      Alert.alert('Yêu cầu đã gửi', res?.message || 'Nếu email tồn tại, hướng dẫn đã được gửi');
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Lỗi', msg || 'Không thể gửi yêu cầu');
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
          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>
            Nhập email đăng ký để nhận liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục spam nếu không thấy thư.
          </Text>
          <TextInput
            placeholder="Email"
            placeholderTextColor={palette.placeholder}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Đang gửi…' : 'Gửi yêu cầu'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.linkButtonText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const palette = {
  background: '#E6F0FF',
  card: '#FFFFFF',
  primary: '#2563EB',
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
  title: { fontSize: 24, fontWeight: '600', color: palette.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: palette.muted, textAlign: 'center', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: palette.text,
    marginBottom: 16,
    backgroundColor: '#F8FAFF',
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkButtonText: { color: palette.primary, fontSize: 14, fontWeight: '500' },
});
