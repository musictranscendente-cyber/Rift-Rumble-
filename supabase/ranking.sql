-- Rift Rumble – Ranqueada: tabela dos jogadores reais, regras de acesso e proteção contra trapaça.
-- Cole tudo no Supabase em: SQL Editor -> New query -> Run. Pode rodar de novo sem problema.

create table if not exists public.ranked_players (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 3 and 16),
  fav         text not null default 'solkar',
  season      int  not null check (season >= 1),
  points      int  not null default 0 check (points >= 0),
  max_league  int  not null default 0 check (max_league between 0 and 5),
  streak      int  not null default 0 check (streak >= 0),
  wins        int  not null default 0 check (wins >= 0),
  losses      int  not null default 0 check (losses >= 0),
  trophies    int  not null default 0 check (trophies >= 0),
  prev_points int  not null default 0 check (prev_points >= 0),
  updated_at  timestamptz not null default now()
);

create index if not exists ranked_players_season_points on public.ranked_players (season, points desc);

alter table public.ranked_players enable row level security;

-- todos podem LER a lista (inclusive quem não entrou na conta)
drop policy if exists "ranking: todos leem" on public.ranked_players;
create policy "ranking: todos leem" on public.ranked_players
  for select using (true);

-- cada um só CRIA e ALTERA a própria linha; ninguém apaga
drop policy if exists "ranking: cria a propria linha" on public.ranked_players;
create policy "ranking: cria a propria linha" on public.ranked_players
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "ranking: altera a propria linha" on public.ranked_players;
create policy "ranking: altera a propria linha" on public.ranked_players
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- proteção contra trapaça (roda no banco, o jogo não consegue pular)
create or replace function public.ranked_players_guard() returns trigger
language plpgsql as $$
declare
  passou numeric;
begin
  if tg_op = 'INSERT' then
    -- linha nova começa com no máximo 40 pontos, sem troféus
    if new.points > 40 then raise exception 'linha nova: no maximo 40 pontos'; end if;
    new.trophies := 0;
    new.prev_points := 0;
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE
  if new.user_id <> old.user_id then raise exception 'nao pode trocar o dono'; end if;
  if new.season < old.season then raise exception 'temporada nao volta'; end if;
  passou := extract(epoch from (now() - old.updated_at));

  if new.season = old.season then
    if new.points > old.points then
      -- não sobe se a última gravação foi há menos de 20 s
      if passou < 20 then raise exception 'muito rapido'; end if;
      -- sobe no máximo 40 pontos a cada 40 s desde a última gravação (permite reenviar vitórias acumuladas)
      if new.points > old.points + 40 * greatest(1, floor(passou / 40)) then
        raise exception 'subiu pontos demais';
      end if;
    end if;
    if new.trophies <> old.trophies then raise exception 'trofeu so na virada'; end if;
    new.prev_points := old.prev_points;
  else
    -- virada de temporada: no máximo metade dos pontos antigos + 40; troféu sobe no máximo 1
    if new.points > floor(old.points / 2) + 40 then raise exception 'virada: pontos demais'; end if;
    if new.trophies > old.trophies + 1 or new.trophies < old.trophies then raise exception 'virada: trofeu invalido'; end if;
    if new.prev_points > old.points then raise exception 'virada: pontos anteriores invalidos'; end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ranked_players_guard on public.ranked_players;
create trigger ranked_players_guard
  before insert or update on public.ranked_players
  for each row execute function public.ranked_players_guard();
