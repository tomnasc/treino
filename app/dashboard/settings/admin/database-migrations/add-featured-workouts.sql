-- Adicionar a coluna is_featured à tabela workouts
ALTER TABLE workouts
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;

-- Criar índice para facilitar consultas de treinos em destaque
CREATE INDEX idx_workouts_is_featured ON workouts (is_featured) WHERE is_featured = TRUE;

-- Comentário para a coluna is_featured
COMMENT ON COLUMN workouts.is_featured IS 'Indica se o treino está em destaque na plataforma'; 