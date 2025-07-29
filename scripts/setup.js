const fs = require('fs');
const path = require('path');

console.log('🚀 HRMS Backend Setup');
console.log('=====================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please update the .env file with your Supabase credentials.\n');
  } else {
    console.log('❌ env.example file not found!');
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  console.log('Run: npm install\n');
} else {
  console.log('✅ Dependencies already installed.\n');
}

console.log('📋 Next Steps:');
console.log('1. Update your .env file with Supabase credentials');
console.log('2. Run the SQL schema in your Supabase SQL editor');
console.log('3. Configure Supabase Auth settings (disable public signup)');
console.log('4. Run: npm run dev');
console.log('5. Test the API at: http://localhost:3000/health\n');

console.log('🔗 Useful Links:');
console.log('- Supabase Dashboard: https://supabase.com/dashboard');
console.log('- API Documentation: Check README.md');
console.log('- Database Schema: database/schema.sql\n');

console.log('🎉 Setup complete! Happy coding! 🚀'); 