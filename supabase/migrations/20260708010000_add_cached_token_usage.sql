alter table public.agent_runs
  add column if not exists cached_input_tokens integer;
