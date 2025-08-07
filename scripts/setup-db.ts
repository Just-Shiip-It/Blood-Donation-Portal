#!/usr/bin/env tsx

import { testDatabaseConnection, checkDatabaseHealth, runMigrations } from '../src/lib/db/connection'
import { seedDatabase, clearDatabase } from '../src/lib/db/seed'

async function setupDatabase() {
    console.log('🚀 Setting up Blood Donation Portal database...\n')

    // Test database connection
    console.log('1. Testing database connection...')
    const connectionResult = await testDatabaseConnection()
    if (!connectionResult.success) {
        console.error('❌ Database connection failed:', connectionResult.error)
        process.exit(1)
    }
    console.log('✅ Database connection successful\n')

    // Check database health
    console.log('2. Checking database health...')
    const healthResult = await checkDatabaseHealth()
    if (!healthResult.success) {
        console.error('❌ Database health check failed:', healthResult.error)
        process.exit(1)
    }
    console.log('✅ Database is healthy')
    if (healthResult.data) {
        console.log(`   Version: ${healthResult.data.version}`)
        console.log(`   Uptime: ${healthResult.data.uptime}\n`)
    }

    // Run migrations
    console.log('3. Checking migrations...')
    const migrationResult = await runMigrations()
    if (!migrationResult.success) {
        console.error('❌ Migration check failed:', migrationResult.error)
        process.exit(1)
    }
    console.log('✅ Migrations checked successfully\n')

    // Ask if user wants to seed the database
    const args = process.argv.slice(2)
    const shouldSeed = args.includes('--seed') || args.includes('-s')
    const shouldClear = args.includes('--clear') || args.includes('-c')

    if (shouldClear) {
        console.log('4. Clearing existing data...')
        await clearDatabase()
        console.log('✅ Database cleared\n')
    }

    if (shouldSeed) {
        console.log('4. Seeding database with sample data...')
        await seedDatabase()
        console.log('✅ Database seeded successfully\n')
    }

    console.log('🎉 Database setup completed!')
    console.log('\nNext steps:')
    console.log('- Run migrations: npm run db:migrate')
    console.log('- Start development server: npm run dev')
    console.log('- View database: npm run db:studio')
}

// Handle command line arguments
function showHelp() {
    console.log(`
Blood Donation Portal Database Setup

Usage: tsx scripts/setup-db.ts [options]

Options:
  --seed, -s     Seed the database with sample data
  --clear, -c    Clear all existing data before seeding
  --help, -h     Show this help message

Examples:
  tsx scripts/setup-db.ts                    # Basic setup and health check
  tsx scripts/setup-db.ts --seed             # Setup and seed with sample data
  tsx scripts/setup-db.ts --clear --seed     # Clear existing data and reseed
`)
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit(0)
}

// Run the setup
setupDatabase().catch((error) => {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
})