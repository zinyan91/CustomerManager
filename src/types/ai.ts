export interface AiAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  /** Bảng tính đã đổi thành chữ (CSV theo sheet) để AI đọc; khi có thì không dùng base64Data. */
  textData?: string;
  previewUrl?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachedDocumentId?: string;
  attachedDocumentTitle?: string;
  /** Trả lời lấy từ bộ nhớ dùng chung (người khác đã hỏi), không đọc lại văn bản. */
  fromCache?: boolean;
  attachments?: AiAttachment[];
}

export interface AiThreadSummary {
  id: string;
  title: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiThread {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface StarterPrompt {
  title: string;
  badge: string;
  prompt: string;
}

export const BANKING_STARTER_PROMPTS: StarterPrompt[] = [
  {
    title: 'Thống kê toàn bộ văn thư hệ thống',
    badge: 'Kho văn thư',
    prompt: 'Hiện tại trong hệ thống có bao nhiêu văn thư? Hãy thống kê chi tiết số lượng theo loại hình và lập danh mục cụ thể.',
  },
  {
    title: 'Tổng quan danh sách khách hàng',
    badge: 'Khách hàng',
    prompt: 'Thống kê tổng số khách hàng hiện có trong hệ thống và danh sách thông tin cơ bản.',
  },
  {
    title: 'Quy định phân loại nợ & trích lập dự phòng',
    badge: 'TT 11/2021',
    prompt: 'Tóm tắt các tiêu chí phân loại nợ từ Nhóm 1 đến Nhóm 5 theo Thông tư 11/2021/TT-NHNN và tỷ lệ trích lập dự phòng cụ thể tương ứng.',
  },
  {
    title: 'Kiểm tra tỷ lệ LTV & định giá tài sản',
    badge: 'TSĐB & LTV',
    prompt: 'Hướng dẫn cách tính tỷ lệ LTV (Loan-To-Value) tối đa theo quy chuẩn đối với tài sản bảo đảm là Bất động sản và Giấy tờ có giá.',
  },
  {
    title: 'Tóm tắt văn bản / công văn mới',
    badge: 'Văn thư AI',
    prompt: 'Tôi muốn nhờ bạn phân tích và tóm tắt một văn bản/hồ sơ tín dụng. Hãy hướng dẫn tôi cách đính kèm văn thư để bạn xử lý.',
  },
  {
    title: 'Soạn thảo điều khoản hợp đồng tín dụng',
    badge: 'Soạn thảo',
    prompt: 'Soạn thảo mẫu điều khoản cam kết mục đích sử dụng vốn và nghĩa vụ cung cấp chứng từ sau giải ngân cho khách hàng cá nhân.',
  },
  {
    title: 'So sánh phương thức trả nợ gốc đều vs niên kim',
    badge: 'Tính toán',
    prompt: 'Phân tích ưu nhược điểm giữa phương thức trả nợ Gốc đều định kỳ và Niên kim cố định (Gốc + Lãi bằng nhau mỗi kỳ) đối với dòng tiền người vay.',
  },
  {
    title: 'Hồ sơ pháp lý cần có khi mở tài khoản KH doanh nghiệp',
    badge: 'Pháp lý KHDN',
    prompt: 'Liệt kê danh mục hồ sơ pháp lý bắt buộc cần thu thập khi thẩm định khách hàng doanh nghiệp vay vốn ngắn hạn bổ sung vốn lưu động.',
  },
];

export const FINANCIAL_STARTER_PROMPTS: StarterPrompt[] = [
  {
    title: 'Phân tích sức khỏe tài chính & khả năng trả nợ',
    badge: 'Sức khỏe BCTC',
    prompt: 'Phân tích tổng thể sức khỏe tài chính và khả năng trả nợ của doanh nghiệp dựa trên số liệu BCTC đang mở trên màn hình.',
  },
  {
    title: 'Đọc sao kê tài khoản & Phân tích dòng tiền',
    badge: 'Sao kê & Dòng tiền',
    prompt: 'Hướng dẫn đọc và phân tích sao kê tài khoản ngân hàng của doanh nghiệp: bóc tách doanh số ghi có, ghi nợ, dòng tiền thuần, phát hiện dòng tiền đảo lòng vòng và rút tiền mặt bất thường.',
  },
  {
    title: 'Tam giác đối soát BCTC - Sao kê - Thuế',
    badge: 'Đối soát 3 bên',
    prompt: 'Cách đối chiếu tam giác giữa Doanh thu BCTC (B02) với Doanh số ghi có trên sao kê ngân hàng và Tờ khai thuế GTGT để nhận diện doanh thu thực tế và cảnh báo doanh thu ảo.',
  },
  {
    title: 'Thẩm định hạn mức vốn lưu động theo TT 39',
    badge: 'Hạn mức TT 39',
    prompt: 'Phương pháp xác định nhu cầu vốn lưu động ròng, chu kỳ ngân quỹ (CCC) và tính toán hạn mức tín dụng ngắn hạn tối đa cho doanh nghiệp theo Thông tư 39/2016/TT-NHNN.',
  },
  {
    title: 'Đánh giá biên lợi nhuận & đặc thù ngành',
    badge: 'Hiệu quả & Ngành',
    prompt: 'Đánh giá biên lợi nhuận gộp, biên ròng, ROA, ROE và vòng quay vốn theo đặc thù ngành kinh doanh (sản xuất, thương mại, xây dựng, nông sản, xuất nhập khẩu).',
  },
  {
    title: 'Stress-test kịch bản rủi ro & Cảnh báo sớm',
    badge: 'Stress-test & Rủi ro',
    prompt: 'Thực hiện stress-test khả năng trả nợ khi doanh thu giảm 20% hoặc lãi suất tăng 2%/năm; chỉ ra các dấu hiệu cảnh báo sớm rủi ro tín dụng của doanh nghiệp.',
  },
];
