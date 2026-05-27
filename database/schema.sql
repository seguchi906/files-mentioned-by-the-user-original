create table if not exists projects (
  id bigserial primary key,
  fiscal_year integer,
  fiscal_year_true integer,
  number text not null unique,
  name text not null,
  field text,
  subfield text,
  field_number integer,
  start_date date,
  end_date date,
  revised_end_date date,
  fisical_end_date date,
  office text,
  contract_amount bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_fiscal_year_true_idx on projects (fiscal_year_true);
create index if not exists projects_field_idx on projects (field);
create index if not exists projects_office_idx on projects (office);
create index if not exists projects_number_idx on projects (number);

create or replace function set_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
before update on projects
for each row
execute function set_projects_updated_at();
