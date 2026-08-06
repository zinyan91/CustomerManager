import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { DateFormatProvider } from './context/DateFormatContext.tsx'
import { FormatSettingsProvider } from './context/FormatSettingsContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { WorkProvider } from './context/WorkContext.tsx'
import { FontSettingsProvider } from './context/FontSettingsContext.tsx'
import { LanguageProvider } from './context/LanguageContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DateFormatProvider>
            <FormatSettingsProvider>
              <FontSettingsProvider>
                <WorkProvider>
                  <App />
                </WorkProvider>
              </FontSettingsProvider>
            </FormatSettingsProvider>
          </DateFormatProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
