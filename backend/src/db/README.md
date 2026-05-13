# Database Schema v1

This folder contains a simple SQL-first database setup for PostgreSQL.

## Apply locally

Run schema and seed manually with psql:

```bash
psql "$DATABASE_URL" -f src/db/schema.sql
psql "$DATABASE_URL" -f src/db/seed.sql
```

## Important notes

- This is not a migration system.
- SQL changes are applied manually.
- For production updates, execute SQL carefully and in controlled manual steps.

## Core relationships

- users.role_id -> roles.id
- academies.created_by -> users.id
- seasons.academy_id -> academies.id
- seasons.created_by -> users.id
- groups.season_id -> seasons.id
- groups.created_by -> users.id
- coach_groups.coach_id -> users.id
- coach_groups.group_id -> groups.id
- coach_groups.created_by -> users.id
- children.created_by -> users.id
- child_group_assignments.child_id -> children.id
- child_group_assignments.group_id -> groups.id
- child_group_assignments.created_by -> users.id
- audit_logs.actor_user_id -> users.id

## Soft delete approach

Entities that support soft delete use is_active instead of physical delete.
