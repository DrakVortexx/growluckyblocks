// Install dependencies script
const { execSync } = require('child_process');

console.log('📦 Installing Supabase dependency...');

try {
  execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
  console.log('✅ Supabase client installed successfully');
} catch (error) {
  console.error('❌ Failed to install Supabase:', error.message);
  console.log('💡 Please run: npm install @supabase/supabase-js');
}
