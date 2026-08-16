import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Sparkles, Check, ChevronRight, Percent, Calendar, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { formatVND } from '../utils/formatters';

interface RatePackage {
  id: number | string;
  name: string;
  code: string;
  prefRate: number; // Lãi suất ưu đãi (%/năm)
  prefMonths: number; // Số tháng ưu đãi
  postMargin: number; // Biên độ sau ưu đãi (+3.5%)
  baseRate: number; // Lãi suất cơ sở (8.5%)
  minTenor: number; // Thời hạn tối thiểu (tháng)
  desc: string;
}

const DEFAULT_PACKAGES: RatePackage[] = [
  {
    id: 1,
    name: 'Gói Vay Mua Nhà An Cư',
    code: 'HOME-06M',
    prefRate: 6.5,
    prefMonths: 6,
    postMargin: 3.5,
    baseRate: 8.5,
    minTenor: 36,
    desc: 'Ưu đãi 6.5%/năm trong 6 tháng đầu. Thả nổi = Lãi suất cơ sở + 3.5%.',
  },
  {
    id: 2,
    name: 'Gói An Gia Lãi Suất Cố Định 12T',
    code: 'HOME-12M',
    prefRate: 7.9,
    prefMonths: 12,
    postMargin: 3.8,
    baseRate: 8.5,
    minTenor: 48,
    desc: 'Cố định 7.9%/năm suốt 12 tháng đầu, an tâm kế hoạch trả nợ dài hạn.',
  },
  {
    id: 3,
    name: 'Gói Vay Sản Xuất Kinh Doanh Tức Thì',
    code: 'SME-SPEED',
    prefRate: 7.2,
    prefMonths: 6,
    postMargin: 3.0,
    baseRate: 8.5,
    minTenor: 12,
    desc: 'Hỗ trợ vốn lưu động ngắn hạn và trung hạn cho hộ kinh doanh và doanh nghiệp.',
  },
  {
    id: 4,
    name: 'Gói Vay Mua Xe Ô Tô Ưu Đãi',
    code: 'AUTO-PRO',
    prefRate: 8.2,
    prefMonths: 12,
    postMargin: 3.6,
    baseRate: 8.5,
    minTenor: 36,
    desc: 'Tài trợ tối đa 85% giá trị xe, phê duyệt siêu tốc trong ngày.',
  },
];

export const RateQuoteModule: React.FC = () => {
  const [packages, setPackages] = useState<RatePackage[]>(DEFAULT_PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState<RatePackage>(DEFAULT_PACKAGES[0]);
  const [loanAmountStr, setLoanAmountStr] = useState('1500'); // 1.5 tỷ
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const { data } = await supabase
          .from('RatePrograms')
          .select('*')
          .limit(20);
        if (data && data.length > 0) {
          const mapped: RatePackage[] = data.map((p, idx) => ({
            id: p.Id || idx,
            name: p.ProgramName || p.Name || 'Gói vay ưu đãi',
            code: p.ProgramCode || `PKG-${idx + 1}`,
            prefRate: p.PreferentialRate ? (p.PreferentialRate < 1 ? p.PreferentialRate * 100 : p.PreferentialRate) : 6.8,
            prefMonths: p.PreferentialPeriodMonths || 6,
            postMargin: p.MarginRate ? (p.MarginRate < 1 ? p.MarginRate * 100 : p.MarginRate) : 3.5,
            baseRate: 8.5,
            minTenor: p.MinTenorMonths || 36,
            desc: p.Description || 'Chương trình tín dụng ưu đãi theo biểu lãi suất hiện hành.',
          }));
          setPackages(mapped);
          setSelectedPkg(mapped[0]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadPrograms();
  }, []);

  const principal = (parseFloat(loanAmountStr) || 0) * 1_000_000;
  const prefMonthlyInterest = (principal * (selectedPkg.prefRate / 100)) / 12;
  const postFloatingRate = selectedPkg.baseRate + selectedPkg.postMargin;
  const postMonthlyInterest = (principal * (postFloatingRate / 100)) / 12;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.quoteHeroCard}>
        <View style={styles.badgeRow}>
          <Sparkles size={14} color="#38BDF8" />
          <Text style={styles.badgeText}>BẢNG CHÀO LÃI SUẤT TƯ VẤN KHÁCH HÀNG</Text>
        </View>
        <Text style={styles.heroTitle}>Báo giá & Phương án Ưu đãi</Text>
        <Text style={styles.heroSubtitle}>
          Chọn gói vay để tính nhanh lãi suất ưu đãi và lãi suất thả nổi tư vấn khách hàng.
        </Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.inputCardLabel}>Số tiền dự kiến vay (Triệu VNĐ)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            keyboardType="numeric"
            value={loanAmountStr}
            onChangeText={setLoanAmountStr}
            placeholder="1500"
          />
          <Text style={styles.inputUnit}>Triệu ₫</Text>
        </View>
        <Text style={styles.inputEquiv}>= {formatVND(principal)}</Text>
      </View>

      {/* Package Selector Cards */}
      <Text style={styles.sectionTitle}>CHỌN GÓI VAY ƯU ĐÃI</Text>
      {packages.map((pkg) => {
        const isSelected = selectedPkg.id === pkg.id;
        return (
          <TouchableOpacity
            key={pkg.id}
            activeOpacity={0.85}
            style={[styles.pkgCard, isSelected && styles.pkgCardActive]}
            onPress={() => setSelectedPkg(pkg)}
          >
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <View style={styles.pkgCodeBadge}>
                  <Text style={styles.pkgCodeText}>{pkg.code}</Text>
                </View>
                <Text style={styles.pkgName}>{pkg.name}</Text>
              </View>
              {isSelected ? (
                <View style={styles.checkCircleActive}>
                  <Check size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            <View style={styles.pkgRatePillGrid}>
              <View style={styles.pkgRatePill}>
                <Text style={styles.pillLabel}>Lãi ưu đãi:</Text>
                <Text style={[styles.pillValue, { color: '#059669' }]}>
                  {pkg.prefRate}%/năm ({pkg.prefMonths} tháng)
                </Text>
              </View>
              <View style={styles.pkgRatePill}>
                <Text style={styles.pillLabel}>Sau ưu đãi:</Text>
                <Text style={[styles.pillValue, { color: '#2563EB' }]}>
                  LSCĐ + {pkg.postMargin}%
                </Text>
              </View>
            </View>

            <Text style={styles.pkgDesc}>{pkg.desc}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Quotation Summary for Customer */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>BẢNG TỔNG HỢP TƯ VẤN ({selectedPkg.code})</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Lãi suất {selectedPkg.prefMonths} tháng đầu:</Text>
          <Text style={[styles.summaryVal, { color: '#059669' }]}>
            {selectedPkg.prefRate}%/năm
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tiền lãi tháng đầu ước tính:</Text>
          <Text style={[styles.summaryVal, { color: '#059669', fontSize: 16 }]}>
            {formatVND(prefMonthlyInterest)}/tháng
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Lãi suất sau ưu đãi ước tính:</Text>
          <Text style={[styles.summaryVal, { color: '#D97706' }]}>
            {postFloatingRate.toFixed(2)}%/năm
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tiền lãi sau ưu đãi ước tính:</Text>
          <Text style={[styles.summaryVal, { color: '#D97706' }]}>
            {formatVND(postMonthlyInterest)}/tháng
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  quoteHeroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  inputCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  inputEquiv: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  pkgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pkgCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#FAFCFF',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pkgCodeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  pkgCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  pkgName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  checkCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgRatePillGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pkgRatePill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
  },
  pillLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  pillValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  pkgDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
});
