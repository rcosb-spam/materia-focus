# Setup do Sistema de Acompanhamento de Desempenho de Questões

## Tabelas a serem criadas no Supabase

Execute os seguintes comandos SQL no editor SQL do Supabase:

### 1. Tabela exam_subjects (Matérias da Prova)

```sql
-- Create exam_subjects table
create table public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subject_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, subject_name)
);

-- Enable RLS
alter table public.exam_subjects enable row level security;

-- RLS Policies
create policy "Users can view their own exam subjects"
  on public.exam_subjects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own exam subjects"
  on public.exam_subjects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own exam subjects"
  on public.exam_subjects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own exam subjects"
  on public.exam_subjects for delete
  using (auth.uid() = user_id);

-- Create trigger for updated_at
create trigger update_exam_subjects_updated_at
  before update on public.exam_subjects
  for each row
  execute function update_updated_at_column();
```

### 2. Tabela exam_topics (Subtópicos)

```sql
-- Create exam_topics table
create table public.exam_topics (
  id uuid primary key default gen_random_uuid(),
  exam_subject_id uuid not null references public.exam_subjects on delete cascade,
  topic_name text not null,
  is_relevant boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(exam_subject_id, topic_name)
);

-- Enable RLS
alter table public.exam_topics enable row level security;

-- RLS Policies
create policy "Users can view topics of their exam subjects"
  on public.exam_topics for select
  using (
    exists (
      select 1 from public.exam_subjects
      where exam_subjects.id = exam_topics.exam_subject_id
      and exam_subjects.user_id = auth.uid()
    )
  );

create policy "Users can insert topics for their exam subjects"
  on public.exam_topics for insert
  with check (
    exists (
      select 1 from public.exam_subjects
      where exam_subjects.id = exam_topics.exam_subject_id
      and exam_subjects.user_id = auth.uid()
    )
  );

create policy "Users can update topics of their exam subjects"
  on public.exam_topics for update
  using (
    exists (
      select 1 from public.exam_subjects
      where exam_subjects.id = exam_topics.exam_subject_id
      and exam_subjects.user_id = auth.uid()
    )
  );

create policy "Users can delete topics of their exam subjects"
  on public.exam_topics for delete
  using (
    exists (
      select 1 from public.exam_subjects
      where exam_subjects.id = exam_topics.exam_subject_id
      and exam_subjects.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
create trigger update_exam_topics_updated_at
  before update on public.exam_topics
  for each row
  execute function update_updated_at_column();
```

### 3. Tabela question_notebooks (Cadernos de Questões)

```sql
-- Create question_notebooks table
create table public.question_notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  notebook_id text not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.question_notebooks enable row level security;

-- RLS Policies
create policy "Users can view their own notebooks"
  on public.question_notebooks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notebooks"
  on public.question_notebooks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own notebooks"
  on public.question_notebooks for delete
  using (auth.uid() = user_id);
```

### 4. Tabela question_performance (Desempenho nas Questões)

```sql
-- Create question_performance table
create table public.question_performance (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.question_notebooks on delete cascade,
  exam_subject_id uuid not null references public.exam_subjects on delete cascade,
  exam_topic_id uuid not null references public.exam_topics on delete cascade,
  correct_answers integer not null default 0,
  answered_questions integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.question_performance enable row level security;

-- RLS Policies
create policy "Users can view performance of their notebooks"
  on public.question_performance for select
  using (
    exists (
      select 1 from public.question_notebooks
      where question_notebooks.id = question_performance.notebook_id
      and question_notebooks.user_id = auth.uid()
    )
  );

create policy "Users can insert performance for their notebooks"
  on public.question_performance for insert
  with check (
    exists (
      select 1 from public.question_notebooks
      where question_notebooks.id = question_performance.notebook_id
      and question_notebooks.user_id = auth.uid()
    )
  );

create policy "Users can delete performance of their notebooks"
  on public.question_performance for delete
  using (
    exists (
      select 1 from public.question_notebooks
      where question_notebooks.id = question_performance.notebook_id
      and question_notebooks.user_id = auth.uid()
    )
  );
```

## Formatos dos arquivos CSV

### materia.csv
```
Materia;Subtopico
TI - Desenvolvimento de Sistemas;Definição de Algoritmos e Estruturas de Controle
TI - Desenvolvimento de Sistemas;Variáveis, Subprogramas e Passagem de Parâmetro
```

### caderno.csv
```
caderno;Matéria;Subtópico;acertos;resolvidas;total
76778160;Língua Portuguesa (Português);Acentuação;1;1;5
76778160;Língua Portuguesa (Português);Adjetivo;1;1;34
```
