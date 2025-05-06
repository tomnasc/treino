-- Este script transforma o primeiro usuário registrado ou um usuário específico por email em administrador
-- Use este script no painel SQL do Supabase quando precisar criar o primeiro administrador

-- Opção 1: Transformar o primeiro usuário registrado em administrador
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- Opção 2: Transformar um usuário específico por email em administrador
-- Substitua 'email@exemplo.com' pelo email do usuário que você deseja tornar administrador
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE email = 'email@exemplo.com';

-- Verificar se o usuário foi atualizado corretamente
SELECT id, email, role FROM profiles WHERE role = 'admin'; 