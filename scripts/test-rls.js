require('dotenv').config({ path: '.env.test' });
const { createClient } = require('@supabase/supabase-js');

console.log('🧪 TESTE RLS - BANCO ORIGINAL\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  try {
    // 1. Público NÃO vê profiles
    console.log('1. Público → profiles...');
    const { error: publicError } = await supabase.from('profiles').select('id').limit(1);
    console.log(publicError ? '✅ BLOQUEADO' : '❌ PERMITIDO (PROBLEMA!)');
    
    // 2. Login admin
    console.log('\n2. Login admin...');
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD
    });
    
    if (loginError) {
      console.log(`❌ Login falhou: ${loginError.message}`);
      return;
    }
    
    console.log(`✅ Admin logado: ${auth.user.email}`);
    
    // 3. Admin vê perfis
    console.log('\n3. Admin → profiles...');
    const { data: profiles } = await supabase.from('profiles').select('id, email').limit(3);
    console.log(profiles?.length ? `✅ Vê ${profiles.length} perfis` : '❌ Não vê perfis');
    
    // 4. Verificar sistema
    console.log('\n4. Sistema funciona?');
    await supabase.auth.signOut();
    
    const { data: services } = await supabase.from('services').select('id').limit(1);
    console.log(services?.length ? '✅ Público vê serviços' : '❌ Público NÃO vê serviços');
    
    console.log('\n🎉 TESTE CONCLUÍDO!');
    
  } catch (error) {
    console.error('💥 ERRO:', error.message);
  }
}

test();
