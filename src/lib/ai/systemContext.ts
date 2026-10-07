import type { OfficialDoc, OfficialDocFilter } from '../../types/officialDoc';
import { OFFICIAL_CATEGORIES, categoryLabel } from '../officialDoc/categories';
import { searchOfficialDocs, countByCategory, type CategoryCounts } from '../api/officialDocApi';
import { fetchCustomersAPI } from '../api/customerApi';
import { fetchHfAuth } from '../huggingface/hfConfigApi';
import type { Customer } from '../../types';

export interface SystemContextData {
  officialDocs: OfficialDoc[];
  totalOfficialDocs: number;
  docsByCategory: CategoryCounts;
  customers: Customer[];
  totalCustomers: number;
  hfConfig: {
    hasToken: boolean;
    username?: string;
  };
}

const DEFAULT_DOC_FILTER: OfficialDocFilter = {
  search: '',
  category: 'all',
  status: 'all',
  issuedFrom: '',
  issuedTo: '',
};

export interface SystemContextOptions {
  /** Tải danh sách khách hàng (nặng nhất). Chỉ bật khi câu hỏi nhắc tới khách hàng. */
  includeCustomers?: boolean;
}

const MAX_FORM_NAMES = 5;

/** Tệp của văn bản cho AI: số tệp gốc và tên các biểu mẫu (tối đa vài tên), để trả lời được "văn bản này có biểu mẫu nào". */
export function describeDocFiles(files: OfficialDoc['files'] | undefined): string {
  if (!files?.length) return 'Chưa có tệp';
  const originals = files.filter((f) => f.kind === 'goc').length;
  const forms = files.filter((f) => f.kind === 'bieu-mau');
  const parts: string[] = [];
  if (originals > 0) parts.push(`${originals} tệp gốc`);
  if (forms.length > 0) {
    const names = forms.slice(0, MAX_FORM_NAMES).map((f) => `"${f.name}"`).join(', ');
    const more = forms.length > MAX_FORM_NAMES ? ` và ${forms.length - MAX_FORM_NAMES} biểu mẫu khác` : '';
    parts.push(`${forms.length} biểu mẫu: ${names}${more}`);
  }
  return parts.join(', ');
}

/** Câu hỏi có nhắc tới khách hàng, để quyết định có tải danh sách khách hàng cho AI hay không. */
export function mentionsCustomers(question: string): boolean {
  // \b của JS không coi chữ có dấu là chữ: "không" sẽ khớp nhầm "kh"; dùng ranh giới theo chữ cái Unicode
  return /khách hàng|khach hang|(^|[^\p{L}])kh($|[^\p{L}])|cif|người vay|nguoi vay|cccd|khdn|khcn/iu.test(question);
}

/**
 * Thu thập dữ liệu nghiệp vụ thời gian thực của hệ thống CustomerManager cho AI.
 * Ba nguồn tải song song; nguồn nào lỗi thì bỏ qua riêng nguồn đó.
 */
export async function fetchSystemContextData(options: SystemContextOptions = {}): Promise<SystemContextData> {
  const { includeCustomers = true } = options;

  const [docsRes, customers, hasToken] = await Promise.all([
    Promise.all([searchOfficialDocs(DEFAULT_DOC_FILTER, 1), countByCategory(DEFAULT_DOC_FILTER)]).catch((err) => {
      console.warn('Không thể nạp danh sách văn thư cho AI context:', err);
      return null;
    }),
    includeCustomers ? fetchCustomersAPI().catch(() => [] as Customer[]) : Promise.resolve([] as Customer[]),
    fetchHfAuth().then((auth) => ({ hasToken: Boolean(auth?.token), username: auth?.username })).catch(() => ({ hasToken: false, username: undefined })),
  ]);

  const officialDocs: OfficialDoc[] = docsRes?.[0].docs ?? [];
  const docsByCategory: CategoryCounts = docsRes?.[1] ?? { all: 0, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 };

  return {
    officialDocs,
    totalOfficialDocs: docsByCategory.all || officialDocs.length,
    docsByCategory,
    customers,
    totalCustomers: customers.length,
    hfConfig: hasToken,
  };
}

/**
 * Định dạng dữ liệu hệ thống thành chuỗi văn bản Markdown làm System Context cho Gemini AI
 */
