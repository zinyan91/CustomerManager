import { useCallback, useEffect, useState } from 'react';
import {
  fetchCustomersOf, fetchTransferHistory, previewTransfer, transferCustomers, type TransferLogEntry,
} from '../lib/api/customerTransferApi';
import { toggleAll, toggleSelected, type TransferCounts, type TransferCustomer } from '../lib/customerTransfer';

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Trạng thái màn chuyển giao: khách của người chuyển, lựa chọn, số hồ sơ sẽ chuyển (xem trước), nhật ký. */
export function useCustomerTransfer(fromId: string | null) {
  const [customers, setCustomers] = useState<TransferCustomer[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [counts, setCounts] = useState<TransferCounts | null>(null);
  const [history, setHistory] = useState<TransferLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!fromId) {
      setCustomers([]);
      return;
    }
    setLoadingCustomers(true);
    try {
      setCustomers(await fetchCustomersOf(fromId));
    } catch (err) {
      setCustomers([]);
      setError(message(err, 'Không nạp được khách hàng.'));
    } finally {
      setLoadingCustomers(false);
    }
  }, [fromId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchTransferHistory());
    } catch (err) {
      setHistory([]);
      setError(message(err, 'Không nạp được nhật ký chuyển giao.'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelected(new Set());
    setCounts(null);
    setError(null);
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!fromId || selected.size === 0) {
      setCounts(null);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      previewTransfer(fromId, [...selected])
        .then((c) => {
          if (active) setCounts(c);
        })
        .catch((err) => {
          if (active) {
            setCounts(null);
            setError(message(err, 'Không xem trước được chuyển giao.'));
          }
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fromId, selected]);

  const toggle = useCallback((id: number) => setSelected((s) => toggleSelected(s, id)), []);
  const toggleEvery = useCallback(() => setSelected((s) => toggleAll(customers, s)), [customers]);

  /** Chuyển các khách đang chọn. Ném lỗi để màn hiển thị; thành công thì nạp lại khách, nhật ký và xóa lựa chọn. */
  const run = useCallback(async (toId: string): Promise<TransferCounts> => {
    if (!fromId) throw new Error('Chọn người chuyển.');
    setRunning(true);
    setError(null);
    try {
      const result = await transferCustomers(fromId, toId, [...selected]);
      setSelected(new Set());
      setCounts(null);
      await Promise.all([loadCustomers(), loadHistory()]);
      return result;
    } finally {
      setRunning(false);
    }
  }, [fromId, selected, loadCustomers, loadHistory]);

  return { customers, selected, loadingCustomers, counts, history, historyLoading, running, error, toggle, toggleEvery, run };
}
