# Documentation Encoding & Emoji Policy

This repository standardizes documentation encoding and emoji usage to ensure clean rendering across GitHub, local editors, and CI logs.

- Encoding
  - Use UTF-8 without BOM for all text files.
  - Avoid control characters other than TAB and LF.
  - Do not commit files containing null bytes or the Unicode replacement character.
- Emoji usage
  - Optional and limited to headings, callouts, and short emphasis.
  - Keep body text readable without emoji; include plain-text context.
  - Prefer this allowed set for consistency: ✅ ❌ ⚠️ 🚀 🔧 🔒 📋 🧪 📝 🧰 📦 🧭 🧠 📈 📉 💡
  - For diagrams, prefer ASCII/Markdown alternatives; box-drawing is acceptable.
  - Provide ASCII fallbacks when critical for meaning.
- Examples
  - Good: "## Security ✅" and "Run tests (all pass)."
  - Avoid: Dense emoji strings, unknown symbols, or decorative-only glyphs.
- Validation
  - CI runs `scripts/check-doc-encoding.js` to block control chars, mojibake, and disallowed emojis.

See README.md for a quick link and CI guidance.
