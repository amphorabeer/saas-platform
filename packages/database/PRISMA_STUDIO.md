# Prisma Studio Setup Guide

## Quick Start

```bash
cd packages/database
pnpm db:studio
```

This will open Prisma Studio at `http://localhost:5555`

## Available Tables

You can view and edit data in these tables:

1. **ModuleConfig** - 7 modules (Hotel, Restaurant, Beauty, Shop, Brewery, Winery, Distillery)
2. **Organization** - 7 sample organizations
3. **User** - 16 users (including Super Admin)
4. **Subscription** - Organization subscriptions
5. **ModuleAccess** - Which modules each organization has access to
6. **SupportTicket** - Support tickets
7. **HotelRoom** - Sample hotel rooms
8. **LandingPageContent** - Landing page configuration

## Troubleshooting

### Error: "User postgres was denied access"

This is a known permission issue. The tables exist and have data, but Prisma Client has permission issues.

**Workaround:**
- Use direct SQL queries via `docker exec`:
  ```bash
  docker exec -it saas-platform-postgres psql -U postgres -d saas_platform
  ```
- Or use the API routes which have fallback mechanisms

### Error: "Account table not found"

The Account table exists but might not show in Prisma Studio due to permissions.

**Solution:**
- Focus on other tables like ModuleConfig, Organization, User
- Account table is for NextAuth (OAuth providers) - not critical for basic functionality

### Regenerate Prisma Client

If Prisma Studio shows errors:

```bash
cd packages/database
pnpm db:generate
pnpm db:studio
```

## Viewing Data via SQL

If Prisma Studio doesn't work, use direct SQL:

```bash
# View all modules
docker exec saas-platform-postgres psql -U postgres -d saas_platform -c "SELECT name, \"isEnabled\" FROM \"ModuleConfig\";"

# View all organizations
docker exec saas-platform-postgres psql -U postgres -d saas_platform -c "SELECT name, slug, email FROM \"Organization\";"

# View all users
docker exec saas-platform-postgres psql -U postgres -d saas_platform -c "SELECT email, name, role FROM \"User\";"
```

