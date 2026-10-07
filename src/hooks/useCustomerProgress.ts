import { useEffect, useMemo, useState } from 'react';
import { fetchCustomerProgressAPI } from '../lib/api/customerProgressApi';
import type { CustomerProgress } from '../lib/customerProgress';

interface ProgressState {
  /** Khóa danh sách mã đã nạp, để biết dữ liệu có còn đúng với danh sách hiện tại. */
  key: string;
  map: Map<number, CustomerProgress> | null;
  error: string | null;
}

/**
 * Tiến độ hồ sơ của các khách hàng đang hiện. Chưa nạp xong hoặc lỗi thì `progress` là null:
 * giao diện phải hiện trạng thái chờ hoặc lỗi, không được hiện "chưa có hồ sơ" thay cho dữ liệu chưa đến.
 */
export function useCustomerProgress(customerIds: number[]) {
  const key = useMemo(() => [...customerIds].sort((a, b) => a - b).join(','), [customerIds]);
  const [state, setState] = useState<ProgressState>({ key: '', map: null, error: null });

  useEffect(() => {
    if (key === '') return;
    let active = true;
    fetchCustomerProgressAPI(key.split(',').map(Number))
      .then((map) => active && setState({ key, map, error: null }))
      .catch((err) => active && setState({ key, map: null, error: err instanceof Error ? err.message : 'Không nạp được tiến độ hồ sơ.' }));
    return () => {
      active = false;
    };
  }, [key]);

  const current = state.key === key;
  return {
    progress: current ? state.map : null,
    error: current ? state.error : null,
    loading: key !== '' && !current,
  };
}
