import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { LoanContract, Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatVND, formatDate, formatRate, getDebtGroupBadge } from '../utils/formatters';

interface LoanListViewProps {
  loans: LoanContract[];
  searchQuery: string;
  refreshing: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const LoanListView: React.FC<LoanListViewProps> = ({
  loans,
  searchQuery,
  refreshing,
  onSearchChange,
  onRefresh,
  onBack,
  onOpenSidebar,
  onSelectCustomer,
}) => {
  return (
    <View style={commonStyles.container}>
      <WindowHeader
        title="Khế ước nhận nợ (KUNN)"
        subTitle={`${loans.length} khế ước`}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
      />

      <FlatList
        data={loans}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={commonStyles.cardItem}
            activeOpacity={0.85}
            onPress={() => item.customer && onSelectCustomer(item.customer)}
          >
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.cardItemTitle}>{item.ContractNumber}</Text>
              <View style={[commonStyles.debtPill, { backgroundColor: getDebtGroupBadge(item.DebtGroup).bg }]}>
                <Text
                  style={[
                    commonStyles.debtPillText,
                    { color: getDebtGroupBadge(item.DebtGroup).color },
                  ]}
                >
                  Nhóm {item.DebtGroup || 1}
                </Text>
              </View>
            </View>

            <Text style={commonStyles.cardItemSub}>
              KH: <Text style={commonStyles.boldDark}>{item.customer?.FullName || 'Chưa gán KH'}</Text> • CIF:{' '}
              <Text style={commonStyles.boldDark}>{item.customer?.CifKh || '-'}</Text>
            </Text>

            <View style={commonStyles.gridThree}>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Số tiền vay</Text>
                <Text style={commonStyles.gridVal}>{formatVND(item.ContractAmount)}</Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Dư nợ hiện hữu</Text>
                <Text style={[commonStyles.gridVal, { color: '#DC2626' }]}>
                  {formatVND(item.CurrentBalance)}
                </Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Lãi suất</Text>
                <Text style={[commonStyles.gridVal, { color: '#059669' }]}>
                  {formatRate(item.InterestRate)}
                </Text>
              </View>
            </View>

            {item.DisbursementDate ? (
              <Text style={[commonStyles.cardItemSub, { marginTop: 6, fontSize: 11 }]}>
                Ngày giải ngân: {formatDate(item.DisbursementDate)}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
        contentContainerStyle={commonStyles.windowListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <CreditCard size={40} color="#94A3B8" />
            <Text style={commonStyles.emptyTitle}>Không tìm thấy khế ước vay nào</Text>
          </View>
        }
      />
    </View>
  );
};
