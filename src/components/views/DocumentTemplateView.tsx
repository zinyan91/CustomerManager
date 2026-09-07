import React, { useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { TemplateSelector } from '../documents/TemplateSelector';
import { DocumentForm } from '../documents/DocumentForm';
import { DocumentPreview } from '../documents/DocumentPreview';
import { buildGiayCamKetHtml } from '../../lib/documentHtml';
import { SaleCatalogModal } from '../documents/SaleCatalogModal';
import { useDocumentTemplateController } from '../../hooks/useDocumentTemplateController';
import { useDocumentDossierController } from '../../hooks/useDocumentDossierController';
import { DossierWorkspace } from '../documents/dossier/DossierWorkspace';

export const DocumentTemplateView: React.FC = () => {
  const styles = UI;
  const ctrl = useDocumentTemplateController();
  const [mode, setMode] = useState<'legacy' | 'dossier'>('legacy');
  const dossierCtrl = useDocumentDossierController();

  return (
    <div className="rounded-2xl border border-line/70 bg-panel/90 shadow-sm overflow-hidden text-xs font-app animate-in fade-in duration-150">
      {/* 1. Header chọn biểu mẫu liền mạch */}
      <TemplateSelector
        styles={styles}
        selectedTemplate={ctrl.selectedTemplate}
        setSelectedTemplate={(t) => { ctrl.setSelectedTemplate(t); setMode('legacy'); }}
      />

      {/* 1b. Chuyển chế độ: mẫu lẻ (cũ) ↔ bộ hồ sơ (mới, song song) */}
      <div className="px-3.5 sm:px-4 py-2.5 border-b border-line/60 bg-surface/30 flex flex-wrap gap-2">
        {dossierCtrl.dossiers.map(d => {
          const active = mode === 'dossier' && dossierCtrl.activeDossier.id === d.id;
          const Icon = d.icon;
          return (
            <button key={d.id} type="button"
              onClick={() => { setMode('dossier'); dossierCtrl.selectDossier(d.id); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                active ? 'bg-accent text-accent-ink border-accent'
                  : 'bg-surface text-ink-muted border-line/70 hover:border-accent'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      {mode === 'dossier' ? (
        <DossierWorkspace styles={styles} ctrl={dossierCtrl} />
      ) : (
      /* 2. Không gian làm việc 2 cột liền mạch - KHÔNG CÓ KHOẢNG HỞ Ở GIỮA */
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line/60">
        {/* Cột trái: Form nhập liệu liền mạch */}
        <div className="lg:col-span-6 lg:self-start p-4 sm:p-6 bg-panel/30">
          <DocumentForm
            styles={styles}
            selectedTemplate={ctrl.selectedTemplate}
            mbContractDate={ctrl.mbContractDate} setMbContractDate={ctrl.setMbContractDate}
            mbPartyAName={ctrl.mbPartyAName} setMbPartyAName={ctrl.setMbPartyAName}
            mbPartyACccd={ctrl.mbPartyACccd} setMbPartyACccd={ctrl.setMbPartyACccd}
            mbPartyACccdDate={ctrl.mbPartyACccdDate} setMbPartyACccdDate={ctrl.setMbPartyACccdDate}
            mbPartyAAddress={ctrl.mbPartyAAddress} setMbPartyAAddress={ctrl.setMbPartyAAddress}
            mbPartyBName={ctrl.mbPartyBName} setMbPartyBName={ctrl.setMbPartyBName}
            mbPartyBCccd={ctrl.mbPartyBCccd} setMbPartyBCccd={ctrl.setMbPartyBCccd}
            mbPartyBCccdDate={ctrl.mbPartyBCccdDate} setMbPartyBCccdDate={ctrl.setMbPartyBCccdDate}
            mbPartyBAddress={ctrl.mbPartyBAddress} setMbPartyBAddress={ctrl.setMbPartyBAddress}
            mbLocation={ctrl.mbLocation} setMbLocation={ctrl.setMbLocation}
            mbStartDate={ctrl.mbStartDate} setMbStartDate={ctrl.setMbStartDate}
            mbEndDate={ctrl.mbEndDate} setMbEndDate={ctrl.setMbEndDate}
            mbMonthlyPrice={ctrl.mbMonthlyPrice} setMbMonthlyPrice={ctrl.setMbMonthlyPrice}
            mbDepositAmount={ctrl.mbDepositAmount} setMbDepositAmount={ctrl.setMbDepositAmount}
            lhFloors={ctrl.lhFloors} setLhFloors={ctrl.setLhFloors}
            lhLandArea={ctrl.lhLandArea} setLhLandArea={ctrl.setLhLandArea}
            lhHouseArea={ctrl.lhHouseArea} setLhHouseArea={ctrl.setLhHouseArea}
            lhHandoverDate={ctrl.lhHandoverDate} setLhHandoverDate={ctrl.setLhHandoverDate}
            lhPaymentDay={ctrl.lhPaymentDay} setLhPaymentDay={ctrl.setLhPaymentDay}
            constContractDate={ctrl.constContractDate} setConstContractDate={ctrl.setConstContractDate}
            constPartyAName={ctrl.constPartyAName} setConstPartyAName={ctrl.setConstPartyAName}
            constPartyACccd={ctrl.constPartyACccd} setConstPartyACccd={ctrl.setConstPartyACccd}
            constPartyAAddress={ctrl.constPartyAAddress} setConstPartyAAddress={ctrl.setConstPartyAAddress}
            constPartyBName={ctrl.constPartyBName} setConstPartyBName={ctrl.setConstPartyBName}
            constPartyBCccd={ctrl.constPartyBCccd} setConstPartyBCccd={ctrl.setConstPartyBCccd}
            constSiteAddress={ctrl.constSiteAddress} setConstSiteAddress={ctrl.setConstSiteAddress}
            constStartDate={ctrl.constStartDate} setConstStartDate={ctrl.setConstStartDate}
            constEndDate={ctrl.constEndDate} setConstEndDate={ctrl.setConstEndDate}
            constTotalPrice={ctrl.constTotalPrice} setConstTotalPrice={ctrl.setConstTotalPrice}
            constDepositStage1={ctrl.constDepositStage1} setConstDepositStage1={ctrl.setConstDepositStage1}
            constStage2Amount={ctrl.constStage2Amount} setConstStage2Amount={ctrl.setConstStage2Amount}
            constWarrantyMonths={ctrl.constWarrantyMonths} setConstWarrantyMonths={ctrl.setConstWarrantyMonths}
            constItems={ctrl.constItems} setConstItems={ctrl.setConstItems}
            handleAddConstItem={ctrl.handleAddConstItem}
            saleContractDate={ctrl.saleContractDate} setSaleContractDate={ctrl.setSaleContractDate}
            saleBuyerName={ctrl.saleBuyerName} setSaleBuyerName={ctrl.setSaleBuyerName}
            saleBuyerAddress={ctrl.saleBuyerAddress} setSaleBuyerAddress={ctrl.setSaleBuyerAddress}
            saleSellerName={ctrl.saleSellerName} setSaleSellerName={ctrl.setSaleSellerName}
            saleSellerCccd={ctrl.saleSellerCccd} setSaleSellerCccd={ctrl.setSaleSellerCccd}
            saleSellerCccdDate={ctrl.saleSellerCccdDate} setSaleSellerCccdDate={ctrl.setSaleSellerCccdDate}
            saleSellerCccdPlace={ctrl.saleSellerCccdPlace} setSaleSellerCccdPlace={ctrl.setSaleSellerCccdPlace}
            salePayMethod={ctrl.salePayMethod} setSalePayMethod={ctrl.setSalePayMethod}
            saleBankOwner={ctrl.saleBankOwner} setSaleBankOwner={ctrl.setSaleBankOwner}
            saleBankAccNo={ctrl.saleBankAccNo} setSaleBankAccNo={ctrl.setSaleBankAccNo}
            saleBankName={ctrl.saleBankName} setSaleBankName={ctrl.setSaleBankName}
            saleBankBranch={ctrl.saleBankBranch} setSaleBankBranch={ctrl.setSaleBankBranch}
            saleStartDate={ctrl.saleStartDate} setSaleStartDate={ctrl.setSaleStartDate}
            saleEndDate={ctrl.saleEndDate} setSaleEndDate={ctrl.setSaleEndDate}
            salePaymentStage1={ctrl.salePaymentStage1} setSalePaymentStage1={ctrl.setSalePaymentStage1}
            saleItems={ctrl.saleItems} setSaleItems={ctrl.setSaleItems}
            handleAddSaleItem={ctrl.handleAddSaleItem}
            catalogs={ctrl.catalogs}
            currentCatalogId={ctrl.currentCatalogId}
            onSelectCatalogId={ctrl.handleSelectCatalogId}
            onOpenCatalogModal={() => ctrl.setCatalogModalOpen(true)}
            payMethodType={ctrl.payMethodType} setPayMethodType={ctrl.setPayMethodType}
            recipientTitle={ctrl.recipientTitle} setRecipientTitle={ctrl.setRecipientTitle}
            payCashName={ctrl.payCashName} setPayCashName={ctrl.setPayCashName}
            payCashCccd={ctrl.payCashCccd} setPayCashCccd={ctrl.setPayCashCccd}
            payCashCccdDate={ctrl.payCashCccdDate} setPayCashCccdDate={ctrl.setPayCashCccdDate}
            payCashCccdPlace={ctrl.payCashCccdPlace} setPayCashCccdPlace={ctrl.setPayCashCccdPlace}
            payBankOwner={ctrl.payBankOwner} setPayBankOwner={ctrl.setPayBankOwner}
            payBankAccNo={ctrl.payBankAccNo} setPayBankAccNo={ctrl.setPayBankAccNo}
            payBankName={ctrl.payBankName} setPayBankName={ctrl.setPayBankName}
            payBankBranch={ctrl.payBankBranch} setPayBankBranch={ctrl.setPayBankBranch}
            deposit={ctrl.deposit} setDeposit={ctrl.setDeposit}
            payStages={ctrl.payStages} setPayStages={ctrl.setPayStages}
            handleAddPayStage={ctrl.handleAddPayStage}
          />
        </div>

        {/* Cột phải: Xem trước tài liệu A4 liền mạch */}
        <div className="lg:col-span-6 flex flex-col bg-surface/20 min-h-[700px]">
          <DocumentPreview
            styles={styles}
            docTitle={ctrl.currentTplInfo.label}
            docFilename={ctrl.currentTplInfo.id}
            docHtml={ctrl.generateDocHtml()}
            attachment={
              ctrl.selectedTemplate === 'sale_contract' && ctrl.salePayMethod === 'cash'
                ? {
                  title: 'Giấy cam kết',
                  filename: 'giay_cam_ket',
                  html: buildGiayCamKetHtml({
                    hoTen: ctrl.saleSellerName,
                    cccd: ctrl.saleSellerCccd,
                    ngayCap: ctrl.saleSellerCccdDate,
                    noiCap: ctrl.saleSellerCccdPlace,
                    ngayLap: ctrl.saleContractDate,
                  }),
                }
                : undefined
            }
          />
        </div>
      </div>
      )}

      {/* Modal Quản lý / Thêm mới bộ mẫu danh mục hàng hóa */}
      <SaleCatalogModal
        isOpen={ctrl.catalogModalOpen}
        onClose={() => ctrl.setCatalogModalOpen(false)}
        catalogs={ctrl.catalogs}
        currentCatalogId={ctrl.currentCatalogId}
        onSelectCatalog={(cat) => ctrl.handleSelectCatalogId(cat.id)}
        onSaveNewCatalog={ctrl.handleSaveNewCatalog}
        onDeleteCatalog={ctrl.handleDeleteCatalog}
        onResetDefaults={ctrl.handleResetCatalogs}
        currentSaleItems={ctrl.saleItems}
      />
    </div>
  );
};
