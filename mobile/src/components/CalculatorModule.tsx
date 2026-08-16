import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { Calculator, DollarSign, Calendar, Percent, ChevronDown, CheckCircle, RefreshCw, FileText, Share2 } from 'lucide-react-native';
import { formatVND } from '../utils/formatters';
import { exportService } from '../utils/exportService';

type CalcType = 'loan_schedule' | 'credit_capacity' | 'prepayment_fee';

export const CalculatorModule: React.FC = () => {
  const [activeCalc, setActiveCalc] = useState<CalcType>('loan_schedule');

  // 1. Loan Schedule State
  const [loanAmountStr, setLoanAmountStr] = useState('1000'); // Triệu VNĐ (1 tỷ)
  const [loanTenorStr, setLoanTenorStr] = useState('120'); // Tháng (10 năm)
  const [interestRateStr, setInterestRateStr] = useState('9.5'); // %/năm
  const [method, setMethod] = useState<'reducing' | 'annuity'>('reducing'); // Dư nợ giảm dần vs Niên kim đều
  const [showScheduleList, setShowScheduleList] = useState(false);

  // 2. Credit Capacity State
  const [incomeStr, setIncomeStr] = useState('35'); // Triệu VNĐ/tháng
  const [livingCostStr, setLivingCostStr] = useState('10'); // Triệu VNĐ/tháng
  const [otherDebtStr, setOtherDebtStr] = useState('0'); // Triệu VNĐ/tháng
  const [dtiLimitStr, setDtiLimitStr] = useState('60'); // %

  // 3. Prepayment Fee State
  const [payoffAmountStr, setPayoffAmountStr] = useState('500'); // Triệu VNĐ
  const [feeRateStr, setFeeRateStr] = useState('1.5'); // % phí phạt tất toán

  // Calculations for Loan Schedule
  const loanScheduleResult = useMemo(() => {
    const principal = (parseFloat(loanAmountStr) || 0) * 1_000_000;
    const months = parseInt(loanTenorStr, 10) || 1;
    const annualRate = (parseFloat(interestRateStr) || 0) / 100;
    const monthlyRate = annualRate / 12;

    if (principal <= 0 || months <= 0) {
      return { totalInterest: 0, firstMonthPay: 0, totalPayment: 0, schedule: [] };
    }

    let totalInterest = 0;
    let balance = principal;
    const schedule = [];

    if (method === 'reducing') {
      const monthlyPrincipal = principal / months;
      for (let i = 1; i <= months; i++) {
        const monthlyInterest = balance * monthlyRate;
        totalInterest += monthlyInterest;
        const totalMonth = monthlyPrincipal + monthlyInterest;
        balance -= monthlyPrincipal;
        if (i <= 36 || i === months) {
          schedule.push({
            period: i,
            principal: monthlyPrincipal,
            interest: monthlyInterest,
            total: totalMonth,
            remaining: Math.max(0, balance),
          });
        }
      }
      const firstMonthPay = monthlyPrincipal + principal * monthlyRate;
      return {
        totalInterest,
        firstMonthPay,
        totalPayment: principal + totalInterest,
        schedule,
      };
    } else {
      // Annuity (Gốc + Lãi đều hàng tháng)
      const monthlyPayment =
        monthlyRate === 0
          ? principal / months
          : (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
            (Math.pow(1 + monthlyRate, months) - 1);

      for (let i = 1; i <= months; i++) {
        const monthlyInterest = balance * monthlyRate;
        const monthlyPrincipal = monthlyPayment - monthlyInterest;
        totalInterest += monthlyInterest;
        balance -= monthlyPrincipal;
        if (i <= 36 || i === months) {
          schedule.push({
            period: i,
            principal: monthlyPrincipal,
            interest: monthlyInterest,
            total: monthlyPayment,
            remaining: Math.max(0, balance),
          });
        }
      }
      return {
        totalInterest,
        firstMonthPay: monthlyPayment,
        totalPayment: monthlyPayment * months,
        schedule,
      };
    }
  }, [loanAmountStr, loanTenorStr, interestRateStr, method]);

  // Calculations for Capacity
  const capacityResult = useMemo(() => {
    const income = (parseFloat(incomeStr) || 0) * 1_000_000;
    const livingCost = (parseFloat(livingCostStr) || 0) * 1_000_000;
    const otherDebt = (parseFloat(otherDebtStr) || 0) * 1_000_000;
    const dtiLimit = (parseFloat(dtiLimitStr) || 60) / 100;

    const maxMonthlyDebtService = Math.max(0, income * dtiLimit - otherDebt);
    const netIncomeAvailable = Math.max(0, income - livingCost - otherDebt);

    // Giả định vay 10 năm với lãi suất 9.5%/năm
    const months = 120;
    const monthlyRate = 0.095 / 12;
    const maxCapacity =
      monthlyRate === 0
        ? maxMonthlyDebtService * months
        : (maxMonthlyDebtService * (Math.pow(1 + monthlyRate, months) - 1)) /
          (monthlyRate * Math.pow(1 + monthlyRate, months));

    return {
      maxMonthlyDebtService,
      netIncomeAvailable,
      maxCapacity,
    };
  }, [incomeStr, livingCostStr, otherDebtStr, dtiLimitStr]);

  // Calculations for Prepayment Fee
  const prepaymentResult = useMemo(() => {
    const amount = (parseFloat(payoffAmountStr) || 0) * 1_000_000;
    const rate = (parseFloat(feeRateStr) || 0) / 100;
    const fee = amount * rate;
    const vat = fee * 0.1; // VAT 10% nếu có
    return {
      fee,
      vat,
      totalPayoff: amount + fee,
    };
  }, [payoffAmountStr, feeRateStr]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Sub Nav Tool Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabBtn, activeCalc === 'loan_schedule' && styles.tabBtnActive]}
          onPress={() => setActiveCalc('loan_schedule')}
        >
          <Text style={[styles.tabBtnText, activeCalc === 'loan_schedule' && styles.tabBtnTextActive]}>
            Lập lịch trả nợ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCalc === 'credit_capacity' && styles.tabBtnActive]}
          onPress={() => setActiveCalc('credit_capacity')}
        >
          <Text style={[styles.tabBtnText, activeCalc === 'credit_capacity' && styles.tabBtnTextActive]}>
            Khả năng vay
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeCalc === 'prepayment_fee' && styles.tabBtnActive]}
          onPress={() => setActiveCalc('prepayment_fee')}
        >
          <Text style={[styles.tabBtnText, activeCalc === 'prepayment_fee' && styles.tabBtnTextActive]}>
            Phí tất toán
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. LOAN SCHEDULE CALCULATOR */}
      {activeCalc === 'loan_schedule' && (
        <View>
          <View style={styles.cardBox}>
            <Text style={styles.cardHeader}>THÔNG SỐ PHƯƠNG ÁN VAY</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền vay (Triệu VNĐ)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={loanAmountStr}
                  onChangeText={setLoanAmountStr}
                  placeholder="Ví dụ: 1000 (= 1 tỷ)"
                />
                <Text style={styles.inputUnit}>Triệu ₫</Text>
              </View>
              <Text style={styles.helperText}>
                = {formatVND((parseFloat(loanAmountStr) || 0) * 1_000_000)}
              </Text>
            </View>

            <View style={styles.grid2}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Thời hạn (Tháng)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={loanTenorStr}
                    onChangeText={setLoanTenorStr}
                    placeholder="120"
                  />
                  <Text style={styles.inputUnit}>tháng</Text>
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Lãi suất (%/năm)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={interestRateStr}
                    onChangeText={setInterestRateStr}
                    placeholder="9.5"
                  />
                  <Text style={styles.inputUnit}>%</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Phương thức trả nợ</Text>
            <View style={styles.methodCapsules}>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'reducing' && styles.methodBtnActive]}
                onPress={() => setMethod('reducing')}
              >
                <Text style={[styles.methodText, method === 'reducing' && styles.methodTextActive]}>
                  Dư nợ giảm dần
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'annuity' && styles.methodBtnActive]}
                onPress={() => setMethod('annuity')}
              >
                <Text style={[styles.methodText, method === 'annuity' && styles.methodTextActive]}>
                  Niên kim (Đều tháng)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Result Highlight Card */}
          <View style={styles.resultHighlightCard}>
            <Text style={styles.resultTitle}>KẾT QUẢ TÍNH TOÁN PHƯƠNG ÁN</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tháng đầu trả (Gốc + Lãi):</Text>
              <Text style={[styles.resultValue, { color: '#2563EB' }]}>
                {formatVND(loanScheduleResult.firstMonthPay)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tổng lãi phải trả:</Text>
              <Text style={[styles.resultValue, { color: '#D97706' }]}>
                {formatVND(loanScheduleResult.totalInterest)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tổng tiền (Gốc + Lãi):</Text>
              <Text style={[styles.resultValue, { color: '#059669', fontSize: 16 }]}>
                {formatVND(loanScheduleResult.totalPayment)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.toggleScheduleBtn}
              onPress={() => setShowScheduleList(!showScheduleList)}
            >
              <Text style={styles.toggleScheduleText}>
                {showScheduleList ? 'Ẩn bảng chi tiết từng kỳ' : 'Xem bảng chi tiết các kỳ nợ'}
              </Text>
              <ChevronDown
                size={16}
                color="#2563EB"
                style={{ transform: [{ rotate: showScheduleList ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportPdfBtn}
              activeOpacity={0.8}
              onPress={() =>
                exportService.exportRepaymentSchedulePDF(
                  (parseFloat(loanAmountStr) || 0) * 1_000_000,
                  parseInt(loanTenorStr, 10) || 1,
                  parseFloat(interestRateStr) || 0,
                  method,
                  loanScheduleResult.schedule
                )
              }
            >
              <FileText size={15} color="#FFFFFF" />
              <Text style={styles.exportPdfBtnText}>Xuất Lịch trả nợ ra PDF & Chia sẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Schedule Breakdown Table */}
          {showScheduleList && (
            <View style={styles.scheduleTableBox}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableCol, { width: 36 }]}>Kỳ</Text>
                <Text style={[styles.tableCol, { flex: 1 }]}>Gốc</Text>
                <Text style={[styles.tableCol, { flex: 1 }]}>Lãi</Text>
                <Text style={[styles.tableCol, { flex: 1.1 }]}>Tổng kỳ</Text>
                <Text style={[styles.tableCol, { flex: 1.1 }]}>Dư nợ còn</Text>
              </View>
              {loanScheduleResult.schedule.map((item) => (
                <View key={item.period} style={styles.tableDataRow}>
                  <Text style={[styles.tableCell, { width: 36, fontWeight: '700' }]}>{item.period}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{formatVND(item.principal)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#D97706' }]}>
                    {formatVND(item.interest)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.1, fontWeight: '700', color: '#2563EB' }]}>
                    {formatVND(item.total)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.1, color: '#64748B' }]}>
                    {formatVND(item.remaining)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 2. CREDIT CAPACITY CALCULATOR */}
      {activeCalc === 'credit_capacity' && (
        <View>
          <View style={styles.cardBox}>
            <Text style={styles.cardHeader}>THU NHẬP & NGHĨA VỤ TÀI CHÍNH</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tổng thu nhập thực tế (Triệu ₫/tháng)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={incomeStr}
                  onChangeText={setIncomeStr}
                  placeholder="35"
                />
                <Text style={styles.inputUnit}>Tr ₫/th</Text>
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Chi hoạt (Tr ₫)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={livingCostStr}
                    onChangeText={setLivingCostStr}
                    placeholder="10"
                  />
                  <Text style={styles.inputUnit}>Tr ₫</Text>
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Nợ khác đang trả (Tr ₫)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={otherDebtStr}
                    onChangeText={setOtherDebtStr}
                    placeholder="0"
                  />
                  <Text style={styles.inputUnit}>Tr ₫</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tỷ lệ DTI tối đa quy định (%)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={dtiLimitStr}
                  onChangeText={setDtiLimitStr}
                  placeholder="60"
                />
                <Text style={styles.inputUnit}>%</Text>
              </View>
            </View>
          </View>

          <View style={styles.resultHighlightCard}>
            <Text style={styles.resultTitle}>HẠN MỨC CHO VAY TỐI ĐA ƯỚC TÍNH</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Khả năng trả nợ/tháng (DTI):</Text>
              <Text style={[styles.resultValue, { color: '#2563EB' }]}>
                {formatVND(capacityResult.maxMonthlyDebtService)}/tháng
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Hạn mức vay tối đa (10 năm):</Text>
              <Text style={[styles.resultValue, { color: '#059669', fontSize: 18, fontWeight: '900' }]}>
                {formatVND(capacityResult.maxCapacity)}
              </Text>
            </View>
            <Text style={styles.disclaimerText}>
              * Kết quả dựa trên quy định DTI tối đa {dtiLimitStr}% và lãi suất tham chiếu 9.5%/năm thời hạn 10 năm.
            </Text>
          </View>
        </View>
      )}

      {/* 3. PREPAYMENT FEE CALCULATOR */}
      {activeCalc === 'prepayment_fee' && (
        <View>
          <View style={styles.cardBox}>
            <Text style={styles.cardHeader}>TÍNH PHÍ TẤT TOÁN TRƯỚC HẠN</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền trả nợ trước hạn (Triệu ₫)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={payoffAmountStr}
                  onChangeText={setPayoffAmountStr}
                  placeholder="500"
                />
                <Text style={styles.inputUnit}>Triệu ₫</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phần trăm phí phạt (%)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={feeRateStr}
                  onChangeText={setFeeRateStr}
                  placeholder="1.5"
                />
                <Text style={styles.inputUnit}>%</Text>
              </View>
            </View>
          </View>

          <View style={styles.resultHighlightCard}>
            <Text style={styles.resultTitle}>TỔNG TIỀN PHẢI NỘP KHI TẤT TOÁN</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Phí phạt tất toán:</Text>
              <Text style={[styles.resultValue, { color: '#DC2626' }]}>
                {formatVND(prepaymentResult.fee)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tổng tiền nộp (Gốc + Phí phạt):</Text>
              <Text style={[styles.resultValue, { color: '#059669', fontSize: 17, fontWeight: '900' }]}>
                {formatVND(prepaymentResult.totalPayoff)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 3,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  methodCapsules: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  methodTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  resultHighlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  resultLabel: {
    fontSize: 13,
    color: '#475569',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  toggleScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 4,
  },
  toggleScheduleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  exportPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  exportPdfBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduleTableBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableCol: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 10,
    color: '#1E293B',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
