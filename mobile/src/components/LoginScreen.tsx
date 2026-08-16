import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ShieldCheck, User, Lock, Eye, EyeOff } from 'lucide-react-native';

interface LoginScreenProps {
  loggingIn: boolean;
  onLogin: (username: string, pass: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ loggingIn, onLogin }) => {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    onLogin(loginUsername, loginPassword);
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.loginInnerContainer}
      >
        <View style={styles.loginBrandBox}>
          <View style={styles.loginIconCircle}>
            <ShieldCheck size={36} color="#2563EB" />
          </View>
          <Text style={styles.loginTitle}>CUSTOMER MANAGER</Text>
          <Text style={styles.loginSubTitle}>Hệ thống Tác nghiệp Tín dụng Di động</Text>
        </View>

        <View style={styles.loginCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên đăng nhập / Email</Text>
            <View style={styles.inputBox}>
              <User size={18} color="#64748B" />
              <TextInput
                style={styles.textInputField}
                placeholder="Tên đăng nhập hoặc email..."
                placeholderTextColor="#94A3B8"
                value={loginUsername}
                onChangeText={setLoginUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.inputBox}>
              <Lock size={18} color="#64748B" />
              <TextInput
                style={styles.textInputField}
                placeholder="Mật khẩu..."
                placeholderTextColor="#94A3B8"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94A3B8" />
                ) : (
                  <Eye size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loggingIn}
            style={styles.loginBtn}
          >
            {loggingIn ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>Đăng nhập hệ thống</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loginInnerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginBrandBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loginIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loginSubTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#F8FAFC',
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 8,
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
