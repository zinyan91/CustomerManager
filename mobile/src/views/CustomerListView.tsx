import React from 'react';
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
import { Users, Phone, MessageSquare, ChevronRight } from 'lucide-react-native';
import { Customer } from '../types';
import { WindowHeader } from '../components/WindowHeader';
import { commonStyles } from '../theme/styles';
import { formatVND } from '../utils/formatters';

interface CustomerListViewProps {
  customers: Customer[];
  searchQuery: string;
  refreshing: boolean;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  onSelectCustomer: (c: Customer) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  searchQuery,
  refreshing,
  onSearchChange,
  onRefresh,
  onBack,
  onOpenSidebar,
  onSelectCustomer,
}) => {
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
    <View style={commonStyles.container}>
      <WindowHeader
        title="Danh sách Khách hàng"
        subTitle={`${customers.length} hồ sơ`}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onBack={onBack}
        onOpenSidebar={onOpenSidebar}
      />

      <FlatList
        data={customers}
        keyExtractor={(item) => item.Id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={commonStyles.cardItem}
            activeOpacity={0.85}
            onPress={() => onSelectCustomer(item)}
          >
            <View style={commonStyles.cardItemHeader}>
              <View style={commonStyles.rowAlign}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {item.FullName?.charAt(0) || 'K'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.cardItemTitle} numberOfLines={1}>
                    {item.FullName}
                  </Text>
                  <Text style={commonStyles.cardItemSub}>
                    CIF: <Text style={commonStyles.boldDark}>{item.CifKh}</Text> • {item.Phone || 'Chưa có SĐT'}
                  </Text>
                </View>
              </View>
              {item.CreditRating ? (
                <View style={commonStyles.ratingBadge}>
                  <Text style={commonStyles.ratingBadgeText}>{item.CreditRating}</Text>
                </View>
              ) : null}
            </View>

            <View style={commonStyles.gridThree}>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Thu nhập</Text>
                <Text style={commonStyles.gridVal}>{formatVND(item.MonthlyIncome)}</Text>
              </View>
              <View style={commonStyles.gridCol}>
                <Text style={commonStyles.gridLabel}>Điểm CIC</Text>
                <Text style={commonStyles.gridVal}>{item.CreditScore || '—'}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {item.Phone ? (
                <View style={commonStyles.rowAlign}>
                  <TouchableOpacity
                    style={commonStyles.callPill}
                    onPress={() => handleCall(item.Phone)}
                  >
                    <Phone size={12} color="#059669" />
                    <Text style={commonStyles.callPillText}>{item.Phone}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={commonStyles.iconActionBtn}
                    onPress={() => handleSMS(item.Phone)}
                  >
                    <MessageSquare size={13} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.detailLink}
                onPress={() => onSelectCustomer(item)}
              >
                <Text style={styles.detailLinkText}>Hồ sơ 360°</Text>
                <ChevronRight size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={commonStyles.windowListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <Users size={40} color="#94A3B8" />
            <Text style={commonStyles.emptyTitle}>Không tìm thấy khách hàng nào</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
});
