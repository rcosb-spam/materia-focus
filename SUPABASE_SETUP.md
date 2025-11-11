# Configuração do Supabase

Este projeto requer um projeto Supabase configurado. Siga os passos abaixo:

## 1. Criar um projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Anote a URL e a chave anônima do projeto (em Settings > API)

## 2. Configurar variáveis de ambiente

1. Copie o arquivo `.env.example` para `.env`
2. Preencha as variáveis com suas credenciais do Supabase:
   - `VITE_SUPABASE_URL`: URL do seu projeto
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima (anon key)

## 3. Executar as migrações SQL

Execute os seguintes comandos SQL no SQL Editor do Supabase (ou use o arquivo de migração abaixo):

### Criar as tabelas

\`\`\`sql
-- Tabela de matérias
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de aulas
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_studied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de ciclos de estudo
CREATE TABLE study_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_hours NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de alocações de horas por matéria em cada ciclo
CREATE TABLE cycle_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES study_cycles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  allocated_hours NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para registrar sessões de estudo
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES study_cycles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  hours_studied NUMERIC NOT NULL CHECK (hours_studied > 0),
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
CREATE INDEX idx_lessons_subject_id ON lessons(subject_id);
CREATE INDEX idx_study_cycles_user_id ON study_cycles(user_id);
CREATE INDEX idx_cycle_allocations_cycle_id ON cycle_allocations(cycle_id);
CREATE INDEX idx_cycle_allocations_subject_id ON cycle_allocations(subject_id);
CREATE INDEX idx_study_sessions_cycle_id ON study_sessions(cycle_id);
CREATE INDEX idx_study_sessions_subject_id ON study_sessions(subject_id);
\`\`\`

### Configurar RLS (Row Level Security)

\`\`\`sql
-- Habilitar RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para subjects
CREATE POLICY "Users can view their own subjects"
  ON subjects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
  ON subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
  ON subjects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
  ON subjects FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para lessons
CREATE POLICY "Users can view lessons of their subjects"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = lessons.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lessons to their subjects"
  ON lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = lessons.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lessons of their subjects"
  ON lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = lessons.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lessons of their subjects"
  ON lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = lessons.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

-- Políticas para study_cycles
CREATE POLICY "Users can view their own cycles"
  ON study_cycles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cycles"
  ON study_cycles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycles"
  ON study_cycles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cycles"
  ON study_cycles FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para cycle_allocations
CREATE POLICY "Users can view allocations of their cycles"
  ON cycle_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = cycle_allocations.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert allocations to their cycles"
  ON cycle_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = cycle_allocations.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update allocations of their cycles"
  ON cycle_allocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = cycle_allocations.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete allocations of their cycles"
  ON cycle_allocations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = cycle_allocations.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

-- Políticas para study_sessions
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = study_sessions.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = study_sessions.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own study sessions"
  ON study_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = study_sessions.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_cycles
      WHERE study_cycles.id = study_sessions.cycle_id
      AND study_cycles.user_id = auth.uid()
    )
  );
\`\`\`

### Configurar triggers para updated_at

\`\`\`sql
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_cycles_updated_at BEFORE UPDATE ON study_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_allocations_updated_at BEFORE UPDATE ON cycle_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
\`\`\`

## 4. Configurar autenticação

No painel do Supabase, em Authentication > Providers:
- Habilite "Email" provider
- Configure as opções conforme sua necessidade

## 5. Instalar dependências

\`\`\`bash
npm install @supabase/supabase-js
\`\`\`

## 6. Executar o projeto

\`\`\`bash
npm run dev
\`\`\`

Pronto! Seu app deve estar funcionando com o Supabase configurado.
