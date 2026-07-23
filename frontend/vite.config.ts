import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (command === 'build' && mode === 'production') {
    const apiUrl = env.VITE_API_URL?.trim()

    if (!apiUrl) {
      throw new Error('VITE_API_URL is required for production builds.')
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(apiUrl)
    } catch {
      throw new Error('VITE_API_URL must be a valid absolute URL.')
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new Error('VITE_API_URL must use HTTPS for production builds.')
    }

    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      throw new Error('VITE_API_URL cannot point to localhost in production.')
    }
  }

  return {
    plugins: [react()],
  }
})
