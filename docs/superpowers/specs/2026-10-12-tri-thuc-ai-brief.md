# Giao việc: kho tri thức cho AI CustomerManager

Viết cho phiên Claude Code mở tại `D:\CustomerManager`. Bản này chỉ nêu mục tiêu, hiện
trạng đo được và bài học từ bản đã chạy ở repo khác — **chưa phải spec**. Bước đầu của
phiên mới là brainstorm rồi viết spec, không phải code ngay.

## Người dùng muốn gì

AI trong CustomerManager hiện chỉ biết dữ liệu (văn bản pháp quy, khách hàng, báo cáo
tài chính). Hỏi nó "trang X dùng thế nào", "quy trình Y ra sao", "vì sao số này lệch" thì
nó không biết, vì không ai mô tả hệ thống cho nó.

Mục tiêu: AI bao quát **toàn bộ** hệ thống — mọi trang, mọi quy trình nghiệp vụ, mọi cái
bẫy đã gặp — giống bản vừa làm xong cho web admin Felix.

## Đã có gì ở đây (đo lại 12/10/2026)

- `src/`: 971 tệp `.ts`/`.tsx`, 156.415 dòng, gồm cả test. Bỏ test còn 635 tệp, 108.245 dòng.
  (Bản trước của brief ghi 65.600 dòng — sai.)
- `src/components/` có 27 nhóm thư mục (chưa tính `__tests__`): admin, ai, businessPlan,
  calculator, card, collateral, common, corporateFinancial, creditContract, customer,
  customers, dashboard, dispatch, documents, hub, inventory, mdsdv, mortgage, portfolio,
  quiz, rate, reports, shopping, storage, ui, users, views. Ngoài ra `src/components/views/`
  có 35 màn hình.
- **Bản đồ trang nằm ở `src/lib/navigation.ts` và `src/lib/routes.ts`.** `ScreenId` có 29 giá
  trị (`ROUTE_OF` phủ đủ 29), nhưng `NAV_GROUPS` chỉ liệt kê 18; 11 trang còn lại (disbursement,
  corporate-financial, shopping-checklist, purchase-statement, retail-invoice, cof, reports,
  mdsdv, card-policies, templates, quiz-bank) chỉ vào được qua Hub (`HUB_SUBROUTES`,
  `src/lib/hubTasks.ts`). Khu quản trị có thêm `ADMIN_NAV` (4 mục) ở `src/lib/adminNav.ts`.
  **Nguồn chuẩn cho test gác phải là `ScreenId`/`ROUTE_OF`, không phải `NAV_GROUPS`.**
- `src/lib/ai/` (18 tệp, 1944 dòng, chưa tính `__tests__`): `geminiClient.ts` (có
  `SYSTEM_INSTRUCTION` ở dòng 64), `systemContext.ts` (nạp văn bản pháp quy + khách hàng +
  báo cáo tài chính theo nhu cầu), `docRetrieval.ts`, `docContext.ts`, `answerCache.ts`.
- `systemContext.ts` **đã** dò từ khoá để quyết định nạp gì: `mentionsCustomers` quyết định có
  tải danh sách khách hàng hay không, cờ `includeFinancials` làm tương tự cho tài chính.
  Cách "dò từ khoá rồi nạp sẵn" đã có tiền lệ trong repo.
- **Chưa có function calling.** `geminiClient.ts` không khai báo `tools` — AI chỉ nhận
  ngữ cảnh dựng sẵn (ghép vào `system_instruction`) rồi trả lời.
- AI gọi thẳng `streamGenerateContent?alt=sse` của Gemini **từ trình duyệt**; khoá API lấy từ
  `localStorage` (`cm_gemini_api_key`) hoặc cấu hình build.

## Bản tham chiếu đã chạy: `D:\Felix Platform\felix-admin`

Xem trực tiếp các tệp này để lấy mẫu, đừng dựng lại từ đầu (đã kiểm tra đủ các tệp tồn tại):

| Việc | Tệp |
|---|---|
| 20 tệp tri thức | `src/lib/ai/triThuc/noi-dung/*.md` |
| Đọc và tra tri thức (thuần, có test) | `src/lib/ai/triThuc/phanTichTriThuc.ts` |
| Nạp từ đĩa, cache | `src/lib/ai/triThuc/khoTriThuc.ts` |
| Công cụ cho model gọi | `src/lib/ai/tools/read/heThong.ts` (`traCuuHeThong`) |
| Bản đồ trang từ menu | `src/lib/layout/menuAdmin.ts` |
| Test gác | `src/tests/ai/triThucGac.test.ts` |

Định dạng mỗi tệp tri thức:

