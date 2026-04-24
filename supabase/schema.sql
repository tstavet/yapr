-- Yapr database schema
-- Run this in the Supabase SQL editor after creating a new project.

-- 1. Enable pgvector for episodic memory search
create extension if not exists vector;

-- 2. Profiles (one row per authenticated user)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  buddy_name text not null default 'Kones',
  buddy_voice text not null default 'shimmer',  -- OpenAI TTS voice: alloy, echo, fable, onyx, nova, shimmer
  created_at timestamptz default now()
);

-- 3. Structured facts (Layer 2 memory — living bio of the user)
-- Single row per user, merged into every system prompt.
create table if not exists user_facts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  facts jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 4. Conversations (one per app session)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  summary text
);

-- 5. Messages (Layer 1 memory — session buffer)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- 6. Episodic memories (Layer 3 — vector-searchable moments)
create table if not exists episodic_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  content text not null,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  created_at timestamptz default now()
);

create index if not exists episodic_memories_embedding_idx
  on episodic_memories using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists episodic_memories_user_idx on episodic_memories(user_id, created_at desc);

-- 7. Semantic search function for episodic memory
create or replace function match_memories(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 3
)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    em.id,
    em.content,
    em.created_at,
    1 - (em.embedding <=> query_embedding) as similarity
  from episodic_memories em
  where em.user_id = match_user_id
  order by em.embedding <=> query_embedding
  limit match_count;
$$;

-- 8. Row-level security: users see only their own data
alter table profiles enable row level security;
alter table user_facts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table episodic_memories enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own facts" on user_facts for all using (auth.uid() = user_id);
create policy "own conversations" on conversations for all using (auth.uid() = user_id);
create policy "own messages" on messages for all using (auth.uid() = user_id);
create policy "own memories" on episodic_memories for all using (auth.uid() = user_id);

-- 9. Auto-create profile + facts row on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id) values (new.id);
  insert into user_facts (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
