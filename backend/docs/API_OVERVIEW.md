# API Overview

## Backend Summary
This backend is a Node.js + Express API with PostgreSQL storage. It provides authenticated administration flows, coach flows, public questionnaire submission, and read-only reporting/dashboard endpoints.

## Authentication
- Base path: /api/auth
- Login issues JWT access tokens.
- Authenticated endpoints require `Authorization: Bearer <token>`.

## Roles
- super_admin
- admin
- manager
- coach

Role checks are enforced through middleware and service-level access checks.

## Route Groups
- /api/auth
- /api/users
- /api/academies
- /api/seasons
- /api/groups
- /api/children
- /api/public/questionnaires
- /api/questionnaires
- /api/social
- /api/sports
- /api/reports

## Security Notes
- JWT is used for authenticated API access.
- RBAC guards access to protected resources.
- Public questionnaires use token-based access only for public submission endpoints.
- Rate limits are enabled globally and tightened for login and public questionnaire routes.
- Audit logs are recorded for important write actions in protected modules.

## Local Setup
```bash
npm install
npm run db:setup
npm run create:super-admin
npm run dev
npm run test:social
npm run test:sports
```
