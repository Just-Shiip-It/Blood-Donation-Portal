# Database Setup Guide

## Prerequisites

You need to set up a PostgreSQL database and Supabase project for the authentication system to work properly.

## Option 1: Using Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be ready

2. **Get Your Credentials**
   - Go to Settings > API
   - Copy the following:
     - Project URL
     - Anon public key
     - Service role key (keep this secret)

3. **Set Up Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   DATABASE_URL=your_database_connection_string
   NEXTAUTH_SECRET=your_random_secret_key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Get Database URL**
   - Go to Settings > Database
   - Copy the connection string (URI format)
   - Use this as your `DATABASE_URL`

## Option 2: Local PostgreSQL

1. **Install PostgreSQL**
   - Download and install PostgreSQL
   - Create a database for the project

2. **Set Environment Variables**
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/blood_donation_portal
   ```

## Running Migrations

Once your database is set up:

1. **Run the setup script**
   ```bash
   npm run db:setup
   ```

2. **Or run migrations manually**
   ```bash
   npm run db:migrate
   ```

3. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Check if your database server is running
- Ensure your IP is whitelisted (for cloud databases)

### Migration Issues
- Make sure the database exists
- Check if you have proper permissions
- Try running migrations one by one

### Supabase Auth Issues
- Verify your Supabase project is active
- Check that your API keys are correct
- Ensure your domain is added to allowed origins

## Testing the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Try to register a new user at `http://localhost:3000/register`

3. Check if the user is created in your database

## Need Help?

If you encounter issues:
1. Check the console logs for specific error messages
2. Verify all environment variables are set correctly
3. Test your database connection separately
4. Check Supabase dashboard for any issues