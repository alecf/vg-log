# Project Guidelines

## Database Migrations

Migrations must always be **forward-compatible**:

- **Never delete columns or tables** - mark as deprecated instead, remove in a future release after confirming no code references them
- **Never rename columns or tables** - add a new column/table, migrate data, then deprecate the old one
- **Always add columns as nullable** or with a default value so existing rows remain valid
- **Backfill data** in the same migration when adding columns that should have values for existing rows

This ensures zero-downtime deployments where old code can still run against the new schema during rollout.
