import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  computeInventorySummary, nextItemId, toTemplateItems,
  type InventoryItem,
} from '../lib/inventory';
import {
  loadInventoryTemplates, addInventoryTemplate, updateInventoryTemplate,
  deleteInventoryTemplate, resetInventoryTemplates, fetchInventoryTemplatesFromCloud,
  overwriteInventoryTemplateItems,
} from '../lib/templateStore';
import { nextSortState, sortRows, type SortState } from '../lib/tableSort';
import {
  INVENTORY_SORT_ACCESSORS, DEBT_SORT_ACCESSORS, type InventorySortKey, type DebtSortKey,
} from '../lib/inventoryLedgerSort';
import {
  fetchInventoryItemsDb, saveInventoryItemDb, saveAllInventoryItemsDb, deleteInventoryItemDb,
} from '../lib/inventoryDb';
import { type InventoryCategoryTemplate, type TemplateItem } from '../data/inventoryTemplates';
import { SAMPLE_RECEIVABLES, type ReceivableItem } from '../lib/debt';
import {
  buildInventoryLedgerDocHtml, buildInventoryLedgerTabXlsx, buildInventoryLedgerWorkbookXlsx,
  inventoryLedgerFileName, INVENTORY_LEDGER_TITLES, type InventoryLedgerTab,
} from '../lib/inventoryLedgerExport';
import { downloadBytes } from '../lib/xlsExport';
import { MIME_XLSX } from '../lib/xlsxWriter';
import { printHtmlDoc } from '../lib/printHtmlDoc';
import { parseMoneyDecimalInput, todayIso } from '../lib/utils';
import { useConfirm } from '../context/ConfirmContext';

