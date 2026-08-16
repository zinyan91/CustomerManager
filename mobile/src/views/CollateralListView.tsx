import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Shield } from 'lucide-react-native';
import { Collateral, Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatVND, formatDate } from '../utils/formatters';

interface CollateralListViewProps {
  collaterals: Collateral[];
  searchQuery: string;
  refreshing: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const CollateralListView: React.FC<CollateralListViewProps> = ({
  collaterals,
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
        title="Kho Tài sản bảo đảm"
        subTitle={`${collaterals.length} tài sản`}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
      />

      <FlatList
        data={collaterals}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={commonStyles.cardItem}
            activeOpacity={0.85}
            onPress={() => item.customer && onSelectCustomer(item.customer)}
          >
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.cardItemTitle}>{item.AssetCode || 'Tài sản thế chấp'}</Text>
              <View style={[commonStyles.debtPill, { backgroundColor: '#FFFBEB' }]}>
                <Text style={[commonStyles.debtPillText, { color: '#D97706' }]}>
                  {item.AssetType || 'BĐS'}
                </Text>
              </View>
            </View>

            <Text style={commonStyles.cardItemSub}>
              Chủ sở hữu: <Text style={commonStyles.boldDark}>{item.customer?.FullName || '-'}</Text> • CIF:{' '}
              <Text style={commonStyles.boldDark}>{item.customer?.CifKh || '-'}</Text>
            </Text>

            {item.Address ? (
              <Text style={commonStyles.cardAddressText} numberOfLines={2}>
                {item.Address}
              </Text>
            ) : null}

            <View style={commonStyles.gridThree}>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Giá trị định giá</Text>
                <Text style={[commonStyles.gridVal, { color: '#D97706' }]}>
                  {formatVND(item.AppraisedValue || item.Value)}
                </Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Tỷ lệ LTV</Text>
                <Text style={commonStyles.gridVal}>
                  {item.LtvPercent ? `${item.LtvPercent}%` : '—'}
                </Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Ngày định giá</Text>
                <Text style={commonStyles.gridVal}>{formatDate(item.AppraisalDate)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={commonStyles.windowListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <Shield size={40} color="#94A3B8" />
            <Text style={commonStyles.emptyTitle}>Không tìm thấy tài sản bảo đảm nào</Text>
          </View>
        }
      />
    </View>
  );
};
