import { useState } from 'react';
import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import type { StorageRepo } from '../../types/storageRepo';
import { useAuth } from '../../context/AuthContext';
import { useStorageConfig } from '../../hooks/useStorageConfig';
import { ConfigCard } from '../storage/ConfigCard';
import { DriveConnectionSection } from '../storage/DriveConnectionSection';
import { HfTokenSection } from '../storage/HfTokenSection';
import { RepoMigrationPanel } from '../storage/RepoMigrationPanel';
import { StorageReposSection } from '../storage/StorageReposSection';

function Loading() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Đang nạp cấu hình...</span>
    </div>
  );
}

function StorageConfigBody() {
  const { auth, repos, loading, error, reload } = useStorageConfig();
  const [migrating, setMigrating] = useState<StorageRepo | null>(null);
  const ready = !loading && !error;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Cấu hình kho lưu trữ</h1>

      {error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="space-y-5 min-w-0">
          <ConfigCard title="Danh sách repo">
            {loading && <Loading />}
            {ready && <StorageReposSection auth={auth} repos={repos} onChanged={reload} onMigrate={setMigrating} />}
          </ConfigCard>
        </div>

        <div className="space-y-5 min-w-0">
          {migrating && (
            <RepoMigrationPanel key={migrating.id} repo={migrating} hfToken={auth?.token ?? ''} onDone={reload} onClose={() => setMigrating(null)} />
          )}
          <ConfigCard title="Google Drive">
            <DriveConnectionSection />
          </ConfigCard>
          <ConfigCard title="Tài khoản Hugging Face">
            {loading && <Loading />}
            {ready && <HfTokenSection auth={auth} onSaved={reload} />}
          </ConfigCard>
        </div>
      </div>
    </div>
  );
}

/** Cấu hình kho lưu trữ trong khu quản trị: danh sách repo và việc chuyển sang Drive, kết nối Google Drive, token Hugging Face. Chỉ Master Admin. */
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
