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
    <div data-workspace-page className="space-y-0 w-full font-app animate-in fade-in duration-150">
      {/* Top Header & Tab Switcher */}
      <div data-workspace-panel className={`${PANEL} p-4 sm:p-5 rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`${HEADING_SCREEN} flex items-center gap-2.5`}>
            <div className="p-2 bg-accent-soft rounded-xl text-accent">
              <BookOpen size={18} />
            </div>
            <span className="text-sm sm:text-base font-bold text-accent tracking-tight">
              TRA CỨU QUY ĐỊNH PHÁT HÀNH & BIỂU PHÍ THẺ TÍN DỤNG
            </span>
          </div>
          <div className="text-xs text-ink-faint">
            Nguồn: <span className="font-semibold text-ink">QĐ {CARD_POLICY_SOURCE.decision} ({CARD_POLICY_SOURCE.issuedDate})</span>
          </div>
        </div>

        <div className="flex gap-2 border-b border-line/60 pt-2">
          <button
            type="button"
            onClick={() => setMainTab('issuance')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              mainTab === 'issuance'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
            }`}
          >
            <BookOpen size={14} /> Chính sách & Hạn mức phát hành
          </button>
          <button
            type="button"
            onClick={() => setMainTab('fee-codes')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              mainTab === 'fee-codes'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
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
