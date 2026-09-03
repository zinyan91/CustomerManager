---
description: Quy chuẩn kiến trúc Dual Storage kết hợp Supabase (Database, Auth, RLS, Metadata) song song cùng Cloudflare R2 (Object Storage, Zero Egress Fees, CDN Assets, File lớn).
---

# Kiến Trúc Lưu Trữ Kép: Supabase + Cloudflare R2

Hệ thống CustomerManager áp dụng mô hình kiến trúc lưu trữ song song giữa **Supabase** và **Cloudflare R2** để tối ưu hóa hiệu năng, độ tin cậy và chi phí vận hành:

```
┌─────────────────────────────────────────────────────────────┐
│                       CUSTOMER MANAGER                      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       (Metadata & Auth)               (Binary Files & CDN)
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│          SUPABASE           │ │        CLOUDFLARE R2        │
│  - PostgreSQL Database      │ │  - Object Storage (S3 API)  │
│  - User Auth & Session      │ │  - 0 USD Egress Bandwidth   │
│  - Row Level Security (RLS) │ │  - Global Edge CDN          │
│  - Table metadata:          │ │  - High Capacity & Low Cost │
│    • file_key, file_url     │ │  - Chứa:                    │
│    • file_name, file_size   │ │    • Ảnh chụp TSĐB          │
│    • mime_type, checksum    │ │    • Hồ sơ pháp lý PDF/Docx │
│    • owner_id, permissions  │ │    • File xuất Excel/Báo cáo│
└─────────────────────────────┘ └─────────────────────────────┘
```

## 1. Phân định vai trò (Separation of Storage Concerns)

### A. Supabase (Data Layer & Security Engine)
- **Cơ sở dữ liệu quan hệ (PostgreSQL):** Quản lý hồ sơ khách hàng, hợp đồng, khoản vay, định giá TSĐB, dự toán vật dụng, lịch thu nợ.
- **Bảo mật & Quyền truy cập (Auth & RLS):** Xác thực người dùng, phân quyền vai trò (`banker`, `admin`) và chính sách RLS theo từng chi nhánh/người phụ trách.
- **Bảng Metadata lưu trữ:** Lưu các bản ghi quản lý tệp tin:
  - `id`, `bucket`, `object_key`, `public_url` / `custom_domain_url`
  - `file_name`, `mime_type`, `file_size_bytes`
  - `entity_type` (`customer`, `contract`, `collateral`, `shopping_preset`...)
  - `entity_id`, `uploaded_by`, `created_at`

### B. Cloudflare R2 (Binary Assets & Unmetered Egress Storage)
- **Zero Egress Fees:** Không tính phí băng thông tải về (khác với Supabase Storage có hạn mức băng thông và tính phí phát sinh khi vượt ngạch).
- **Tài sản nhị phân lớn & Tần suất truy cập cao:**
  - Hình ảnh thẩm định Tài sản bảo đảm (TSĐB: bất động sản, xe cộ, máy móc thiết bị).
  - Tệp scan giấy tờ pháp lý (CCCD, Sổ đỏ/Sổ hồng, ĐKKD).
  - Tệp mẫu biểu hợp đồng DOCX/PDF kích thước lớn.
  - File xuất dự toán mua sắm, bảng kê, hóa đơn bán lẻ, sao kê tài chính.
- **Cơ chế tải lên:**
  - Client yêu cầu Presigned Upload URL qua API/Worker $\rightarrow$ Upload trực tiếp lên Cloudflare R2 (không nghẽn server) $\rightarrow$ Ghi metadata vào Supabase.

---

## 2. Nguyên tắc triển khai trong Codebase
1. **Không lưu Blob/Base64 trực tiếp vào cột PostgreSQL của Supabase** (tránh phình dung lượng database và chậm truy vấn).
2. **Sử dụng URL / Object Key tham chiếu:** Các bảng trong Supabase chỉ giữ đường dẫn hoặc `r2_key`.
3. **Fallback linh hoạt:** Khi môi trường chưa có cấu hình R2 (chạy local/offline), hỗ trợ fallback qua Supabase Storage hoặc local cache một cách an toàn.
