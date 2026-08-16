import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ArrowLeft, Menu, Search } from 'lucide-react-native';
import { commonStyles } from '../theme/styles';

interface WindowHeaderProps {
  title: string;
  subTitle?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onBack: () => void;
  onOpenSidebar: () => void;
  showSearch?: boolean;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  title,
  subTitle,
  searchQuery = '',
  onSearchChange,
  onBack,
  onOpenSidebar,
  showSearch = true,
}) => {
  return (
    <View style={commonStyles.windowHeaderBox}>
      <View style={commonStyles.windowTopRow}>
        <TouchableOpacity
          style={commonStyles.backToHubBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color="#2563EB" />
          <Text style={commonStyles.backToHubText}>Trang chủ</Text>
        </TouchableOpacity>

        <View style={commonStyles.windowTitleBox}>
          <Text style={commonStyles.windowTitleText} numberOfLines={1}>
            {title}
          </Text>
          {subTitle ? (
            <Text style={commonStyles.windowSubText}>{subTitle}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={commonStyles.menuDrawerBtn}
          onPress={onOpenSidebar}
          activeOpacity={0.7}
        >
          <Menu size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {showSearch && onSearchChange ? (
        <View style={commonStyles.windowSearchRow}>
          <Search size={14} color="#94A3B8" />
          <TextInput
            style={commonStyles.windowSearchInput}
            placeholder={`Tìm kiếm trong ${title}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
        </View>
      ) : null}
    </View>
  );
};
