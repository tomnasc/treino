-- Criar uma função que transfere a propriedade dos exercícios para um admin quando o usuário é excluído
CREATE OR REPLACE FUNCTION transfer_exercises_to_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Obter o ID de um usuário admin
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    -- Se não existir admin, usar NULL (sistema)
    IF admin_id IS NULL THEN
        admin_id := NULL;
    END IF;
    
    -- Atualizar exercícios do usuário excluído para pertencer ao admin
    UPDATE exercises
    SET created_by = admin_id
    WHERE created_by = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função antes de excluir um perfil
DROP TRIGGER IF EXISTS transfer_exercises_trigger ON profiles;
CREATE TRIGGER transfer_exercises_trigger
BEFORE DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION transfer_exercises_to_admin(); 