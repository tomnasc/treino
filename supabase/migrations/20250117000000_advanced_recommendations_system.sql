-- =====================================================
-- SISTEMA AVANÇADO DE RECOMENDAÇÕES
-- Criado em: 2025-01-17
-- Descrição: Schema completo para funcionalidades avançadas
-- =====================================================

-- 1. TABELA DE SUBSTITUIÇÕES INTELIGENTES
CREATE TABLE IF NOT EXISTS exercise_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  substitute_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'equipment_unavailable',
    'injury_limitation',
    'experience_level',
    'muscle_imbalance',
    'goal_optimization',
    'progression_needed'
  )),
  condition_data JSONB NOT NULL DEFAULT '{}',
  effectiveness_score INTEGER NOT NULL DEFAULT 5 CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Evitar substituições circulares
  CONSTRAINT no_circular_substitution CHECK (original_exercise_id != substitute_exercise_id),
  
  -- Índice único para evitar duplicatas
  UNIQUE(original_exercise_id, substitute_exercise_id, reason)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exercise_substitutions_original ON exercise_substitutions(original_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_substitutions_substitute ON exercise_substitutions(substitute_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_substitutions_reason ON exercise_substitutions(reason);
CREATE INDEX IF NOT EXISTS idx_exercise_substitutions_active ON exercise_substitutions(is_active) WHERE is_active = true;

-- 2. TABELA DE TEMPLATES DE CORREÇÃO
CREATE TABLE IF NOT EXISTS correction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'muscle_balance',
    'injury_prevention', 
    'goal_optimization',
    'progression'
  )),
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  success_metrics JSONB NOT NULL DEFAULT '[]',
  estimated_impact JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_correction_templates_category ON correction_templates(category);
CREATE INDEX IF NOT EXISTS idx_correction_templates_priority ON correction_templates(priority);
CREATE INDEX IF NOT EXISTS idx_correction_templates_active ON correction_templates(is_active) WHERE is_active = true;

-- 3. TABELA DE MÉTRICAS DE PROGRESSO
CREATE TABLE IF NOT EXISTS progress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  measurement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  metrics JSONB NOT NULL DEFAULT '{}',
  detailed_analysis JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_progress_metrics_user_id ON progress_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_date ON progress_metrics(measurement_date);

-- 4. TABELA DE TRACKING DE RECOMENDAÇÕES
CREATE TABLE IF NOT EXISTS recommendations_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  recommendation_data JSONB NOT NULL DEFAULT '{}',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_metrics JSONB NOT NULL DEFAULT '{}',
  after_metrics JSONB,
  impact_analysis JSONB,
  success_score INTEGER CHECK (success_score >= 1 AND success_score <= 10),
  user_feedback JSONB,
  follow_up_recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para tracking
CREATE INDEX IF NOT EXISTS idx_recommendations_tracking_user_id ON recommendations_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_tracking_type ON recommendations_tracking(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_tracking_applied ON recommendations_tracking(applied_at);

-- 5. TABELA DE PLANOS SEMANAIS
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN (
    'ABC',
    'ABCD', 
    'Push_Pull_Legs',
    'Upper_Lower',
    'Full_Body'
  )),
  training_days INTEGER NOT NULL DEFAULT 3 CHECK (training_days >= 1 AND training_days <= 7),
  rest_days INTEGER[] NOT NULL DEFAULT '{}',
  daily_workouts JSONB NOT NULL DEFAULT '[]',
  weekly_metrics JSONB NOT NULL DEFAULT '{}',
  optimization_suggestions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Apenas um plano ativo por usuário por vez
  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Índices para planos semanais  
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_week_start ON weekly_plans(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_active ON weekly_plans(is_active) WHERE is_active = true;

-- 6. TABELA DE PERFIS DE ANÁLISE DOS USUÁRIOS
CREATE TABLE IF NOT EXISTS user_analysis_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fitness_level TEXT NOT NULL DEFAULT 'beginner' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goal TEXT NOT NULL DEFAULT 'muscle_gain' CHECK (primary_goal IN (
    'muscle_gain',
    'fat_loss', 
    'strength_gain',
    'endurance',
    'functional_fitness',
    'rehabilitation',
    'maintenance'
  )),
  secondary_goals TEXT[] NOT NULL DEFAULT '{}',
  available_equipment TEXT[] NOT NULL DEFAULT '{}',
  training_frequency INTEGER NOT NULL DEFAULT 3 CHECK (training_frequency >= 1 AND training_frequency <= 7),
  time_per_session INTEGER NOT NULL DEFAULT 60 CHECK (time_per_session >= 15 AND time_per_session <= 180),
  injury_history TEXT[] NOT NULL DEFAULT '{}',
  limitations TEXT[] NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Um perfil por usuário
  UNIQUE(user_id)
);

