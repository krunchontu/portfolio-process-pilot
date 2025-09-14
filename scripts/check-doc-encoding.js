#!/usr/bin/env node

/*
 * Pre-commit doc encoding/garble guard
 * - Blocks Markdown commits containing null bytes or control chars
 * - Targets staged *.md files (repo-wide) and files under docs/
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACMRTUXB', {
    encoding: 'utf8'
  })
  return out
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
}

function isMarkdown(file) {
  return file.toLowerCase().endsWith('.md')
}

function shouldCheck(file) {
  return isMarkdown(file) || file.startsWith('docs/')
}

function hasNullBytes(buf) {
  return buf.includes(0x00)
}

function hasControlChars(str) {
  // Allow newline (\n) and tab (\t); block other ASCII control chars
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(str)
}

function firstNonEmptyLines(str, count = 5) {
  const lines = str.split(/\r?\n/).filter(l => l.trim().length > 0)
  return lines.slice(0, count)
}

// Additional helpers for mojibake and emoji policy
function hasReplacementChar(str) {
  return str.includes('\uFFFD')
}

function findHeadingMojibake(text) {
  const lines = text.split(/\r?\n/)
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^#{1,6}\s*\?\?\b/.test(line)) {
      hits.push({ line: i + 1, sample: line.slice(0, 120) })
    }
  }
  return hits
}

// Approximate emoji matcher and enforcement of allowed set
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu
const variationSelector = /\uFE0F/g
const allowedEmojis = new Set([
  '✅','❌','⚠️','🚀','🔧','🔒','📋','🧪','📝','🧰','📦','🧭','🧠','📈','📉','💡'
].flatMap(e => [e, e.replace(variationSelector, '')]))

function findDisallowedEmojis(text) {
  const lines = text.split(/\r?\n/)
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (EMOJI_REGEX.test(line)) {
      const found = Array.from(line.matchAll(EMOJI_REGEX), m => (m[0] || '').replace(variationSelector, ''))
      const bad = found.filter(ch => !allowedEmojis.has(ch))
      if (bad.length) hits.push({ line: i + 1, sample: line.slice(0, 120), emojis: Array.from(new Set(bad)) })
    }
  }
  return hits
}

function main() {
  const staged = getStagedFiles()
  const targets = staged.filter(shouldCheck)

  if (targets.length === 0) return process.exit(0)

  const violations = []

  for (const file of targets) {
    try {
      const buf = fs.readFileSync(file)
      const txt = buf.toString('utf8')

      if (hasNullBytes(buf)) {
        violations.push({ file, reason: 'contains null (\u0000) bytes' })
        continue
      }

      if (hasControlChars(txt)) {
        const sample = firstNonEmptyLines(txt).join(' / ').slice(0, 120)
        violations.push({ file, reason: 'contains non-printable control characters', sample })
        continue
      }

      // Extra guard: detect BOM in first char and strip (not a failure, informational only)
      if (txt.charCodeAt(0) === 0xFEFF) {
        // Not failing; just ensure awareness in output
        // No action required
      }

      // Mojibake patterns in headings (likely lost emoji)
      const mojibake = findHeadingMojibake(txt)
      for (const m of mojibake) {
        violations.push({ file, reason: "heading contains '??' mojibake", sample: `L${m.line}: ${m.sample}` })
      }

      // Replacement character check
      if (hasReplacementChar(txt)) {
        violations.push({ file, reason: 'contains Unicode replacement character (\\uFFFD)' })
      }

      // Emoji policy enforcement
      const disallowed = findDisallowedEmojis(txt)
      for (const d of disallowed) {
        violations.push({ file, reason: `uses disallowed emoji: ${d.emojis.join(', ')}`, sample: `L${d.line}: ${d.sample}` })
      }
    } catch (err) {
      violations.push({ file, reason: `read error: ${err.message}` })
    }
  }

  if (violations.length > 0) {
    console.error('\n❌ Documentation encoding/garble check failed:')
    for (const v of violations) {
      console.error(`  • ${v.file}: ${v.reason}${v.sample ? ` — sample: "${v.sample}"` : ''}`)
    }
    console.error('\nFix tips:')
    console.error('  - Remove stray control/null chars (often from paste/encoding glitches)')
    console.error('  - Ensure files are saved as UTF-8 (no null bytes)')
    console.error('  - If a corrupted header line exists, delete and retype it')
    process.exit(1)
  }
}

main()

