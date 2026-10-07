import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStorageConfig } from '../../hooks/useStorageConfig';
import { DriveConnectionSection } from '../storage/DriveConnectionSection';
import { HfTokenSection } from '../storage/HfTokenSection';
import { StorageReposSection } from '../storage/StorageReposSection';

const HEADING = 'text-sm font-bold text-slate-900 dark:text-slate-100 uppercase';

function StorageConfigBody() {
  const { auth, repos, loading, error, reload } = useStorageConfig();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Cấu hình kho lưu trữ</h1>

      {error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <section className="space-y-2">
        <h2 className={HEADING}>Google Drive</h2>
        <DriveConnectionSection />
      </section>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang nạp cấu hình...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="space-y-2">
            <h2 className={HEADING}>Tài khoản Hugging Face</h2>
            <HfTokenSection auth={auth} onSaved={reload} />
          </section>

          <section className="space-y-2">
            <h2 className={HEADING}>Danh sách repo</h2>
            <StorageReposSection auth={auth} repos={repos} onChanged={reload} />
          </section>
        </>
      )}
    </div>
  );
}

/** Cấu hình kho lưu trữ trong khu quản trị: kết nối Google Drive, token Hugging Face, danh sách repo. Chỉ Master Admin. */
export function StorageConfigView() {
  const { can } = useAuth();

  if (!can('storage.configure')) {
    return (
      <div role="alert" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Chỉ Master Admin cấu hình được kho lưu trữ.</span>
      </div>
    );
  }

  return <StorageConfigBody />;
}
