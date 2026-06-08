// test-all.mjs - VERSÃO CORRIGIDA
import { createClient } from '@supabase/supabase-js';

console.log('🔐 TESTE RLS - VERIFICAÇÃO CORRETA');
console.log('='.repeat(60));

// Configuração do banco ATIVO
const supabase = createClient(
  'https://vptwtwhadxcdfhveugkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0'
);

async function testRLS() {
  console.log('📋 1. VERIFICAÇÃO RLS:\n');
  
  // Teste 1: Público → profiles
  console.log('a) Público tentando ver PROFILES:');
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(2);
  
  if (profilesError) {
    console.log('   ❌ ERRO (inesperado):', profilesError.message);
  } else if (profilesData && profilesData.length === 0) {
    console.log('   ✅ RLS FUNCIONANDO! Retorna array vazio []');
    console.log('   (Isso significa: público não vê nenhum perfil)');
  } else {
    console.log('   ❌ RLS NÃO FUNCIONA! Público vê perfis:');
    console.log('   Dados:', profilesData);
  }
  
  // Teste 2: Público → appointments
  console.log('\nb) Público tentando ver APPOINTMENTS:');
  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, client_name')
    .limit(2);
  
  if (appointmentsError) {
    console.log('   ❌ ERRO (inesperado):', appointmentsError.message);
  } else if (appointmentsData && appointmentsData.length === 0) {
    console.log('   ✅ RLS FUNCIONANDO! Retorna array vazio []');
    console.log('   (Isso significa: público não vê agendamentos)');
  } else {
    console.log('   ❌ RLS NÃO FUNCIONA! Público vê agendamentos');
  }
  
  // Teste 3: Público → services
  console.log('\nc) Público tentando ver SERVICES:');
  const { data: servicesData, error: servicesError } = await supabase
    .from('services')
    .select('id, name')
    .limit(3);
  
  if (servicesError) {
    console.log('   ❌ ERRO:', servicesError.message);
  } else if (servicesData && servicesData.length > 0) {
    console.log(`   ✅ CORRETO! Público vê ${servicesData.length} serviços`);
    console.log('   Serviços:', servicesData.map(s => s.name).join(', '));
  } else {
    console.log('   ⚠️  Nenhum serviço encontrado');
  }
  
  console.log('\n📋 2. TESTE LOGIN ADMIN:\n');
  
  try {
    console.log('Tentando login como admin...');
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'suporte@creativeprintjp.com',
      password: 'Superadmin23%'  // ← Use a senha REAL
    });
    
    if (loginError) {
      console.log(`   ❌ Login falhou: ${loginError.message}`);
      console.log('   ⚠️  Verifique se o usuário existe neste banco específico');
    } else {
      console.log(`   ✅ Admin logado: ${auth.user.email}`);
      
      // Testar se admin vê perfis
      console.log('\n   Admin vendo PROFILES:');
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, email, company_name')
        .limit(5);
      
      if (adminProfiles && adminProfiles.length > 0) {
        console.log(`   ✅ Admin vê ${adminProfiles.length} perfis`);
        console.log('   Exemplos:', adminProfiles.slice(0, 2).map(p => p.email).join(', '));
      } else {
        console.log('   ⚠️  Admin não vê perfis (pode não ter dados ou política muito restritiva)');
      }
      
      // Logout
      await supabase.auth.signOut();
      console.log('   🔓 Logout realizado');
    }
  } catch (error) {
    console.log('   💥 Erro no login:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNÓSTICO FINAL:');
  console.log('='.repeat(60));
  
  // Análise final
  const publicNaoVêPerfis = (!profilesError && profilesData && profilesData.length === 0);
  const publicNaoVêAppointments = (!appointmentsError && appointmentsData && appointmentsData.length === 0);
  const publicVêServices = (servicesData && servicesData.length > 0);
  
  if (publicNaoVêPerfis && publicNaoVêAppointments && publicVêServices) {
    console.log('\n🎉 🎉 🎉 RLS CONFIGURADO PERFEITAMENTE!');
    console.log('✅ Público NÃO vê dados privados (profiles/appointments)');
    console.log('✅ Público VÊ dados públicos (services)');
    console.log('✅ Sistema está SEGURO em produção!');
  } else if (publicNaoVêPerfis || publicNaoVêAppointments) {
    console.log('\n⚠️  RLS PARCIALMENTE CONFIGURADO');
    console.log('Algumas políticas funcionam, outras não');
  } else {
    console.log('\n🚨 RLS NÃO ESTÁ FUNCIONANDO CORRETAMENTE');
    console.log('Público ainda pode ver dados privados');
  }
  
  console.log('\n🚀 PRÓXIMOS PASSOS:');
  console.log('1. Teste sistema no navegador (agendamento público)');
  console.log('2. Teste login cliente');
  console.log('3. Teste login admin');
  console.log('4. Monitore por 24h');
}

// Executar
testRLS().catch(error => {
  console.error('💥 ERRO INESPERADO:', error.message);
});