export function formatSystemContextPrompt(data: SystemContextData): string {
  const lines: string[] = [];

  lines.push('=== [DỮ LIỆU NỘI BỘ HỆ THỐNG CUSTOMERMANAGER] ===');
  lines.push('(Lưu ý: Chỉ sử dụng dữ liệu của đúng phân hệ người dùng đang hỏi. Tuyệt đối không nhắc đến kho lưu trữ hoặc token nếu người dùng hỏi về văn thư).');
  lines.push('');

  // 1. VĂN THƯ
  lines.push(`## 1. PHÂN HỆ VĂN THƯ (Tổng cộng: ${data.totalOfficialDocs} văn bản):`);
  if (data.totalOfficialDocs === 0) {
    lines.push('- Hiện chưa có văn bản nào được lưu trữ.');
  } else {
    lines.push('Phân loại theo danh mục:');
    OFFICIAL_CATEGORIES.forEach((c) => {
      const count = data.docsByCategory[c.id] || 0;
      lines.push(`- ${c.label}: ${count} văn bản`);
    });

    lines.push('\nDanh mục các văn bản hiện có:');
    data.officialDocs.forEach((doc, idx) => {
      const catText = categoryLabel(doc.category);
      const docNum = doc.docNumber ? `Số hiệu: "${doc.docNumber}"` : 'Chưa có số hiệu';
      const issued = doc.issuedDate ? `Ngày ban hành: ${doc.issuedDate}` : '';
      const filesCount = describeDocFiles(doc.files);

      const meta = [docNum, `Mục: ${catText}`, issued, filesCount].filter(Boolean).join(' | ');
      lines.push(`${idx + 1}. "${doc.title}" [${meta}]`);
    });
  }
  lines.push('');

  // 2. KHO LƯU TRỮ CÁ NHÂN
  lines.push('## 2. PHÂN HỆ KHO LƯU TRỮ CÁ NHÂN:');
  lines.push(`- Trạng thái kết nối Access Token: ${data.hfConfig.hasToken ? `Đã kết nối (User: ${data.hfConfig.username || 'System'})` : 'Chưa cấu hình Token'}`);
  lines.push('');

  // 3. KHÁCH HÀNG
  lines.push(`## 3. PHÂN HỆ KHÁCH HÀNG (Tổng cộng: ${data.totalCustomers} khách hàng):`);
  if (data.totalCustomers === 0) {
    lines.push('- Danh sách khách hàng hiện đang trống.');
  } else {
    const previewList = data.customers.slice(0, 50);
    previewList.forEach((c, idx) => {
      const cifStr = c.CifKh ? `CIF: ${c.CifKh}` : '';
      const ccStr = c.NationalId ? `CCCD: ${c.NationalId}` : '';
      const phStr = c.Phone ? `SĐT: ${c.Phone}` : '';
      const info = [cifStr, ccStr, phStr].filter(Boolean).join(', ');
      lines.push(`${idx + 1}. ${c.FullName} (${info || 'Chưa có thông tin định danh'})`);
    });
    if (data.totalCustomers > 50) {
      lines.push(`... và ${data.totalCustomers - 50} khách hàng khác.`);
    }
  }
  lines.push('=== [HẾT DỮ LIỆU HỆ THỐNG] ===');

  return lines.join('\n');
}

/**
 * Trả lời trực tiếp các câu hỏi tra cứu dữ liệu hệ thống (dùng khi offline hoặc fallback)
 */
export function buildDirectSystemDataResponse(query: string, data: SystemContextData): string | null {
  const q = query.toLowerCase().trim();

  // Kiểm tra câu hỏi về số lượng / danh sách văn thư
  const isAskingDispatches =
    q.includes('văn thư') ||
    q.includes('công văn') ||
    q.includes('văn bản') ||
    q.includes('hợp đồng') ||
    q.includes('tờ trình');

  const isAskingCount =
    q.includes('bao nhiêu') ||
    q.includes('có mấy') ||
    q.includes('thống kê') ||
    q.includes('danh sách') ||
    q.includes('liệt kê') ||
    q.includes('hiện có') ||
    q.includes('tổng số');

  if (isAskingDispatches && isAskingCount) {
    if (data.totalOfficialDocs === 0) {
      return 'Hiện tại trong hệ thống chưa có văn bản nào.';
    }

    let response = `Hiện tại trong hệ thống đang quản lý tổng cộng **${data.totalOfficialDocs} văn bản**.\n\n`;

    response += `| STT | Danh mục | Số lượng |\n| :---: | :--- | :---: |\n`;
    OFFICIAL_CATEGORIES.forEach((c, idx) => {
      const count = data.docsByCategory[c.id] || 0;
      response += `| ${idx + 1} | **${c.label}** | **${count}** |\n`;
    });

    if (data.officialDocs.length > 0) {
      response += `\n| STT | Số hiệu | Tiêu đề | Danh mục | Ngày ban hành | Số tệp |\n`;
      response += `| :---: | :--- | :--- | :--- | :---: | :---: |\n`;

      data.officialDocs.forEach((doc, idx) => {
        const cat = categoryLabel(doc.category);
        const num = doc.docNumber || '-';
        const title = doc.title || '-';
        const date = doc.issuedDate || '-';
        const files = doc.files?.length || 0;
        response += `| ${idx + 1} | ${num} | ${title} | ${cat} | ${date} | ${files} |\n`;
      });
    }

    return response;
  }

  // Kiểm tra câu hỏi về số lượng / danh sách khách hàng
  const isAskingCustomers =
    q.includes('khách hàng') ||
    q.includes('cif') ||
    q.includes('người vay') ||
    q.includes('danh sách kh');

  if (isAskingCustomers && isAskingCount) {
    if (data.totalCustomers === 0) {
      return 'Hiện tại trong hệ thống chưa có khách hàng nào.';
    }

    let response = `Hiện tại trong hệ thống đang quản lý tổng cộng **${data.totalCustomers} khách hàng**.\n\n`;
    response += `| STT | Họ và tên | Mã CIF | CCCD / ĐKKD | Số điện thoại |\n`;
    response += `| :---: | :--- | :---: | :---: | :---: |\n`;

    data.customers.slice(0, 20).forEach((c, idx) => {
      response += `| ${idx + 1} | **${c.FullName}** | ${c.CifKh || '-'} | ${c.NationalId || '-'} | ${c.Phone || '-'} |\n`;
    });

    if (data.totalCustomers > 20) {
      response += `\n*(Và còn ${data.totalCustomers - 20} khách hàng khác)*\n`;
    }

    return response;
  }

  return null;
}
