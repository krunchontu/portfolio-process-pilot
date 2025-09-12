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

