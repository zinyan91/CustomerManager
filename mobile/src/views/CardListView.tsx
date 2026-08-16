import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { CardContract, Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatVND, formatDate } from '../utils/formatters';

interface CardListViewProps {
  cards: CardContract[];
  searchQuery: string;
  refreshing: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const CardListView: React.FC<CardListViewProps> = ({
  cards,
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
        title="Thẻ tín dụng"
        subTitle={`${cards.length} thẻ`}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
      />

      <FlatList
        data={cards}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={commonStyles.cardItem}
            activeOpacity={0.85}
            onPress={() => item.customer && onSelectCustomer(item.customer)}
          >
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.cardItemTitle}>
                Thẻ: {item.CardContractNumber || item.CardHolderName || 'Chưa có số'}
              </Text>
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
                  {item.IsClosed ? 'Đã đóng' : 'Hoạt động'}
                </Text>
              </View>
            </View>

            <Text style={commonStyles.cardItemSub}>
              KH: <Text style={commonStyles.boldDark}>{item.customer?.FullName || item.CardHolderName || '-'}</Text> • CIF:{' '}
              <Text style={commonStyles.boldDark}>{item.customer?.CifKh || '-'}</Text>
            </Text>

            <View style={commonStyles.gridThree}>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Hạn mức cấp</Text>
                <Text style={[commonStyles.gridVal, { color: '#DB2777' }]}>
                  {formatVND(item.GrantedLimit)}
                </Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Sản phẩm thẻ</Text>
                <Text style={commonStyles.gridVal}>{item.CardProducts || 'Chuẩn'}</Text>
              </View>
            </View>

            <View style={[commonStyles.rowBetween, { marginTop: 6 }]}>
              <Text style={[commonStyles.cardItemSub, { fontSize: 11 }]}>
                Phát hành: {formatDate(item.IssueDate)}
              </Text>
              <Text style={[commonStyles.cardItemSub, { fontSize: 11 }]}>
                Hết hạn: {formatDate(item.ExpiryDate)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={commonStyles.windowListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <CreditCard size={40} color="#94A3B8" />
            <Text style={commonStyles.emptyTitle}>Không tìm thấy thẻ tín dụng nào</Text>
          </View>
        }
      />
    </View>
  );
};
