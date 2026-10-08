import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginView } from '../components/LoginView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ModuleGate } from '../components/ModuleGate';
import { OfficeHome } from './OfficeHome';
import { calcPath } from './paths';
import './styles/office.css';

/** Cổng vào /office: tạo bảng tính trống, mở tệp từ máy (chuyển sang màn Bảng tính qua trạng thái địa chỉ) hoặc mở bản nháp. */
export const OfficeIndex: React.FC = () => {
  const navigate = useNavigate();
  return (
    <OfficeHome
      onNewSpreadsheet={() => navigate(calcPath())}
      onOpenFile={(file) => navigate(calcPath(), { state: { file } })}
      onOpenDraft={(id) => navigate(calcPath(id))}
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
