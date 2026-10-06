import { useEffect, useState } from 'react';
import { fetchHfAuth } from '../lib/huggingface/hfConfigApi';

/** Token Hugging Face dùng chung (SystemConfig) để mở/tải tệp. Rỗng khi chưa cấu hình hoặc lỗi. */
export function useHfToken() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchHfAuth()
      .then((auth) => {
        if (active) setToken(auth?.token ?? '');
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không đọc được cấu hình kho lưu trữ.');
      });
    return () => {
      active = false;
    };
  }, []);

  return { token, error };
}