```markdown
---
id: catalog-studio
tieuDe: Catalog Studio (Phân hệ Catalog)
moTa: Kho → danh mục → nhóm → file; lưu, xung đột 409/412
tuKhoa: [catalog, danh mục, nhóm, file iso, thêm file, xung đột]
trang: [/catalog]
---
# nội dung…
```

## Bài học đã trả giá ở bản trước

- **Bản đồ nhét vào prompt phải nhỏ.** Liệt kê từng trang một dòng thì vượt 2 KB khi mới
  có nửa số chủ đề. Phải gộp trang theo nhóm; giới hạn chốt ở 3 KB.
- **Mỗi tệp tri thức ≤ 3,5 KB.** Dài hơn thì một lần tra đã chiếm hết chỗ của câu hỏi.
- **Tra chủ đề phải khớp trọn dãy từ, và giữ dấu tiếng Việt.** Bản đầu khớp chuỗi con nên
  "kho" khớp "không"; bỏ dấu để so thì "gói" lẫn với "gọi", "nhãn" lẫn "nhắn". Cách đúng:
  câu hỏi có dấu thì so có dấu, chỉ câu gõ không dấu mới so ở dạng bỏ dấu. (`mentionsCustomers`
  trong repo này đã dính đúng bẫy `\b` với chữ có dấu và phải dùng ranh giới theo chữ cái Unicode.)
- **Notepad lưu kèm BOM** làm hỏng việc đọc phần đầu `---` và cả kho chết theo.
- **Tri thức trôi khỏi mã rất nhanh.** Viết xong phải đối chiếu lại với mã: bản trước có
  5 chỗ sai ngay trong tuần đầu (mô tả cache sai, nút không tồn tại, nguồn dữ liệu sai).
  Mỗi câu mô tả hành vi phải chỉ ra được tệp nào trong `src/` nói thế. Skill `tin-dung` ở repo
  này cũng đã trôi (cập nhật 7/9, sau đó thêm hàng chục commit) nên **không chép từ skill mà
  không kiểm lại bằng `src/`**.
- **Test gác là thứ giữ cho nó không mục**: mọi trang trong menu phải có tri thức; không
  tệp nào vượt kích thước; không chứa chuỗi trông như bí mật.

## Khác biệt kiến trúc phải giải quyết

Felix admin là Next.js, AI chạy ở máy chủ nên đọc tệp `.md` từ đĩa. **CustomerManager là
Vite SPA và AI chạy trong trình duyệt** — không có `fs`. Hướng khả dĩ: `import.meta.glob`
với hậu tố `?raw` để Vite gói sẵn nội dung vào bundle (repo chưa dùng `import.meta.glob`
ở đâu). Cần cân nhắc:

- Gói 20–30 tệp `.md` vào bundle làm nặng lần tải đầu, nên có thể phải tải lười theo chủ đề.
  `App.tsx` đã tải lười từng màn hình bằng `React.lazy`; `import.meta.glob` không có `eager`
  cũng cho ra từng tệp một chunk riêng.
- **Mọi thứ trong bundle đều công khai.** Tri thức phải mô tả cách dùng và quy trình, không chứa
  khoá, địa chỉ nội bộ hay dữ liệu khách hàng thật. Test gác về chuỗi giống bí mật càng cần.

Và vì chưa có function calling, phải chọn: thêm `tools` cho Gemini (model tự gọi khi cần,
giống admin), hay dò từ khoá trong câu hỏi rồi nạp sẵn chủ đề vào ngữ cảnh (đơn giản hơn,
hợp với cách `systemContext.ts` đang làm). Chọn `tools` thì vòng lặp stream trong
`geminiClient.ts` phải xử lý thêm lượt `functionCall` rồi gọi lại model, trong khi hiện nó
chỉ đọc luồng SSE thành chữ. Đây là quyết định đầu tiên cần chốt với người dùng.

## Việc đầu tiên của phiên mới

1. Đọc `AGENTS.md` và `.agents/rules/truoc-khi-code.md` của repo này, điền mẫu brief trong đó
   — bắt buộc trước khi gõ mã.
2. Nạp skill `tin-dung` (nguồn duy nhất: `D:\agent-kit\skills\tin-dung`) để hiểu nghiệp vụ trước
   khi mô tả nó, rồi đối chiếu từng điều với `src/`.
3. Brainstorm: chốt cách nạp tri thức (tool hay nạp sẵn), chốt danh sách phân hệ cần viết
   (xuất phát từ `NAV_GROUPS`).
4. Viết spec vào `docs/superpowers/specs/` (thư mục repo này đang dùng; kế hoạch vào
   `docs/superpowers/plans/`), rồi mới tới kế hoạch và thực thi.
5. Xong và đã kiểm chứng thì ghi một mục vào `docs/progress/2026-10.md` theo khuôn ở
   `docs/progress/README.md`, trước khi commit.
