import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { ClipboardCheck } from 'lucide-react-native';
import { PostLoanControlRecord, Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatDate } from '../utils/formatters';

interface PostLoanListViewProps {
  records: PostLoanControlRecord[];
  searchQuery: string;
  refreshing: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const PostLoanListView: React.FC<PostLoanListViewProps> = ({
  records,
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
        title="Kiểm soát sau vay (KSSV)"
        subTitle={`${records.length} đợt kiểm tra`}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
      />

      <FlatList
        data={records}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={commonStyles.cardItem}
            activeOpacity={0.85}
            onPress={() => item.customer && onSelectCustomer(item.customer)}
          >
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.cardItemTitle}>Mã KSSV: {item.ControlKey || 'Đợt kiểm soát'}</Text>
              <View
                style={[
                  commonStyles.debtPill,
                  {
                    backgroundColor:
                      item.Result === 'pass'
                        ? '#ECFDF5'
                        : item.Result === 'watch'
                        ? '#FFFBEB'
                        : '#FEF2F2',
                  },
                ]}
              >
                <Text
                  style={[
                    commonStyles.debtPillText,
                    {
                      color:
                        item.Result === 'pass'
                          ? '#059669'
                          : item.Result === 'watch'
                          ? '#D97706'
                          : '#DC2626',
                    },
                  ]}
                >
                  {item.Result === 'pass'
                    ? 'Đạt'
                    : item.Result === 'watch'
                    ? 'Theo dõi'
                    : item.Result === 'fail'
                    ? 'Cảnh báo'
                    : 'Cần kiểm tra'}
                </Text>
              </View>
            </View>

            <Text style={commonStyles.cardItemSub}>
              KH: <Text style={commonStyles.boldDark}>{item.customer?.FullName || '-'}</Text> • CIF:{' '}
              <Text style={commonStyles.boldDark}>{item.customer?.CifKh || '-'}</Text>
            </Text>

            <View style={commonStyles.gridThree}>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Kỳ kiểm tra</Text>
                <Text style={commonStyles.gridVal}>Kỳ {item.PeriodIndex || 1}</Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Hạn hoàn thành</Text>
                <Text style={[commonStyles.gridVal, { color: '#DC2626' }]}>
                  {formatDate(item.DueDate)}
                </Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Ngày thực hiện</Text>
                <Text style={commonStyles.gridVal}>{formatDate(item.PerformedDate)}</Text>
              </View>
            </View>

            {item.Findings ? (
              <View style={commonStyles.noteBox}>
                <Text style={commonStyles.noteText} numberOfLines={2}>
                  {item.Findings}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        contentContainerStyle={commonStyles.windowListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <ClipboardCheck size={40} color="#94A3B8" />
            <Text style={commonStyles.emptyTitle}>Không có lịch kiểm soát sau vay nào</Text>
          </View>
        }
      />
    </View>
  );
};
