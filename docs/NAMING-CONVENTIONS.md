# Naming Conventions

This project standardizes naming across layers to reduce friction and improve maintainability.

Policy

- Database: snake_case for table and column names.
- API JSON (requests and responses): camelCase for all property names.
- Frontend: camelCase throughout.

How It’s Enforced

- Mapping helpers: `backend/src/utils/caseMapping.js`
  - `keysToSnake(obj, { deep = false, exclude = [] })` converts top‑level camelCase to snake_case for DB writes.
  - `keysToCamel(obj, { deep = false, exclude = [] })` converts top‑level snake_case to camelCase for API responses.
  - By default, conversion is not deep to avoid mutating JSON payloads (e.g., `payload`, `steps`, `notifications`).

- Models own mapping at boundaries:
  - Inputs to models expect camelCase; models convert to snake_case for DB.
  - Outputs from models are camelCase; controllers can return them directly.

Controller Guidelines

- Accept and pass camelCase to models (e.g., `createdBy`, `workflowId`).
- Do not manually shape snake_case structures in controllers.
- When returning DB-derived lists assembled in controllers, use the model’s mapper or `keysToCamel` before sending.

Notes

- Nested JSON stored in DB (e.g., `payload`, `steps`) is left as-is by default.
- If you need deep conversion, use `{ deep: true }` carefully and consider `exclude` for sensitive paths.

