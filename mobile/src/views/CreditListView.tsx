import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { FileText } from 'lucide-react-native';
import { CreditContract, Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatVND, formatDate } from '../utils/formatters';

interface CreditListViewProps {
  credits: CreditContract[];
  searchQuery: string;
  refreshing: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const CreditListView: React.FC<CreditListViewProps> = ({
  credits,
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
        title="Hạn mức tín dụng (HĐTD)"
        subTitle={`${credits.length} hợp đồng`}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
      />

      <FlatList
        data={credits}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={commonStyles.cardItem}
            activeOpacity={0.85}
            onPress={() => item.customer && onSelectCustomer(item.customer)}
          >
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.cardItemTitle}>{item.HdtdNumber}</Text>
              <View
                style={[
                  commonStyles.debtPill,
                  { backgroundColor: item.IsClosed ? '#F1F5F9' : '#ECFDF5' },
                ]}
              >
                <Text
                  style={[
                    commonStyles.debtPillText,
                    { color: item.IsClosed ? '#64748B' : '#059669' },
                  ]}
                >
                  {item.IsClosed ? 'Đã đóng' : 'Hiệu lực'}
                </Text>
              </View>
            </View>

            <Text style={commonStyles.cardItemSub}>
              KH: <Text style={commonStyles.boldDark}>{item.customer?.FullName || '-'}</Text> • CIF:{' '}
              <Text style={commonStyles.boldDark}>{item.customer?.CifKh || '-'}</Text>
            </Text>

            <View style={commonStyles.gridThree}>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Hạn mức cấp</Text>
                <Text style={[commonStyles.gridVal, { color: '#2563EB' }]}>
                  {formatVND(item.ContractAmount)}
                </Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Thời hạn</Text>
                <Text style={commonStyles.gridVal}>
                  {item.LoanTenorMonths ? `${item.LoanTenorMonths} tháng` : '—'}
                </Text>
              </View>
            </View>

            <View style={[commonStyles.rowBetween, { marginTop: 6 }]}>
              <Text style={[commonStyles.cardItemSub, { fontSize: 11 }]}>
                Bắt đầu: {formatDate(item.ContractStartDate)}
              </Text>
              <Text style={[commonStyles.cardItemSub, { fontSize: 11 }]}>
                Hết hạn: {formatDate(item.ContractEndDate)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={commonStyles.windowListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <FileText size={40} color="#94A3B8" />
            <Text style={commonStyles.emptyTitle}>Không tìm thấy hợp đồng hạn mức nào</Text>
          </View>
        }
      />
    </View>
  );
};
