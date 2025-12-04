import { useNavigation } from '@react-navigation/native';
import React, { useContext, useState } from 'react';
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
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useContext(AuthContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Login failed', msg || 'Kiểm tra thông tin');
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
        <View style={styles.brandBadge}>
          <Text style={styles.brandTitle}>QQ Shipper</Text>
          <Text style={styles.brandSubtitle}>Quản lý giao hàng thông minh</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Truy cập dashboard để nhận và theo dõi đơn</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor={palette.placeholder}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Mật khẩu"
            placeholderTextColor={palette.placeholder}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Đang xử lý…' : 'Đăng nhập'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
          >
            <Text style={styles.linkButtonText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>Chưa có tài khoản?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
            <Text style={styles.footerLink}>Đăng ký ngay</Text>
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
  accent: '#1D4ED8',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E0E7FF',
  placeholder: '#94A3B8',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brandBadge: { alignItems: 'center', marginBottom: 24 },
  brandTitle: { fontSize: 28, fontWeight: '700', color: palette.text },
  brandSubtitle: { fontSize: 14, color: palette.muted, marginTop: 4 },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '600', color: palette.text, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: palette.muted, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: palette.text,
    marginBottom: 14,
    backgroundColor: '#F8FAFF',
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 14, alignItems: 'center' },
  linkButtonText: { color: palette.accent, fontSize: 14, fontWeight: '500' },
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
});
