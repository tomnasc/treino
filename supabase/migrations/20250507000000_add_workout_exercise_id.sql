-- Adicionar coluna workout_exercise_id na tabela exercise_history caso não exista
ALTER TABLE exercise_history
ADD COLUMN IF NOT EXISTS workout_exercise_id UUID REFERENCES workout_exercises(id);

-- Adicionar comentário explicativo
COMMENT ON COLUMN exercise_history.workout_exercise_id IS 'Referência para a tabela workout_exercises, relacionando o histórico com o exercício específico do treino';

-- Adicionar index para melhorar performance das consultas usando workout_exercise_id
CREATE INDEX IF NOT EXISTS idx_exercise_history_workout_exercise_id ON exercise_history(workout_exercise_id); 