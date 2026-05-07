
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tzbatjjiqwruzqsmphiw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6YmF0amppcXdydXpxc21waGl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA0MjM0MywiZXhwIjoyMDkzNjE4MzQzfQ.12M-JiSx0B6U2Tn79Wal5bHb4jg7446QOGQv9q46mMI'
);

async function checkRole() {
  const email = 'ti@grupoairslaid.com.br';
  const { data: user, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
      console.log("Erro ao listar usuários:", userError.message);
      return;
  }

  const targetUser = user.users.find(u => u.email === email);
  
  if (!targetUser) {
    console.log("Usuário não encontrado na Auth.");
    return;
  }

  console.log("Usuário Auth ID:", targetUser.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUser.id)
    .single();

  if (profileError) {
    console.log("Erro ao buscar perfil:", profileError.message);
    if (profileError.code === 'PGRST116') {
        console.log("Perfil não existe. Criando como ADMIN...");
        await supabase.from('profiles').insert({
            id: targetUser.id,
            email: email,
            name: 'TI Grupo Airslaid',
            role: 'ADMIN'
        });
        console.log("Perfil criado como ADMIN.");
    }
  } else {
    console.log("Perfil encontrado:", profile);
    if (profile.role !== 'ADMIN') {
        console.log("AVISO: O cargo não é ADMIN. Tentando corrigir...");
        await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', targetUser.id);
        console.log("Cargo atualizado para ADMIN.");
    } else {
        console.log("Confirmação: Usuário já é ADMIN.");
    }
  }
}

checkRole();
