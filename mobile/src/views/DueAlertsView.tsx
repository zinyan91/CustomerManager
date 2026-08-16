import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Calendar, Clock, CheckCircle2, Phone } from 'lucide-react-native';
import { Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatVND, formatDate } from '../utils/formatters';
import { computeDueDashboard } from '../utils/dueCalculation';

interface DueAlertsViewProps {
  dueData: ReturnType<typeof computeDueDashboard>;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const DueAlertsView: React.FC<DueAlertsViewProps> = ({
  dueData,
  refreshing,
  onRefresh,
  onBack,
  onOpenSidebar,
  onSelectCustomer,
}) => {
  const [dueSubTab, setDueSubTab] = useState<'month' | 'kunn' | 'hmtd' | 'tsbd'>('month');
  const [groupFilter, setGroupFilter] = useState<'all' | 'g1' | 'g2' | 'bad'>('all');

  const handleCall = (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Khách hàng chưa có số điện thoại.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const displayedMonthList =
    groupFilter === 'g1'
      ? dueData.dueMonthGroup1List
      : groupFilter === 'g2'
      ? dueData.dueMonthGroup2List
      : groupFilter === 'bad'
      ? dueData.dueMonthBadDebtList
      : dueData.dueInMonthList;

  return (
    <View style={commonStyles.container}>
      <WindowHeader
        title="Cảnh báo nợ đến hạn"
        subTitle={`${dueData.totalDueAlerts} khoản cần xử lý`}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
        showSearch={false}
      />

      {/* 4 Main Tabs Matching Web */}
      <View style={commonStyles.segmentedContainer}>
        <TouchableOpacity
          style={[commonStyles.segmentedBtn, dueSubTab === 'month' && commonStyles.segmentedBtnActive]}
          onPress={() => setDueSubTab('month')}
        >
          <Text
            style={[
              commonStyles.segmentedText,
              dueSubTab === 'month' && commonStyles.segmentedTextActive,
            ]}
          >
            Kỳ tháng ({dueData.dueInMonthList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.segmentedBtn, dueSubTab === 'kunn' && commonStyles.segmentedBtnActive]}
          onPress={() => setDueSubTab('kunn')}
        >
          <Text
            style={[
              commonStyles.segmentedText,
              dueSubTab === 'kunn' && commonStyles.segmentedTextActive,
            ]}
          >
            KUNN ({dueData.dueKunnList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.segmentedBtn, dueSubTab === 'hmtd' && commonStyles.segmentedBtnActive]}
          onPress={() => setDueSubTab('hmtd')}
        >
          <Text
            style={[
              commonStyles.segmentedText,
              dueSubTab === 'hmtd' && commonStyles.segmentedTextActive,
            ]}
          >
            HMTD ({dueData.dueHmtdList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.segmentedBtn, dueSubTab === 'tsbd' && commonStyles.segmentedBtnActive]}
          onPress={() => setDueSubTab('tsbd')}
        >
          <Text
            style={[
              commonStyles.segmentedText,
              dueSubTab === 'tsbd' && commonStyles.segmentedTextActive,
            ]}
          >
            TSBD ({dueData.dueCollateralList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Filter Chips for Month Tab */}
      {dueSubTab === 'month' ? (
        <View style={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.filterChip, groupFilter === 'all' && styles.filterChipActive]}
            onPress={() => setGroupFilter('all')}
          >
            <Text style={[styles.filterChipText, groupFilter === 'all' && styles.filterChipTextActive]}>
              Tất cả ({dueData.dueInMonthList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, groupFilter === 'g1' && styles.filterChipActive]}
            onPress={() => setGroupFilter('g1')}
          >
            <Text style={[styles.filterChipText, groupFilter === 'g1' && styles.filterChipTextActive]}>
              Nhóm 1 (&lt;10N) ({dueData.dueMonthGroup1List.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, groupFilter === 'g2' && styles.filterChipActive]}
            onPress={() => setGroupFilter('g2')}
          >
            <Text style={[styles.filterChipText, groupFilter === 'g2' && styles.filterChipTextActive]}>
              Nhóm 2 (10-90N) ({dueData.dueMonthGroup2List.length})
            </Text>
          </TouchableOpacity>

          {dueData.dueMonthBadDebtList.length > 0 ? (
            <TouchableOpacity
              style={[styles.filterChip, groupFilter === 'bad' && styles.filterChipActive]}
              onPress={() => setGroupFilter('bad')}
            >
              <Text style={[styles.filterChipText, groupFilter === 'bad' && styles.filterChipTextActive]}>
                Nợ xấu ({dueData.dueMonthBadDebtList.length})
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {dueSubTab === 'month' ? (
        <FlatList
          data={displayedMonthList}
          keyExtractor={(item) => item.contract.Id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={commonStyles.cardItem}
              activeOpacity={0.85}
              onPress={() => item.customer && onSelectCustomer(item.customer)}
            >
              <View style={commonStyles.rowBetween}>
                <View style={commonStyles.dateTag}>
                  <Calendar size={12} color="#2563EB" />
                  <Text style={[commonStyles.dateTagText, { color: '#2563EB' }]}>
                    Đến hạn: {item.dueInfo?.dueDateStr}
                  </Text>
                </View>
                <View
                  style={[
                    commonStyles.debtPill,
                    {
                      backgroundColor: item.classification?.badgeBg || '#EFF6FF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      commonStyles.debtPillText,
                      { color: item.classification?.badgeColor || '#2563EB' },
                    ]}
                  >
                    {item.classification?.statusText || item.dueInfo?.daysLeft}
                  </Text>
                </View>
              </View>

              <Text style={commonStyles.cardItemTitle} numberOfLines={1}>
                {item.customer?.FullName || 'Khách hàng'}
              </Text>
              <Text style={commonStyles.cardItemSub}>
                KUNN: <Text style={commonStyles.boldDark}>{item.contract.ContractNumber}</Text> • CIF:{' '}
                <Text style={commonStyles.boldDark}>{item.customer?.CifKh || '-'}</Text>
              </Text>

              <View style={commonStyles.dueActionRow}>
                <View>
                  <Text style={commonStyles.metaMicroLabel}>Dư nợ hiện hữu</Text>
                  <Text style={[commonStyles.dueAmountText, { color: '#DC2626' }]}>
                    {formatVND(item.contract.CurrentBalance || item.contract.LoanAmount || 0)}
                  </Text>
                </View>
                {item.customer?.Phone ? (
                  <TouchableOpacity
                    style={commonStyles.callBtn}
                    onPress={() => handleCall(item.customer?.Phone)}
                  >
                    <Phone size={13} color="#FFFFFF" />
                    <Text style={commonStyles.callBtnText}>Gọi nhắc nợ</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={commonStyles.windowListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={commonStyles.emptyContainer}>
              <CheckCircle2 size={40} color="#059669" />
              <Text style={commonStyles.emptyTitle}>Không có kỳ nợ nào đến hạn trong 5 ngày tới</Text>
            </View>
          }
        />
      ) : dueSubTab === 'kunn' ? (
        <FlatList
          data={dueData.dueKunnList}
          keyExtractor={(item) => item.contract.Id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={commonStyles.cardItem}
              activeOpacity={0.85}
              onPress={() => item.customer && onSelectCustomer(item.customer)}
            >
              <View style={commonStyles.rowBetween}>
                <View style={commonStyles.dateTag}>
                  <Clock size={12} color="#DC2626" />
                  <Text style={commonStyles.dateTagText}>
                    Đáo hạn: {formatDate(item.contract.KunnDueDate || item.contract.ContractEndDate)}
                  </Text>
                </View>
                <View style={[commonStyles.debtPill, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[commonStyles.debtPillText, { color: '#DC2626' }]}>
                    {item.daysLeft !== null && item.daysLeft < 0
                      ? `Quá hạn ${Math.abs(item.daysLeft)} ngày`
                      : `Còn ${item.daysLeft} ngày`}
                  </Text>
                </View>
              </View>

              <Text style={commonStyles.cardItemTitle} numberOfLines={1}>
                {item.customer?.FullName || 'Khách hàng'}
              </Text>
              <Text style={commonStyles.cardItemSub}>
                KUNN: <Text style={commonStyles.boldDark}>{item.contract.ContractNumber}</Text> • Kỳ hạn:{' '}
                <Text style={commonStyles.boldDark}>{item.contract.KunnTenor || `${item.contract.LoanTenorMonths}T`}</Text>
              </Text>

              <View style={commonStyles.dueActionRow}>
                <View>
                  <Text style={commonStyles.metaMicroLabel}>Số tiền vay / Dư nợ</Text>
                  <Text style={[commonStyles.dueAmountText, { color: '#DC2626' }]}>
                    {formatVND(item.contract.LoanAmount || item.contract.CurrentBalance || 0)}
                  </Text>
                </View>
                {item.customer?.Phone ? (
                  <TouchableOpacity
                    style={commonStyles.callBtn}
                    onPress={() => handleCall(item.customer?.Phone)}
                  >
                    <Phone size={13} color="#FFFFFF" />
                    <Text style={commonStyles.callBtnText}>Gọi đôn đốc</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={commonStyles.windowListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={commonStyles.emptyContainer}>
              <CheckCircle2 size={40} color="#059669" />
              <Text style={commonStyles.emptyTitle}>Không có KUNN nào sắp đáo hạn trong 10 ngày tới</Text>
            </View>
          }
        />
      ) : dueSubTab === 'hmtd' ? (
        <FlatList
          data={dueData.dueHmtdList}
          keyExtractor={(item) => item.contract.Id.toString()}
          renderItem={({ item }) => (
            <View style={commonStyles.cardItem}>
              <View style={commonStyles.rowBetween}>
                <Text style={commonStyles.cardItemTitle}>HMTD: {item.contract.ContractNumber}</Text>
                <View style={[commonStyles.debtPill, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={[commonStyles.debtPillText, { color: '#D97706' }]}>
                    {item.daysLeft !== null && item.daysLeft < 0
                      ? `Hết hạn ${Math.abs(item.daysLeft)} ngày`
                      : `Còn ${item.daysLeft} ngày`}
                  </Text>
                </View>
              </View>
              <Text style={commonStyles.cardItemSub}>
                KH: <Text style={commonStyles.boldDark}>{item.customer?.FullName || '-'}</Text> ({item.customer?.CifKh})
              </Text>
              <View style={commonStyles.gridThree}>
                <View style={commonStyles.gridCol}>
                  <Text style={commonStyles.gridLabel}>Tổng mức cấp</Text>
                  <Text style={[commonStyles.gridVal, { color: '#2563EB' }]}>
                    {formatVND(item.contract.ContractAmount || 0)}
                  </Text>
                </View>
                <View style={commonStyles.gridCol}>
                  <Text style={commonStyles.gridLabel}>Ngày hết hạn</Text>
                  <Text style={commonStyles.gridVal}>{formatDate(item.endDateStr)}</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={commonStyles.windowListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={commonStyles.emptyContainer}>
              <CheckCircle2 size={40} color="#059669" />
              <Text style={commonStyles.emptyTitle}>Không có HMTD nào sắp hết hạn trong 45 ngày tới</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={dueData.dueCollateralList}
          keyExtractor={(item) => item.collateral.Id.toString()}
          renderItem={({ item }) => (
            <View style={commonStyles.cardItem}>
              <View style={commonStyles.rowBetween}>
                <Text style={commonStyles.cardItemTitle}>{item.collateral.AssetCode || 'Tài sản thế chấp'}</Text>
                <View style={[commonStyles.debtPill, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={[commonStyles.debtPillText, { color: '#D97706' }]}>
                    {item.daysLeft !== null && item.daysLeft < 0
                      ? `Hết hạn ${Math.abs(item.daysLeft)} ngày`
                      : `Còn ${item.daysLeft} ngày`}
                  </Text>
                </View>
              </View>
              <Text style={commonStyles.cardItemSub}>
                Chủ sở hữu: <Text style={commonStyles.boldDark}>{item.customer?.FullName || '-'}</Text> ({item.customer?.CifKh})
              </Text>
              {item.collateral.Address ? (
                <Text style={commonStyles.cardAddressText}>{item.collateral.Address}</Text>
              ) : null}
              <View style={commonStyles.gridThree}>
                <View style={commonStyles.gridCol}>
                  <Text style={commonStyles.gridLabel}>Định giá</Text>
                  <Text style={[commonStyles.gridVal, { color: '#D97706' }]}>
                    {formatVND(item.collateral.AppraisedValue || item.collateral.Value)}
                  </Text>
                </View>
                <View style={commonStyles.gridCol}>
                  <Text style={commonStyles.gridLabel}>Hạn định giá lại</Text>
                  <Text style={commonStyles.gridVal}>{formatDate(item.expiryStr)}</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={commonStyles.windowListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={commonStyles.emptyContainer}>
              <CheckCircle2 size={40} color="#059669" />
              <Text style={commonStyles.emptyTitle}>Không có TSBD nào sắp hết hạn định giá trong 30 ngày tới</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
