const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ProcessPilot Backend...\n');

// Create necessary directories
const directories = ['logs', 'uploads'];
directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('⚠️  Please update .env with your actual configuration values');
  } else {
    console.log('❌ .env.example not found. Please create .env manually');
  }
}

console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('\n🗄️  Database setup:');
console.log('1. Make sure PostgreSQL is running');
console.log('2. Create database: CREATE DATABASE process_pilot;');
console.log('3. Run migrations: npm run db:migrate');
console.log('4. Seed data: npm run db:seed');

console.log('\n🔧 Next steps:');
console.log('1. Configure your .env file');
console.log('2. Set up your PostgreSQL database');
console.log('3. Run: npm run db:migrate && npm run db:seed');
console.log('4. Start development server: npm run dev');

console.log('\n✨ Setup complete! Happy coding! 🎉');