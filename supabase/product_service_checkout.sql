-- Executar depois de schema.sql em instalações novas, ou diretamente na base existente.
-- Script incremental e reaplicável. Não remove o acervo antigo de portfólio.
begin;

create table if not exists public.provider_catalog_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  kind text not null check (kind in ('product', 'service')),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  cost_price numeric(10,2) not null default 0 check (cost_price >= 0 and cost_price < 100000000),
  sale_price numeric(10,2) not null check (sale_price >= 0 and sale_price < 100000000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (kind = 'product' or cost_price = 0)
);
create index if not exists provider_catalog_active_idx
  on public.provider_catalog_items(provider_id, name) where deleted_at is null;
create index if not exists provider_catalog_owner_idx on public.provider_catalog_items(provider_id);

create table if not exists public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  catalog_item_id uuid not null references public.provider_catalog_items(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  kind text not null check (kind in ('product', 'service')),
  name text not null,
  description text not null default '',
  quantity integer not null check (quantity between 1 and 9999),
  unit_cost numeric(10,2) not null check (unit_cost >= 0 and unit_cost < 100000000),
  unit_price numeric(10,2) not null check (unit_price >= 0 and unit_price < 100000000),
  check (kind = 'product' or unit_cost = 0),
  unique (appointment_id, catalog_item_id)
);
create index if not exists appointment_items_provider_idx on public.appointment_items(provider_id);
create index if not exists appointment_items_catalog_idx on public.appointment_items(catalog_item_id);

-- Valores finais e forma de pagamento permanecem em appointments (fonte única do faturamento).
-- Custos privados ficam nesta relação 1:1; clientes não podem consultar a margem do prestador.
create table if not exists public.appointment_finances (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  total_cost numeric(18,2) check (total_cost >= 0 and total_cost < 10000000000000000),
  recorded_at timestamptz not null default now()
);
create index if not exists appointment_finances_provider_idx on public.appointment_finances(provider_id);

alter table public.provider_catalog_items enable row level security;
alter table public.appointment_items enable row level security;
alter table public.appointment_finances enable row level security;
revoke all on public.provider_catalog_items, public.appointment_items, public.appointment_finances from anon, authenticated;
grant select, insert, update on public.provider_catalog_items to authenticated;
grant select on public.appointment_items, public.appointment_finances to authenticated;

drop policy if exists catalog_owner_select on public.provider_catalog_items;
create policy catalog_owner_select on public.provider_catalog_items for select to authenticated
  using (provider_id = (select auth.uid()));
drop policy if exists catalog_owner_insert on public.provider_catalog_items;
create policy catalog_owner_insert on public.provider_catalog_items for insert to authenticated
  with check (provider_id = (select auth.uid()));
drop policy if exists catalog_owner_update on public.provider_catalog_items;
create policy catalog_owner_update on public.provider_catalog_items for update to authenticated
  using (provider_id = (select auth.uid())) with check (provider_id = (select auth.uid()));
drop policy if exists appointment_items_owner on public.appointment_items;
create policy appointment_items_owner on public.appointment_items for select to authenticated
  using (provider_id = (select auth.uid()));
drop policy if exists appointment_finances_owner on public.appointment_finances;
create policy appointment_finances_owner on public.appointment_finances for select to authenticated
  using (provider_id = (select auth.uid()));

create schema if not exists private;
grant usage on schema private to authenticated;

-- SECURITY DEFINER é necessário: escritas diretas em appointments/finances/items são revogadas.
-- A implementação privilegiada fica fora dos schemas expostos e valida a identidade explicitamente.
create or replace function private.complete_appointment_with_items(
  p_appointment_id uuid, p_final_amount numeric, p_payment_method public.payment_method,
  p_items jsonb
) returns public.appointments
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target public.appointments;
  entry jsonb;
  catalog public.provider_catalog_items;
  item_id uuid;
  qty numeric;
  total numeric := 0;
  seen uuid[] := '{}';
