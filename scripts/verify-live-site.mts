import { execFileSync } from 'node:child_process'
import { collectProductionAssets, extractBuildCommit, hasExpectedProductTitle } from '../src/release/liveSite.ts'

const pageUrl = process.argv[2] ?? 'https://dani1565.github.io/Monte-Carlo-simulator/'
const expectedCommit = (process.argv[3] ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })).trim().toLowerCase()
if (!/^[0-9a-f]{40}$/.test(expectedCommit)) {
  throw new Error('Expected commit must be a 40-character Git SHA')
}

const pageResponse = await fetch(pageUrl, { cache: 'no-store' })
if (!pageResponse.ok) {
  throw new Error(`Live page failed: ${pageResponse.status} ${pageResponse.statusText}`)
}

const html = await pageResponse.text()
if (!hasExpectedProductTitle(html)) {
  throw new Error('Live page does not contain the expected product title')
}

const deployedCommit = extractBuildCommit(html)
if (deployedCommit !== expectedCommit) {
  throw new Error(`Live build commit mismatch: expected ${expectedCommit}, received ${deployedCommit ?? 'no marker'}`)
}

const assets = collectProductionAssets(html, pageUrl)
if (assets.moduleScripts.length === 0 || assets.stylesheets.length === 0) {
  throw new Error(`Expected at least one module script and one stylesheet; found ${assets.moduleScripts.length} scripts and ${assets.stylesheets.length} stylesheets`)
}

const assetResults = await Promise.all([...assets.moduleScripts, ...assets.stylesheets].map(async (url) => {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.arrayBuffer()
  if (!response.ok || body.byteLength === 0) {
    throw new Error(`Live asset failed: ${url} (${response.status}, ${body.byteLength} bytes)`)
  }
  return { url, status: response.status, bytes: body.byteLength }
}))

console.log(JSON.stringify({
  pageUrl,
  pageStatus: pageResponse.status,
  expectedTitle: true,
  expectedCommit,
  deployedCommit,
  moduleScriptCount: assets.moduleScripts.length,
  stylesheetCount: assets.stylesheets.length,
  assets: assetResults,
}, null, 2))
