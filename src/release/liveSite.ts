function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))
  return match?.[1] ?? null
}

export interface ProductionAssets {
  stylesheets: string[]
  moduleScripts: string[]
}

export function collectProductionAssets(html: string, pageUrl: string): ProductionAssets {
  const assets: ProductionAssets = { stylesheets: [], moduleScripts: [] }
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/gi) ?? []) {
    const isModuleScript = /^<script\b/i.test(tag) && attribute(tag, 'type') === 'module'
    const isStylesheet = /^<link\b/i.test(tag) && attribute(tag, 'rel') === 'stylesheet'
    const path = isModuleScript ? attribute(tag, 'src') : isStylesheet ? attribute(tag, 'href') : null
    if (!path) continue
    const url = new URL(path, pageUrl).toString()
    if (isModuleScript) assets.moduleScripts.push(url)
    if (isStylesheet) assets.stylesheets.push(url)
  }
  return assets
}

export function extractBuildCommit(html: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (attribute(tag, 'name') !== 'build-commit') continue
    const commit = attribute(tag, 'content')
    if (commit && /^[0-9a-f]{40}$/i.test(commit)) return commit.toLowerCase()
  }
  return null
}

export function hasExpectedProductTitle(html: string): boolean {
  return /<title>\s*מבחן המינוף\s*\|\s*סימולטור מונטה קרלו\s*<\/title>/i.test(html)
}
