-- PCP 360° · schema inicial
-- Base: especificação v1.0, seção 13. Acréscimos marcados com [+] — necessários para KPIs, alertas e matching.

create extension if not exists pgcrypto;

-- ENUMS -----------------------------------------------------------------------
create type priority_level as enum ('P1', 'P2', 'P3');
create type box_status as enum ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
create type work_order_status as enum ('WAITING', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'DONE');
create type technician_level as enum ('ASSISTENTE', 'JR', 'PLENO', 'SR');
-- [+] Tipos controlados para aplicar as regras 03–05 e a compatibilidade de box.
create type service_type as enum ('REVISAO', 'PREVENTIVA', 'CORRETIVA', 'DIAGNOSTICO', 'DIAGNOSTICO_COMPLEXO');
create type box_category as enum ('GERAL', 'DIAGNOSTICO', 'RAPIDO');

-- updated_at automático --------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- TABELAS ---------------------------------------------------------------------
create table technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level technician_level not null,
  productivity_score numeric(5,2) default 0 check (productivity_score between 0 and 100),
  available boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table technician_skills (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references technicians(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  proficiency integer default 1 check (proficiency between 1 and 5),
  certified boolean default false,                         -- [+] componente "Certificação" do score
  unique (technician_id, skill_id)
);

create table boxes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category box_category not null,
  status box_status default 'AVAILABLE',
  current_work_order uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()                     -- [+] alerta "box parado"
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  os_number text unique not null,
  plate text,
  chassis text,
  customer_name text,
  service_type service_type not null,
  required_skill_id uuid references skills(id),            -- [+] skill match
  estimated_hours numeric not null check (estimated_hours > 0),
  plan_gold boolean default false,
  sensitive_cargo boolean default false,
  parts_missing boolean default false,                     -- [+] alerta "peça indisponível"
  arrived_at timestamptz not null default now(),           -- [+] início do Lead Time
  promised_date timestamptz,
  priority priority_level,
  priority_reason text,                                    -- [+] transparência da classificação
  status work_order_status default 'WAITING',
  assigned_technician uuid references technicians(id),
  assigned_box uuid references boxes(id),
  started_at timestamptz,                                  -- [+] Waiting / Touch Time
  finished_at timestamptz,                                 -- [+] Lead Time
  rework boolean default false,                            -- [+] First Time Right
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table boxes
  add constraint boxes_current_work_order_fk foreign key (current_work_order) references work_orders(id) on delete set null;

create table alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  severity text not null check (severity in ('CRITICAL', 'HIGH', 'MEDIUM', 'INFO')),
  resolved boolean default false,
  dedupe_key text not null,                                -- [+] evita alerta duplicado
  work_order_id uuid references work_orders(id) on delete cascade,
  box_id uuid references boxes(id) on delete set null,
  created_at timestamptz default now()
);

create index work_orders_status_idx on work_orders (status, priority);
-- Um único alerta aberto por condição, mesmo com várias telas avaliando ao mesmo tempo.
create unique index alerts_open_dedupe_idx on alerts (dedupe_key) where not resolved;

create trigger work_orders_updated_at before update on work_orders for each row execute function set_updated_at();
create trigger boxes_updated_at before update on boxes for each row execute function set_updated_at();

-- ROW LEVEL SECURITY ----------------------------------------------------------
-- Política básica da especificação, estendida a todas as tabelas.
-- O servidor Next usa a service role (ignora RLS). Refinar por papel (PCP, Supervisor, Mecânico, Gestor)
-- antes de liberar acesso direto do navegador.
alter table technicians enable row level security;
alter table technician_skills enable row level security;
alter table skills enable row level security;
alter table boxes enable row level security;
alter table work_orders enable row level security;
alter table alerts enable row level security;

create policy authenticated_access on technicians for all to authenticated using (true) with check (true);
create policy authenticated_access on technician_skills for all to authenticated using (true) with check (true);
create policy authenticated_access on skills for all to authenticated using (true) with check (true);
create policy authenticated_access on boxes for all to authenticated using (true) with check (true);
create policy authenticated_access on work_orders for all to authenticated using (true) with check (true);
create policy authenticated_access on alerts for all to authenticated using (true) with check (true);

-- REALTIME --------------------------------------------------------------------
alter publication supabase_realtime add table work_orders, boxes, technicians, alerts;

-- DADOS INICIAIS ----------------------------------------------------------------
insert into skills (name, description) values
  ('Motor', 'Motor diesel, injeção, arrefecimento'),
  ('Transmissão', 'Caixa, embreagem, diferencial'),
  ('Elétrica', 'Sistema elétrico e chicotes'),
  ('Diagnóstico eletrônico', 'Leitura de falhas, software, parametrização'),
  ('Freios e suspensão', 'Freio a ar, EBS, suspensão'),
  ('Hidráulica', 'Sistemas hidráulicos e tomada de força');
