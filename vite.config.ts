import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use process.cwd() to get the correct root directory
  // Casting process to any to avoid TS errors if @types/node isn't perfectly picked up
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Define global process.env to prevent crashes in some libs, but keep it minimal
      'process.env': {}, 
      // Explicitly define the API key replacement
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  }
})