import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { I18nProvider } from '@heroui/react/rac'
import './index.css'
import { router } from './routes'
import { ThemeProvider } from './theme/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
      <ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'rounded-full size-fit',
            draggable: false,
            newestOnTop: false,
            theme: 'colored',
            autoClose: 2000,
            hideProgressBar: true,
            pauseOnFocusLoss: true,
            pauseOnHover: true,
          }}
        />
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)