export function useInventoryController() {
  const [activeSubTab, setActiveSubTab] = useState<InventoryLedgerTab>('inventory');

  // Industry Templates State
  const [templates, setTemplates] = useState<InventoryCategoryTemplate[]>(loadInventoryTemplates);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => templates[0]?.id || 'htk-lua-gao');

  // Customer & Context State
  const [categoryName, setCategoryName] = useState<string>(() => templates[0]?.name || 'HTK Lúa Gạo');
  const [customerName, setCustomerName] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>(() => todayIso());

  // Inventory items
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const tpl = templates.find(t => t.id === 'htk-lua-gao') || templates[0];
    return tpl ? tpl.items.map(it => ({ ...it, id: nextItemId() })) : [];
  });

  // Accounts Receivable items (TK 131)
  const [receivables, setReceivables] = useState<ReceivableItem[]>(SAMPLE_RECEIVABLES);

  // Accounts Payable items (TK 331)
  const [payables, setPayables] = useState<ReceivableItem[]>([
    {
      id: 'pay-1',
      code: 'NCC01',
      name: 'Công ty TNHH Xi măng Hà Tiên',
      beginningDebit: 0,
      beginningCredit: 150000000,
      occurredDebit: 50000000,
      occurredCredit: 80000000,
    },
    {
      id: 'pay-2',
      code: 'NCC02',
      name: 'Nhà máy Thép Hòa Phát',
      beginningDebit: 0,
      beginningCredit: 320000000,
      occurredDebit: 120000000,
      occurredCredit: 200000000,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New item form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Cái');
  const [newPriceStr, setNewPriceStr] = useState('');
  const [newBegQtyStr, setNewBegQtyStr] = useState('');
  const [newImpQtyStr, setNewImpQtyStr] = useState('');
  const [newExpQtyStr, setNewExpQtyStr] = useState('');

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  }, []);

  // Fetch Industry Templates from Database / Supabase Cloud on mount
  useEffect(() => {
    let active = true;
    fetchInventoryTemplatesFromCloud().then(cloudList => {
      if (active && cloudList && cloudList.length > 0) {
        setTemplates(cloudList);
        if (!cloudList.some(t => t.id === selectedTemplateId)) {
          setSelectedTemplateId(cloudList[0].id);
          setCategoryName(cloudList[0].name);
        }
      }
    });
    return () => { active = false; };
  }, [selectedTemplateId]);

  // Fetch Inventory items from Database on mount or category change
  useEffect(() => {
    let active = true;
    fetchInventoryItemsDb(categoryName).then(dbItems => {
      if (active && dbItems && dbItems.length > 0) {
        setItems(dbItems);
      }
    });
    return () => { active = false; };
  }, [categoryName]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setCategoryName(tpl.name);
      fetchInventoryItemsDb(tpl.name).then(dbItems => {
        if (dbItems && dbItems.length > 0) {
          setItems(dbItems);
        } else {
          const newItems = tpl.items.map(it => ({ ...it, id: nextItemId() }));
          setItems(newItems);
          saveAllInventoryItemsDb(newItems, tpl.name);
        }
      });
      showNotify('success', `Đã nạp danh mục: ${tpl.name}.`);
    }
  }, [templates, showNotify]);

  // Template CRUD actions
  const handleSaveTemplate = useCallback((name: string, tplItems: TemplateItem[], templateId?: string) => {
    let updated: InventoryCategoryTemplate[];
    if (templateId) {
      updated = updateInventoryTemplate(templateId, name, tplItems);
      showNotify('success', `Đã cập nhật Mẫu ngành hàng: ${name}`);
    } else {
      const res = addInventoryTemplate(name, tplItems);
      updated = res.templates;
      setSelectedTemplateId(res.newTemplate.id);
      setCategoryName(res.newTemplate.name);
      const newItems = res.newTemplate.items.map(it => ({ ...it, id: nextItemId() }));
      setItems(newItems);
      saveAllInventoryItemsDb(newItems, res.newTemplate.name);
      showNotify('success', `Đã tạo mới Mẫu ngành hàng: ${name}`);
    }
    setTemplates(updated);
  }, [showNotify]);

  const handleDeleteTemplate = useCallback((id: string) => {
    const updated = deleteInventoryTemplate(id);
    setTemplates(updated);
    if (selectedTemplateId === id) {
      const first = updated[0];
      if (first) {
        setSelectedTemplateId(first.id);
        setCategoryName(first.name);
        fetchInventoryItemsDb(first.name).then(dbItems => {
          if (dbItems && dbItems.length > 0) {
            setItems(dbItems);
          } else {
            const newItems = first.items.map(it => ({ ...it, id: nextItemId() }));
            setItems(newItems);
            saveAllInventoryItemsDb(newItems, first.name);
          }
        });
      } else {
        setItems([]);
      }
    }
    showNotify('success', 'Đã xóa ngành hàng.');
  }, [selectedTemplateId, showNotify]);

  const handleResetTemplates = useCallback(() => {
    const defaultTpls = resetInventoryTemplates();
    setTemplates(defaultTpls);
    if (defaultTpls[0]) {
      setSelectedTemplateId(defaultTpls[0].id);
      setCategoryName(defaultTpls[0].name);
      const newItems = defaultTpls[0].items.map(it => ({ ...it, id: nextItemId() }));
      setItems(newItems);
      saveAllInventoryItemsDb(newItems, defaultTpls[0].name);
    }
    showNotify('success', 'Đã khôi phục về danh mục 8 ngành hàng mặc định.');
  }, [showNotify]);

  const handleAddItem = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotify('error', 'Vui lòng nhập tên sản phẩm.');
      return;
    }
    const item: InventoryItem = {
      id: nextItemId(),
      code: newCode.trim() || `SP${items.length + 1}`,
      name: newName.trim(),
      unit: newUnit.trim() || 'Cái',
      unitPrice: parseMoneyDecimalInput(newPriceStr),
      beginningQty: parseMoneyDecimalInput(newBegQtyStr),
      importQty: parseMoneyDecimalInput(newImpQtyStr),
      exportQty: parseMoneyDecimalInput(newExpQtyStr),
    };
    setItems(prev => [item, ...prev]);
    saveInventoryItemDb(item, categoryName);
    setNewCode('');
    setNewName('');
    setNewPriceStr('');
    setNewBegQtyStr('');
    setNewImpQtyStr('');
    setNewExpQtyStr('');
    showNotify('success', `Đã thêm mặt hàng (đã lưu CSDL): ${item.name}`);
  }, [newName, newCode, items.length, newUnit, newPriceStr, newBegQtyStr, newImpQtyStr, newExpQtyStr, categoryName, showNotify]);

  const updateItem = useCallback((id: string, patch: Partial<InventoryItem>) => {
    setItems(prev => {
      const next = prev.map(it => {
        if (it.id === id) {
          const updated = { ...it, ...patch };
          saveInventoryItemDb(updated, categoryName);
          return updated;
        }
        return it;
      });
      return next;
    });
  }, [categoryName]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    deleteInventoryItemDb(id);
  }, []);

  const confirm = useConfirm();

  const clearAllItems = useCallback(async () => {
    const ok = await confirm({
      title: 'Xóa toàn bộ mặt hàng',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ mặt hàng khỏi danh mục này?',
      confirmText: 'Xóa toàn bộ',
      tone: 'danger',
    });
    if (ok) {
      items.forEach(it => deleteInventoryItemDb(it.id));
      setItems([]);
      showNotify('success', 'Đã xóa toàn bộ bảng dữ liệu trong CSDL.');
    }
  }, [confirm, items, showNotify]);

  const [inventorySort, setInventorySort] = useState<SortState<InventorySortKey> | null>(null);
  const [receivableSort, setReceivableSort] = useState<SortState<DebtSortKey> | null>(null);
  const [payableSort, setPayableSort] = useState<SortState<DebtSortKey> | null>(null);

  const toggleInventorySort = useCallback((key: InventorySortKey) => setInventorySort(prev => nextSortState(prev, key)), []);
  const toggleReceivableSort = useCallback((key: DebtSortKey) => setReceivableSort(prev => nextSortState(prev, key)), []);
  const togglePayableSort = useCallback((key: DebtSortKey) => setPayableSort(prev => nextSortState(prev, key)), []);

  const sortedItems = useMemo(() => sortRows(items, inventorySort, INVENTORY_SORT_ACCESSORS), [items, inventorySort]);
  const sortedReceivables = useMemo(() => sortRows(receivables, receivableSort, DEBT_SORT_ACCESSORS), [receivables, receivableSort]);
  const sortedPayables = useMemo(() => sortRows(payables, payableSort, DEBT_SORT_ACCESSORS), [payables, payableSort]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return sortedItems;
    const term = searchTerm.toLowerCase().trim();
    return sortedItems.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term) || it.unit.toLowerCase().includes(term)
    );
  }, [sortedItems, searchTerm]);

  const summary = useMemo(() => computeInventorySummary(items), [items]);

  const handleOverwriteTemplate = useCallback(async () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
      showNotify('error', 'Chưa chọn mẫu ngành hàng để lưu đè.');
      return;
    }
    const ok = await confirm({
      title: 'Lưu đè mẫu ngành hàng',
      message: `${sortedItems.length} mặt hàng đang có trong bảng sẽ thay toàn bộ danh sách của mẫu "${template.name}" (${template.items.length} mặt hàng).`,
      confirmText: 'Lưu đè mẫu',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      setTemplates(await overwriteInventoryTemplateItems(templates, template.id, toTemplateItems(sortedItems)));
      showNotify('success', `Đã lưu đè mẫu "${template.name}" với ${sortedItems.length} mặt hàng.`);
    } catch (err: any) {
      showNotify('error', `Lưu đè mẫu thất bại: ${err.message}`);
    }
  }, [templates, selectedTemplateId, sortedItems, confirm, showNotify]);

  const exportContext = useMemo(
    () => ({ categoryName, customerName: customerName.trim() || undefined, recordDate }),
    [categoryName, customerName, recordDate],
  );
  const ledgerData = useMemo(
    () => ({ items: sortedItems, receivables: sortedReceivables, payables: sortedPayables }),
    [sortedItems, sortedReceivables, sortedPayables],
  );

  const handleExportExcel = useCallback((scope: 'tab' | 'all') => {
    try {
      const bytes = scope === 'all'
        ? buildInventoryLedgerWorkbookXlsx(ledgerData, exportContext)
        : buildInventoryLedgerTabXlsx(activeSubTab, ledgerData, exportContext);
      const fn = inventoryLedgerFileName(scope === 'all' ? 'all' : activeSubTab, exportContext, 'xlsx');
      downloadBytes(bytes, fn, MIME_XLSX);
      showNotify('success', `Đã xuất file Excel: ${fn}`);
    } catch (err: any) {
      showNotify('error', `Lỗi xuất file Excel: ${err.message}`);
    }
  }, [activeSubTab, ledgerData, exportContext, showNotify]);

  const handlePrintHtml = useCallback(() => {
    try {
      const html = buildInventoryLedgerDocHtml(activeSubTab, ledgerData, exportContext);
      if (!printHtmlDoc(html, INVENTORY_LEDGER_TITLES[activeSubTab])) {
        showNotify('error', 'Trình duyệt không mở được khung in.');
      }
    } catch (err: any) {
      showNotify('error', `Lỗi in ấn: ${err.message}`);
    }
  }, [activeSubTab, ledgerData, exportContext, showNotify]);

  return {
    activeSubTab,
    setActiveSubTab,
    templates,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    selectedTemplateId,
    categoryName,
    setCategoryName,
    customerName,
    setCustomerName,
    recordDate,
    setRecordDate,
    items,
    setItems,
    receivables,
    setReceivables,
    payables,
    setPayables,
    searchTerm,
    setSearchTerm,
    notification,
    setNotification,
    showNotify,
    newCode,
    setNewCode,
    newName,
    setNewName,
    newUnit,
    setNewUnit,
    newPriceStr,
    setNewPriceStr,
    newBegQtyStr,
    setNewBegQtyStr,
    newImpQtyStr,
    setNewImpQtyStr,
    newExpQtyStr,
    setNewExpQtyStr,
    filteredItems,
    sortedReceivables,
    sortedPayables,
    inventorySort,
    receivableSort,
    payableSort,
    toggleInventorySort,
    toggleReceivableSort,
    togglePayableSort,
    handleOverwriteTemplate,
    summary,
    handleSelectTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleResetTemplates,
    handleAddItem,
    updateItem,
    removeItem,
    clearAllItems,
    handleExportExcel,
    handlePrintHtml,
  };
}
