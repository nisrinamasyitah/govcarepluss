import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public',
    emptyOutDir: false,
  },
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://apis.google.com https://recaptcha.google.com",
        "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://apis.google.com https://recaptcha.google.com",
        "frame-src 'self' https://www.google.com https://recaptcha.google.com https://apis.google.com https://*.firebaseapp.com https://*.firebaseio.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: https://www.gstatic.com https://www.google.com",
        "connect-src 'self' https://www.google.com https://apis.google.com https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://recaptcha.google.com https://securetoken.googleapis.com",
      ].join('; ')
    }
  }
})
