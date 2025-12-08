import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Plugin to set correct content-type and headers for download files
const downloadFilePlugin = () => {
  return {
    name: 'download-file-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.endsWith('.lnk')) {
          res.setHeader('Content-Type', 'application/x-ms-shortcut')
          res.setHeader('Content-Disposition', 'attachment; filename="Toastman-Chrome.lnk"')
        } else if (req.url && req.url.endsWith('.zip')) {
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', 'attachment; filename="Toastman-Chrome.zip"')
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), downloadFilePlugin()],
  // Custom domain - no subdirectory needed
  base: '/',
  server: {
    port: 9998,
    strictPort: true
  },
})
