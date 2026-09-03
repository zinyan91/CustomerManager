import { useState, useEffect } from 'react';
import type { TemplateType } from '../components/documents/TemplateSelector';
import { TEMPLATE_LIST } from '../components/documents/TemplateSelector';
import type { SaleItem, ConstItem, PaymentStageItem } from '../components/documents/DocumentForm';
import { DEFAULT_DEPOSIT_CONTRACT, type DepositContractData } from '../components/documents/depositContract';
import { buildDocumentHtml } from '../lib/documentHtml';
import {
  loadSaleCatalogs,
  saveSaleCatalog,
  deleteSaleCatalog,
  resetSaleCatalogs,
  fetchSaleCatalogsFromCloud,
  type SaleCatalogProfile,
} from '../lib/saleCatalogStore';

export const monthsBetweenLabel = (startIso: string, endIso: string): string => {
  const a = startIso?.split('-'), b = endIso?.split('-');
  if (!a || !b || a.length !== 3 || b.length !== 3) return '';
  const months =
    (parseInt(b[0], 10) - parseInt(a[0], 10)) * 12
    + (parseInt(b[1], 10) - parseInt(a[1], 10));
  if (isNaN(months) || months <= 0) return '';
  return months % 12 === 0 && months >= 12
    ? `${months / 12} năm`
    : `${months} tháng`;
};

