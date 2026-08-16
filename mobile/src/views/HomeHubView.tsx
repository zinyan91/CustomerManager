import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Menu,
  RotateCw,
  Calendar,
  ChevronRight,
  Users,
  CreditCard,
  FileText,
  Shield,
  ClipboardCheck,
  Calculator,
  Percent,
  BookOpen,
} from 'lucide-react-native';
import { formatVND } from '../utils/formatters';
import { ActiveWindow } from '../components/SidebarDrawer';
import { SAFE_TOP_INSET } from '../theme/styles';

interface HomeHubViewProps {
  totalOutstandingBalance: number;
  totalCreditLimit: number;
  totalCollateralValue: number;
  customerCount: number;
  loanCount: number;
  creditCount: number;
  cardCount: number;
  collateralCount: number;
  postLoanCount: number;
  totalDueAlerts: number;
  dueInMonthCount: number;
  dueKunnCount: number;
  refreshing: boolean;
  userFullName: string | null;
  onRefresh: () => void;
  onOpenSidebar: () => void;
  onNavigate: (win: ActiveWindow) => void;
}

export const HomeHubView: React.FC<HomeHubViewProps> = ({
  totalOutstandingBalance,
  totalCreditLimit,
  totalCollateralValue,
  customerCount,
  loanCount,
  creditCount,
  cardCount,
  collateralCount,
  postLoanCount,
  totalDueAlerts,
  dueInMonthCount,
  dueKunnCount,
  refreshing,
  userFullName,
  onRefresh,
  onOpenSidebar,
  onNavigate,
}) => {
  return (
    <View style={styles.hubContainer}>
      {/* Top Header Bar */}
      <View style={styles.hubTopBar}>
        <TouchableOpacity style={styles.hubMenuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
          <Menu size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hubAppTitle}>Customer Manager</Text>
          <Text style={styles.hubAppSub}>{userFullName || 'Cán bộ Tín dụng'}</Text>
        </View>
        <TouchableOpacity style={styles.hubRefreshBtn} onPress={onRefresh} activeOpacity={0.7}>
          <RotateCw size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.hubScroll}
        contentContainerStyle={styles.hubScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Portfolio Quick Summary Box */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxLabel}>TỔNG DƯ NỢ ĐANG QUẢN LÝ</Text>
          <Text style={styles.summaryBoxBalance}>{formatVND(totalOutstandingBalance)}</Text>
          <View style={styles.summarySubStatsRow}>
            <Text style={styles.summarySubText}>
              Hạn mức HĐTD: <Text style={styles.boldDark}>{formatVND(totalCreditLimit)}</Text>
            </Text>
            <Text style={styles.summarySubDivider}>•</Text>
            <Text style={styles.summarySubText}>
              Định giá TSBD: <Text style={styles.boldDark}>{formatVND(totalCollateralValue)}</Text>
            </Text>
          </View>
        </View>

        {/* Due Repayments Capsule Alert */}
        {totalDueAlerts > 0 ? (
          <TouchableOpacity
            style={styles.dueAlertCapsule}
            activeOpacity={0.85}
            onPress={() => onNavigate('dues')}
          >
            <View style={styles.dueAlertIconBox}>
              <Calendar size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dueAlertTitle}>Cảnh báo nợ đến hạn thu hồi</Text>
              <Text style={styles.dueAlertCount}>
                <Text style={styles.boldRed}>{dueInMonthCount} kỳ trả nợ</Text> trong tháng • <Text style={styles.boldRed}>{dueKunnCount} KUNN</Text> sắp đáo hạn
              </Text>
            </View>
            <ChevronRight size={18} color="#DC2626" />
          </TouchableOpacity>
        ) : null}

        {/* 8 Business Module Windows Grid */}
        <Text style={styles.hubSectionTitle}>DANH MỤC CỬA SỔ TÁC NGHIỆP</Text>

        <View style={styles.hubGrid}>
          {/* 1. Khách hàng */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('customers')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#EFF6FF' }]}>
              <Users size={22} color="#2563EB" />
            </View>
            <Text style={styles.hubTileTitle}>Khách hàng (CIF)</Text>
            <Text style={styles.hubTileSub}>{customerCount} hồ sơ</Text>
          </TouchableOpacity>

          {/* 2. Khế ước */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('kunn')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#F5F3FF' }]}>
              <CreditCard size={22} color="#7C3AED" />
            </View>
            <Text style={styles.hubTileTitle}>Khế ước (KUNN)</Text>
            <Text style={styles.hubTileSub}>{loanCount} khế ước</Text>
          </TouchableOpacity>

          {/* 3. Hạn mức */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('hdtd')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#F0FDF4' }]}>
              <FileText size={22} color="#16A34A" />
            </View>
            <Text style={styles.hubTileTitle}>Hạn mức (HĐTD)</Text>
            <Text style={styles.hubTileSub}>{creditCount} hợp đồng</Text>
          </TouchableOpacity>

          {/* 4. Thẻ */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('cards')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#FDF2F8' }]}>
              <CreditCard size={22} color="#DB2777" />
            </View>
            <Text style={styles.hubTileTitle}>Thẻ tín dụng</Text>
            <Text style={styles.hubTileSub}>{cardCount} thẻ</Text>
          </TouchableOpacity>

          {/* 5. TSBD */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('collaterals')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#FFFBEB' }]}>
              <Shield size={22} color="#D97706" />
            </View>
            <Text style={styles.hubTileTitle}>Kho TSBD</Text>
            <Text style={styles.hubTileSub}>{collateralCount} tài sản</Text>
          </TouchableOpacity>

          {/* 6. KSSV */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('postloan')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#ECFDF5' }]}>
              <ClipboardCheck size={22} color="#059669" />
            </View>
            <Text style={styles.hubTileTitle}>Kiểm soát (KSSV)</Text>
            <Text style={styles.hubTileSub}>{postLoanCount} đợt</Text>
          </TouchableOpacity>

          {/* 7. Tính phương án */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('calculator')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#EFF6FF' }]}>
              <Calculator size={22} color="#2563EB" />
            </View>
            <Text style={styles.hubTileTitle}>Tính phương án vay</Text>
            <Text style={styles.hubTileSub}>Lịch trả nợ, DTI, phí</Text>
          </TouchableOpacity>

          {/* 8. Bộ đề */}
          <TouchableOpacity
            style={styles.hubTile}
            activeOpacity={0.8}
            onPress={() => onNavigate('quiz')}
          >
            <View style={[styles.hubTileIcon, { backgroundColor: '#F0FDF4' }]}>
              <BookOpen size={22} color="#16A34A" />
            </View>
            <Text style={styles.hubTileTitle}>Bộ đề ôn tập</Text>
            <Text style={styles.hubTileSub}>593 câu hỏi chuẩn</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Rate Quote Entry */}
        <TouchableOpacity
          style={styles.rateQuoteBanner}
          activeOpacity={0.85}
          onPress={() => onNavigate('ratequote')}
        >
          <View style={styles.rateQuoteBannerIcon}>
            <Percent size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rateQuoteBannerTitle}>Bảng biểu báo giá lãi suất</Text>
            <Text style={styles.rateQuoteBannerSub}>Tra cứu khung lãi suất huy động & cho vay</Text>
          </View>
          <ChevronRight size={18} color="#2563EB" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hubContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  hubTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: SAFE_TOP_INSET,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  hubMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubAppTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  hubAppSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  hubRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubScroll: {
    flex: 1,
  },
  hubScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  summaryBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  summaryBoxBalance: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 6,
  },
  summarySubStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summarySubText: {
    fontSize: 11,
    color: '#64748B',
  },
  summarySubDivider: {
    marginHorizontal: 8,
    color: '#CBD5E1',
  },
  boldDark: {
    fontWeight: '700',
    color: '#0F172A',
  },
  boldRed: {
    fontWeight: '800',
    color: '#DC2626',
  },
  dueAlertCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    gap: 10,
  },
  dueAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  dueAlertCount: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 1,
  },
  hubSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hubTile: {
    width: '48.4%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hubTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  hubTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  hubTileSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rateQuoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 12,
    gap: 12,
  },
  rateQuoteBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateQuoteBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  rateQuoteBannerSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
});
