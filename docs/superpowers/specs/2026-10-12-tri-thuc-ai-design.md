# Kho tri thức hệ thống cho AI — thiết kế

Nguồn đầu bài: [2026-10-12-tri-thuc-ai-brief.md](./2026-10-12-tri-thuc-ai-brief.md). Bản này là kết quả brainstorm với người dùng ngày 12/10/2026.

## Đã chốt với người dùng

1. AI lấy tri thức bằng **function calling**: model tự gọi công cụ `traCuuHeThong` khi cần.
2. Phạm vi: **hạ tầng + mọi trang**, nội dung viết theo đợt. Đợt 1 là hạ tầng cùng 4 chủ đề mẫu: lãi và lịch trả nợ, nhóm nợ, TSĐB + LTV, kho lưu trữ.
3. Vòng lặp gọi công cụ là **module thuần riêng**; `geminiClient.ts` chỉ làm một lượt gọi.

## Mục tiêu

Cán bộ hỏi AI "trang X dùng thế nào", "quy trình Y ra sao", "vì sao số này lệch" thì AI trả lời đúng theo mã đang chạy, không bịa. Công cụ chỉ tra tri thức tĩnh; không tra dữ liệu khách hàng (luồng `systemContext` giữ nguyên).

## Phạm vi

LÀM
- Kho tri thức (tệp `.md` + trình đọc/tra) và công cụ `traCuuHeThong`.
- Vòng lặp gọi công cụ, nối vào `streamGeminiContent` mà không đổi chữ ký hàm.
- Bản đồ trang trong system prompt (≤ 3 KB), sinh từ dữ liệu, không viết tay.
- Test gác.
- Đợt 1: 4 chủ đề nghiệp vụ.

KHÔNG LÀM
- Công cụ tra dữ liệu thật (khách hàng, khoản vay) và công cụ ghi.
- Đường dự phòng riêng cho câu hỏi cách dùng khi Gemini lỗi (đường dự phòng số liệu hiện có giữ nguyên).
- Viết nội dung cho các chủ đề ngoài đợt 1 (xem "Các đợt sau").
- Đổi giao diện chat.

## Kiến trúc

| Khối | Tầng | Việc duy nhất |
|---|---|---|
| `src/lib/ai/triThuc/phanTichTriThuc.ts` | lib, thuần | Đọc frontmatter (bỏ BOM), tra chủ đề, dựng bản đồ trang |
| `src/lib/ai/triThuc/khoTriThuc.ts` | hạ tầng | `import.meta.glob('./noi-dung/*.md', { query: '?raw', import: 'default' })` không eager; tải tất cả ở câu hỏi AI đầu tiên rồi cache |
| `src/lib/ai/triThuc/noi-dung/*.md` | dữ liệu | Mỗi tệp một chủ đề |
| `src/lib/ai/tools/traCuuHeThong.ts` | lib | Khai báo công cụ và hàm chạy |
| `src/lib/ai/toolLoop.ts` | lib, thuần | Vòng lặp lượt gọi, nhận hàm "mở một lượt" và bảng công cụ |
| `src/lib/ai/geminiClient.ts` | hạ tầng | Thêm `tools` vào payload; mở một lượt trả về chữ hoặc `functionCall`; chữ ký `streamGeminiContent` giữ nguyên |

Phụ thuộc đi một chiều: `geminiClient` → `toolLoop` → `traCuuHeThong` → `phanTichTriThuc`; `khoTriThuc` chỉ được nối vào ở nơi lắp ráp (`geminiClient`).

Chạm thêm hai nơi nhỏ ngoài bảng trên: `StreamExtras` có thêm `onToolUse` (báo đã dùng công cụ) và `tools` (đặt `false` để tắt công cụ cho lời gọi cần đầu ra thuần như `summarizeDocumentWithAi`); `useAiAssistant.ts` dùng `onToolUse` để không lưu câu trả lời vào bộ nhớ dùng chung.

### Tệp tri thức