-- Índices para perfis de análise
CREATE INDEX IF NOT EXISTS idx_user_analysis_profiles_user_id ON user_analysis_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analysis_profiles_fitness_level ON user_analysis_profiles(fitness_level);
CREATE INDEX IF NOT EXISTS idx_user_analysis_profiles_primary_goal ON user_analysis_profiles(primary_goal);

-- 7. TABELA DE AÇÕES DE RECOMENDAÇÕES
CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'add_exercise',
    'remove_exercise', 
    'replace_exercise',
    'modify_parameters',
    'reorder_exercises'
  )),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  target_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE SET NULL,
  new_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  parameter_changes JSONB,
  reason TEXT NOT NULL,
  expected_benefit TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reversible BOOLEAN NOT NULL DEFAULT true,
  executed_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT,
  before_state JSONB,
  after_state JSONB,
  user_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para ações
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user_id ON recommendation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_workout_id ON recommendation_actions(workout_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_type ON recommendation_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_executed ON recommendation_actions(executed_at);

-- 8. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers nas tabelas relevantes
CREATE TRIGGER update_exercise_substitutions_updated_at 
  BEFORE UPDATE ON exercise_substitutions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_correction_templates_updated_at 
  BEFORE UPDATE ON correction_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_tracking_updated_at 
  BEFORE UPDATE ON recommendations_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at 
  BEFORE UPDATE ON weekly_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_analysis_profiles_updated_at 
  BEFORE UPDATE ON user_analysis_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendation_actions_updated_at 
  BEFORE UPDATE ON recommendation_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. POLÍTICAS RLS (ROW LEVEL SECURITY)
ALTER TABLE exercise_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analysis_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

-- Políticas para substituições (públicas para leitura, admin para escrita)
CREATE POLICY "Todos podem ler substituições ativas" 
  ON exercise_substitutions FOR SELECT 
  TO authenticated 
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar substituições" 
  ON exercise_substitutions FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas para templates (públicas para leitura, admin para escrita)
CREATE POLICY "Todos podem ler templates ativos" 
  ON correction_templates FOR SELECT 
  TO authenticated 
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar templates" 
  ON correction_templates FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas para dados do usuário (cada usuário vê apenas seus dados)
CREATE POLICY "Usuários podem ver suas próprias métricas" 
  ON progress_metrics FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias métricas" 
  ON progress_metrics FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem ver seu próprio tracking" 
  ON recommendations_tracking FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem gerenciar seus planos semanais" 
  ON weekly_plans FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem gerenciar seu perfil de análise" 
  ON user_analysis_profiles FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem gerenciar suas ações" 
  ON recommendation_actions FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas para admins (acesso total)
CREATE POLICY "Admins têm acesso total às métricas" 
  ON progress_metrics FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins têm acesso total ao tracking" 
  ON recommendations_tracking FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 10. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE exercise_substitutions IS 'Regras de substituição inteligente de exercícios baseadas em equipamento, lesões, nível, etc.';
COMMENT ON TABLE correction_templates IS 'Templates predefinidos para correções automáticas de desequilíbrios e otimizações';
COMMENT ON TABLE progress_metrics IS 'Métricas de progresso do usuário ao longo do tempo';
COMMENT ON TABLE recommendations_tracking IS 'Rastreamento do impacto das recomendações aplicadas';
COMMENT ON TABLE weekly_plans IS 'Planos de treino semanais otimizados para cada usuário';
COMMENT ON TABLE user_analysis_profiles IS 'Perfis detalhados dos usuários para análise personalizada';
COMMENT ON TABLE recommendation_actions IS 'Ações específicas de recomendações executadas pelo usuário';

-- 11. DADOS INICIAIS - SUBSTITUIÇÕES BÁSICAS
-- (Será populado posteriormente com dados reais)

-- 12. VIEWS PARA CONSULTAS COMUNS
CREATE OR REPLACE VIEW user_recommendation_summary AS
SELECT 
  u.id as user_id,
  u.full_name,
  uap.fitness_level,
  uap.primary_goal,
  COUNT(rt.id) as total_recommendations_applied,
  AVG(rt.success_score) as avg_success_score,
  MAX(pm.measurement_date) as last_measurement,
  CASE 
    WHEN COUNT(wp.id) > 0 THEN true 
    ELSE false 
  END as has_weekly_plan
FROM profiles u
LEFT JOIN user_analysis_profiles uap ON u.id = uap.user_id
LEFT JOIN recommendations_tracking rt ON u.id = rt.user_id
LEFT JOIN progress_metrics pm ON u.id = pm.user_id
LEFT JOIN weekly_plans wp ON u.id = wp.user_id AND wp.is_active = true
GROUP BY u.id, u.full_name, uap.fitness_level, uap.primary_goal;

COMMENT ON VIEW user_recommendation_summary IS 'Resumo das recomendações e progresso por usuário';

-- Concluído: Schema do banco de dados criado com sucesso!