import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { DateFormatProvider } from './context/DateFormatContext.tsx'
import { FormatSettingsProvider } from './context/FormatSettingsContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DateFormatProvider>
          <FormatSettingsProvider>
            <App />
          </FormatSettingsProvider>
        </DateFormatProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
