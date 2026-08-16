import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Search, BookOpen } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface QuizOptionItem {
  id: string;
  text: string;
}

interface QuizItem {
  id: number;
  question: string;
  topic: string;
  options: QuizOptionItem[];
  correctAnswers: string[];
  explanation?: string;
  source?: string;
}

const DEFAULT_BANK_QUIZ: QuizItem[] = [
  {
    id: 1,
    question: 'Thời hạn tối đa đối với khoản vay ngắn hạn theo quy định của Ngân hàng Nhà nước là bao lâu?',
    topic: 'Quy định Chung',
    options: [
      { id: 'A', text: 'Tối đa 06 tháng' },
      { id: 'B', text: 'Tối đa 12 tháng' },
      { id: 'C', text: 'Tối đa 18 tháng' },
      { id: 'D', text: 'Tối đa 24 tháng' },
    ],
    correctAnswers: ['B'],
    explanation: 'Theo Thông tư 39/2016/TT-NHNN, khoản vay ngắn hạn có thời hạn cho vay tối đa đến 12 tháng.',
    source: 'Thông tư 39/2016/TT-NHNN',
  },
  {
    id: 2,
    question: 'Tài sản nào sau đây KHÔNG ĐƯỢC nhận làm tài sản bảo đảm cho khoản cấp tín dụng?',
    topic: 'Tài sản Bảo đảm',
    options: [
      { id: 'A', text: 'Quyền sử dụng đất ở hợp pháp có Giấy chứng nhận' },
      { id: 'B', text: 'Sổ tiết kiệm do ngân hàng phát hành' },
      { id: 'C', text: 'Tài sản đang có tranh chấp quyền sở hữu hoặc bị kê biên thi hành án' },
      { id: 'D', text: 'Phương tiện vận tải đã đăng ký giao dịch bảo đảm' },
    ],
    correctAnswers: ['C'],
    explanation: 'Tài sản đang có tranh chấp, bị kê biên hoặc cấm chuyển nhượng không đủ điều kiện pháp lý làm tài sản bảo đảm.',
    source: 'Nghị định 21/2021/NĐ-CP & Luật Các TCTD',
  },
  {
    id: 3,
    question: 'Nhóm nợ nào sau đây được phân loại là Nợ dưới tiêu chuẩn (Nhóm 3) theo Thông tư 11/2021/TT-NHNN?',
    topic: 'Phân loại Nợ',
    options: [
      { id: 'A', text: 'Nợ quá hạn từ 10 đến 90 ngày' },
      { id: 'B', text: 'Nợ quá hạn từ 91 đến 180 ngày' },
      { id: 'C', text: 'Nợ quá hạn từ 181 đến 360 ngày' },
      { id: 'D', text: 'Nợ quá hạn trên 360 ngày' },
    ],
    correctAnswers: ['B'],
    explanation: 'Nợ nhóm 3 (Nợ dưới chuẩn) bao gồm các khoản nợ quá hạn từ 91 ngày đến 180 ngày, hoặc nợ được cơ cấu lại thời hạn trả nợ lần đầu.',
    source: 'Thông tư 11/2021/TT-NHNN',
  },
  {
    id: 4,
    question: 'Tỷ lệ an toàn vốn tối thiểu (CAR) áp dụng đối với ngân hàng thương mại theo Thông tư 41/2016/TT-NHNN (Basel II) là bao nhiêu?',
    topic: 'Quản trị Rủi ro',
    options: [
      { id: 'A', text: 'Tối thiểu 6%' },
      { id: 'B', text: 'Tối thiểu 8%' },
      { id: 'C', text: 'Tối thiểu 9%' },
      { id: 'D', text: 'Tối thiểu 10%' },
    ],
    correctAnswers: ['B'],
    explanation: 'Thông tư 41/2016/TT-NHNN quy định tỷ lệ an toàn vốn (CAR) của ngân hàng thương mại phải duy trì tối thiểu ở mức 8%.',
    source: 'Thông tư 41/2016/TT-NHNN',
  },
  {
    id: 5,
    question: 'Thẩm quyền phê duyệt cấp tín dụng đối với người có liên quan của thành viên HĐQT thuộc về cấp nào?',
    topic: 'Luật Các TCTD',
    options: [
      { id: 'A', text: 'Giám đốc Chi nhánh' },
      { id: 'B', text: 'Hội đồng Tín dụng cơ sở' },
      { id: 'C', text: 'Hội đồng Quản trị / Tổng Giám đốc theo phân quyền' },
      { id: 'D', text: 'Cán bộ quản lý rủi ro' },
    ],
    correctAnswers: ['C'],
    explanation: 'Cấp tín dụng cho các đối tượng hạn chế, người có liên quan phải do Hội đồng quản trị thông qua theo quy định của Luật Các TCTD.',
    source: 'Luật Các Tổ chức Tín dụng',
  },
];

