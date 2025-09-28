// Dump the in-app Swagger specs (OpenAPI) to a JSON file for tooling
const fs = require('fs')
const path = require('path')

// Reuse the configured specs
const { specs } = require('../config/swagger')

const outDir = path.join(__dirname, '../../docs')
const outFile = path.join(outDir, 'swagger.json')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

fs.writeFileSync(outFile, JSON.stringify(specs, null, 2))
console.log(`✅ Wrote OpenAPI JSON to ${path.relative(process.cwd(), outFile)}`)