begin
  if actor is null then raise exception 'Autenticação necessária.'; end if;
  if p_final_amount is null or not (p_final_amount > 0 and p_final_amount < 100000000)
    or round(p_final_amount, 2) <> p_final_amount then
    raise exception 'Informe um valor final válido com até duas casas decimais.';
  end if;
  if p_payment_method is null then raise exception 'Informe a forma de pagamento.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Lista de itens inválida.';
  end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'Limite de 200 itens por atendimento.'; end if;

  select * into target from public.appointments
    where id = p_appointment_id and provider_id = actor for update;
  if target.id is null or target.status <> 'accepted' then
    raise exception 'Agendamento não encontrado, ainda não aceito, já concluído ou sem permissão.';
  end if;
  -- Ordem estável de bloqueio do catálogo evita deadlocks em conclusões simultâneas.
  for entry in select value from jsonb_array_elements(p_items) order by value->>'catalog_item_id' loop
    item_id := (entry->>'catalog_item_id')::uuid;
    qty := (entry->>'quantity')::numeric;
    if item_id is null or item_id = any(seen) or qty is null
      or not (qty between 1 and 9999) or qty <> trunc(qty) then
      raise exception 'Item repetido ou quantidade inválida.';
    end if;
    seen := array_append(seen, item_id);
    select * into catalog from public.provider_catalog_items
      where id = item_id and provider_id = actor and deleted_at is null for share;
    if catalog.id is null then raise exception 'Item indisponível ou pertencente a outro prestador.'; end if;
    insert into public.appointment_items (
      appointment_id, catalog_item_id, provider_id, kind, name, description, quantity, unit_cost, unit_price
    ) values (target.id, catalog.id, actor, catalog.kind, catalog.name, catalog.description,
      qty::integer, case when catalog.kind = 'product' then catalog.cost_price else 0 end, catalog.sale_price);
    total := total + case when catalog.kind = 'product' then catalog.cost_price * qty else 0 end;
  end loop;
  insert into public.appointment_finances(appointment_id, provider_id, total_cost)
    values (target.id, actor, total);
  update public.appointments set status = 'completed', completed_at = now(),
    final_amount = p_final_amount, payment_method = p_payment_method
    where id = target.id returning * into target;
  return target;
end;
$$;
revoke all on function private.complete_appointment_with_items(uuid, numeric, public.payment_method, jsonb) from public, anon;
grant execute on function private.complete_appointment_with_items(uuid, numeric, public.payment_method, jsonb) to authenticated;

create or replace function public.complete_appointment_with_items(
  p_appointment_id uuid, p_final_amount numeric, p_payment_method public.payment_method, p_items jsonb default '[]'
) returns public.appointments language sql security invoker set search_path = '' as $$
  select private.complete_appointment_with_items(p_appointment_id, p_final_amount, p_payment_method, p_items);
$$;
revoke all on function public.complete_appointment_with_items(uuid, numeric, public.payment_method, jsonb) from public, anon;
grant execute on function public.complete_appointment_with_items(uuid, numeric, public.payment_method, jsonb) to authenticated;

-- Compatibilidade: clientes antigos também passam pela mesma transação, sem itens.
create or replace function public.complete_appointment(
  p_appointment_id uuid, p_final_amount numeric, p_payment_method public.payment_method
) returns public.appointments language sql security invoker set search_path = '' as $$
  select private.complete_appointment_with_items(p_appointment_id, p_final_amount, p_payment_method, '[]'::jsonb);
$$;
revoke all on function public.complete_appointment(uuid, numeric, public.payment_method) from public, anon;
grant execute on function public.complete_appointment(uuid, numeric, public.payment_method) to authenticated;

-- Não inventar custos para serviços antigos: NULL significa custo não informado.
insert into public.appointment_finances(appointment_id, provider_id, total_cost, recorded_at)
  select id, provider_id, null, coalesce(completed_at, created_at) from public.appointments
  where status = 'completed' on conflict (appointment_id) do nothing;

create or replace view public.provider_financial_summary with (security_invoker = true) as
  select a.provider_id, sum(a.final_amount) as gross_revenue,
    sum(coalesce(f.total_cost, 0)) as product_costs,
    sum(a.final_amount - coalesce(f.total_cost, 0)) as net_profit,
    count(*) filter (where f.total_cost is null) as receipts_without_cost
  from public.appointments a left join public.appointment_finances f on f.appointment_id = a.id
  where a.status = 'completed' and a.final_amount is not null and a.provider_id = (select auth.uid())
  group by a.provider_id;
revoke all on public.provider_financial_summary from anon;
grant select on public.provider_financial_summary to authenticated;
notify pgrst, 'reload schema';
commit;
