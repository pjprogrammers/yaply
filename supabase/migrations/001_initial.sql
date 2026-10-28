create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_code text,
  game_key text not null default 'skribbl',
  started_at timestamptz not null,
  ended_at timestamptz,
  rounds_completed integer not null default 0
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete set null,
  display_name_snapshot text not null,
  final_score integer not null default 0,
  placement integer,
  primary key (match_id, display_name_snapshot)
);

create index matches_ended_at_idx on public.matches (ended_at desc);
create index match_players_player_id_idx on public.match_players (player_id);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
