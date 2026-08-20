import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App.tsx';
import { ProviderComposer } from './components/ProviderComposer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { DateFormatProvider } from './context/DateFormatContext.tsx';
import { FormatSettingsProvider } from './context/FormatSettingsContext.tsx';
import { FontSettingsProvider } from './context/FontSettingsContext.tsx';
import { WorkProvider } from './context/WorkContext.tsx';

const providers = [
  ThemeProvider,
  LanguageProvider,
  AuthProvider,
  DateFormatProvider,
  FormatSettingsProvider,
  FontSettingsProvider,
  WorkProvider,
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary title="Ứng dụng gặp sự cố khởi chạy">
      <BrowserRouter>
        <ProviderComposer providers={providers}>
          <App />
        </ProviderComposer>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

