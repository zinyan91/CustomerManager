import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStorageConfig } from '../../hooks/useStorageConfig';
import { ConfigCard } from '../storage/ConfigCard';
import { DriveConnectionSection } from '../storage/DriveConnectionSection';
import { StorageReposSection } from '../storage/StorageReposSection';
import { AdminPageHeader } from '../admin/AdminPageHeader';

function Loading() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Đang nạp cấu hình...</span>
    </div>
  );
}

function StorageConfigBody() {
  const { repos, loading, error, reload } = useStorageConfig();
  const ready = !loading && !error;

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Cấu hình kho lưu trữ" />

      {error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-neg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="space-y-5 min-w-0">
          <ConfigCard title="Danh sách repo">
            {loading && <Loading />}
            {ready && <StorageReposSection repos={repos} onChanged={reload} />}
          </ConfigCard>
        </div>

        <div className="space-y-5 min-w-0">
          <ConfigCard title="Google Drive">
            <DriveConnectionSection />
          </ConfigCard>
        </div>
      </div>
    </div>
  );
}

/** Cấu hình kho lưu trữ trong khu quản trị: danh sách repo và kết nối Google Drive. Chỉ Master Admin. */
export function StorageConfigView() {
  const { can } = useAuth();

  if (!can('storage.configure')) {
    return (
      <div role="alert" className="flex items-center gap-2 text-sm text-ink">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Chỉ Master Admin cấu hình được kho lưu trữ.</span>
      </div>
    );
  }

  return <StorageConfigBody />;
}