```markdown
---
id: lai-lich-tra-no
tieuDe: Lãi và lịch trả nợ
moTa: Cách tính lãi, lịch trả gốc lãi, vì sao tổng gốc lệch
tuKhoa: [lãi, lịch trả nợ, gốc, kỳ trả, dư nợ giảm dần]
trang: [/tools/calculators, /loans]
nguon: [src/lib/loanMath.ts, src/lib/calcMath.ts]
---
# nội dung…
```

- `trang` là đường dẫn trong `ROUTE_OF` (cùng đường dẫn quản trị trong `ADMIN_NAV`).
- `nguon` là các tệp trong `src/` mà nội dung dựa vào. Mỗi câu mô tả hành vi phải đối chiếu được với các tệp này.
- Giới hạn: mỗi tệp ≤ 3,5 KB; chỉ nội dung cách dùng và quy trình, không khóa, địa chỉ nội bộ hay dữ liệu khách hàng thật (mọi thứ trong bundle đều công khai).

### Tra chủ đề (`phanTichTriThuc`)

- Khớp theo **id trước**; không có thì khớp **trọn dãy từ** trong `tieuDe`/`tuKhoa`, không khớp chuỗi con.
- Câu có dấu thì so có dấu; chỉ câu gõ không dấu mới so ở dạng bỏ dấu. Ranh giới từ theo chữ cái Unicode, không dùng `\b`.
- Trả tối đa 2 chủ đề. Không khớp thì trả danh sách id gần nhất, không trả rỗng.

### Công cụ `traCuuHeThong`

- Tham số `chuDe` (chuỗi, tùy chọn). Không có `chuDe`: trả danh sách id + `moTa`. Có `chuDe`: trả nội dung chủ đề khớp.
- System prompt chứa bản đồ chủ đề gộp theo nhóm (≤ 3 KB), sinh từ trường `nhom` và `tieuDe` trong frontmatter của các tệp tri thức (không viết tay, không lặp danh sách trang), cùng một đoạn chỉ dẫn gọi công cụ khi hỏi cách dùng hệ thống và không bịa khi công cụ không có. Độ phủ trang do test gác bảo đảm, không do bản đồ.
- Không khớp chủ đề nào thì công cụ trả toàn bộ danh sách chủ đề (vài trăm byte), không tính "gần nhất".

### Vòng lặp (`toolLoop`)

- Một lượt trả luồng sự kiện: chữ, hoặc `functionCall`. Gặp `functionCall` thì chạy công cụ, thêm kết quả vào lượt sau, tối đa **2 lượt công cụ** rồi bắt buộc trả lời bằng chữ.
- Giữ nguyên `parts` của model (kể cả `thoughtSignature`) khi gửi lại; không dựng lại từ chữ.
- Chọn model dự phòng chỉ ở lượt đầu. Các lượt sau dùng đúng model của lượt đầu; lượt sau lỗi thì báo lỗi như thường, không đổi model giữa chừng.
- Công cụ ném lỗi thì trả cho model một kết quả lỗi có thông điệp, để model nói thật là không tra được.

### Bộ nhớ dùng chung (`answerCache`)

Câu trả lời có gọi công cụ **không** được lưu. `isCacheValid` chỉ từ chối bản ghi không có văn bản nguồn, nên chưa đủ: câu hỏi vừa khớp văn bản vừa gọi công cụ vẫn bị lưu, rồi tri thức đổi mà bản lưu còn sống tới 30 ngày. Vì vậy `geminiClient` báo qua `onToolUse` và `useAiAssistant` bỏ qua bước lưu. Hệ quả: câu hỏi cách dùng luôn tốn một lượt gọi Gemini.

## Test gác (`src/lib/ai/__tests__/triThucGac.test.ts`)

- Mọi đường dẫn trong `ROUTE_OF` và `ADMIN_NAV` phải được ít nhất một chủ đề phủ. Nguồn chuẩn là `ROUTE_OF`, **không phải `NAV_GROUPS`** (menu chỉ có 18 trong 29 trang).
- Danh sách `CHUA_VIET` trong test liệt kê các đường dẫn tạm chưa phủ. Test lỗi khi đường dẫn **ngoài** danh sách mà chưa được phủ, và lỗi khi đường dẫn **trong** danh sách đã được phủ (buộc xóa khỏi danh sách). Nhờ đó danh sách chỉ giảm.
- Mỗi tệp ≤ 3,5 KB; bản đồ ≤ 3 KB; không BOM; đủ trường frontmatter; `id` không trùng.
- Mỗi tệp trong `nguon` phải tồn tại trong `src/`.
- Không chuỗi giống bí mật (khóa API, token, JWT, URL có thông tin đăng nhập).

