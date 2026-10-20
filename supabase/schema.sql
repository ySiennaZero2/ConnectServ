-- ConectaServ MVP
-- Execute este arquivo no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('client', 'provider');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fiscal_document_type as enum ('CPF', 'CNPJ');
exception when duplicate_object then null;
end $$;

create or replace function public.is_valid_cpf(value text)
returns boolean
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  total integer := 0;
  first_digit integer;
  second_digit integer;
  index_value integer;
begin
  if value !~ '^[0-9]{11}$' or value ~ '^([0-9])\1{10}$' then
    return false;
  end if;

  for index_value in 1..9 loop
    total := total + substring(value, index_value, 1)::integer * (11 - index_value);
  end loop;
  first_digit := (total * 10) % 11;
  if first_digit = 10 then first_digit := 0; end if;

  total := 0;
  for index_value in 1..10 loop
    total := total + substring(value, index_value, 1)::integer * (12 - index_value);
  end loop;
  second_digit := (total * 10) % 11;
  if second_digit = 10 then second_digit := 0; end if;

  return first_digit = substring(value, 10, 1)::integer
    and second_digit = substring(value, 11, 1)::integer;
end;
$$;

create or replace function public.is_valid_cnpj(value text)
returns boolean
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  first_weights integer[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  second_weights integer[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  total integer := 0;
  remainder integer;
  first_digit integer;
  second_digit integer;
  index_value integer;
begin
  if value !~ '^[0-9]{14}$' or value ~ '^([0-9])\1{13}$' then
    return false;
  end if;

  for index_value in 1..12 loop
    total := total + substring(value, index_value, 1)::integer * first_weights[index_value];
  end loop;
  remainder := total % 11;
  first_digit := case when remainder < 2 then 0 else 11 - remainder end;

  total := 0;
  for index_value in 1..13 loop
    total := total + substring(value, index_value, 1)::integer * second_weights[index_value];
  end loop;
  remainder := total % 11;
  second_digit := case when remainder < 2 then 0 else 11 - remainder end;

  return first_digit = substring(value, 13, 1)::integer
    and second_digit = substring(value, 14, 1)::integer;
end;
$$;

do $$ begin
  create type public.appointment_status as enum (
    'pending',
    'accepted',
    'declined',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.service_request_status as enum (
    'open',
    'quote_selected',
    'cancelled',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.service_quote_status as enum ('sent', 'selected', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_urgency as enum ('flexible', 'soon', 'urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_media_type as enum ('image', 'video');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('pix', 'credit_card', 'debit_card', 'cash');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.cancellation_reason as enum (
    'communication_failure',
    'service_disagreement',
    'lateness',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.moderation_status as enum ('publicado', 'sob_analise');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_plan as enum ('gratuito', 'profissional', 'premium');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (char_length(trim(full_name)) between 3 and 120),
  cpf varchar(11),
  phone text,
  avatar_url text,
  city text,
  latitude double precision,
  longitude double precision,
  rating_average numeric(2,1) not null default 0 check (rating_average between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_client_cpf_required check (
    (role = 'client'::public.user_role and cpf is not null and public.is_valid_cpf(cpf))
    or (role = 'provider'::public.user_role and cpf is null)
  )
);

alter table public.profiles add column if not exists cpf varchar(11);

do $$ begin
  alter table public.profiles
    add constraint profiles_client_cpf_required check (
      (role = 'client'::public.user_role and (cpf is null or public.is_valid_cpf(cpf)))
      or (role = 'provider'::public.user_role and cpf is null)
    ) not valid;
exception when duplicate_object then null;
end $$;

create unique index if not exists profiles_cpf_unique_idx
  on public.profiles(cpf) where cpf is not null;

create table if not exists public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tipo_documento public.fiscal_document_type not null,
  cpf_cnpj varchar(14) not null,
  nome_responsavel text not null check (char_length(trim(nome_responsavel)) between 3 and 120),
  razao_social text,
  nome_fantasia text,
  cep varchar(8),
  logradouro text,
  numero text,
  bairro text,
  cidade_fisica text,
  fachada_url text,
  profession text not null check (char_length(trim(profession)) between 3 and 120),
  bio text not null default '' check (char_length(bio) <= 1000),
  agenda_open boolean not null default true,
  profile_hidden boolean not null default false,
  availability_weekdays smallint[] not null default array[1,2,3,4,5]::smallint[] check (
    cardinality(availability_weekdays) between 0 and 7
    and availability_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  availability_start time not null default '08:00',
  availability_end time not null default '18:00',
  availability_timezone text not null default 'America/Sao_Paulo',
  service_cities text[] not null default array['Registro']::text[] check (
    cardinality(service_cities) between 1 and 23
    and service_cities <@ array[
      'Apiaí', 'Barra do Chapéu', 'Barra do Turvo', 'Cajati', 'Cananéia',
      'Eldorado', 'Iguape', 'Ilha Comprida', 'Iporanga', 'Itaóca',
      'Itapirapuã Paulista', 'Itariri', 'Jacupiranga', 'Juquiá', 'Juquitiba',
      'Miracatu', 'Pariquera-Açu', 'Pedro de Toledo', 'Registro', 'Ribeira',
      'São Lourenço da Serra', 'Sete Barras', 'Tapiraí'
    ]::text[]
  ),
  service_categories text[] not null default array['general']::text[] check (
    cardinality(service_categories) between 1 and 3
    and service_categories <@ array[
      'electrical', 'plumbing', 'cleaning', 'furniture',
      'painting', 'air_conditioning', 'general'
    ]::text[]
  ),
  service_radius_km integer not null default 10 check (service_radius_km between 1 and 100),
  rating_average numeric(2,1) not null default 0 check (rating_average between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  plano_atual public.subscription_plan not null default 'gratuito',
  atendimentos_mes_atual integer not null default 0 check (atendimentos_mes_atual >= 0),
  data_ultimo_reset timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_profiles_fiscal_data_check check (
    tipo_documento is not null
    and cpf_cnpj is not null
    and nome_responsavel is not null
    and (
      (
      tipo_documento = 'CPF'::public.fiscal_document_type
      and public.is_valid_cpf(cpf_cnpj)
      and razao_social is null and nome_fantasia is null and cep is null
      and logradouro is null and numero is null and bairro is null and cidade_fisica is null
      )
      or (
        tipo_documento = 'CNPJ'::public.fiscal_document_type
        and public.is_valid_cnpj(cpf_cnpj)
        and razao_social is not null and char_length(trim(razao_social)) >= 3
        and nome_fantasia is not null and char_length(trim(nome_fantasia)) >= 2
        and cep is not null and cep ~ '^[0-9]{8}$'
        and logradouro is not null and char_length(trim(logradouro)) >= 3
        and numero is not null and char_length(trim(numero)) >= 1
        and bairro is not null and char_length(trim(bairro)) >= 2
        and cidade_fisica is not null and char_length(trim(cidade_fisica)) >= 2
      )
    )
  )
);

alter table public.provider_profiles
  add column if not exists tipo_documento public.fiscal_document_type,
  add column if not exists cpf_cnpj varchar(14),
  add column if not exists nome_responsavel text,
  add column if not exists razao_social text,
  add column if not exists nome_fantasia text,
  add column if not exists cep varchar(8),
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists cidade_fisica text;

alter table public.provider_profiles
  add column if not exists fachada_url text;

alter table public.provider_profiles
  add column if not exists plano_atual public.subscription_plan not null default 'gratuito',
  add column if not exists atendimentos_mes_atual integer not null default 0,
  add column if not exists data_ultimo_reset timestamptz not null default now();

do $$ begin
  alter table public.provider_profiles
    add constraint provider_profiles_monthly_usage_check
    check (atendimentos_mes_atual >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.provider_profiles
    add constraint provider_profiles_fiscal_data_check check (
      (tipo_documento is null and cpf_cnpj is null)
      or (
        tipo_documento is not null
        and cpf_cnpj is not null
        and (
          (
            tipo_documento = 'CPF'::public.fiscal_document_type
            and public.is_valid_cpf(cpf_cnpj)
            and razao_social is null and nome_fantasia is null and cep is null
            and logradouro is null and numero is null and bairro is null and cidade_fisica is null
          )
          or (
            tipo_documento = 'CNPJ'::public.fiscal_document_type
            and public.is_valid_cnpj(cpf_cnpj)
            and razao_social is not null and char_length(trim(razao_social)) >= 3
            and nome_fantasia is not null and char_length(trim(nome_fantasia)) >= 2
            and cep is not null and cep ~ '^[0-9]{8}$'
            and logradouro is not null and char_length(trim(logradouro)) >= 3
            and numero is not null and char_length(trim(numero)) >= 1
            and bairro is not null and char_length(trim(bairro)) >= 2
            and cidade_fisica is not null and char_length(trim(cidade_fisica)) >= 2
          )
        )
      )
    ) not valid;
exception when duplicate_object then null;
end $$;

create unique index if not exists provider_profiles_cpf_cnpj_unique_idx
  on public.provider_profiles(cpf_cnpj) where cpf_cnpj is not null;

alter table public.provider_profiles
  add column if not exists service_categories text[] not null default array['general']::text[];

alter table public.provider_profiles
  add column if not exists availability_weekdays smallint[] not null default array[1,2,3,4,5]::smallint[],
  add column if not exists availability_start time not null default '08:00',
  add column if not exists availability_end time not null default '18:00',
  add column if not exists availability_timezone text not null default 'America/Sao_Paulo',
  add column if not exists service_cities text[] not null default array['Registro']::text[];

alter table public.provider_profiles
  add column if not exists profile_hidden boolean not null default false;

update public.provider_profiles
set plano_atual = case
  when cardinality(service_cities) > 5 then 'premium'::public.subscription_plan
  when cardinality(service_cities) > 2 then 'profissional'::public.subscription_plan
  else plano_atual
end
where cardinality(service_cities) > case plano_atual
  when 'gratuito'::public.subscription_plan then 2
  when 'profissional'::public.subscription_plan then 5
  else 23
end;

create index if not exists provider_profiles_plan_search_idx
  on public.provider_profiles(plano_atual desc, rating_average desc)
  where profile_hidden = false;

alter table public.provider_profiles drop column if exists base_price;

do $$ begin
  alter table public.provider_profiles
    add constraint provider_profiles_availability_check check (
      cardinality(availability_weekdays) between 0 and 7
      and availability_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
      and availability_start < availability_end
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.provider_profiles
    drop constraint if exists provider_profiles_service_cities_check;
  alter table public.provider_profiles
    drop constraint if exists provider_profiles_service_cities_plan_check;
  alter table public.provider_profiles
    add constraint provider_profiles_service_cities_plan_check check (
      cardinality(service_cities) between 1 and 23
      and cardinality(service_cities) <= case plano_atual
        when 'gratuito'::public.subscription_plan then 2
        when 'profissional'::public.subscription_plan then 5
        else 23
      end
      and service_cities <@ array[
        'Apiaí', 'Barra do Chapéu', 'Barra do Turvo', 'Cajati', 'Cananéia',
        'Eldorado', 'Iguape', 'Ilha Comprida', 'Iporanga', 'Itaóca',
        'Itapirapuã Paulista', 'Itariri', 'Jacupiranga', 'Juquiá', 'Juquitiba',
        'Miracatu', 'Pariquera-Açu', 'Pedro de Toledo', 'Registro', 'Ribeira',
        'São Lourenço da Serra', 'Sete Barras', 'Tapiraí'
      ]::text[]
    );
exception when duplicate_object then null;
end $$;

create or replace function public.refresh_my_provider_plan()
returns public.provider_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  target public.provider_profiles;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;

  select * into target
  from public.provider_profiles
  where user_id = requester_id
  for update;

  if target.user_id is null then
    raise exception 'Perfil profissional não encontrado.' using errcode = '42501';
  end if;

  if now() >= target.data_ultimo_reset + interval '30 days' then
    update public.provider_profiles
    set atendimentos_mes_atual = 0, data_ultimo_reset = now(), updated_at = now()
    where user_id = requester_id
    returning * into target;
  end if;
  return target;
end;
$$;

create or replace function public.consume_provider_service_slot()
returns public.provider_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  target public.provider_profiles;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;

  select * into target
  from public.provider_profiles
  where user_id = requester_id
  for update;

  if target.user_id is null then
    raise exception 'Apenas profissionais podem realizar esta ação.' using errcode = '42501';
  end if;

  if now() >= target.data_ultimo_reset + interval '30 days' then
    target.atendimentos_mes_atual := 0;
    target.data_ultimo_reset := now();
  end if;

  if target.plano_atual = 'gratuito'::public.subscription_plan
     and target.atendimentos_mes_atual >= 5 then
    raise exception 'LIMIT_MONTHLY_FREE_PLAN: limite mensal de 5 atendimentos atingido.'
      using errcode = 'P0001';
  end if;

  update public.provider_profiles
  set
    atendimentos_mes_atual = target.atendimentos_mes_atual + 1,
    data_ultimo_reset = target.data_ultimo_reset,
    updated_at = now()
  where user_id = requester_id
  returning * into target;

  return target;
end;
$$;

create or replace function public.change_my_subscription_plan(
  p_plan public.subscription_plan
)
returns public.provider_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  target public.provider_profiles;
  city_limit integer;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;
  if p_plan is null then
    raise exception 'Selecione um plano válido.' using errcode = '23514';
  end if;
  if p_plan <> 'gratuito'::public.subscription_plan then
    raise exception 'Planos pagos só podem ser ativados após confirmação do pagamento.'
      using errcode = '42501';
  end if;

  city_limit := case p_plan
    when 'gratuito'::public.subscription_plan then 2
    when 'profissional'::public.subscription_plan then 5
    else 23
  end;

  update public.provider_profiles
  set
    plano_atual = p_plan,
    service_cities = service_cities[1:city_limit],
    updated_at = now()
  where user_id = requester_id
  returning * into target;

  if target.user_id is null then
    raise exception 'Perfil profissional não encontrado.' using errcode = '42501';
  end if;
  return target;
end;
$$;

create table if not exists public.historico_pagamentos (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  mercadopago_payment_id text not null unique,
  valor numeric(10,2) not null check (valor > 0),
  plano public.subscription_plan not null check (plano <> 'gratuito'::public.subscription_plan),
  metodo_pagamento text not null check (metodo_pagamento in ('pix', 'cartao')),
  status text not null check (char_length(status) between 2 and 40),
  data_pagamento timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.historico_pagamentos
  drop constraint if exists historico_pagamentos_mercadopago_payment_id_check;
alter table public.historico_pagamentos
  add constraint historico_pagamentos_mercadopago_payment_id_check
  check (mercadopago_payment_id ~ '^((ORD|PAY)[A-Za-z0-9]+|[0-9]+)$');

create index if not exists historico_pagamentos_prestador_data_idx
  on public.historico_pagamentos(prestador_id, created_at desc);

create or replace function public.activate_subscription_from_payment(
  p_provider_id uuid,
  p_payment_id text,
  p_plan public.subscription_plan,
  p_amount numeric,
  p_method text,
  p_status text,
  p_paid_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_amount numeric(10,2);
  official_amount numeric(10,2);
  existing_id uuid;
  existing_provider_id uuid;
  existing_plan public.subscription_plan;
  existing_amount numeric(10,2);
begin
  official_amount := case p_plan
    when 'profissional'::public.subscription_plan then 19.90
    when 'premium'::public.subscription_plan then 39.90
    else null
  end;

  if official_amount is null or p_amount not in (50.00, official_amount) then
    raise exception 'Plano ou valor de pagamento inválido.' using errcode = '23514';
  end if;
  expected_amount := p_amount;
  if p_payment_id is null or p_payment_id !~ '^((ORD|PAY)[A-Za-z0-9]+|[0-9]+)$'
    or p_method is null or p_method not in ('pix', 'cartao') then
    raise exception 'Identificador ou método de pagamento inválido.' using errcode = '23514';
  end if;
  if p_status <> 'approved' then
    raise exception 'Somente pagamentos aprovados podem ativar planos.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.provider_profiles where user_id = p_provider_id
  ) then
    raise exception 'Perfil profissional não encontrado.' using errcode = 'P0002';
  end if;

  select id, prestador_id, plano, valor
  into existing_id, existing_provider_id, existing_plan, existing_amount
  from public.historico_pagamentos
  where mercadopago_payment_id = p_payment_id
  for update;

  if existing_id is not null and (
    existing_provider_id <> p_provider_id
    or existing_plan <> p_plan
    or existing_amount <> expected_amount
  ) then
    raise exception 'Pagamento já registrado com dados divergentes.' using errcode = '23505';
  end if;

  insert into public.historico_pagamentos (
    prestador_id, mercadopago_payment_id, valor, plano, metodo_pagamento,
    status, data_pagamento, updated_at
  ) values (
    p_provider_id, p_payment_id, expected_amount, p_plan, p_method,
    'approved', coalesce(p_paid_at, now()), now()
  )
  on conflict (mercadopago_payment_id) do update set
    status = 'approved',
    data_pagamento = coalesce(public.historico_pagamentos.data_pagamento, excluded.data_pagamento),
    updated_at = now();

  update public.provider_profiles
  set
    plano_atual = p_plan,
    atendimentos_mes_atual = 0,
    data_ultimo_reset = now(),
    updated_at = now()
  where user_id = p_provider_id;
end;
$$;

do $$ begin
  alter table public.provider_profiles
    add constraint provider_profiles_service_categories_check check (
      cardinality(service_categories) between 1 and 3
      and service_categories <@ array[
        'electrical', 'plumbing', 'cleaning', 'furniture',
        'painting', 'air_conditioning', 'general'
      ]::text[]
    );
exception when duplicate_object then null;
end $$;

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  caption text check (caption is null or char_length(caption) <= 200),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (provider_id, storage_path)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  client_name text not null check (char_length(trim(client_name)) between 3 and 120),
  category text not null check (
    category = any(array[
      'electrical', 'plumbing', 'cleaning', 'furniture',
      'painting', 'air_conditioning', 'general'
    ]::text[])
  ),
  title text not null check (char_length(trim(title)) between 8 and 90),
  description text not null check (char_length(trim(description)) between 30 and 1200),
  city text not null,
  urgency public.request_urgency not null default 'flexible',
  status public.service_request_status not null default 'open',
  selected_quote_id uuid,
  selected_provider_id uuid references public.provider_profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_requests
  add column if not exists client_name text;

update public.service_requests request
set client_name = profile.full_name
from public.profiles profile
where request.client_id = profile.id
  and request.client_name is null;

alter table public.service_requests
  alter column client_name set not null;

create index if not exists service_requests_category_status_idx
  on public.service_requests(category, status, created_at desc);

create index if not exists service_requests_client_idx
  on public.service_requests(client_id, created_at desc);

create index if not exists service_requests_city_status_idx
  on public.service_requests(city, status, created_at desc);

create table if not exists public.service_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  media_type public.request_media_type not null,
  storage_path text not null,
  mime_type text not null,
  file_name text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  unique (request_id, storage_path)
);

create table if not exists public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  estimated_duration text not null check (char_length(trim(estimated_duration)) between 3 and 60),
  message text not null check (char_length(trim(message)) between 20 and 700),
  includes_materials boolean not null default false,
  materials_description text check (
    materials_description is null or char_length(trim(materials_description)) <= 400
  ),
  status public.service_quote_status not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create index if not exists service_quotes_request_idx
  on public.service_quotes(request_id, amount);

create index if not exists service_quotes_provider_idx
  on public.service_quotes(provider_id, created_at desc);

do $$ begin
  alter table public.service_requests
    add constraint service_requests_selected_quote_fk
    foreign key (selected_quote_id) references public.service_quotes(id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  quote_id uuid not null references public.service_quotes(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists community_messages_quote_created_idx
  on public.community_messages(quote_id, created_at);

create index if not exists community_messages_request_idx
  on public.community_messages(request_id);

create index if not exists community_messages_sender_idx
  on public.community_messages(sender_id);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 30 and 480),
  details text not null check (char_length(trim(details)) between 10 and 1000),
  status public.appointment_status not null default 'pending',
  rejection_reason text,
  final_amount numeric(10,2) check (final_amount is null or final_amount > 0),
  payment_method public.payment_method,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint appointments_different_users check (client_id <> provider_id),
  constraint declined_requires_reason check (
    status <> 'declined'
    or (rejection_reason is not null and char_length(trim(rejection_reason)) >= 10)
  )
);

alter table public.appointments
  add column if not exists final_amount numeric(10,2),
  add column if not exists payment_method public.payment_method;

create unique index if not exists appointments_provider_active_slot_idx
  on public.appointments(provider_id, scheduled_at)
  where status in ('pending', 'accepted');

create index if not exists appointments_client_idx
  on public.appointments(client_id, scheduled_at desc);

create index if not exists appointments_provider_status_idx
  on public.appointments(provider_id, status, scheduled_at);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_id uuid not null references public.profiles(id) on delete restrict,
  reviewer_role public.user_role not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  moderation_status public.moderation_status not null default 'publicado',
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reviews_different_users check (reviewer_id <> reviewed_id),
  unique (appointment_id, reviewer_id)
);

alter table public.reviews
  add column if not exists moderation_status public.moderation_status not null default 'publicado',
  add column if not exists reported_by uuid references public.profiles(id) on delete set null;

create index if not exists reviews_reviewed_idx
  on public.reviews(reviewed_id, created_at desc);

create table if not exists public.appointment_cancellations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  cancelled_by public.user_role not null,
  reason public.cancellation_reason not null,
  justification text check (justification is null or char_length(trim(justification)) <= 140),
  reply text check (reply is null or char_length(trim(reply)) between 1 and 140),
  replied_by uuid references public.profiles(id) on delete set null,
  replied_at timestamptz,
  moderation_status public.moderation_status not null default 'publicado',
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cancellation_reply_consistency check (
    (reply is null and replied_by is null and replied_at is null)
    or (reply is not null and replied_by is not null and replied_at is not null)
  )
);

create index if not exists appointment_cancellations_created_idx
  on public.appointment_cancellations(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists provider_profiles_set_updated_at on public.provider_profiles;
create trigger provider_profiles_set_updated_at
before update on public.provider_profiles
for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

drop trigger if exists service_quotes_set_updated_at on public.service_quotes;
create trigger service_quotes_set_updated_at
before update on public.service_quotes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role public.user_role;
  selected_document_type public.fiscal_document_type;
  selected_name text;
  selected_responsible_name text;
  selected_document text;
  selected_legal_name text;
  selected_trade_name text;
  selected_cep text;
  selected_street text;
  selected_number text;
  selected_district text;
  selected_company_city text;
begin
  selected_role := case
    when new.raw_user_meta_data ->> 'role' = 'provider' then 'provider'::public.user_role
    else 'client'::public.user_role
  end;
  selected_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  selected_responsible_name := selected_name;

  if selected_role = 'client'::public.user_role then
    selected_document := new.raw_user_meta_data ->> 'cpf';
    if selected_document is null or not public.is_valid_cpf(selected_document) then
      raise exception 'CPF inválido ou ausente.' using errcode = '23514';
    end if;

    insert into public.profiles (id, role, full_name, cpf)
    values (new.id, selected_role, selected_name, selected_document);
  else
    if new.raw_user_meta_data ->> 'tipo_documento' is null
       or new.raw_user_meta_data ->> 'tipo_documento' not in ('CPF', 'CNPJ') then
      raise exception 'Tipo de documento do prestador inválido.' using errcode = '23514';
    end if;

    selected_document_type :=
      (new.raw_user_meta_data ->> 'tipo_documento')::public.fiscal_document_type;
    selected_document := new.raw_user_meta_data ->> 'cpf_cnpj';
    if selected_document is null
       or (selected_document_type = 'CPF' and not public.is_valid_cpf(selected_document))
       or (selected_document_type = 'CNPJ' and not public.is_valid_cnpj(selected_document)) then
      raise exception '% inválido ou ausente.', selected_document_type using errcode = '23514';
    end if;

    if selected_document_type = 'CNPJ'::public.fiscal_document_type then
      selected_legal_name := nullif(trim(new.raw_user_meta_data ->> 'razao_social'), '');
      selected_trade_name := nullif(trim(new.raw_user_meta_data ->> 'nome_fantasia'), '');
      selected_cep := new.raw_user_meta_data ->> 'cep';
      selected_street := nullif(trim(new.raw_user_meta_data ->> 'logradouro'), '');
      selected_number := nullif(trim(new.raw_user_meta_data ->> 'numero'), '');
      selected_district := nullif(trim(new.raw_user_meta_data ->> 'bairro'), '');
      selected_company_city := nullif(trim(new.raw_user_meta_data ->> 'cidade_fisica'), '');
      selected_name := coalesce(selected_trade_name, selected_name);
    end if;

    insert into public.profiles (id, role, full_name, cpf)
    values (new.id, selected_role, selected_name, null);

    insert into public.provider_profiles (
      user_id, tipo_documento, cpf_cnpj, nome_responsavel, razao_social, nome_fantasia,
      cep, logradouro, numero, bairro, cidade_fisica, profession, bio
    ) values (
      new.id, selected_document_type, selected_document, selected_responsible_name,
      selected_legal_name, selected_trade_name, selected_cep, selected_street,
      selected_number, selected_district, selected_company_city, 'Profissional autônomo',
      'Conte aos clientes sobre sua experiência e seus serviços.'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_my_registration_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  registration_data jsonb;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;

  select case
    when profile.role = 'client'::public.user_role then
      jsonb_build_object(
        'role', 'client',
        'full_name', profile.full_name,
        'phone', coalesce(profile.phone, ''),
        'city', coalesce(profile.city, ''),
        'cpf', coalesce(profile.cpf, '')
      )
    else
      jsonb_build_object(
        'role', 'provider',
        'responsible_name', coalesce(provider.nome_responsavel, profile.full_name),
        'phone', coalesce(profile.phone, ''),
        'document_type', coalesce(provider.tipo_documento::text, 'CPF'),
        'cpf_cnpj', coalesce(provider.cpf_cnpj, ''),
        'legal_name', coalesce(provider.razao_social, ''),
        'trade_name', coalesce(provider.nome_fantasia, ''),
        'cep', coalesce(provider.cep, ''),
        'street', coalesce(provider.logradouro, ''),
        'number', coalesce(provider.numero, ''),
        'district', coalesce(provider.bairro, ''),
        'company_city', coalesce(provider.cidade_fisica, '')
      )
  end
  into registration_data
  from public.profiles profile
  left join public.provider_profiles provider on provider.user_id = profile.id
  where profile.id = requester_id;

  if registration_data is null then
    raise exception 'Cadastro não encontrado.' using errcode = 'P0002';
  end if;
  return registration_data;
end;
$$;

create or replace function public.update_my_client_data(
  p_full_name text,
  p_phone text,
  p_city text,
  p_cpf text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
begin
  if requester_id is null or not exists (
    select 1 from public.profiles
    where id = requester_id and role = 'client'::public.user_role
  ) then
    raise exception 'Somente o cliente pode alterar estes dados.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 3
     or char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10
     or char_length(trim(coalesce(p_city, ''))) < 2
     or p_cpf is null
     or not public.is_valid_cpf(p_cpf) then
    raise exception 'Dados pessoais inválidos.' using errcode = '23514';
  end if;

  update public.profiles
  set full_name = trim(p_full_name), phone = p_phone, city = trim(p_city), cpf = p_cpf
  where id = requester_id;
exception
  when unique_violation then
    raise exception 'Este CPF já está cadastrado.' using errcode = '23505';
end;
$$;

create or replace function public.update_my_provider_registration_data(
  p_responsible_name text,
  p_phone text,
  p_cpf_cnpj text,
  p_legal_name text,
  p_trade_name text,
  p_cep text,
  p_street text,
  p_number text,
  p_district text,
  p_company_city text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  current_document_type public.fiscal_document_type;
  public_name text;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;

  select tipo_documento into current_document_type
  from public.provider_profiles
  where user_id = requester_id;
  if not found then
    raise exception 'Cadastro profissional não encontrado.' using errcode = 'P0002';
  end if;
  current_document_type := coalesce(
    current_document_type,
    'CPF'::public.fiscal_document_type
  );
  if char_length(trim(coalesce(p_responsible_name, ''))) < 3
     or char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Dados do responsável inválidos.' using errcode = '23514';
  end if;

  if current_document_type = 'CPF'::public.fiscal_document_type then
    if p_cpf_cnpj is null or not public.is_valid_cpf(p_cpf_cnpj) then
      raise exception 'CPF inválido.' using errcode = '23514';
    end if;
    public_name := trim(p_responsible_name);
  else
    if p_cpf_cnpj is null
       or not public.is_valid_cnpj(p_cpf_cnpj)
       or char_length(trim(coalesce(p_legal_name, ''))) < 3
       or char_length(trim(coalesce(p_trade_name, ''))) < 2
       or coalesce(p_cep, '') !~ '^[0-9]{8}$'
       or char_length(trim(coalesce(p_street, ''))) < 3
       or char_length(trim(coalesce(p_number, ''))) < 1
       or char_length(trim(coalesce(p_district, ''))) < 2
       or char_length(trim(coalesce(p_company_city, ''))) < 2 then
      raise exception 'Dados da empresa inválidos.' using errcode = '23514';
    end if;
    public_name := trim(p_trade_name);
  end if;

  update public.profiles
  set full_name = public_name, phone = p_phone
  where id = requester_id;

  update public.provider_profiles
  set tipo_documento = current_document_type,
      cpf_cnpj = p_cpf_cnpj,
      nome_responsavel = trim(p_responsible_name),
      razao_social = case when current_document_type = 'CNPJ' then trim(p_legal_name) else null end,
      nome_fantasia = case when current_document_type = 'CNPJ' then trim(p_trade_name) else null end,
      cep = case when current_document_type = 'CNPJ' then p_cep else null end,
      logradouro = case when current_document_type = 'CNPJ' then trim(p_street) else null end,
      numero = case when current_document_type = 'CNPJ' then trim(p_number) else null end,
      bairro = case when current_document_type = 'CNPJ' then trim(p_district) else null end,
      cidade_fisica = case when current_document_type = 'CNPJ' then trim(p_company_city) else null end
  where user_id = requester_id;
exception
  when unique_violation then
    raise exception 'Este CPF/CNPJ já está cadastrado.' using errcode = '23505';
end;
$$;

revoke all on function public.get_my_registration_data() from public, anon, authenticated;
revoke all on function public.update_my_client_data(text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_my_provider_registration_data(
  text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.get_my_registration_data() to authenticated;
grant execute on function public.update_my_client_data(text, text, text, text) to authenticated;
grant execute on function public.update_my_provider_registration_data(
  text, text, text, text, text, text, text, text, text, text
) to authenticated;

create or replace function public.request_appointment(
  p_provider_id uuid,
  p_scheduled_at timestamptz,
  p_details text
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_role public.user_role;
  provider_profile public.provider_profiles;
  local_scheduled_at timestamp;
  created_appointment public.appointments;
begin
  select role into requester_role
  from public.profiles
  where id = auth.uid();

  if requester_role is distinct from 'client'::public.user_role then
    raise exception 'Somente clientes podem solicitar agendamentos.';
  end if;

  select * into provider_profile
  from public.provider_profiles
  where user_id = p_provider_id;

  if provider_profile.user_id is null then
    raise exception 'Prestador não encontrado.';
  end if;
  if not provider_profile.agenda_open then
    raise exception 'A agenda deste prestador está fechada.';
  end if;
  if p_scheduled_at <= now() + interval '15 minutes' then
    raise exception 'Escolha um horário futuro.';
  end if;
  if char_length(trim(coalesce(p_details, ''))) < 10 then
    raise exception 'Descreva o serviço com pelo menos 10 caracteres.';
  end if;

  local_scheduled_at := p_scheduled_at at time zone provider_profile.availability_timezone;
  if not (extract(dow from local_scheduled_at)::smallint = any(provider_profile.availability_weekdays)) then
    raise exception 'O profissional não atende no dia selecionado.';
  end if;
  if local_scheduled_at::time < provider_profile.availability_start
     or local_scheduled_at::time >= provider_profile.availability_end then
    raise exception 'O horário está fora do período de atendimento do profissional.';
  end if;

  insert into public.appointments (client_id, provider_id, scheduled_at, details)
  values (auth.uid(), p_provider_id, p_scheduled_at, trim(p_details))
  returning * into created_appointment;

  return created_appointment;
exception
  when unique_violation then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.';
end;
$$;

create or replace function public.respond_to_appointment(
  p_appointment_id uuid,
  p_decision public.appointment_status,
  p_rejection_reason text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.appointments;
begin
  if p_decision not in ('accepted'::public.appointment_status, 'declined'::public.appointment_status) then
    raise exception 'A decisão deve ser accepted ou declined.';
  end if;
  if p_decision = 'declined'::public.appointment_status
     and char_length(trim(coalesce(p_rejection_reason, ''))) < 10 then
    raise exception 'Informe uma justificativa com pelo menos 10 caracteres.';
  end if;

  select * into target
  from public.appointments
  where id = p_appointment_id
    and provider_id = (select auth.uid())
    and status = 'pending'::public.appointment_status
  for update;

  if target.id is null then
    raise exception 'Solicitação não encontrada, já respondida ou sem permissão.';
  end if;

  if p_decision = 'accepted'::public.appointment_status then
    perform public.consume_provider_service_slot();
  end if;

  update public.appointments
  set
    status = p_decision,
    rejection_reason = case when p_decision = 'declined' then trim(p_rejection_reason) else null end,
    responded_at = now()
  where id = target.id
  returning * into target;
  return target;
end;
$$;

drop function if exists public.complete_appointment(uuid);

create or replace function public.complete_appointment(
  p_appointment_id uuid,
  p_final_amount numeric,
  p_payment_method public.payment_method
)
returns public.appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.appointments;
begin
  if p_final_amount is null or p_final_amount <= 0 then
    raise exception 'Informe um valor final válido.';
  end if;
  if p_payment_method is null then
    raise exception 'Informe a forma de pagamento.';
  end if;

  update public.appointments
  set
    status = 'completed',
    completed_at = now(),
    final_amount = p_final_amount,
    payment_method = p_payment_method
  where id = p_appointment_id
    and provider_id = auth.uid()
    and status = 'accepted'
  returning * into target;

  if target.id is null then
    raise exception 'Agendamento não encontrado, ainda não aceito ou sem permissão.';
  end if;
  return target;
end;
$$;

drop function if exists public.cancel_appointment(uuid);

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_reason public.cancellation_reason,
  p_justification text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.appointments;
  requester_id uuid := (select auth.uid());
  cancellation_author public.user_role;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(coalesce(p_justification, ''))) > 140 then
    raise exception 'Informe um motivo válido e uma justificativa de até 140 caracteres.' using errcode = '23514';
  end if;

  update public.appointments
  set status = 'cancelled', updated_at = now()
  where id = p_appointment_id
    and (client_id = requester_id or provider_id = requester_id)
    and status = 'accepted'
  returning * into target;

  if target.id is null then
    raise exception 'Serviço não encontrado, ainda não aceito ou sem permissão.';
  end if;

  cancellation_author := case
    when target.client_id = requester_id then 'client'::public.user_role
    else 'provider'::public.user_role
  end;

  insert into public.appointment_cancellations (
    appointment_id, cancelled_by, reason, justification
  ) values (
    target.id,
    cancellation_author,
    p_reason,
    nullif(trim(p_justification), '')
  );
  return target;
end;
$$;

create or replace function public.reply_to_cancellation(
  p_cancellation_id uuid,
  p_reply text
)
returns public.appointment_cancellations
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  target public.appointment_cancellations;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reply, ''))) not between 1 and 140 then
    raise exception 'A resposta deve ter entre 1 e 140 caracteres.' using errcode = '23514';
  end if;

  update public.appointment_cancellations cancellation
  set reply = trim(p_reply), replied_by = requester_id, replied_at = now()
  from public.appointments appointment
  where cancellation.id = p_cancellation_id
    and appointment.id = cancellation.appointment_id
    and cancellation.reply is null
    and (
      (cancellation.cancelled_by = 'client' and appointment.provider_id = requester_id)
      or (cancellation.cancelled_by = 'provider' and appointment.client_id = requester_id)
    )
  returning cancellation.* into target;

  if target.id is null then
    raise exception 'Cancelamento não encontrado ou resposta não permitida.' using errcode = '42501';
  end if;
  return target;
end;
$$;

create or replace function public.report_history_comment(
  p_kind text,
  p_comment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := (select auth.uid());
  affected_rows integer;
begin
  if requester_id is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;

  if p_kind = 'review' then
    update public.reviews
    set moderation_status = 'sob_analise', reported_by = requester_id
    where id = p_comment_id
      and reviewed_id = requester_id
      and moderation_status = 'publicado';
  elsif p_kind = 'cancellation' then
    update public.appointment_cancellations cancellation
    set moderation_status = 'sob_analise', reported_by = requester_id
    from public.appointments appointment
    where cancellation.id = p_comment_id
      and appointment.id = cancellation.appointment_id
      and cancellation.moderation_status = 'publicado'
      and (
        (cancellation.cancelled_by = 'client' and appointment.provider_id = requester_id)
        or (cancellation.cancelled_by = 'provider' and appointment.client_id = requester_id)
      );
  else
    raise exception 'Tipo de comentário inválido.' using errcode = '22023';
  end if;

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Comentário não encontrado ou denúncia não permitida.' using errcode = '42501';
  end if;
end;
$$;

drop function if exists public.create_service_request(text, text, text, public.request_urgency);

create or replace function public.create_service_request(
  p_category text,
  p_title text,
  p_description text,
  p_city text,
  p_urgency public.request_urgency default 'flexible'
)
returns public.service_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  client_profile public.profiles;
  created_request public.service_requests;
begin
  select * into client_profile
  from public.profiles
  where id = auth.uid();

  if client_profile.id is null or client_profile.role <> 'client'::public.user_role then
    raise exception 'Apenas clientes podem criar pedidos de orçamento.';
  end if;
  if not (p_city = any(array[
    'Apiaí', 'Barra do Chapéu', 'Barra do Turvo', 'Cajati', 'Cananéia',
    'Eldorado', 'Iguape', 'Ilha Comprida', 'Iporanga', 'Itaóca',
    'Itapirapuã Paulista', 'Itariri', 'Jacupiranga', 'Juquiá', 'Juquitiba',
    'Miracatu', 'Pariquera-Açu', 'Pedro de Toledo', 'Registro', 'Ribeira',
    'São Lourenço da Serra', 'Sete Barras', 'Tapiraí'
  ]::text[])) then
    raise exception 'Selecione uma cidade válida do Vale do Ribeira.';
  end if;

  insert into public.service_requests (
    client_id, client_name, category, title, description, city, urgency
  ) values (
    auth.uid(),
    client_profile.full_name,
    p_category,
    trim(p_title),
    trim(p_description),
    p_city,
    p_urgency
  )
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.submit_service_quote(
  p_request_id uuid,
  p_amount numeric,
  p_estimated_duration text,
  p_message text,
  p_includes_materials boolean default false,
  p_materials_description text default null
)
returns public.service_quotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.service_requests;
  provider_profile public.provider_profiles;
  saved_quote public.service_quotes;
begin
  select * into target_request
  from public.service_requests
  where id = p_request_id
  for update;

  select * into provider_profile
  from public.provider_profiles
  where user_id = auth.uid();

  if provider_profile.user_id is null then
    raise exception 'Apenas profissionais podem enviar propostas.';
  end if;
  if not provider_profile.agenda_open then
    raise exception 'Abra sua agenda antes de enviar uma proposta.';
  end if;
  if provider_profile.profile_hidden then
    raise exception 'Desative o modo férias antes de enviar uma proposta.';
  end if;
  if target_request.id is null or target_request.status <> 'open'::public.service_request_status then
    raise exception 'Este pedido não está mais recebendo propostas.';
  end if;
  if not (target_request.city = any(provider_profile.service_cities)) then
    raise exception 'Este pedido está fora das cidades atendidas por você.';
  end if;

  if not exists (
    select 1
    from public.service_quotes existing_quote
    where existing_quote.request_id = p_request_id
      and existing_quote.provider_id = (select auth.uid())
  ) then
    perform public.consume_provider_service_slot();
  end if;

  insert into public.service_quotes (
    request_id,
    provider_id,
    amount,
    estimated_duration,
    message,
    includes_materials,
    materials_description,
    status
  ) values (
    p_request_id,
    auth.uid(),
    p_amount,
    trim(p_estimated_duration),
    trim(p_message),
    p_includes_materials,
    nullif(trim(p_materials_description), ''),
    'sent'
  )
  on conflict (request_id, provider_id) do update set
    amount = excluded.amount,
    estimated_duration = excluded.estimated_duration,
    message = excluded.message,
    includes_materials = excluded.includes_materials,
    materials_description = excluded.materials_description,
    status = 'sent',
    updated_at = now()
  returning * into saved_quote;

  return saved_quote;
end;
$$;

create or replace function public.select_service_quote(
  p_request_id uuid,
  p_quote_id uuid
)
returns public.service_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_request public.service_requests;
  selected_quote public.service_quotes;
begin
  select * into target_request
  from public.service_requests
  where id = p_request_id
  for update;

  if target_request.id is null or target_request.client_id <> auth.uid() then
    raise exception 'Você não pode alterar este pedido.';
  end if;
  if target_request.status <> 'open'::public.service_request_status then
    raise exception 'Este pedido não está mais recebendo propostas.';
  end if;

  select * into selected_quote
  from public.service_quotes
  where id = p_quote_id and request_id = p_request_id;

  if selected_quote.id is null then
    raise exception 'Proposta inválida para este pedido.';
  end if;

  update public.service_quotes
  set status = case
    when id = p_quote_id then 'selected'::public.service_quote_status
    else 'rejected'::public.service_quote_status
  end
  where request_id = p_request_id;

  update public.service_requests
  set
    status = 'quote_selected',
    selected_quote_id = selected_quote.id,
    selected_provider_id = selected_quote.provider_id
  where id = p_request_id
  returning * into target_request;

  return target_request;
end;
$$;

create or replace function public.cancel_service_request(p_request_id uuid)
returns public.service_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_request public.service_requests;
begin
  update public.service_requests
  set status = 'cancelled'
  where id = p_request_id
    and client_id = auth.uid()
    and status = 'open'
  returning * into target_request;

  if target_request.id is null then
    raise exception 'O pedido não pode ser cancelado.';
  end if;

  update public.service_quotes
  set status = 'rejected'
  where request_id = p_request_id;

  return target_request;
end;
$$;

create or replace function public.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.appointments;
begin
  select * into target
  from public.appointments
  where id = new.appointment_id;

  if target.id is null or target.status <> 'completed'::public.appointment_status then
    raise exception 'Avaliações só podem ser enviadas após a conclusão do serviço.';
  end if;

  if auth.uid() = target.client_id then
    new.reviewer_id := target.client_id;
    new.reviewed_id := target.provider_id;
    new.reviewer_role := 'client';
  elsif auth.uid() = target.provider_id then
    new.reviewer_id := target.provider_id;
    new.reviewed_id := target.client_id;
    new.reviewer_role := 'provider';
  else
    raise exception 'Você não participou deste atendimento.';
  end if;

  new.moderation_status := 'publicado'::public.moderation_status;
  new.reported_by := null;

  return new;
end;
$$;

drop trigger if exists reviews_prepare_insert on public.reviews;
create trigger reviews_prepare_insert
before insert on public.reviews
for each row execute function public.prepare_review();

create or replace function public.refresh_review_average()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reviewer_role = 'client'::public.user_role then
    update public.provider_profiles
    set
      rating_average = (
        select round(avg(r.rating)::numeric, 1)
        from public.reviews r
        where r.reviewed_id = new.reviewed_id
          and r.reviewer_role = 'client'
      ),
      rating_count = (
        select count(*)
        from public.reviews r
        where r.reviewed_id = new.reviewed_id
          and r.reviewer_role = 'client'
      )
    where user_id = new.reviewed_id;
  else
    update public.profiles
    set
      rating_average = (
        select round(avg(r.rating)::numeric, 1)
        from public.reviews r
        where r.reviewed_id = new.reviewed_id
          and r.reviewer_role = 'provider'
      ),
      rating_count = (
        select count(*)
        from public.reviews r
        where r.reviewed_id = new.reviewed_id
          and r.reviewer_role = 'provider'
      )
    where id = new.reviewed_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_refresh_average on public.reviews;
create trigger reviews_refresh_average
after insert on public.reviews
for each row execute function public.refresh_review_average();

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_user_id uuid := auth.uid();
begin
  if target_user_id is null then
    raise exception 'Sessão expirada. Entre novamente.';
  end if;

  delete from public.reviews
  where reviewer_id = target_user_id or reviewed_id = target_user_id;

  delete from public.appointments
  where client_id = target_user_id or provider_id = target_user_id;

  update public.service_requests
  set
    selected_quote_id = null,
    selected_provider_id = null,
    status = case
      when status = 'quote_selected'::public.service_request_status
        then 'open'::public.service_request_status
      else status
    end
  where selected_provider_id = target_user_id;

  delete from public.service_quotes where provider_id = target_user_id;
  delete from public.service_requests where client_id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.historico_pagamentos enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_request_attachments enable row level security;
alter table public.service_quotes enable row level security;
alter table public.community_messages enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;
alter table public.appointment_cancellations enable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
revoke select on public.profiles from authenticated;
grant select (
  id, role, full_name, phone, avatar_url, city, latitude, longitude,
  rating_average, rating_count, created_at, updated_at
) on public.profiles to authenticated;
revoke select on public.provider_profiles from authenticated;
grant select (
  user_id, profession, bio, agenda_open, profile_hidden,
  availability_weekdays, availability_start, availability_end,
  availability_timezone, service_cities, service_categories,
  service_radius_km, rating_average, rating_count,
  plano_atual, atendimentos_mes_atual, data_ultimo_reset,
  tipo_documento, nome_fantasia, cep, logradouro, numero, bairro, cidade_fisica, fachada_url,
  created_at, updated_at
) on public.provider_profiles to authenticated;
grant select on public.historico_pagamentos to authenticated;
grant select on public.profiles to service_role;
grant select on public.provider_profiles to service_role;
grant update (plano_atual, service_cities, updated_at)
  on public.provider_profiles to service_role;
grant select, insert, update on public.historico_pagamentos to service_role;
grant select, insert, update, delete on public.portfolio_items to authenticated;
grant select on public.service_requests to authenticated;
grant select, insert, delete on public.service_request_attachments to authenticated;
grant select on public.service_quotes to authenticated;
grant select, insert on public.community_messages to authenticated;
grant select on public.appointments to authenticated;
grant select, insert on public.reviews to authenticated;
grant select on public.appointment_cancellations to authenticated;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or role = 'provider'
  or exists (
    select 1
    from public.appointments a
    where (a.client_id = auth.uid() and a.provider_id = profiles.id)
       or (a.provider_id = auth.uid() and a.client_id = profiles.id)
  )
  or exists (
    select 1
    from public.service_quotes quote
    join public.service_requests request on request.id = quote.request_id
    where (request.client_id = (select auth.uid()) and quote.provider_id = profiles.id)
       or (quote.provider_id = (select auth.uid()) and request.client_id = profiles.id)
  )
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Authenticated users can view providers" on public.provider_profiles;
create policy "Authenticated users can view providers"
on public.provider_profiles for select to authenticated
using (true);

drop policy if exists "Providers can view own payment history" on public.historico_pagamentos;
create policy "Providers can view own payment history"
on public.historico_pagamentos for select to authenticated
using (prestador_id = (select auth.uid()));

drop policy if exists "Providers can update own professional profile" on public.provider_profiles;
create policy "Providers can update own professional profile"
on public.provider_profiles for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'provider'
  )
);

drop policy if exists "Authenticated users can view portfolio" on public.portfolio_items;
create policy "Authenticated users can view portfolio"
on public.portfolio_items for select to authenticated
using (true);

drop policy if exists "Clients and related providers can view service requests" on public.service_requests;
create policy "Clients and related providers can view service requests"
on public.service_requests for select to authenticated
using (
  client_id = auth.uid()
  or selected_provider_id = auth.uid()
  or (
    status = 'open'::public.service_request_status
    and exists (
      select 1 from public.provider_profiles pp
      where pp.user_id = (select auth.uid())
        and service_requests.city = any(pp.service_cities)
    )
  )
);

drop policy if exists "Participants can view request attachments" on public.service_request_attachments;
create policy "Participants can view request attachments"
on public.service_request_attachments for select to authenticated
using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = service_request_attachments.request_id
      and (
        sr.client_id = auth.uid()
        or sr.selected_provider_id = auth.uid()
        or (
          sr.status = 'open'::public.service_request_status
          and exists (
            select 1 from public.provider_profiles pp
            where pp.user_id = (select auth.uid())
              and sr.city = any(pp.service_cities)
          )
        )
      )
  )
);

drop policy if exists "Clients can attach files to own requests" on public.service_request_attachments;
create policy "Clients can attach files to own requests"
on public.service_request_attachments for insert to authenticated
with check (
  exists (
    select 1 from public.service_requests sr
    where sr.id = service_request_attachments.request_id
      and sr.client_id = auth.uid()
      and sr.status = 'open'::public.service_request_status
  )
);

drop policy if exists "Clients can delete files from own open requests" on public.service_request_attachments;
create policy "Clients can delete files from own open requests"
on public.service_request_attachments for delete to authenticated
using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = service_request_attachments.request_id
      and sr.client_id = auth.uid()
      and sr.status = 'open'::public.service_request_status
  )
);

drop policy if exists "Clients and quote authors can view proposals" on public.service_quotes;
create policy "Clients and quote authors can view proposals"
on public.service_quotes for select to authenticated
using (
  provider_id = auth.uid()
  or exists (
    select 1 from public.service_requests sr
    where sr.id = service_quotes.request_id and sr.client_id = auth.uid()
  )
);

drop policy if exists "Conversation participants can view messages" on public.community_messages;
create policy "Conversation participants can view messages"
on public.community_messages for select to authenticated
using (
  exists (
    select 1
    from public.service_quotes quote
    join public.service_requests request on request.id = quote.request_id
    where quote.id = community_messages.quote_id
      and request.id = community_messages.request_id
      and (
        request.client_id = (select auth.uid())
        or quote.provider_id = (select auth.uid())
      )
  )
);

drop policy if exists "Conversation participants can send messages" on public.community_messages;
create policy "Conversation participants can send messages"
on public.community_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.service_quotes quote
    join public.service_requests request on request.id = quote.request_id
    where quote.id = community_messages.quote_id
      and request.id = community_messages.request_id
      and (
        request.client_id = (select auth.uid())
        or quote.provider_id = (select auth.uid())
      )
  )
);

drop policy if exists "Providers can create portfolio items" on public.portfolio_items;
create policy "Providers can create portfolio items"
on public.portfolio_items for insert to authenticated
with check (provider_id = auth.uid());

drop policy if exists "Providers can update own portfolio items" on public.portfolio_items;
create policy "Providers can update own portfolio items"
on public.portfolio_items for update to authenticated
using (provider_id = auth.uid())
with check (provider_id = auth.uid());

drop policy if exists "Providers can delete own portfolio items" on public.portfolio_items;
create policy "Providers can delete own portfolio items"
on public.portfolio_items for delete to authenticated
using (provider_id = auth.uid());

drop policy if exists "Participants can view appointments" on public.appointments;
create policy "Participants can view appointments"
on public.appointments for select to authenticated
using (client_id = auth.uid() or provider_id = auth.uid());

drop policy if exists "Authenticated users can view reviews" on public.reviews;
create policy "Authenticated users can view reviews"
on public.reviews for select to authenticated
using (
  (
    reviewer_role = 'client'
    and moderation_status = 'publicado'::public.moderation_status
  )
  or reviewer_id = (select auth.uid())
  or reviewed_id = (select auth.uid())
);

drop policy if exists "Participants can create one review" on public.reviews;
create policy "Participants can create one review"
on public.reviews for insert to authenticated
with check (reviewer_id = auth.uid());

drop policy if exists "Participants can view appointment cancellations" on public.appointment_cancellations;
create policy "Participants can view appointment cancellations"
on public.appointment_cancellations for select to authenticated
using (
  exists (
    select 1
    from public.appointments appointment
    where appointment.id = appointment_cancellations.appointment_id
      and (
        appointment.client_id = (select auth.uid())
        or appointment.provider_id = (select auth.uid())
      )
  )
);

-- Restringe colunas calculadas e mudanças de status a triggers/RPCs.
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, city, latitude, longitude) on public.profiles to authenticated;

revoke insert, delete on public.provider_profiles from authenticated;
revoke update on public.provider_profiles from authenticated;
grant update (
  profession,
  bio,
  agenda_open,
  profile_hidden,
  availability_weekdays,
  availability_start,
  availability_end,
  availability_timezone,
  service_cities,
  service_radius_km
)
  on public.provider_profiles to authenticated;

grant update (service_categories)
  on public.provider_profiles to authenticated;

revoke insert, update, delete on public.historico_pagamentos from authenticated;

revoke insert, update, delete on public.appointments from authenticated;
revoke insert, update, delete on public.service_requests from authenticated;
revoke insert, update, delete on public.service_quotes from authenticated;
revoke update, delete on public.community_messages from authenticated;
revoke update, delete on public.reviews from authenticated;
revoke insert, update, delete on public.appointment_cancellations from authenticated;
revoke all on function public.request_appointment(uuid, timestamptz, text) from public, anon;
revoke all on function public.refresh_my_provider_plan() from public, anon, authenticated;
revoke all on function public.consume_provider_service_slot() from public, anon, authenticated;
revoke all on function public.change_my_subscription_plan(public.subscription_plan) from public, anon, authenticated;
revoke all on function public.activate_subscription_from_payment(uuid, text, public.subscription_plan, numeric, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.respond_to_appointment(uuid, public.appointment_status, text) from public, anon;
revoke all on function public.complete_appointment(uuid, numeric, public.payment_method) from public, anon;
revoke all on function public.cancel_appointment(uuid, public.cancellation_reason, text) from public, anon, authenticated;
revoke all on function public.reply_to_cancellation(uuid, text) from public, anon, authenticated;
revoke all on function public.report_history_comment(text, uuid) from public, anon, authenticated;
revoke all on function public.create_service_request(text, text, text, text, public.request_urgency) from public, anon;
revoke all on function public.submit_service_quote(uuid, numeric, text, text, boolean, text) from public, anon;
revoke all on function public.select_service_quote(uuid, uuid) from public, anon;
revoke all on function public.cancel_service_request(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.request_appointment(uuid, timestamptz, text) to authenticated;
grant execute on function public.refresh_my_provider_plan() to authenticated;
grant execute on function public.activate_subscription_from_payment(uuid, text, public.subscription_plan, numeric, text, text, timestamptz) to service_role;
grant execute on function public.respond_to_appointment(uuid, public.appointment_status, text) to authenticated;
grant execute on function public.complete_appointment(uuid, numeric, public.payment_method) to authenticated;
grant execute on function public.cancel_appointment(uuid, public.cancellation_reason, text) to authenticated;
grant execute on function public.reply_to_cancellation(uuid, text) to authenticated;
grant execute on function public.report_history_comment(text, uuid) to authenticated;
grant execute on function public.create_service_request(text, text, text, text, public.request_urgency) to authenticated;
grant execute on function public.submit_service_quote(uuid, numeric, text, text, boolean, text) to authenticated;
grant execute on function public.select_service_quote(uuid, uuid) to authenticated;
grant execute on function public.cancel_service_request(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio images are public" on storage.objects;
create policy "Portfolio images are public"
on storage.objects for select
using (bucket_id = 'portfolio');

drop policy if exists "Providers upload into own portfolio folder" on storage.objects;
create policy "Providers upload into own portfolio folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'provider'
  )
);

drop policy if exists "Providers update own portfolio images" on storage.objects;
create policy "Providers update own portfolio images"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Providers delete own portfolio images" on storage.objects;
create policy "Providers delete own portfolio images"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-requests',
  'service-requests',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Participants can view service request media" on storage.objects;
create policy "Participants can view service request media"
on storage.objects for select to authenticated
using (
  bucket_id = 'service-requests'
  and exists (
    select 1
    from public.service_request_attachments attachment
    join public.service_requests request on request.id = attachment.request_id
    where attachment.storage_path = storage.objects.name
      and (
        request.client_id = auth.uid()
        or request.selected_provider_id = auth.uid()
        or (
          request.status = 'open'::public.service_request_status
          and exists (
            select 1 from public.provider_profiles provider
            where provider.user_id = (select auth.uid())
              and request.city = any(provider.service_cities)
          )
        )
      )
  )
);

drop policy if exists "Clients upload service request media" on storage.objects;
create policy "Clients upload service request media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'service-requests'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Clients delete own service request media" on storage.objects;
create policy "Clients delete own service request media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'service-requests'
  and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'community_messages'
     ) then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end $$;
