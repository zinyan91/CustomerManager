import React, { useState, useEffect } from 'react';
import { UI } from '../../lib/uiClasses';
import { TemplateSelector, TEMPLATE_LIST, type TemplateType } from '../documents/TemplateSelector';
import { DocumentForm, type SaleItem } from '../documents/DocumentForm';
import { DEFAULT_DEPOSIT_CONTRACT, type DepositContractData } from '../documents/depositContract';
import { DocumentPreview } from '../documents/DocumentPreview';
import { buildDocumentHtml, buildGiayCamKetHtml } from '../../lib/documentHtml';
import {
  loadSaleCatalogs,
  saveSaleCatalog,
  deleteSaleCatalog,
  resetSaleCatalogs,
  fetchSaleCatalogsFromCloud,
  type SaleCatalogProfile,
} from '../../lib/saleCatalogStore';
import { SaleCatalogModal } from '../documents/SaleCatalogModal';

const monthsBetweenLabel = (startIso: string, endIso: string): string => {
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

export const DocumentTemplateView: React.FC = () => {
  const styles = UI;

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('lease_mb');

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

  const [lhFloors, setLhFloors] = useState('01');
  const [lhLandArea, setLhLandArea] = useState('80');
  const [lhHouseArea, setLhHouseArea] = useState('75');
  const [lhHandoverDate, setLhHandoverDate] = useState('2026-04-23');
  const [lhPaymentDay, setLhPaymentDay] = useState('05');

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

  const [constItems, setConstItems] = useState([
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

  const [saleContractDate, setSaleContractDate] = useState('2026-04-09');
  const [saleBuyerName, setSaleBuyerName] = useState('LÊ THỊ CẢNH');
  const [saleBuyerAddress, setSaleBuyerAddress] = useState('Kỳ Anh, Hà Tĩnh');
  const [saleSellerName, setSaleSellerName] = useState('PHẠM HỒNG ĐỨC');
  const [saleSellerCccd, setSaleSellerCccd] = useState('0720 7700 0901');
  const [saleSellerCccdDate, setSaleSellerCccdDate] = useState('25/05/2023');
  const [deposit, setDeposit] = useState<DepositContractData>(DEFAULT_DEPOSIT_CONTRACT);

  const [saleSellerCccdPlace, setSaleSellerCccdPlace] = useState('CCS QLHC về TTXH');
  const [salePayMethod, setSalePayMethod] = useState<'cash' | 'transfer'>('transfer');
  const [saleBankOwner, setSaleBankOwner] = useState('PHẠM HỒNG ĐỨC');
  const [saleBankAccNo, setSaleBankAccNo] = useState('1023456789');
  const [saleBankName, setSaleBankName] = useState('Vietcombank');
  const [saleBankBranch, setSaleBankBranch] = useState('Chi nhánh Hà Tĩnh');
  const [saleStartDate, setSaleStartDate] = useState('2026-04-09');
  const [saleEndDate, setSaleEndDate] = useState('2026-05-09');
  const [salePaymentStage1, setSalePaymentStage1] = useState('93.600.000');

  // --- Sale Catalogs State ---
  const LAST_CATALOG_KEY = 'CUSTOMER_MANAGER_LAST_SALE_CATALOG_ID';
  const [catalogs, setCatalogs] = useState<SaleCatalogProfile[]>(() => loadSaleCatalogs());
  const [currentCatalogId, setCurrentCatalogId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('CUSTOMER_MANAGER_LAST_SALE_CATALOG_ID');
      if (saved && loadSaleCatalogs().some(c => c.id === saved)) {
        return saved;
      }
    }
    return 'spa-cosmetics';
  });
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchSaleCatalogsFromCloud().then(cloudList => {
      if (isMounted && cloudList && cloudList.length > 0) {
        setCatalogs(cloudList);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    const all = loadSaleCatalogs();
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('CUSTOMER_MANAGER_LAST_SALE_CATALOG_ID') : null;
    const initial = (savedId && all.find(c => c.id === savedId)) || all.find(c => c.id === 'spa-cosmetics') || all[0];
    return initial ? initial.items : [];
  });

  const handleSelectCatalogId = (id: string) => {
    setCurrentCatalogId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_CATALOG_KEY, id);
    }
    const selected = catalogs.find(c => c.id === id);
    if (selected) {
      setSaleItems([...selected.items]);
    }
  };

  const handleSaveNewCatalog = (name: string, category: string, items: SaleItem[]) => {
    const newProfile: SaleCatalogProfile = {
      id: `custom-${Date.now()}`,
      name,
      category,
      items,
    };
    const updated = saveSaleCatalog(newProfile);
    setCatalogs(updated);
    setCurrentCatalogId(newProfile.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_CATALOG_KEY, newProfile.id);
    }
    setSaleItems([...items]);
  };

  const handleDeleteCatalog = (id: string) => {
    const updated = deleteSaleCatalog(id);
    setCatalogs(updated);
    if (currentCatalogId === id && updated.length > 0) {
      setCurrentCatalogId(updated[0].id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_CATALOG_KEY, updated[0].id);
      }
      setSaleItems([...updated[0].items]);
    }
  };

  const handleResetCatalogs = () => {
    const resetList = resetSaleCatalogs();
    setCatalogs(resetList);
    setCurrentCatalogId(resetList[0].id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_CATALOG_KEY, resetList[0].id);
    }
    setSaleItems([...resetList[0].items]);
  };

  const handleAddSaleItem = () => {
    setSaleItems([
      ...saleItems,
      { id: Date.now().toString(), name: 'Mặt hàng mới', unit: 'Chai', quantity: 1, price: 100000 }
    ]);
  };


  const [payMethodType, setPayMethodType] = useState<'cash' | 'transfer'>('cash');
  const [payCashName, setPayCashName] = useState('PHẠM HỒNG ĐỨC');
  const [payCashCccd, setPayCashCccd] = useState('0720 7700 0901');
  const [payCashCccdDate, setPayCashCccdDate] = useState('25/05/2023');
  const [payCashCccdPlace, setPayCashCccdPlace] = useState('CCS QLHC về TTXH');

  const [payBankOwner, setPayBankOwner] = useState('PHẠM HỒNG ĐỨC');
  const [payBankAccNo, setPayBankAccNo] = useState('1023456789');
  const [payBankName, setPayBankName] = useState('Vietcombank');
  const [payBankBranch, setPayBankBranch] = useState('Chi nhánh Hà Tĩnh');

  const [payStages, setPayStages] = useState<any[]>([
    { id: '1', stageName: 'Đợt 1 (Đợt đầu tiên)', amount: '93.600.000', status: 'paid', note: 'Đã thanh toán đợt đầu' },
    { id: '2', stageName: 'Đợt 2 (Đợt này)', amount: '500.000.000', status: 'current', note: 'Thanh toán đợt này trước khi nhận hàng' }
  ]);

  const handleAddPayStage = () => {
    const nextIdx = payStages.length + 1;
    setPayStages([
      ...payStages,
      { id: Date.now().toString(), stageName: `Đợt ${nextIdx}`, amount: '100.000.000', status: 'current', note: 'Đề nghị thanh toán' }
    ]);
  };

  const currentTplInfo = TEMPLATE_LIST.find(t => t.id === selectedTemplate) || TEMPLATE_LIST[0];

  const constDurationMonths = monthsBetweenLabel(constStartDate, constEndDate) || 'theo thỏa thuận';
  const lhTermLabel = monthsBetweenLabel(mbStartDate, mbEndDate) || 'theo thỏa thuận';

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
    saleContractDate,
    saleBuyerName,
    saleBuyerAddress,
    saleSellerName,
    saleSellerCccd,
    saleSellerCccdDate,
    deposit,
    saleSellerCccdPlace,
    salePayMethod,
    saleBankOwner,
    saleBankAccNo,
    saleBankName,
    saleBankBranch,
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


  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <TemplateSelector
        styles={styles}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <DocumentForm
            styles={styles}
            selectedTemplate={selectedTemplate}
            mbContractDate={mbContractDate} setMbContractDate={setMbContractDate}
            mbPartyAName={mbPartyAName} setMbPartyAName={setMbPartyAName}
            mbPartyACccd={mbPartyACccd} setMbPartyACccd={setMbPartyACccd}
            mbPartyACccdDate={mbPartyACccdDate} setMbPartyACccdDate={setMbPartyACccdDate}
            mbPartyAAddress={mbPartyAAddress} setMbPartyAAddress={setMbPartyAAddress}
            mbPartyBName={mbPartyBName} setMbPartyBName={setMbPartyBName}
            mbPartyBCccd={mbPartyBCccd} setMbPartyBCccd={setMbPartyBCccd}
            mbPartyBCccdDate={mbPartyBCccdDate} setMbPartyBCccdDate={setMbPartyBCccdDate}
            mbPartyBAddress={mbPartyBAddress} setMbPartyBAddress={setMbPartyBAddress}
            mbLocation={mbLocation} setMbLocation={setMbLocation}
            mbStartDate={mbStartDate} setMbStartDate={setMbStartDate}
            mbEndDate={mbEndDate} setMbEndDate={setMbEndDate}
            mbMonthlyPrice={mbMonthlyPrice} setMbMonthlyPrice={setMbMonthlyPrice}
            mbDepositAmount={mbDepositAmount} setMbDepositAmount={setMbDepositAmount}
            lhFloors={lhFloors} setLhFloors={setLhFloors}
            lhLandArea={lhLandArea} setLhLandArea={setLhLandArea}
            lhHouseArea={lhHouseArea} setLhHouseArea={setLhHouseArea}
            lhHandoverDate={lhHandoverDate} setLhHandoverDate={setLhHandoverDate}
            lhPaymentDay={lhPaymentDay} setLhPaymentDay={setLhPaymentDay}
            constContractDate={constContractDate} setConstContractDate={setConstContractDate}
            constPartyAName={constPartyAName} setConstPartyAName={setConstPartyAName}
            constPartyACccd={constPartyACccd} setConstPartyACccd={setConstPartyACccd}
            constPartyAAddress={constPartyAAddress} setConstPartyAAddress={setConstPartyAAddress}
            constPartyBName={constPartyBName} setConstPartyBName={setConstPartyBName}
            constPartyBCccd={constPartyBCccd} setConstPartyBCccd={setConstPartyBCccd}
            constSiteAddress={constSiteAddress} setConstSiteAddress={setConstSiteAddress}
            constStartDate={constStartDate} setConstStartDate={setConstStartDate}
            constEndDate={constEndDate} setConstEndDate={setConstEndDate}
            constTotalPrice={constTotalPrice} setConstTotalPrice={setConstTotalPrice}
            constDepositStage1={constDepositStage1} setConstDepositStage1={setConstDepositStage1}
            constStage2Amount={constStage2Amount} setConstStage2Amount={setConstStage2Amount}
            constWarrantyMonths={constWarrantyMonths} setConstWarrantyMonths={setConstWarrantyMonths}
            constItems={constItems} setConstItems={setConstItems}
            handleAddConstItem={handleAddConstItem}
            saleContractDate={saleContractDate} setSaleContractDate={setSaleContractDate}
            saleBuyerName={saleBuyerName} setSaleBuyerName={setSaleBuyerName}
            saleBuyerAddress={saleBuyerAddress} setSaleBuyerAddress={setSaleBuyerAddress}
            saleSellerName={saleSellerName} setSaleSellerName={setSaleSellerName}
            saleSellerCccd={saleSellerCccd} setSaleSellerCccd={setSaleSellerCccd}
            saleSellerCccdDate={saleSellerCccdDate} setSaleSellerCccdDate={setSaleSellerCccdDate}
            saleSellerCccdPlace={saleSellerCccdPlace} setSaleSellerCccdPlace={setSaleSellerCccdPlace}
            salePayMethod={salePayMethod} setSalePayMethod={setSalePayMethod}
            saleBankOwner={saleBankOwner} setSaleBankOwner={setSaleBankOwner}
            saleBankAccNo={saleBankAccNo} setSaleBankAccNo={setSaleBankAccNo}
            saleBankName={saleBankName} setSaleBankName={setSaleBankName}
            saleBankBranch={saleBankBranch} setSaleBankBranch={setSaleBankBranch}
            saleStartDate={saleStartDate} setSaleStartDate={setSaleStartDate}
            saleEndDate={saleEndDate} setSaleEndDate={setSaleEndDate}
            salePaymentStage1={salePaymentStage1} setSalePaymentStage1={setSalePaymentStage1}
            saleItems={saleItems} setSaleItems={setSaleItems}
            handleAddSaleItem={handleAddSaleItem}
            catalogs={catalogs}
            currentCatalogId={currentCatalogId}
            onSelectCatalogId={handleSelectCatalogId}
            onOpenCatalogModal={() => setCatalogModalOpen(true)}
            payMethodType={payMethodType} setPayMethodType={setPayMethodType}
            payCashName={payCashName} setPayCashName={setPayCashName}
            payCashCccd={payCashCccd} setPayCashCccd={setPayCashCccd}
            payCashCccdDate={payCashCccdDate} setPayCashCccdDate={setPayCashCccdDate}
            payCashCccdPlace={payCashCccdPlace} setPayCashCccdPlace={setPayCashCccdPlace}
            payBankOwner={payBankOwner} setPayBankOwner={setPayBankOwner}
            payBankAccNo={payBankAccNo} setPayBankAccNo={setPayBankAccNo}
            payBankName={payBankName} setPayBankName={setPayBankName}
            payBankBranch={payBankBranch} setPayBankBranch={setPayBankBranch}
            deposit={deposit} setDeposit={setDeposit}
            payStages={payStages} setPayStages={setPayStages}
            handleAddPayStage={handleAddPayStage}
          />
        </div>

        <div className="lg:col-span-7">
          <DocumentPreview
            styles={styles}
            docTitle={currentTplInfo.label}
            docFilename={currentTplInfo.id}
            docHtml={generateDocHtml()}
            attachment={
              selectedTemplate === 'sale_contract' && salePayMethod === 'cash'
                ? {
                  title: 'Giấy cam kết',
                  filename: 'giay_cam_ket',
                  html: buildGiayCamKetHtml({
                    hoTen: saleSellerName,
                    cccd: saleSellerCccd,
                    ngayCap: saleSellerCccdDate,
                    noiCap: saleSellerCccdPlace,
                    ngayLap: saleContractDate,
                  }),
                }
                : undefined
            }
          />
        </div>
      </div>

      {/* Modal Quản lý / Thêm mới bộ mẫu danh mục hàng hóa */}
      <SaleCatalogModal
        isOpen={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        catalogs={catalogs}
        currentCatalogId={currentCatalogId}
        onSelectCatalog={(cat) => handleSelectCatalogId(cat.id)}
        onSaveNewCatalog={handleSaveNewCatalog}
        onDeleteCatalog={handleDeleteCatalog}
        onResetDefaults={handleResetCatalogs}
        currentSaleItems={saleItems}
      />
    </div>
  );
};
