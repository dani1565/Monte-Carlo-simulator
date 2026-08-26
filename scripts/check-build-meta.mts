import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { extractBuildCommit } from '../src/release/liveSite.ts'

const expectedCommit = (process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })).trim().toLowerCase()
const html = await readFile('dist/index.html', 'utf8')
const buildCommit = extractBuildCommit(html)

if (buildCommit !== expectedCommit) {
  throw new Error(`Production artifact commit mismatch: expected ${expectedCommit}, received ${buildCommit ?? 'no marker'}`)
}

console.log(`Production artifact commit verified: ${buildCommit}`)
