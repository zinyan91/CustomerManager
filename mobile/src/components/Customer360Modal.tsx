import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { X, Phone, MessageSquare, FileText } from 'lucide-react-native';
import { Customer, LoanContract, CreditContract, Collateral, CardContract } from '../types';
import { formatVND, formatDate, formatRate, getDebtGroupBadge } from '../utils/formatters';
import { exportService } from '../utils/exportService';

interface Customer360ModalProps {
  customer: Customer | null;
  customerLoans: LoanContract[];
  customerCredits: CreditContract[];
  customerCollaterals: Collateral[];
  customerCards: CardContract[];
  loading: boolean;
  onClose: () => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  customer,
  customerLoans,
  customerCredits,
  customerCollaterals,
  customerCards,
  loading,
  onClose,
}) => {
  if (!customer) return null;

  const handleCall = (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Khách hàng chưa có số điện thoại.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleSMS = (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Khách hàng chưa có số điện thoại.');
      return;
    }
    Linking.openURL(`sms:${phone.replace(/\s+/g, '')}`);
  };

  return (
    <Modal
      visible={!!customer}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalBar} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{customer.FullName}</Text>
              <Text style={styles.modalSub}>
                CIF: {customer.CifKh} {customer.NationalId ? `• CCCD: ${customer.NationalId}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Đang tải chi tiết hồ sơ 360°...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Contact Actions */}
              <View style={styles.rowAlign}>
                <TouchableOpacity
                  style={[styles.modalContactBtn, { backgroundColor: '#ECFDF5' }]}
                  onPress={() => handleCall(customer.Phone)}
                >
                  <Phone size={15} color="#059669" />
                  <Text style={[styles.modalContactText, { color: '#059669' }]}>
                    {customer.Phone || 'Gọi điện'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalContactBtn, { backgroundColor: '#EFF6FF' }]}
                  onPress={() => handleSMS(customer.Phone)}
                >
                  <MessageSquare size={15} color="#2563EB" />
                  <Text style={[styles.modalContactText, { color: '#2563EB' }]}>
                    Nhắn tin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Export Document Actions (PDF / Excel / Word) */}
              <View style={styles.exportBarRow}>
                <TouchableOpacity
                  style={[styles.exportBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                  onPress={() =>
                    exportService.exportCustomerPDF(
                      customer,
                      customerLoans,
                      customerCredits,
                      customerCollaterals
                    )
                  }
                >
                  <FileText size={14} color="#DC2626" />
                  <Text style={[styles.exportBtnText, { color: '#DC2626' }]}>Xuất PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                  onPress={() =>
                    exportService.exportCustomerExcel(
                      customer,
                      customerLoans,
                      customerCollaterals
                    )
                  }
                >
                  <FileText size={14} color="#16A34A" />
                  <Text style={[styles.exportBtnText, { color: '#16A34A' }]}>Xuất Excel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                  onPress={() =>
                    exportService.exportCustomerWord(
                      customer,
                      customerLoans,
                      customerCollaterals
                    )
                  }
                >
                  <FileText size={14} color="#2563EB" />
                  <Text style={[styles.exportBtnText, { color: '#2563EB' }]}>Xuất Word</Text>
                </TouchableOpacity>
              </View>

              {/* Profile info */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardHeader}>THÔNG TIN HỒ SƠ</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Thu nhập hàng tháng:</Text>
                  <Text style={styles.infoVal}>{formatVND(customer.MonthlyIncome)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Xếp hạng tín dụng:</Text>
                  <Text style={styles.infoVal}>{customer.CreditRating || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Điểm CIC:</Text>
                  <Text style={styles.infoVal}>{customer.CreditScore || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Địa chỉ:</Text>
                  <Text style={[styles.infoVal, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                    {customer.Address || '-'}
                  </Text>
                </View>
              </View>

              {/* Loans List */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardHeader}>KHẾ ƯỚC VAY (KUNN) ({customerLoans.length})</Text>
                {customerLoans.length === 0 ? (
                  <Text style={styles.noDataText}>Chưa có khoản vay nào</Text>
                ) : (
                  customerLoans.map((l) => (
                    <View key={l.Id} style={styles.subItemBox}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.subItemTitle}>{l.ContractNumber}</Text>
                        <View style={[styles.debtPill, { backgroundColor: getDebtGroupBadge(l.DebtGroup).bg }]}>
                          <Text style={[styles.debtPillText, { color: getDebtGroupBadge(l.DebtGroup).color }]}>
                            Nhóm {l.DebtGroup || 1}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.subItemGrid}>
                        <Text style={styles.subItemLabel}>
                          Số tiền: <Text style={styles.boldDark}>{formatVND(l.ContractAmount)}</Text>
                        </Text>
                        <Text style={styles.subItemLabel}>
                          Dư nợ: <Text style={[styles.boldDark, { color: '#DC2626' }]}>{formatVND(l.CurrentBalance)}</Text>
                        </Text>
                        <Text style={styles.subItemLabel}>
                          Lãi suất: <Text style={styles.boldDark}>{formatRate(l.InterestRate)}</Text>
                        </Text>
                        <Text style={styles.subItemLabel}>
                          Giải ngân: <Text style={styles.boldDark}>{formatDate(l.DisbursementDate)}</Text>
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Collaterals List */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardHeader}>TÀI SẢN THẾ CHẤP (TSBD) ({customerCollaterals.length})</Text>
                {customerCollaterals.length === 0 ? (
                  <Text style={styles.noDataText}>Không có tài sản bảo đảm</Text>
                ) : (
                  customerCollaterals.map((c) => (
                    <View key={c.Id} style={styles.subItemBox}>
                      <Text style={styles.subItemTitle}>{c.AssetCode || 'Tài sản'}</Text>
                      <Text style={styles.subItemSub}>Loại: {c.AssetType || 'BĐS'}</Text>
                      <Text style={styles.subItemSub}>Định giá: {formatVND(c.AppraisedValue || c.Value)}</Text>
                      {c.Address ? <Text style={styles.subItemSub}>Địa chỉ: {c.Address}</Text> : null}
                    </View>
                  ))
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  modalBody: {
    padding: 16,
  },
  rowAlign: {
    flexDirection: 'row',
    gap: 8,
  },
  modalContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modalContactText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exportBarRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  noDataText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  subItemBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  subItemSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debtPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subItemGrid: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subItemLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  boldDark: {
    fontWeight: '700',
    color: '#0F172A',
  },
});
