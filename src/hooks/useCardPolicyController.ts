import { useState, useMemo, useCallback } from 'react';
import {
  CARD_COLLATERAL_KINDS,
  activeCardPolicies, searchCardPolicies,
  type CardCollateralKind,
} from '../lib/cardContract';
import { CARD_FEE_GROUPS, type CardFeeProfile } from '../lib/cardFeeProfiles';
import {
  loadCardFeeProfiles, addCardFeeProfile, updateCardFeeProfile,
  deleteCardFeeProfile, resetCardFeeProfiles, loadCommonFeeNote, saveCommonFeeNote,
} from '../lib/cardFeeStore';

export type MainTab = 'issuance' | 'fee-codes';
export type KindFilter = 'ALL' | CardCollateralKind;

export function useCardPolicyController() {
  const [mainTab, setMainTab] = useState<MainTab>('issuance');

  // --- Tab 1: Issuance Policy States ---
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

  // --- Tab 2: Card Fee Code Lookup States ---
  const [feeProfiles, setFeeProfiles] = useState<CardFeeProfile[]>(() => loadCardFeeProfiles());
  const [commonNote, setCommonNote] = useState<string>(() => loadCommonFeeNote());
  const [feeQuery, setFeeQuery] = useState('');
  const [feeGroup, setFeeGroup] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CardFeeProfile | null>(null);
  const [formData, setFormData] = useState<{
    group: string;
    cardType: string;
    productMan: string;
    feeIntProfile: string;
  }>({
    group: CARD_FEE_GROUPS[0],
    cardType: '',
    productMan: '',
    feeIntProfile: '',
  });

  // Edit Common Note Modal
  const [editingNote, setEditingNote] = useState(false);
  const [noteForm, setNoteForm] = useState(commonNote);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Issuance Policy Filters
  const rows = useMemo(() => {
    const found = searchCardPolicies(query);
    return kind === 'ALL' ? found : found.filter(p => p.collateralKind === kind);
  }, [query, kind]);

  const total = useMemo(() => activeCardPolicies().length, []);

  const countOf = useCallback((k: KindFilter) =>
    k === 'ALL' ? activeCardPolicies().length : activeCardPolicies().filter(p => p.collateralKind === k).length,
    []
  );

  // Fee Codes Filters
  const filteredFeeProfiles = useMemo(() => {
    const term = feeQuery.toLowerCase().trim();
    return feeProfiles.filter(p => {
      if (feeGroup !== 'ALL' && p.group !== feeGroup) return false;
      if (!term) return true;
      return (
        p.group.toLowerCase().includes(term) ||
        p.cardType.toLowerCase().includes(term) ||
        p.productMan.toLowerCase().includes(term) ||
        p.feeIntProfile.toLowerCase().includes(term)
      );
    });
  }, [feeProfiles, feeQuery, feeGroup]);

  // Grouped fee profiles for display
  const groupedProfiles = useMemo(() => {
    const groups: { name: string; items: CardFeeProfile[] }[] = [];
    const targetGroups = feeGroup === 'ALL' ? Array.from(CARD_FEE_GROUPS) : [feeGroup];

    for (const gname of targetGroups) {
      const items = filteredFeeProfiles.filter(p => p.group === gname);
      if (items.length > 0 || feeQuery) {
        groups.push({ name: gname, items });
      }
    }

    const otherItems = filteredFeeProfiles.filter(p => !CARD_FEE_GROUPS.includes(p.group as any));
    if (otherItems.length > 0) {
      groups.push({ name: 'Nhóm khác / Tùy chỉnh', items: otherItems });
    }

    return groups;
  }, [filteredFeeProfiles, feeGroup, feeQuery]);

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setFormData({
      group: feeGroup !== 'ALL' ? feeGroup : CARD_FEE_GROUPS[0],
      cardType: '',
      productMan: '',
      feeIntProfile: '',
    });
    setModalOpen(true);
  }, [feeGroup]);

  const openEditModal = useCallback((item: CardFeeProfile) => {
    setEditingItem(item);
    setFormData({
      group: item.group,
      cardType: item.cardType,
      productMan: item.productMan,
      feeIntProfile: item.feeIntProfile,
    });
    setModalOpen(true);
  }, []);

  const handleSaveModal = useCallback(() => {
    if (!formData.cardType.trim() || !formData.productMan.trim() || !formData.feeIntProfile.trim()) {
      alert('Vui lòng điền đầy đủ thông tin Loại thẻ, Product Man và Fee Int Profile.');
      return;
    }

    if (editingItem) {
      const updated = updateCardFeeProfile(editingItem.id, formData);
      setFeeProfiles(updated);
    } else {
      const updated = addCardFeeProfile(formData);
      setFeeProfiles(updated);
    }
    setModalOpen(false);
  }, [formData, editingItem]);

  const handleDeleteProfile = useCallback((id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá mã phí thẻ này?')) {
      const updated = deleteCardFeeProfile(id);
      setFeeProfiles(updated);
    }
  }, []);

  const handleResetDefaults = useCallback(() => {
    if (window.confirm('Khôi phục danh mục mã phí thẻ về dữ liệu gốc ban đầu? các chỉnh sửa cá nhân sẽ bị xoá.')) {
      const { profiles, note } = resetCardFeeProfiles();
      setFeeProfiles(profiles);
      setCommonNote(note);
      setNoteForm(note);
    }
  }, []);

  const handleSaveNote = useCallback(() => {
    saveCommonFeeNote(noteForm);
    setCommonNote(noteForm);
    setEditingNote(false);
  }, [noteForm]);

  return {
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
    total,
    countOf,
    filteredFeeProfiles,
    groupedProfiles,
    handleCopy,
    openAddModal,
    openEditModal,
    handleSaveModal,
    handleDeleteProfile,
    handleResetDefaults,
    handleSaveNote,
  };
}