export const QuizModule: React.FC = () => {
  const [questions, setQuestions] = useState<QuizItem[]>(DEFAULT_BANK_QUIZ);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const loadFullQuizBank = async () => {
    setLoading(true);
    try {
      const allRows: any[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('QuizQuestions')
          .select('*')
          .order('Id', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows.push(...data);
        if (data.length < step) break;
        from += step;
      }

      if (allRows.length > 0) {
        const mapped: QuizItem[] = allRows.map((q: any, idx: number) => {
          let opts: QuizOptionItem[] = [];
          if (Array.isArray(q.Options)) {
            opts = q.Options.map((opt: any, oIdx: number) => {
              if (typeof opt === 'string') {
                const id = opt.match(/^[A-Z]/) ? opt.substring(0, 1) : String.fromCharCode(65 + oIdx);
                return { id, text: opt };
              }
              return {
                id: opt.id || opt.Code || String.fromCharCode(65 + oIdx),
                text: opt.text || opt.Text || '',
              };
            });
          } else {
            opts = [
              { id: 'A', text: 'Phương án A' },
              { id: 'B', text: 'Phương án B' },
            ];
          }

          return {
            id: q.Id || idx + 1,
            question: q.QuestionText || q.Question || 'Câu hỏi nghiệp vụ ngân hàng',
            topic: q.Topic || 'Nghiệp vụ Tín dụng',
            options: opts,
            correctAnswers: Array.isArray(q.CorrectAnswers)
              ? q.CorrectAnswers
              : [q.CorrectAnswer || 'A'],
            explanation: q.Explanation || '',
            source: Array.isArray(q.Sources) ? q.Sources.join(', ') : q.Source || '',
          };
        });
        setQuestions(mapped);
      }
    } catch (err) {
      console.error('Lỗi nạp ngân hàng câu hỏi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFullQuizBank();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFullQuizBank();
  };

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase().trim();
    return questions.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.topic?.toLowerCase().includes(q) ||
        item.options.some((o) => o.text.toLowerCase().includes(q))
    );
  }, [questions, searchQuery]);

  const renderQuestionItem = ({ item, index }: { item: QuizItem; index: number }) => {
    return (
      <View style={styles.questionCard}>
        {/* Card Header Meta */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.indexText}>Câu {index + 1}</Text>
          <Text style={styles.separatorDot}>•</Text>
          <Text style={styles.topicText}>{item.topic}</Text>
        </View>

        {/* Question Text */}
        <Text style={styles.questionTitle}>{item.question}</Text>

        {/* Options List */}
        <View style={styles.optionsList}>
          {item.options.map((opt) => {
            const isCorrect = item.correctAnswers.includes(opt.id);

            return (
              <View
                key={opt.id}
                style={[
                  styles.optionItem,
                  isCorrect && styles.optionItemCorrect,
                ]}
              >
                <View
                  style={[
                    styles.optionKeyBox,
                    isCorrect && styles.optionKeyCorrect,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionKeyText,
                      isCorrect && styles.optionKeyTextCorrect,
                    ]}
                  >
                    {opt.id}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    isCorrect && styles.optionTextCorrect,
                  ]}
                >
                  {opt.text}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Search Bar */}
      <View style={styles.topControlBar}>
        <View style={styles.searchBox}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trong toàn bộ bộ đề..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải ngân hàng câu hỏi...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredQuestions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderQuestionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không tìm thấy câu hỏi phù hợp</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topControlBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  topicFilterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topicChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  topicChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  separatorDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  questionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  optionItemCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  optionKeyBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionKeyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  optionKeyCorrect: {
    backgroundColor: '#059669',
  },
  optionKeyTextCorrect: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  optionTextCorrect: {
    fontWeight: '700',
    color: '#065F46',
  },
  explanationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  explanationText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  sourceText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
});
