# Blood Donation Portal

A comprehensive web application for managing blood donations, connecting donors with blood banks and healthcare facilities.

## 🩸 Features

- **Donor Management**: Complete donor profiles with medical history and preferences
- **Blood Bank Operations**: Inventory management and appointment scheduling
- **Healthcare Integration**: Blood request management for hospitals and clinics
- **Real-time Tracking**: Donation history and blood availability monitoring
- **Role-based Access**: Different interfaces for donors, admins, and healthcare staff

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod validation

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd blood-donation-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Update the following variables in your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/blood_donation_portal

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Database Setup

Generate and run database migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Database Schema

The application uses 8 main tables:

- **users**: Base user accounts with role-based access
- **donor_profiles**: Detailed donor information and preferences  
- **blood_banks**: Blood bank facility information
- **blood_inventory**: Real-time blood stock management
- **healthcare_facilities**: Hospital and clinic information
- **appointments**: Donation appointment scheduling
- **blood_requests**: Blood requests from healthcare facilities
- **donation_history**: Complete donation tracking and history

## 🗄️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:setup` | Run database health checks |

## 🏗️ Project Structure

```
blood-donation-portal/
├── src/
│   ├── app/                    # Next.js app router
│   ├── components/             # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # Base UI components
│   ├── lib/
│   │   ├── api/               # API utilities
│   │   ├── db/                # Database schema and utilities
│   │   │   ├── schema/        # Database table definitions
│   │   │   ├── connection.ts  # Database connection utilities
│   │   │   ├── seed.ts        # Database seeding
│   │   │   └── utils.ts       # Database helper functions
│   │   ├── supabase/          # Supabase configuration
│   │   ├── validations/       # Zod validation schemas
│   │   └── utils.ts           # General utilities
│   └── middleware.ts          # Next.js middleware
├── drizzle/                   # Database migrations
├── scripts/                   # Utility scripts
└── .kiro/                     # Kiro IDE specifications
```

## 🔐 Authentication & Authorization

The application uses role-based access control with four user types:

- **Donor**: Can schedule appointments and view donation history
- **Admin**: Manages blood bank operations and inventory
- **Facility**: Can request blood and manage facility operations  
- **System Admin**: Full system access and user management

## 🧪 Development Workflow

1. **Schema Changes**: Modify files in `src/lib/db/schema/`
2. **Generate Migration**: Run `npm run db:generate`
3. **Review Migration**: Check generated SQL in `drizzle/`
4. **Apply Migration**: Run `npm run db:migrate`
5. **Test Changes**: Use `npm run db:studio` to verify

## 📝 API Routes

- `/api/health` - Health check endpoint
- `/api/auth/*` - Authentication endpoints
- `/api/donors/*` - Donor management
- `/api/blood-banks/*` - Blood bank operations
- `/api/appointments/*` - Appointment scheduling
- `/api/requests/*` - Blood request management

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the documentation in `/src/lib/db/README.md`
- Review the database schema validation with `npx tsx src/lib/db/test-schema.ts`

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - User management and authentication
  - Blood bank and inventory management
  - Appointment scheduling system
  - Healthcare facility integration
  - Complete database schema with migrations

---

Built with ❤️ for the blood donation community