import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ModuleGate } from '../components/ModuleGate';
import { OfficeHome } from './OfficeHome';
import { calcPath, calcSharedPath, writerPath } from './paths';
import './styles/office.css';

const PATH_OF = { calc: calcPath, writer: writerPath };

/** Cổng vào /office: tạo bảng tính hay văn bản trống, mở tệp từ máy (chuyển sang màn Bảng tính qua trạng thái địa chỉ) hoặc mở bản nháp. */
export const OfficeIndex: React.FC = () => {
  const navigate = useNavigate();
  return (
    <OfficeHome
      onNewDocument={(kind) => navigate(PATH_OF[kind]())}
      onOpenFile={(kind, file) => navigate(PATH_OF[kind](), { state: { file } })}
      onOpenDraft={(kind, id) => navigate(PATH_OF[kind](id))}
      onOpenShared={(id) => navigate(calcSharedPath(id))}
    />
  );
};

/**
 * Khung toàn màn hình của tab Báo cáo: ngoài AppLayout, không sidebar, không Header của ứng dụng; mỗi màn tự có
 * thanh tiêu đề với nút "Về ứng dụng". Phải đăng nhập và có module Công cụ tính.
 */
export const OfficeLayout: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }
  if (!session) return <LoginView />;

  return (
    <div className="felix-office min-h-screen">
      <ErrorBoundary title="Lỗi khi tải màn Báo cáo">
        <ModuleGate>
          <Outlet />
        </ModuleGate>
      </ErrorBoundary>
    </div>
  );
};
