import fs from 'fs'
import path from 'path'

const repoRoot = path.resolve(__dirname, '../..')
const readerRoot = path.resolve(__dirname, 'src')
const runtimeOutDir = path.resolve(repoRoot, 'dist/reader-runtime')
const fontsDir = path.resolve(repoRoot, 'apps/editor/public/fonts')

function runtimeFontAssets() {
  return {
    name: 'kmd-runtime-font-assets',
    generateBundle() {
      let fontFiles: string[] = []
      try {
        fontFiles = fs
          .readdirSync(fontsDir, { withFileTypes: true })
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
          .sort()
      } catch {
        fontFiles = []
      }

      for (const fileName of fontFiles) {
        this.emitFile({
          type: 'asset',
          fileName: `fonts/${fileName}`,
          source: fs.readFileSync(path.join(fontsDir, fileName)),
        })
      }

      this.emitFile({
        type: 'asset',
        fileName: 'runtime-manifest.json',
        source: JSON.stringify({
          runtime: 'kmd-reader-runtime-web',
          protocolVersion: 1,
          entry: 'index.html',
          assetBaseUrl: './',
          fonts: fontFiles.map((fileName) => `fonts/${fileName}`),
        }, null, 2),
      })
    },
  }
}

export default {
  root: readerRoot,
  base: './',
  publicDir: false,
  plugins: [runtimeFontAssets()],
  server: {
    fs: {
      allow: [
        __dirname,
        repoRoot,
      ],
    },
  },
  build: {
    outDir: runtimeOutDir,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(readerRoot, 'index.html'),
    },
  },
}
