# Blood Donation Portal Database

This directory contains the database schema, migrations, and utilities for the Blood Donation Portal application.

## Structure

```
src/lib/db/
├── schema/                 # Database schema definitions
│   ├── index.ts           # Main schema exports
│   ├── users.ts           # User accounts schema
│   ├── donors.ts          # Donor profiles schema
│   ├── blood-banks.ts     # Blood bank facilities schema
│   ├── healthcare-facilities.ts  # Healthcare facilities schema
│   ├── appointments.ts    # Appointment scheduling schema
│   ├── blood-requests.ts  # Blood request management schema
│   └── donation-history.ts # Donation tracking schema
├── connection.ts          # Database connection utilities
├── index.ts              # Main database instance
├── seed.ts               # Database seeding utilities
├── utils.ts              # Database utility functions
├── test-schema.ts        # Schema validation script
└── README.md             # This file
```

## Database Schema

The application uses 8 main tables:

### Core Tables
- **users**: Base user accounts with role-based access
- **donor_profiles**: Detailed donor information and preferences
- **blood_banks**: Blood bank facility information
- **healthcare_facilities**: Hospital and clinic information

### Operational Tables
- **blood_inventory**: Real-time blood stock management
- **appointments**: Donation appointment scheduling
- **blood_requests**: Blood requests from healthcare facilities
- **donation_history**: Complete donation tracking and history

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file with your database connection:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/blood_donation_portal
```

### 2. Schema Validation

Test the schema structure without a database connection:

```bash
npx tsx src/lib/db/test-schema.ts
```

### 3. Generate Migrations

Generate migration files from the schema:

```bash
npm run db:generate
```

### 4. Run Migrations

Apply migrations to your database:

```bash
npm run db:migrate
```

### 5. Seed Database (Optional)

Populate with sample data for development:

```bash
npm run db:seed
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate migration files from schema |
| `npm run db:migrate` | Apply migrations to database |
| `npm run db:push` | Push schema changes directly (dev only) |
| `npm run db:studio` | Open Drizzle Studio for database management |
| `npm run db:setup` | Run database health checks |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Clear and reseed database |

## Schema Features

### Data Types
- **UUID**: Primary keys for all tables
- **JSONB**: Flexible storage for addresses, preferences, and metadata
- **Timestamps**: Automatic created_at/updated_at tracking
- **Enums**: Constrained values for status fields

### Relationships
- Foreign key constraints ensure data integrity
- Cascading deletes where appropriate
- Indexes on frequently queried columns

### Security
- Role-based access control through user roles
- Input validation at the database level
- Audit trails for sensitive operations

## Development Workflow

1. **Schema Changes**: Modify schema files in `schema/` directory
2. **Generate Migration**: Run `npm run db:generate`
3. **Review Migration**: Check generated SQL in `drizzle/` directory
4. **Apply Migration**: Run `npm run db:migrate`
5. **Test Changes**: Use `npm run db:studio` to verify

## Production Considerations

### Performance
- Indexes are automatically created for foreign keys
- Additional indexes can be added via `utils.ts`
- Connection pooling is configured for high concurrency

### Backup
- Use `backupData()` function from `utils.ts`
- Regular database backups should be scheduled
- Migration files serve as schema version control

### Monitoring
- Database health checks available via `connection.ts`
- Statistics and metrics via `utils.ts`
- Error handling with detailed logging

## Troubleshooting

### Common Issues

**Connection Errors**
- Verify DATABASE_URL is correct
- Check database server is running
- Ensure user has proper permissions

**Migration Errors**
- Check for schema conflicts
- Verify foreign key relationships
- Review migration SQL before applying

**Seeding Errors**
- Ensure database is empty before seeding
- Check for constraint violations
- Verify sample data is valid

### Debug Commands

```bash
# Test database connection
npm run db:setup

# Validate schema structure
npx tsx src/lib/db/test-schema.ts

# View database in browser
npm run db:studio

# Check migration status
npm run db:migrate -- --dry-run
```

## Contributing

When adding new tables or modifying existing ones:

1. Create/modify schema files in `schema/` directory
2. Update the main `schema/index.ts` export
3. Generate and review migrations
4. Update seed data if necessary
5. Add appropriate indexes for performance
6. Update this README if needed

## Dependencies

- **drizzle-orm**: Type-safe database ORM
- **drizzle-kit**: Migration and introspection tools
- **pg**: PostgreSQL client for Node.js
- **tsx**: TypeScript execution for scripts