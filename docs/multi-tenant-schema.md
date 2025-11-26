# Multi-tenant data model plan

Goal: move from a single-tenant setup to per-organization scoping with secure, UI-managed integration credentials.

## New core tables
```sql
-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text default 'free',
  status text default 'active',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Users belong to orgs with roles
create type org_role as enum ('owner','admin','agent','viewer');
create table org_memberships (
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role org_role not null default 'agent',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Invites for people not yet in auth.users
create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'agent',
  token text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- Profile bridge to auth.users
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_org_id uuid references organizations(id),
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Per-org settings/config
create table org_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  branding jsonb default '{}'::jsonb,
  limits jsonb default '{}'::jsonb,
  ai_prefs jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Integrations and secrets
```sql
-- One row per connected app per org (Zendesk, Shopify, etc.)
create type integration_type as enum ('zendesk','shopify','custom');
create table integration_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  type integration_type not null,
  name text not null,
  description text,
  base_url text,
  metadata jsonb default '{}'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, type, name)
);

-- Store encrypted credentials; never return payload after save
create type credential_kind as enum ('api_key','oauth','webhook_secret');
create table integration_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_account_id uuid references integration_accounts(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  kind credential_kind not null,
  encrypted_payload bytea not null,
  last4 text,
  expires_at timestamptz,
  rotated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

## Add org_id to existing domain tables
Add a nullable column, backfill with the Default Org, then set NOT NULL + FK:
```sql
alter table specialists      add column org_id uuid references organizations(id);
alter table intents          add column org_id uuid references organizations(id);
alter table knowledge_chunks add column org_id uuid references organizations(id);
alter table data_fields      add column org_id uuid references organizations(id);
alter table logs             add column org_id uuid references organizations(id);
alter table ticket_events    add column org_id uuid references organizations(id);
alter table intent_suggestions add column org_id uuid references organizations(id);
alter table integrations     add column org_id uuid references organizations(id);
```
Backfill example (after seeding one default org and default profile):
```sql
-- assume default org id is stored in a var or copy-paste UUID
update specialists set org_id = '<default_org_uuid>' where org_id is null;
-- repeat for each table
```
Then enforce:
```sql
alter table specialists alter column org_id set not null;
-- repeat per table
```

## Indexing
- Add indexes for per-org filtering: `(org_id)`, `(org_id, created_at desc)` on logs/ticket_events, `(org_id, intent_id)` and `(org_id, specialist_id)` on knowledge_chunks.
- Update the `match_knowledge_chunks` RPC to accept `p_org_id uuid` and filter on it, with an index on `(org_id, intent_id, specialist_id)`.

## RLS policies (templates)
Enable RLS on all org-scoped tables. Example for `specialists`:
```sql
alter table specialists enable row level security;
create policy "org members read specialists"
  on specialists for select
  using (org_id in (select org_id from org_memberships where user_id = auth.uid()));
create policy "org admins write specialists"
  on specialists for all
  using (org_id in (select org_id from org_memberships where user_id = auth.uid() and role in ('owner','admin')));
```
Replicate per table, tightening write access where needed.

## Migration order (safe path)
1) Create `organizations`, `org_memberships`, `org_invites`, `user_profiles`, `org_settings`, `integration_accounts`, `integration_credentials` (and enums).
2) Seed one `organizations` row (e.g., "Default Org") and add at least one membership for your user in `org_memberships`; set `user_profiles.default_org_id`.
3) Add nullable `org_id` columns to existing tables; backfill all rows to the Default Org; then set NOT NULL + FK constraints.
4) Update `match_knowledge_chunks` RPC to require `org_id`.
5) Enable RLS and add policies per table.
6) Refactor code to always pass `org_id` from the authenticated session and filter queries on it. Remove any direct uses of `integrations.api_key` in favor of `integration_credentials`.

## What you need to run in Supabase SQL
- Create the new enums and tables above.
- Insert one `organizations` row and one `org_memberships` row for your user (owner).
- Backfill `org_id` on existing rows, then enforce NOT NULL.
- Add indexes and RLS policies.
- Update the `match_knowledge_chunks` function to accept `org_id` and filter by it.

If you want, I can write the exact SQL for your default org UUID once you paste the UUID you create in step 2.
