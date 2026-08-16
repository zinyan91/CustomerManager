import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import {
  User,
  X,
  Home,
  Users,
  CreditCard,
  FileText,
  Shield,
  ClipboardCheck,
  Calculator,
  Percent,
  BookOpen,
  LogOut,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { SAFE_TOP_INSET } from '../theme/styles';

export type ActiveWindow =
  | 'home'
  | 'customers'
  | 'kunn'
  | 'hdtd'
  | 'cards'
  | 'collaterals'
  | 'postloan'
  | 'calculator'
  | 'ratequote'
  | 'quiz'
  | 'dues';

interface SidebarDrawerProps {
  visible: boolean;
  activeWindow: ActiveWindow;
  userFullName: string | null;
  onSelectWindow: (win: ActiveWindow) => void;
  onClose: () => void;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  visible,
  activeWindow,
  userFullName,
  onSelectWindow,
  onClose,
  onLogout,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.drawerPanel}>
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerAvatar}>
              <User size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.drawerUserName}>
                {userFullName || 'Cán bộ Tín dụng'}
              </Text>
              <Text style={styles.drawerUserRole}>Chuyên viên Quản lý Tín dụng</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Drawer Navigation Links */}
          <ScrollView
            style={styles.drawerNavList}
            contentContainerStyle={styles.drawerNavContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.drawerSectionLabel}>TRANG CHÍNH</Text>
            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'home' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('home')}
            >
              <Home size={18} color={activeWindow === 'home' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'home' && styles.drawerItemTextActive]}>
                Trang chủ tác nghiệp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'dues' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('dues')}
            >
              <Calendar size={18} color={activeWindow === 'dues' ? '#DC2626' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'dues' && { color: '#DC2626' }]}>
                Cảnh báo nợ đến hạn
              </Text>
            </TouchableOpacity>

            <Text style={styles.drawerSectionLabel}>DANH MỤC KHÁCH HÀNG & TÍN DỤNG</Text>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'customers' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('customers')}
            >
              <Users size={18} color={activeWindow === 'customers' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'customers' && styles.drawerItemTextActive]}>
                Khách hàng (CIF)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'kunn' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('kunn')}
            >
              <FileText size={18} color={activeWindow === 'kunn' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'kunn' && styles.drawerItemTextActive]}>
                Khế ước nhận nợ (KUNN)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'hdtd' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('hdtd')}
            >
              <FileText size={18} color={activeWindow === 'hdtd' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'hdtd' && styles.drawerItemTextActive]}>
                Hạn mức (HĐTD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'cards' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('cards')}
            >
              <CreditCard size={18} color={activeWindow === 'cards' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'cards' && styles.drawerItemTextActive]}>
                Thẻ tín dụng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'collaterals' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('collaterals')}
            >
              <Shield size={18} color={activeWindow === 'collaterals' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'collaterals' && styles.drawerItemTextActive]}>
                Kho Tài sản bảo đảm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'postloan' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('postloan')}
            >
              <ClipboardCheck size={18} color={activeWindow === 'postloan' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'postloan' && styles.drawerItemTextActive]}>
                Kiểm soát sau vay (KSSV)
              </Text>
            </TouchableOpacity>

            <Text style={styles.drawerSectionLabel}>CÔNG CỤ HỖ TRỢ</Text>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'calculator' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('calculator')}
            >
              <Calculator size={18} color={activeWindow === 'calculator' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'calculator' && styles.drawerItemTextActive]}>
                Tính phương án vay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'ratequote' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('ratequote')}
            >
              <Percent size={18} color={activeWindow === 'ratequote' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'ratequote' && styles.drawerItemTextActive]}>
                Bảng báo giá lãi suất
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerItem, activeWindow === 'quiz' && styles.drawerItemActive]}
              onPress={() => onSelectWindow('quiz')}
            >
              <BookOpen size={18} color={activeWindow === 'quiz' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.drawerItemText, activeWindow === 'quiz' && styles.drawerItemTextActive]}>
                Bộ đề ôn tập nghiệp vụ
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Drawer Footer / Logout */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity style={styles.drawerLogoutBtn} onPress={onLogout}>
              <LogOut size={16} color="#DC2626" />
              <Text style={styles.drawerLogoutText}>Đăng xuất khỏi ứng dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flexDirection: 'row',
  },
  drawerPanel: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingTop: SAFE_TOP_INSET,
    paddingBottom: Platform.OS === 'android' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  drawerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  drawerUserRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  drawerNavList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  drawerNavContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
    gap: 10,
  },
  drawerItemActive: {
    backgroundColor: '#EFF6FF',
  },
  drawerItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  drawerItemTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  drawerLogoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
