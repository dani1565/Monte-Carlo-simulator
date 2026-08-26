import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function buildCommit(): string {
  const commit = (process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })).trim()
  if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error('Build commit must be a 40-character Git SHA')
  return commit.toLowerCase()
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-commit-meta',
      transformIndexHtml: {
        order: 'pre',
        handler: () => [{
          tag: 'meta',
          attrs: { name: 'build-commit', content: buildCommit() },
          injectTo: 'head',
        }],
      },
    },
  ],
  base: './',
})
