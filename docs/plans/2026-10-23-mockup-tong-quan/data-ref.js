// Sinh từ src/lib/cardPolicyRules.ts, src/data/mdsdv.json, src/data/quiz_bank.json và migration 53, 75. Không sửa tay.
window.REF = {
 "cardPolicies": [
  {
   "code": "A1_KHCN_TSBD_TIEN GUI",
   "subject": "KH cầm cố tiền gửi có kỳ hạn VND và ngoại tệ mở tại Vietbank (bao gồm tiền gửi online có kỳ hạn) để đảm bảo phát hành thẻ cho mình hoặc cho người thứ 3. Bảo lãnh cho người thứ 3 thì người bảo lãnh phải là người Việt Nam. Không áp dụng hợp đồng tiền gửi đối với người nước ngoài.",
   "limitRule": "90% × giá trị tiền gửi có kỳ hạn (quy đổi VNĐ)",
   "maxLimit": null,
   "tiers": false,
   "conditions": [
    "Kỳ hạn tiền gửi: từ 01 tháng trở lên.",
    "Tiền gửi ngoại tệ: áp tỷ giá mua chuyển khoản theo Bảng tỷ giá vàng – ngoại tệ tại thời điểm xét cấp hạn mức thẻ."
   ]
  },
  {
   "code": "A2_KHCN_TSBD_BDS",
   "subject": "KH thế chấp BĐS để bảo đảm hạn mức thẻ, hoặc KH phát hành thẻ tín dụng kèm theo khoản vay có TSBĐ tại Vietbank.",
   "limitRule": "LTV tối đa theo quy định hiện hành × giá trị BĐS (do Vietbank định giá)",
   "maxLimit": 500000000,
   "tiers": false,
   "conditions": [
    "Việc xét cấp thẻ theo hình thức thế chấp BĐS phải tuân theo quy định cấp tín dụng có tài sản bảo đảm là Bất động sản hiện hành của Vietbank.",
    "Trường hợp phát hành thẻ kèm theo khoản vay: KH đứng tên chủ thẻ chính phải là người đứng tên khoản vay trên hệ thống corebanking."
   ]
  },
  {
   "code": "B1_KHCN_KHONG TSBD_QHVB_TIEN GUI",
   "subject": "KHCN đang có quan hệ tiền gửi có kỳ hạn tại Vietbank.",
   "limitRule": "Theo bậc số dư tiền gửi có kỳ hạn bình quân 6 tháng gần nhất",
   "maxLimit": 500000000,
   "tiers": true,
   "conditions": [
    "Tổng số dư tiền gửi có kỳ hạn bình quân trong 6 tháng gần nhất tối thiểu 100 triệu đồng.",
    "Tại thời điểm xét cấp hạn mức thẻ tín dụng, KH có tổng số dư tiền gửi có kỳ hạn tại Vietbank tối thiểu 100 triệu đồng.",
    "Số dư tiền gửi làm căn cứ xét cấp hạn mức thẻ đã loại trừ số dư cầm cố, phong toả để đảm bảo cho nghĩa vụ nợ tại Vietbank và TCTD khác."
   ]
  },
  {
   "code": "B2_KHCN_KHONG TSBD_QHVB_TIN DUNG",
   "subject": "KH đang có quan hệ tín dụng tại Vietbank (chỉ áp dụng cho Bên được cấp tín dụng). KH có khoản vay được đảm bảo bằng phương tiện vận tải, BĐS/sạp chợ, quyền tài sản phát sinh từ hợp đồng mua bán/chuyển nhượng BĐS (đối với BĐS thuộc dự án liên kết với Vietbank).",
   "limitRule": "5% × tổng số tiền vay được duyệt (tính trên HĐTD còn hiệu lực và/hoặc khoản vay đang trình phê duyệt hoặc đã được phê duyệt nhưng chưa ký kết Thoả thuận cấp tín dụng)",
   "maxLimit": 100000000,
   "tiers": false,
   "conditions": [
    "KH đang có quan hệ tín dụng từ 12 tháng trở lên với Vietbank.",
    "Chỉ phát hành thẻ đối với KH có quan hệ tín dụng tại Đơn vị đang quản lý khoản vay của KH (căn cứ thông tin trên FBE).",
    "KH đứng tên chủ thẻ chính là người đứng tên khoản vay trên hệ thống corebanking."
   ]
  },
  {
   "code": "B3_KHCN_KHONG TSBD_QHVB_LANH DAO DN VIP",
   "subject": "KH là thành viên góp vốn có tỷ lệ vốn góp ≥ 30%, Chủ tịch HĐQT/HĐTV, Tổng Giám đốc/Giám đốc điều hành, Kế toán trưởng/Giám đốc tài chính của doanh nghiệp có xếp hạng KHDN tốt tại Vietbank (theo Thông báo 1808/2023/TB-TGĐ ngày 08/06/2023).",
   "limitRule": "Theo ma trận chức danh × xếp hạng doanh nghiệp",
   "maxLimit": 300000000,
   "tiers": false,
   "conditions": [
    "KHDN không phát sinh nợ quá nhóm 2 trong 12 tháng gần nhất, nợ nhóm 3 đến nhóm 5 trong 36 tháng gần nhất, không có dư nợ bán cho VAMC / nợ xử lý rủi ro tín dụng trong 36 tháng gần nhất tại Vietbank hoặc các TCTD khác tính đến thời điểm xét duyệt cấp hạn mức thẻ.",
    "Xếp hạng của doanh nghiệp theo tiêu chí xếp loại KHDN tốt của Vietbank từng thời kỳ.",
    "Điều kiện KH cá nhân: theo quy định tại Phụ lục 01."
   ]
  },
  {
   "code": "B4_KHCN_KHONG TSBD_NGOAITHUNHAP_BAO HIEM",
   "subject": "Khách hàng tham gia các sản phẩm bảo hiểm nhân thọ do Vietbank giới thiệu.",
   "limitRule": "02 × tổng phí bảo hiểm định kỳ theo hằng năm",
   "maxLimit": 100000000,
   "tiers": false,
   "conditions": [
    "KH là cá nhân đứng tên trên hợp đồng (bên mua Bảo hiểm).",
    "KH đã tham gia bảo hiểm tối thiểu 01 năm và đã đóng đầy đủ phí bảo hiểm từ 02 năm trở lên.",
    "KH đã thanh toán đủ phí bảo hiểm đến hiện tại (tra cứu tại Trang Hợp đồng bảo hiểm online của KH hoặc các trang thể hiện thông tin liên quan)."
   ]
  },
  {
   "code": "B5_KHCN_KHONG TSBD_QHVB_LANH DAO VIETBANK GIOI THIEU",
   "subject": "KH do Lãnh đạo Vietbank giới thiệu.",
   "limitRule": "Theo chức danh của người giới thiệu",
   "maxLimit": 500000000,
   "tiers": false,
   "conditions": [
    "Số lượng KH được giới thiệu tối đa: 05 KH/năm/CBNV (năm thường niên)."
   ]
  },
  {
   "code": "B6_KHCN_KHONG TSBD_THUNHAP_ LUONG QUA VIETBANK",
   "subject": "KHCN nhận lương qua tài khoản mở tại Vietbank.",
   "limitRule": "Theo nhân hệ số lương bình quân 03 tháng gần nhất, khác nhau theo chức danh",
   "maxLimit": 200000000,
   "tiers": false,
   "conditions": [
    "Tổ chức đang sử dụng dịch vụ chi hộ lương của Vietbank.",
    "Tổ chức có thời gian hoạt động từ 02 năm (tính từ ngày Mã số thuế / Mã số doanh nghiệp được cấp).",
    "KH ký HĐLĐ chính thức."
   ]
  },
  {
   "code": "B7_KHCN_KHONG TSBD_THUNHAP_ LUONG KHAC",
   "subject": "KH nhận lương qua tài khoản mở tại ngân hàng khác.",
   "limitRule": "Theo nhân hệ số lương bình quân 03 tháng gần nhất, khác nhau theo chức danh",
   "maxLimit": 200000000,
   "tiers": false,
   "conditions": [
    "Tổ chức có thời gian hoạt động từ 02 năm (tính từ ngày Mã số thuế / Mã số Doanh nghiệp được cấp).",
    "KH ký HĐLĐ chính thức.",
    "Thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại của HĐLĐ tối thiểu 01 tháng."
   ]
  },
  {
   "code": "B8_KHCN_KHONG TSBD_THUNHAP_CBNV NGAN HANG",
   "subject": "KHCN làm việc tại các ngân hàng khác.",
   "limitRule": "Hai cơ sở song song: theo chức danh, hoặc theo lương (04 × lương bình quân 03 tháng gần nhất). Trần khác nhau theo từng nhánh chức danh.",
   "maxLimit": 500000000,
   "tiers": true,
   "conditions": [
    "KH ký HĐLĐ chính thức.",
    "Thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại của HĐLĐ tối thiểu 01 tháng.",
    "Thời gian KH công tác tại Ngân hàng hiện tại liên tục tối thiểu 03 tháng (bao gồm thời gian thử việc)."
   ]
  },
  {
   "code": "B9_KHCN_KHONG TSBD_NGOAITHUNHAP_THE TD NGAN HANG KHAC",
   "subject": "KH đang sở hữu thẻ tín dụng quốc tế KHÔNG có TSBĐ của các Ngân hàng khác được phát hành tại Việt Nam (đã được thẩm định thẻ bởi các Ngân hàng uy tín).",
   "limitRule": "100% × hạn mức thẻ tín dụng KH đang sở hữu dùng làm căn cứ cấp thẻ Vietbank",
   "maxLimit": 100000000,
   "tiers": false,
   "conditions": [
    "Thẻ đang sở hữu phải đạt hạn mức tối thiểu theo nhóm ngân hàng phát hành: HSBC, Citibank (UOB), Standard Chartered Bank, Shinhanbank/ANZ, Vietcombank, BIDV, ACB, MB, Vietinbank — tối thiểu 30 triệu đồng.",
    "Sacombank, TPBank, Eximbank, HDBank, VIB — tối thiểu 50 triệu đồng.",
    "Thẻ các ngân hàng còn lại — tối thiểu 100 triệu đồng."
   ]
  },
  {
   "code": "B10_KHCN_KHONG TSBD_VITRIXAHOI_CBNV CQNN",
   "subject": "KHCN là CBNV thuộc các Đơn vị nhà nước.",
   "limitRule": "Theo chức danh, phân theo bốn nhóm đơn vị. TTKD có thể trình theo chức danh hoặc theo lương nếu thoả điều kiện.",
   "maxLimit": 200000000,
   "tiers": false,
   "conditions": [
    "KH có HĐLĐ chính thức (thời hạn HĐLĐ tối thiểu 12 tháng, thời hạn hiệu lực còn lại tối thiểu 01 tháng) / Quyết định biên chế / các Quyết định chứng minh công tác tại đơn vị.",
    "Có thời gian công tác tại đơn vị hiện tại tối thiểu 03 tháng. Trường hợp chuyển công tác giữa các đơn vị nhà nước, KH cung cấp chứng từ thể hiện việc điều chuyển công tác; thời gian làm việc chính thức được xét tại Đơn vị hiện tại và/hoặc Đơn vị cũ trước khi điều chuyển.",
    "KH không sở hữu thẻ tín dụng của quá 03 TCTD khác (không bao gồm thẻ của Vietbank chuẩn bị phát hành)."
   ]
  },
  {
   "code": "B11_KHCN_KHONG TSBD_THUNHAP_HOKINHDOANH",
   "subject": "KHCN là chủ Hộ kinh doanh cá thể, hộ kinh doanh thành lập từ 01 năm trở lên.",
   "limitRule": "Doanh thu khoán một tháng",
   "maxLimit": 50000000,
   "tiers": false,
   "conditions": [
    "Có đăng ký hộ kinh doanh.",
    "Hộ kinh doanh do MỘT cá nhân thành lập (không áp dụng với Hộ kinh doanh do hộ gia đình thành lập).",
    "Hộ kinh doanh được thành lập từ 01 năm trở lên."
   ]
  },
  {
   "code": "B12_KHCN_KHONG TSBD_DNBAOLANH",
   "subject": "KHCN được bảo lãnh bởi Doanh nghiệp có quan hệ tín dụng với Vietbank.",
   "limitRule": "Tối đa 500 triệu đồng/khách hàng. Tổng hạn mức thẻ được một Doanh nghiệp bảo lãnh tối đa 10% hạn mức tín dụng mà Vietbank đã cấp và không vượt quá 5 tỉ đồng/Doanh nghiệp — bao gồm cả hạn mức thẻ của KH đã phát hành theo mã B3 (thành viên góp vốn/Ban lãnh đạo/Chủ DN có xếp hạng KHDN tốt), tính cả vay ngắn hạn và trung dài hạn.",
   "maxLimit": 500000000,
   "tiers": false,
   "conditions": [
    "Cá nhân được bảo lãnh là CBNV làm việc tại Doanh nghiệp.",
    "Doanh nghiệp đang có quan hệ tín dụng có TSĐB tại TTKD (không áp dụng đối với TSĐB là số dư tiền gửi của Doanh nghiệp) thuộc top 500 Doanh nghiệp lớn tại Việt Nam theo www.VNR500.com.vn.",
    "Tại thời điểm KH đề nghị mở thẻ, tổng dư nợ thẻ không vượt quá 70% tổng hạn mức thẻ hiện tại (theo thông tin tra cứu CIC)."
   ]
  },
  {
   "code": "B13_KHCN_KHONG TSBD_BXH_SANCK",
   "subject": "KHCN nằm trong bảng xếp hạng top 200 người giàu trên sàn chứng khoán HOSE/HNX.",
   "limitRule": "Theo xếp hạng người giàu trên sàn chứng khoán",
   "maxLimit": 500000000,
   "tiers": false,
   "conditions": [
    "Cổ phiếu của công ty niêm yết trên sàn chứng khoán HOSE/HNX không thuộc diện cảnh báo, không bị lỗ trong năm gần nhất.",
    "Công ty có liên quan không có thông tin xấu về khả năng tài chính trong 01 năm gần nhất."
   ]
  }
 ],
 "mdsdv": {
  "total": 744,
  "overdraft": 772,
  "rows": [
   {
    "c5": "CEA01463",
    "n5": "Chăn nuôi vịt, ngan, ngỗng",
    "n2": "Nông nghiệp và hoạt động dịch vụ có liên quan",
    "n1": "NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN",
    "od": [
     "CEA0146301"
    ]
   },
   {
    "c5": "CEA02101",
    "n5": "Trồng rừng và chăm sóc rừng cây thân gỗ",
    "n2": "Lâm nghiệp và hoạt động dịch vụ có liên quan",
    "n1": "NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN",
    "od": [
     "CEA0210101"
    ]
   },
   {
    "c5": "CEA02200",
    "n5": "Khai thác gỗ",
    "n2": "Lâm nghiệp và hoạt động dịch vụ có liên quan",
    "n1": "NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN",
    "od": [
     "CEA0220001"
    ]
   },
   {
    "c5": "CEA02301",
    "n5": "Khai thác lâm sản trừ gỗ",
    "n2": "Lâm nghiệp và hoạt động dịch vụ có liên quan",
    "n1": "NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN",
    "od": [
     "CEA0230101"
    ]
   },
   {
    "c5": "CEA02302",
    "n5": "Thu nhặt lâm sản trừ gỗ",
    "n2": "Lâm nghiệp và hoạt động dịch vụ có liên quan",
    "n1": "NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN",
    "od": [
     "CEA0230201"
    ]
   },
   {
    "c5": "CEC16101",
    "n5": "Cưa, xẻ và bào gỗ",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1610101"
    ]
   },
   {
    "c5": "CEC16102",
    "n5": "Bảo quản gỗ",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1610201"
    ]
   },
   {
    "c5": "CEC16210",
    "n5": "Sản xuất gỗ dán, gỗ lạng, ván ép và ván mỏng khác",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1621001"
    ]
   },
   {
    "c5": "CEC16220",
    "n5": "Sản xuất đồ gỗ xây dựng",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1622001"
    ]
   },
   {
    "c5": "CEC16230",
    "n5": "Sản xuất bao bì bằng gỗ",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1623001"
    ]
   },
   {
    "c5": "CEC16291",
    "n5": "Sản xuất sản phẩm khác từ gỗ",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1629101"
    ]
   },
   {
    "c5": "CEC16292",
    "n5": "Sản xuất sản phẩm từ lâm sản (trừ gỗ), cói và vật liệu tết bện",
    "n2": "Chế biến gỗ và sản xuất sản phẩm từ gỗ, tre, nứa (trừ giường, tủ, bàn, ghế); sản xuất sản phẩm từ rơm, rạ và vật liệu tết bện",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC1629201"
    ]
   },
   {
    "c5": "CEC31010",
    "n5": "Sản xuất giường, tủ, bàn, ghế bằng gỗ",
    "n2": "Sản xuất giường, tủ, bàn, ghế",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC3101001"
    ]
   },
   {
    "c5": "CEC31020",
    "n5": "Sản xuất giường, tủ, bàn, ghế bằng kim loại",
    "n2": "Sản xuất giường, tủ, bàn, ghế",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC3102001"
    ]
   },
   {
    "c5": "CEC31090",
    "n5": "Sản xuất giường, tủ, bàn, ghế bằng vật liệu khác",
    "n2": "Sản xuất giường, tủ, bàn, ghế",
    "n1": "CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO",
    "od": [
     "CEC3109001"
    ]
   },
   {
    "c5": "CEG46209",
    "n5": "Bán buôn nông, lâm sản nguyên liệu khác (trừ gỗ, tre, nứa)",
    "n2": "Bán buôn",
    "n1": "BÁN BUÔN VÀ BÁN LẺ",
    "od": [
     "CEG4620901"
    ]
   },
   {
    "c5": "CEG46412",
    "n5": "Bán buôn chăn, màn, rèm, ga trải giường, gối và hàng dệt khác",
    "n2": "Bán buôn",
    "n1": "BÁN BUÔN VÀ BÁN LẺ",
    "od": [
     "CEG4641201"
    ]
   },
   {
    "c5": "CEG46421",
    "n5": "Bán buôn giường, tủ, bàn ghế và đồ nội thất tương tự trong gia đình, văn phòng, cửa hàng",
    "n2": "Bán buôn",
    "n1": "BÁN BUÔN VÀ BÁN LẺ",
    "od": [
     "CEG4642101"
    ]
   },
   {
    "c5": "CEG46496",
    "n5": "Bán buôn giá sách, kệ và đồ nội thất tương tự",
    "n2": "Bán buôn",
    "n1": "BÁN BUÔN VÀ BÁN LẺ",
    "od": [
     "CEG4649601"
    ]
   },
   {
    "c5": "CEG46731",
    "n5": "Bán buôn tre, nứa, gỗ cây và gỗ chế biến",
    "n2": "Bán buôn",
    "n1": "BÁN BUÔN VÀ BÁN LẺ",
    "od": [
     "CEG4673101"
    ]
   },
   {
    "c5": "CEG47592",
    "n5": "Bán lẻ giường, tủ, bàn, ghế và đồ dùng nội thất tương tự",
    "n2": "Bán lẻ",
    "n1": "BÁN BUÔN VÀ BÁN LẺ",
    "od": [
     "CEG4759201"
    ]
   },
   {
    "c5": "CET95240",
    "n5": "Sửa chữa, bảo dưỡng giường, tủ, bàn, ghế và đồ nội thất tương tự",
    "n2": "Sửa chữa, bảo dưỡng máy tính, đồ dùng cá nhân và gia đình, ô tô, mô tô, xe máy và xe có động cơ khác",
    "n1": "HOẠT ĐỘNG DỊCH VỤ KHÁC",
    "od": [
     "CET9524001"
    ]
   }
  ],
  "purposes": [
   [
    "01",
    "Bo sung von luu dong"
   ],
   [
    "02",
    "Dau tu TSCD la BDS (tru QSDD) phuc vu SXKD"
   ],
   [
    "03",
    "Dau tu TSCD khac phuc vu SXKD"
   ],
   [
    "04",
    "Hop tac kinh doanh"
   ],
   [
    "05",
    "Cho vay de gop von, mua co phan cua Cty co phan"
   ],
   [
    "06",
    "Mua, nhan chuyen nhuong, thue, thue mua, xay dung, cai tao, sua chua van phong, cao oc de tu su dung"
   ],
   [
    "07",
    "Mua, nhan chuyen nhuong, thue, thue mua, xay dung, cai tao, sua chua HTKT, CTXD trong KCN, CCN, KCX, KCNC, khu KT de tu su dung"
   ],
   [
    "08",
    "Dau tu kinh doanh trai phieu Chinh phu"
   ]
  ]
 },
 "quiz": {
  "total": 662,
  "multi": 21,
  "open": 2,
  "sample": [
   {
    "id": 1,
    "question": "Khách hàng có nhu cầu vay vốn lần này tại Vietbank để trả nợ trước hạn cho khoản vay của khách hàng tại Tổ chức tín dụng khác. Trường hợp TSBĐ là chính tài sản đang đảm bảo cho khoản vay tại TCTD khác thì có bao nhiêu phương án giải ngân theo Sản phẩm cho vay để trả nợ trước hạn khoản vay của KHCN tại TCTD khác theo 3032/2023/QĐ-TDCN?",
    "options": [
     {
      "id": "A",
      "text": "01 phương án"
     },
     {
      "id": "B",
      "text": "02 phương án"
     },
     {
      "id": "C",
      "text": "03 phương án"
     },
     {
      "id": "D",
      "text": "04 phương án"
     }
    ],
    "correct_answers": [
     "C"
    ],
    "sources": [
     "PDF1 (Câu 1)"
    ]
   },
   {
    "id": 2,
    "question": "Khách hàng vay mua/nhận chuyển nhượng bất động sản có TSBĐ là căn hộ chung cư đã có GCN, thời gian cho vay tối đa là bao nhiêu? (theo CV 2486/2020/QĐ-TGĐ)",
    "options": [
     {
      "id": "A",
      "text": "10 năm"
     },
     {
      "id": "B",
      "text": "20 năm"
     },
     {
      "id": "C",
      "text": "25 năm"
     },
     {
      "id": "D",
      "text": "15 năm"
     }
    ],
    "correct_answers": [
     "D"
    ],
    "sources": [
     "PDF1 (Câu 2)"
    ]
   },
   {
    "id": 78,
    "question": "Sản phẩm Cho vay siêu tốc dành cho khách hàng doanh nghiệp SMEs (VB Super SME) xem xét nhận loại TSBĐ nào?",
    "options": [
     {
      "id": "A",
      "text": "Tất cả loại TSBĐ theo Quy chế nhận TSBĐ từng thời kỳ (loại trừ trường hợp không nhận) - Mức LTV tăng 10% so với quy định chuẩn."
     },
     {
      "id": "B",
      "text": "Tất cả loại TSBĐ theo Quy chế nhận TSBĐ từng thời kỳ, không áp dụng BĐS loại hạn chế/không nhận - Mức LTV theo quy định chuẩn."
     },
     {
      "id": "C",
      "text": "Chỉ bất động sản theo quy chế nhận TSBĐ từng thời kỳ (bao gồm tỷ lệ LTV)"
     },
     {
      "id": "D",
      "text": "Chỉ bất động sản, Phương tiện vận tải theo quy chế nhận TSBĐ từng thời kỳ (bao gồm tỷ lệ LTV)"
     }
    ],
    "correct_answers": [
     "B"
    ],
    "sources": [
     "PDF1 (Câu 78)"
    ]
   }
  ]
 },
 "deposit": {
  "so": "2848-8/2026/TB-BĐH",
  "from": "2026-10-01",
  "to": "2026-10-23",
  "name": "Tuần lễ vàng huy động KHCN",
  "tiers": [
   {
    "channel": "quay",
    "balance": "Quy mô KH < 200 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.09
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH < 200 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.09
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH < 200 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.088
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH < 200 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.088
   },
   {
    "channel": "quay",
    "balance": "200 triệu đồng ≤ Quy mô KH < 500 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.091
   },
   {
    "channel": "quay",
    "balance": "200 triệu đồng ≤ Quy mô KH < 500 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.091
   },
   {
    "channel": "quay",
    "balance": "200 triệu đồng ≤ Quy mô KH < 500 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.088
   },
   {
    "channel": "quay",
    "balance": "200 triệu đồng ≤ Quy mô KH < 500 triệu đồng",
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.088
   },
   {
    "channel": "quay",
    "balance": "500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.092
   },
   {
    "channel": "quay",
    "balance": "500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.092
   },
   {
    "channel": "quay",
    "balance": "500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.089
   },
   {
    "channel": "quay",
    "balance": "500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.089
   },
   {
    "channel": "quay",
    "balance": "2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.093
   },
   {
    "channel": "quay",
    "balance": "2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.093
   },
   {
    "channel": "quay",
    "balance": "2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.09
   },
   {
    "channel": "quay",
    "balance": "2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.09
   },
   {
    "channel": "quay",
    "balance": "3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.094
   },
   {
    "channel": "quay",
    "balance": "3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.094
   },
   {
    "channel": "quay",
    "balance": "3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.091
   },
   {
    "channel": "quay",
    "balance": "3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.091
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH ≥ 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.095
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH ≥ 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.095
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH ≥ 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.092
   },
   {
    "channel": "quay",
    "balance": "Quy mô KH ≥ 8 tỷ đồng",
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.092
   },
   {
    "channel": "online",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.0895
   },
   {
    "channel": "online",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.0895
   },
   {
    "channel": "online",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.0895
   },
   {
    "channel": "online",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.0895
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 6,
    "rate": 0.096
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_quy",
    "tenor": 6,
    "rate": 0.0949
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_thang",
    "tenor": 6,
    "rate": 0.0941
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "tra_truoc",
    "tenor": 6,
    "rate": 0.0916
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 7,
    "rate": 0.096
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_quy",
    "tenor": 7,
    "rate": 0.0945
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_thang",
    "tenor": 7,
    "rate": 0.0938
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "tra_truoc",
    "tenor": 7,
    "rate": 0.0909
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 9,
    "rate": 0.094
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_quy",
    "tenor": 9,
    "rate": 0.0919
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_thang",
    "tenor": 9,
    "rate": 0.0912
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "tra_truoc",
    "tenor": 9,
    "rate": 0.0878
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "cuoi_ky",
    "tenor": 12,
    "rate": 0.094
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_quy",
    "tenor": 12,
    "rate": 0.0909
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "hang_thang",
    "tenor": 12,
    "rate": 0.0902
   },
   {
    "channel": "ftp",
    "balance": null,
    "payout": "tra_truoc",
    "tenor": 12,
    "rate": 0.0859
   }
  ]
 },
 "cof": {
  "so": "2523/2026/TB-BĐH",
  "from": "2026-08-21",
  "rows": [
   {
    "tenor": "Dưới 1 tuần",
    "fixed": 0.083,
    "reset": [
     null,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "1 tuần",
    "fixed": 0.083,
    "reset": [
     null,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "2 tuần",
    "fixed": 0.083,
    "reset": [
     null,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "3 tuần",
    "fixed": 0.083,
    "reset": [
     null,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "1 tháng",
    "fixed": 0.083,
    "reset": [
     null,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "2 tháng",
    "fixed": 0.083,
    "reset": [
     null,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "3 tháng",
    "fixed": 0.083,
    "reset": [
     0.083,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "4 tháng",
    "fixed": 0.083,
    "reset": [
     0.083,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "5 tháng",
    "fixed": 0.087,
    "reset": [
     0.087,
     null,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "6 tháng",
    "fixed": 0.094,
    "reset": [
     0.092,
     0.094,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "7 tháng",
    "fixed": 0.0965,
    "reset": [
     0.093,
     0.095,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "8 tháng",
    "fixed": 0.0965,
    "reset": [
     0.093,
     0.095,
     null,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "9 tháng",
    "fixed": 0.0965,
    "reset": [
     0.0935,
     0.0955,
     0.0965,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "10 tháng",
    "fixed": 0.1055,
    "reset": [
     0.095,
     0.097,
     0.098,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "11 tháng",
    "fixed": 0.1055,
    "reset": [
     0.0965,
     0.0985,
     0.0995,
     null,
     null,
     null
    ]
   },
   {
    "tenor": "12 tháng",
    "fixed": 0.1055,
    "reset": [
     0.1005,
     0.1025,
     0.1035,
     0.1055,
     null,
     null
    ]
   },
   {
    "tenor": "> 12 tháng và ≤ 60 tháng",
    "fixed": 0.121,
    "reset": [
     0.103,
     0.105,
     0.106,
     0.108,
     0.121,
     0.121
    ]
   },
   {
    "tenor": "> 60 tháng và ≤ 180 tháng",
    "fixed": 0.123,
    "reset": [
     0.105,
     0.107,
     0.108,
     0.11,
     0.123,
     0.123
    ]
   },
   {
    "tenor": "> 180 tháng",
    "fixed": 0.125,
    "reset": [
     0.107,
     0.109,
     0.11,
     0.112,
     0.125,
     0.125
    ]
   }
  ]
 }
};
