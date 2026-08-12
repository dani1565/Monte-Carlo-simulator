import { readFile, readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

const roots = ['src', 'README.md']
const forbidden = ['ruinThreshold']
const extensions = new Set(['.ts', '.tsx', '.md'])
const findings = []

async function scan(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => null)
  if (entries) {
    for (const entry of entries) await scan(join(path, entry.name))
    return
  }
  if (!extensions.has(extname(path)) && !path.endsWith('README.md')) return
  const content = await readFile(path, 'utf8')
  for (const term of forbidden) if (content.includes(term)) findings.push(`${path}: ${term}`)
}

for (const root of roots) await scan(root)
if (findings.length) {
  console.error(`Forbidden legacy terms found:\n${findings.join('\n')}`)
  process.exit(1)
}
console.log('Legacy-term check passed')