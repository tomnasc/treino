-- Adicionar coluna exercise_type na tabela exercises
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'reps' CHECK (exercise_type IN ('reps', 'time'));

-- Adicionar coluna exercise_type na tabela workout_exercises
ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'reps' CHECK (exercise_type IN ('reps', 'time'));

-- Adicionar coluna time para suportar exercícios baseados em tempo
ALTER TABLE workout_exercises
ADD COLUMN IF NOT EXISTS time TEXT DEFAULT NULL;

COMMENT ON COLUMN exercises.exercise_type IS 'Indica como o exercício é medido: por repetições (reps) ou por tempo (time)';
COMMENT ON COLUMN workout_exercises.exercise_type IS 'Indica como o exercício é medido: por repetições (reps) ou por tempo (time)';
COMMENT ON COLUMN workout_exercises.time IS 'Duração em segundos para cada série (usado quando exercise_type é "time")';