export function useDocumentTemplateController() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('lease_mb');

  // Mẫu 1: Thuê mặt bằng
  const [mbContractDate, setMbContractDate] = useState('2026-04-23');
  const [mbPartyAName, setMbPartyAName] = useState('ĐỖ THỊ HIẾU');
  const [mbPartyACccd, setMbPartyACccd] = useState('0791 7802 5859');
  const [mbPartyACccdDate, setMbPartyACccdDate] = useState('29/11/2021');
  const [mbPartyAAddress, setMbPartyAAddress] = useState('233/3/1 Đường Vĩnh Viễn, Phường 4, Quận 10, Tp.HCM');
  const [mbPartyBName, setMbPartyBName] = useState('NGÔ NHỊ ĐẠT');
  const [mbPartyBCccd, setMbPartyBCccd] = useState('0343 0300 4676');
  const [mbPartyBCccdDate, setMbPartyBCccdDate] = useState('03/03/2022');
  const [mbPartyBAddress, setMbPartyBAddress] = useState('Bình Đường, An Bình, Tp. Dĩ An, Bình Dương');
  const [mbLocation, setMbLocation] = useState('1 phần thửa đất số 45 Tờ bản đồ số 9, Địa chỉ 478/34 Hòa Hảo, Phường 5, Quận 10, Tp.HCM');
  const [mbStartDate, setMbStartDate] = useState('2026-04-23');
  const [mbEndDate, setMbEndDate] = useState('2027-04-22');
  const [mbMonthlyPrice, setMbMonthlyPrice] = useState('55.000.000');
  const [mbDepositAmount, setMbDepositAmount] = useState('72.000.000');

  // Mẫu 5: Thuê nhà ở
  const [lhFloors, setLhFloors] = useState('01');
  const [lhLandArea, setLhLandArea] = useState('80');
  const [lhHouseArea, setLhHouseArea] = useState('75');
  const [lhHandoverDate, setLhHandoverDate] = useState('2026-04-23');
  const [lhPaymentDay, setLhPaymentDay] = useState('05');

  // Mẫu 2 & 3: Thi công & Dự toán
  const [constContractDate, setConstContractDate] = useState('2026-03-18');
  const [constPartyAName, setConstPartyAName] = useState('LÝ THỊ THÙY DUNG');
  const [constPartyACccd, setConstPartyACccd] = useState('0791 7802 5859');
  const [constPartyAAddress, setConstPartyAAddress] = useState('233/3/1 Đường Vĩnh Viễn, Phường 4, Quận 10, Tp.HCM');
  const [constPartyBName, setConstPartyBName] = useState('ĐỖ THỊ LAN ANH');
  const [constPartyBCccd, setConstPartyBCccd] = useState('0343 0300 4676');
  const [constSiteAddress, setConstSiteAddress] = useState('1 phần thửa đất số 45 Tờ bản đồ số 9 (BĐĐC) Địa chỉ 478/34 Hòa Hảo, Phường 5, Quận 10, Tp.HCM');
  const [constStartDate, setConstStartDate] = useState('2026-03-20');
  const [constEndDate, setConstEndDate] = useState('2026-05-20');
  const [constTotalPrice, setConstTotalPrice] = useState('1.003.700.000');
  const [constDepositStage1, setConstDepositStage1] = useState('53.700.000');
  const [constStage2Amount, setConstStage2Amount] = useState('950.000.000');
  const [constWarrantyMonths, setConstWarrantyMonths] = useState('06');

  const [constItems, setConstItems] = useState<ConstItem[]>([
    { id: '1', name: 'Sửa chữa tường (vữa, sơn)', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Vẽ lại tường, bả vữa, sơn lại' },
    { id: '2', name: 'Thay thế gạch lát nền', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Thay gạch lát sàn mới' },
    { id: '3', name: 'Lắp đặt hệ thống điện (đi dây, ổ cắm)', unit: 'm', quantity: 18, price: 2600000, note: 'Đi lại hệ thống điện' },
    { id: '4', name: 'Sửa chữa cửa (sơn lại, thay bản lề)', unit: 'Cái', quantity: 2, price: 5000000, note: 'Sơn cửa, thay bản lề' },
    { id: '5', name: 'Sửa chữa mái tôn (vệ sinh, sơn lại)', unit: 'm²', quantity: 45, price: 2200000, note: 'Sơn lại mái tôn' },
    { id: '6', name: 'Sơn tường ngoài', unit: 'm²', quantity: 68, price: 1000000, note: 'Sơn lại tường ngoài nhà' },
    { id: '7', name: 'Vệ sinh tổng thể', unit: 'Mỗi', quantity: 1, price: 5000000, note: 'Dọn dẹp vệ sinh toàn bộ nhà' },
    { id: '8', name: 'Lắp đặt trần thạch cao', unit: 'm²', quantity: 45, price: 280000, note: 'Lắp trần thạch cao cho các phòng' },
    { id: '9', name: 'Lắp đặt hệ thống chiếu sáng hiện đại', unit: 'Cái', quantity: 15, price: 1000000, note: 'Lắp đèn chiếu sáng LED hiện đại' },
    { id: '10', name: 'Thay thế cửa cuốn, cửa nhựa', unit: 'Cái', quantity: 1, price: 1500000, note: 'Thay mới cửa cuốn, cửa nhựa' },
    { id: '11', name: 'Thay thế cửa nhôm, cửa kính hư hỏng tại ban công', unit: 'Cái', quantity: 10, price: 2200000, note: 'Thay cửa hư hỏng' },
    { id: '12', name: 'Chống thấm, sửa chữa sân thượng và mái che', unit: 'm²', quantity: 40, price: 700000, note: 'Chống thấm, sửa mái, không đục phá kết cấu' },
    { id: '13', name: 'Cải tạo, ốp lát lại nhà vệ sinh tầng trệt', unit: 'm²', quantity: 36.5, price: 1600000, note: 'Ốp lát, thay thiết bị, không thay đổi tường chịu lực' },
    { id: '14', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 1', unit: 'm²', quantity: 36.5, price: 1600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
    { id: '15', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 2', unit: 'm²', quantity: 36.5, price: 1600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
    { id: '16', name: 'Sơn bả lại trần nhà phòng khách và các tầng', unit: 'm²', quantity: 36, price: 450000, note: 'Hoàn thiện sơn bả trần' },
    { id: '17', name: 'Lắp đặt bổ sung đèn LED chiếu sáng trong nhà', unit: 'Cái', quantity: 4, price: 850000, note: 'Bổ sung đèn LED tiết kiệm điện' },
    { id: '18', name: 'Lát gạch hoàn thiện ban công, lô gia', unit: 'm²', quantity: 50, price: 500000, note: 'Lát gạch hoàn thiện khu vực ban công' },
    { id: '19', name: 'Sửa chữa, thay mới tủ bếp, mặt bàn bếp', unit: 'Bộ', quantity: 5, price: 4600000, note: 'Thay tủ bếp, mặt bàn, không can thiệp kết cấu' },
    { id: '20', name: 'Sửa chữa, sơn mới lan can và tay vịn cầu thang', unit: 'm', quantity: 30, price: 500000, note: 'Sơn sửa lan can, tay vịn, đảm bảo an toàn' },
  ]);

  const handleAddConstItem = () => {
    setConstItems([
      ...constItems,
      { id: Date.now().toString(), name: 'Hạng mục mới', unit: 'm²', quantity: 1, price: 1000000, note: 'Ghi chú công việc' }
    ]);
  };

  // Mẫu 4: Mua bán hàng hóa
  const [saleContractDate, setSaleContractDate] = useState('2026-04-09');
  const [saleBuyerName, setSaleBuyerName] = useState('NGÔ NHỊ ĐẠT');
  const [saleBuyerAddress, setSaleBuyerAddress] = useState('Bình Đường, An Bình, Tp. Dĩ An, Bình Dương');
  const [saleSellerName, setSaleSellerName] = useState('TRẦN THỊ PHƯƠNG');
  const [saleSellerCccd, setSaleSellerCccd] = useState('0791 7802 5859');
  const [saleSellerCccdDate, setSaleSellerCccdDate] = useState('29/11/2021');
  const [saleSellerCccdPlace, setSaleSellerCccdPlace] = useState('Cục Cảnh sát QLHC về TTXH');
  const [salePayMethod, setSalePayMethod] = useState<'cash' | 'transfer'>('cash');
  const [saleBankOwner, setSaleBankOwner] = useState('TRẦN THỊ PHƯƠNG');
  const [saleBankAccNo, setSaleBankAccNo] = useState('0123456789');
  const [saleBankName, setSaleBankName] = useState('Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)');
  const [saleBankBranch, setSaleBankBranch] = useState('Chi nhánh TP.HCM');
  const [saleStartDate, setSaleStartDate] = useState('2026-04-09');
  const [saleEndDate, setSaleEndDate] = useState('2027-04-08');
  const [salePaymentStage1, setSalePaymentStage1] = useState('100.000.000');

  const [catalogs, setCatalogs] = useState<SaleCatalogProfile[]>([]);
  const [currentCatalogId, setCurrentCatalogId] = useState<string>('ban-buon-lua-gao');
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  const [saleItems, setSaleItems] = useState<SaleItem[]>([
    { id: '1', name: 'Lúa Jasmine 85 vụ Đông Xuân', unit: 'Tấn', quantity: 25, price: 8500000 },
    { id: '2', name: 'Lúa Đài Thơm 8 vụ Hè Thu', unit: 'Tấn', quantity: 30, price: 8200000 },
    { id: '3', name: 'Gạo lứt đỏ huyết rồng', unit: 'Tấn', quantity: 10, price: 16000000 },
    { id: '4', name: 'Gạo thơm ST25 cao cấp', unit: 'Tấn', quantity: 15, price: 22000000 },
    { id: '5', name: 'Gạo nàng hoa 9 đóng bao 50kg', unit: 'Tấn', quantity: 20, price: 14500000 },
    { id: '6', name: 'Tấm gạo ST24 nguyên chất', unit: 'Tấn', quantity: 12, price: 11000000 },
    { id: '7', name: 'Cám gạo tươi sấy khô', unit: 'Tấn', quantity: 18, price: 7200000 },
    { id: '8', name: 'Nếp cái hoa vàng chuẩn loại 1', unit: 'Tấn', quantity: 8, price: 19500000 },
  ]);

  useEffect(() => {
    const localCats = loadSaleCatalogs();
    setCatalogs(localCats);
    fetchSaleCatalogsFromCloud().then(cloudCats => {
      if (cloudCats && cloudCats.length > 0) setCatalogs(cloudCats);
    });
  }, []);

  const handleSelectCatalogId = (catId: string) => {
    setCurrentCatalogId(catId);
    const found = catalogs.find(c => c.id === catId);
    if (found && found.items.length > 0) {
      setSaleItems(found.items.map((it, idx) => ({
        id: `${Date.now()}_${idx}`,
        name: it.name,
        unit: it.unit,
        quantity: it.quantity,
        price: it.price,
      })));
    }
  };

  const handleSaveNewCatalog = (name: string, category: string, items: SaleItem[]) => {
    const newProfile: SaleCatalogProfile = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      category,
      items,
    };
    const updated = saveSaleCatalog(newProfile);
    setCatalogs(updated);
    setCurrentCatalogId(newProfile.id);
  };

  const handleDeleteCatalog = (id: string) => {
    const updated = deleteSaleCatalog(id);
    setCatalogs(updated);
    if (currentCatalogId === id && updated.length > 0) {
      handleSelectCatalogId(updated[0].id);
    }
  };

  const handleResetCatalogs = () => {
    const resetList = resetSaleCatalogs();
    setCatalogs(resetList);
    if (resetList.length > 0) {
      handleSelectCatalogId(resetList[0].id);
    }
  };

  const handleAddSaleItem = () => {
    setSaleItems([
      ...saleItems,
      { id: Date.now().toString(), name: 'Mặt hàng mới', unit: 'Tấn', quantity: 1, price: 10000000 }
    ]);
  };

  // Mẫu 6 & 7: Đề nghị thanh toán
  const [payMethodType, setPayMethodType] = useState<'cash' | 'transfer'>('transfer');
  const [recipientTitle, setRecipientTitle] = useState<'Ông' | 'Bà'>('Ông');
  const [payCashName, setPayCashName] = useState('ĐỖ THỊ LAN ANH');
  const [payCashCccd, setPayCashCccd] = useState('0343 0300 4676');
  const [payCashCccdDate, setPayCashCccdDate] = useState('03/03/2022');
  const [payCashCccdPlace, setPayCashCccdPlace] = useState('Cục Cảnh sát QLHC về TTXH');
  const [payBankOwner, setPayBankOwner] = useState('ĐỖ THỊ LAN ANH');
  const [payBankAccNo, setPayBankAccNo] = useState('0123456789');
  const [payBankName, setPayBankName] = useState('Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)');
  const [payBankBranch, setPayBankBranch] = useState('Chi nhánh TP.HCM');

  const [payStages, setPayStages] = useState<PaymentStageItem[]>([
    { id: '1', stageName: 'Đợt 1', amount: '53.700.000', status: 'paid', note: '' },
    { id: '2', stageName: 'Đợt 2', amount: '950.000.000', status: 'current', note: '' },
  ]);

  const handleAddPayStage = () => {
    setPayStages([
      ...payStages,
      { id: Date.now().toString(), stageName: `Đợt ${payStages.length + 1}`, amount: '0', status: 'future', note: '' }
    ]);
  };

  // Mẫu 8: Đặt cọc
  const [deposit, setDeposit] = useState<DepositContractData>(DEFAULT_DEPOSIT_CONTRACT);

  const currentTplInfo = TEMPLATE_LIST.find((t) => t.id === selectedTemplate) || TEMPLATE_LIST[0];
  const constDurationMonths = monthsBetweenLabel(constStartDate, constEndDate);
  const lhTermLabel = monthsBetweenLabel(mbStartDate, mbEndDate);

  const generateDocHtml = () => buildDocumentHtml(selectedTemplate, {
    mbContractDate,
    mbPartyAName,
    mbPartyACccd,
    mbPartyACccdDate,
    mbPartyAAddress,
    mbPartyBName,
    mbPartyBCccd,
    mbPartyBCccdDate,
    mbPartyBAddress,
    mbLocation,
    mbStartDate,
    mbEndDate,
    mbMonthlyPrice,
    mbDepositAmount,
    lhFloors,
    lhLandArea,
    lhHouseArea,
    lhHandoverDate,
    lhPaymentDay,
    constContractDate,
    constPartyAName,
    constPartyACccd,
    constPartyAAddress,
    constPartyBName,
    constPartyBCccd,
    constSiteAddress,
    constStartDate,
    constEndDate,
    constTotalPrice,
    constDepositStage1,
    constStage2Amount,
    constWarrantyMonths,
    constItems,
    deposit,
    saleContractDate,
    saleBuyerName,
    saleBuyerAddress,
    saleSellerName,
    saleSellerCccd,
    saleSellerCccdDate,
    saleSellerCccdPlace,
    salePayMethod,
    saleBankOwner,
    saleBankAccNo,
    saleBankName,
    saleBankBranch,
    saleStartDate,
    saleEndDate,
    recipientTitle,
    salePaymentStage1,
    saleItems,
    payMethodType,
    payCashName,
    payCashCccd,
    payCashCccdDate,
    payCashCccdPlace,
    payBankOwner,
    payBankAccNo,
    payBankName,
    payBankBranch,
    payStages,
    constDurationMonths,
    lhTermLabel,
  });

  return {
    selectedTemplate,
    setSelectedTemplate,
    currentTplInfo,
    generateDocHtml,
    mbContractDate, setMbContractDate,
    mbPartyAName, setMbPartyAName,
    mbPartyACccd, setMbPartyACccd,
    mbPartyACccdDate, setMbPartyACccdDate,
    mbPartyAAddress, setMbPartyAAddress,
    mbPartyBName, setMbPartyBName,
    mbPartyBCccd, setMbPartyBCccd,
    mbPartyBCccdDate, setMbPartyBCccdDate,
    mbPartyBAddress, setMbPartyBAddress,
    mbLocation, setMbLocation,
    mbStartDate, setMbStartDate,
    mbEndDate, setMbEndDate,
    mbMonthlyPrice, setMbMonthlyPrice,
    mbDepositAmount, setMbDepositAmount,
    lhFloors, setLhFloors,
    lhLandArea, setLhLandArea,
    lhHouseArea, setLhHouseArea,
    lhHandoverDate, setLhHandoverDate,
    lhPaymentDay, setLhPaymentDay,
    constContractDate, setConstContractDate,
    constPartyAName, setConstPartyAName,
    constPartyACccd, setConstPartyACccd,
    constPartyAAddress, setConstPartyAAddress,
    constPartyBName, setConstPartyBName,
    constPartyBCccd, setConstPartyBCccd,
    constSiteAddress, setConstSiteAddress,
    constStartDate, setConstStartDate,
    constEndDate, setConstEndDate,
    constTotalPrice, setConstTotalPrice,
    constDepositStage1, setConstDepositStage1,
    constStage2Amount, setConstStage2Amount,
    constWarrantyMonths, setConstWarrantyMonths,
    constItems, setConstItems,
    handleAddConstItem,
    saleContractDate, setSaleContractDate,
    saleBuyerName, setSaleBuyerName,
    saleBuyerAddress, setSaleBuyerAddress,
    saleSellerName, setSaleSellerName,
    saleSellerCccd, setSaleSellerCccd,
    saleSellerCccdDate, setSaleSellerCccdDate,
    saleSellerCccdPlace, setSaleSellerCccdPlace,
    salePayMethod, setSalePayMethod,
    saleBankOwner, setSaleBankOwner,
    saleBankAccNo, setSaleBankAccNo,
    saleBankName, setSaleBankName,
    saleBankBranch, setSaleBankBranch,
    saleStartDate, setSaleStartDate,
    saleEndDate, setSaleEndDate,
    salePaymentStage1, setSalePaymentStage1,
    saleItems, setSaleItems,
    handleAddSaleItem,
    catalogs,
    currentCatalogId,
    catalogModalOpen,
    setCatalogModalOpen,
    handleSelectCatalogId,
    handleSaveNewCatalog,
    handleDeleteCatalog,
    handleResetCatalogs,
    payMethodType, setPayMethodType,
    recipientTitle, setRecipientTitle,
    payCashName, setPayCashName,
    payCashCccd, setPayCashCccd,
    payCashCccdDate, setPayCashCccdDate,
    payCashCccdPlace, setPayCashCccdPlace,
    payBankOwner, setPayBankOwner,
    payBankAccNo, setPayBankAccNo,
    payBankName, setPayBankName,
    payBankBranch, setPayBankBranch,
    deposit, setDeposit,
    payStages, setPayStages,
    handleAddPayStage,
  };
}
