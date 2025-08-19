const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up ProcessPilot Frontend...\n')

// Create necessary directories
const directories = ['src/test', 'public', 'coverage']
directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`✅ Created directory: ${dir}`)
  }
})

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env')
const envExamplePath = path.join(__dirname, '.env.example')

if (!fs.existsSync(envPath)) {
  const envContent = `# Environment Configuration
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_APP_NAME=ProcessPilot
VITE_APP_VERSION=1.0.0
`

  fs.writeFileSync(envPath, envContent)
  console.log('✅ Created .env file with default configuration')
}

console.log('\n📦 Installing dependencies...')
try {
  execSync('npm install', { stdio: 'inherit' })
  console.log('✅ Dependencies installed successfully')
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message)
  process.exit(1)
}

console.log('\n🎨 Building Tailwind CSS...')
try {
  execSync('npx tailwindcss build -o src/index.css', { stdio: 'inherit' })
  console.log('✅ Tailwind CSS built successfully')
} catch (error) {
  console.warn('⚠️  Tailwind build failed - this is normal on first setup')
}

console.log('\n🔧 Next steps:')
console.log('1. Make sure your backend is running on http://localhost:5000')
console.log('2. Start the development server: npm run dev')
console.log('3. Open http://localhost:3000 to view the application')
console.log('4. Run tests: npm run test')
console.log('5. Build for production: npm run build')

console.log('\n✨ Frontend setup complete! Happy coding! 🎉')
