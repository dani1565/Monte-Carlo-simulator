import { describe, expect, it } from 'vitest'

import { collectProductionAssets, extractBuildCommit, hasExpectedProductTitle } from './liveSite'

describe('live-site verification helpers', () => {
  const buildCommit = '1234567890abcdef1234567890abcdef12345678'
  const html = `<!doctype html>
    <title>מבחן המינוף | סימולטור מונטה קרלו</title>
    <meta name="build-commit" content="${buildCommit}">
    <link rel="stylesheet" href="/Monte-Carlo-simulator/assets/site.css">
    <script type="module" src="/Monte-Carlo-simulator/assets/site.js"></script>`

  it('collects production stylesheets and module scripts separately', () => {
    expect(collectProductionAssets(html, 'https://dani1565.github.io/Monte-Carlo-simulator/')).toEqual({
      stylesheets: ['https://dani1565.github.io/Monte-Carlo-simulator/assets/site.css'],
      moduleScripts: ['https://dani1565.github.io/Monte-Carlo-simulator/assets/site.js'],
    })
  })

  it('extracts the exact build commit marker', () => {
    expect(extractBuildCommit(html)).toBe(buildCommit)
    expect(extractBuildCommit('<title>no marker</title>')).toBeNull()
  })

  it('recognizes the expected public product title', () => {
    expect(hasExpectedProductTitle(html)).toBe(true)
    expect(hasExpectedProductTitle('<title>Wrong</title>')).toBe(false)
  })
})