## Các đợt

- **Đợt 1** (spec này): hạ tầng + `lai-lich-tra-no`, `nhom-no`, `tsbd-ltv`, `kho-luu-tru`.
- **Các đợt sau** (mỗi đợt một kế hoạch ngắn, theo nhóm): hồ sơ tín dụng (khách hàng, hợp đồng tín dụng, khoản vay/KUNN, hợp đồng thế chấp, thẻ, giải ngân); chào lãi suất và COF, kiểm soát sau vay; doanh nghiệp (phương án kinh doanh, BCTC, hàng tồn kho); chứng từ (dự toán, bảng kê, hóa đơn); tra cứu và biểu mẫu (mục đích SDV, chính sách thẻ, biểu mẫu, ôn tập); hệ thống (tổng quan + Hub, văn thư, báo cáo/Excel, quản trị + phân quyền).

## Tầng và tệp dự kiến chạm (đợt 1)

Tầng: lib (thuần) + hạ tầng (`khoTriThuc`, `geminiClient`). Không đổi `src/components`, `src/hooks`, schema hay migration.

Tệp mới: `phanTichTriThuc.ts`, `khoTriThuc.ts`, `traCuuHeThong.ts`, `toolLoop.ts`, 4 tệp `.md`, các test tương ứng. Sửa: `geminiClient.ts` (payload và mở một lượt). Hơn 5 tệp nhưng mỗi tệp một việc; nếu kế hoạch thấy nặng thì tách thành hạ tầng trước, nội dung sau.

## Kiểm chứng

- Test thuần: trình đọc (BOM, frontmatter thiếu), tra chủ đề (khớp trọn dãy, có dấu/không dấu, "kho" không khớp "không", "gói" không lẫn "gọi"), vòng lặp bằng luồng giả (không gọi công cụ, một lần, hai lần chạm trần, công cụ lỗi, giữ nguyên `parts`), test gác.
- `npm test` và `npm run build` xanh; xem `dist` thấy các tệp tri thức thành chunk riêng, chunk vào đầu không phình.
- **Kiểm bằng Gemini thật** (cần khóa API của người dùng): hỏi một câu cách dùng cho mỗi chủ đề đợt 1, xác nhận AI gọi công cụ và trả lời đúng; xác nhận lượt gửi kết quả công cụ không bị lỗi 400. Chưa làm được nếu không có khóa.
- Mỗi chủ đề viết xong phải đối chiếu từng câu với `nguon` trước khi coi là xong.

## Rủi ro đã biết

- **`thoughtSignature` (chưa xác nhận):** các model trong mã là họ Gemini 3.x. Tài liệu Google mình đọc chỉ nêu Interactions API ("gửi lại nguyên các bước như nhận"), không nêu quy tắc hay lỗi cho `generateContent` có `functionCall`. Phòng ngừa: giữ nguyên `parts`; xác nhận bằng cuộc gọi thật ở đợt 1. Nếu sai thì lượt hai lỗi 400, nên phải phát hiện trước khi bật cho người dùng.
- **Tri thức trôi khỏi mã:** giảm bằng `nguon` + test tồn tại tệp, nhưng không bắt được câu mô tả sai. Chỉ đối chiếu thủ công, và mỗi lần đổi hành vi trang phải sửa chủ đề tương ứng.
- **Tải lần đầu:** hỏi AI lần đầu tải toàn bộ tệp tri thức (tối đa khoảng 24 × 3,5 KB trước nén); chấp nhận được, không ảnh hưởng tải trang.
- **Model không gọi công cụ** khi nên gọi, hoặc gọi sai chủ đề: giảm bằng bản đồ trang trong prompt và danh sách gần nhất khi không khớp; không loại trừ hoàn toàn.
- **Skill `tin-dung` đã trôi** so với mã: không chép từ skill khi chưa đối chiếu `src/`.
