import React from 'react';
import { PANEL, HEADING_SCREEN } from '../../lib/uiClasses';
import { CARD_POLICY_SOURCE } from '../../lib/cardContract';
import { BookOpen, Tag } from 'lucide-react';
import { useCardPolicyController } from '../../hooks/useCardPolicyController';
import { CardPolicyRulesTab } from '../card/CardPolicyRulesTab';
import { CardFeeScheduleTab } from '../card/CardFeeScheduleTab';
import { CardFeeModal } from '../card/CardFeeModal';

export const CardPolicyLookupView: React.FC = () => {
  const {
    mainTab,
    setMainTab,
    query,
    setQuery,
    kind,
    setKind,
    openKey,
    setOpenKey,
    feeProfiles,
    commonNote,
    feeQuery,
    setFeeQuery,
    feeGroup,
    setFeeGroup,
    copiedCode,
    modalOpen,
    setModalOpen,
    editingItem,
    formData,
    setFormData,
    editingNote,
    setEditingNote,
    noteForm,
    setNoteForm,
    rows,
    countOf,
    groupedProfiles,
    handleCopy,
    openAddModal,
    openEditModal,
    handleSaveModal,
    handleDeleteProfile,
    handleResetDefaults,
    handleSaveNote,
  } = useCardPolicyController();

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10 text-xs">
      {/* Top Header & Tab Switcher */}
      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
            <BookOpen size={16} /> TRA CỨU QUY ĐỊNH PHÁT HÀNH & BIỂU PHÍ THẺ TÍN DỤNG
          </div>
          <div className="text-[11px] text-ink-faint">
            Nguồn: <span className="font-semibold text-ink">QĐ {CARD_POLICY_SOURCE.decision} ({CARD_POLICY_SOURCE.issuedDate})</span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-line pt-2">
          <button
            type="button"
            onClick={() => setMainTab('issuance')}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              mainTab === 'issuance'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <BookOpen size={14} /> Chính sách & Hạn mức phát hành
          </button>
          <button
            type="button"
            onClick={() => setMainTab('fee-codes')}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              mainTab === 'fee-codes'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Tag size={14} /> Mã Phí Thẻ (Fee Int Profile)
          </button>
        </div>
      </div>

      {/* Tab 1: Chính sách & Hạn mức phát hành thẻ */}
      {mainTab === 'issuance' && (
        <CardPolicyRulesTab
          query={query}
          setQuery={setQuery}
          kind={kind}
          setKind={setKind}
          openKey={openKey}
          setOpenKey={setOpenKey}
          rows={rows}
          countOf={countOf}
        />
      )}

      {/* Tab 2: Biểu phí & Mã Profile thẻ */}
      {mainTab === 'fee-codes' && (
        <CardFeeScheduleTab
          feeProfiles={feeProfiles}
          feeQuery={feeQuery}
          setFeeQuery={setFeeQuery}
          feeGroup={feeGroup}
          setFeeGroup={setFeeGroup}
          copiedCode={copiedCode}
          commonNote={commonNote}
          editingNote={editingNote}
          setEditingNote={setEditingNote}
          noteForm={noteForm}
          setNoteForm={setNoteForm}
          groupedProfiles={groupedProfiles}
          handleCopy={handleCopy}
          openAddModal={openAddModal}
          openEditModal={openEditModal}
          handleDeleteProfile={handleDeleteProfile}
          handleResetDefaults={handleResetDefaults}
          handleSaveNote={handleSaveNote}
        />
      )}

      {/* Add / Edit Profile Modal */}
      <CardFeeModal
        isOpen={modalOpen}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveModal}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
