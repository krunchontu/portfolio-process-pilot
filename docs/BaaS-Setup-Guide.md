# BaaS Provider Setup Guide

ProcessPilot supports multiple Backend-as-a-Service (BaaS) providers for flexible deployment options. This guide shows you how to set up each supported provider.

## 🚀 Quick Start

1. **Copy environment file**: `cp backend/.env.baas.example backend/.env`
2. **Choose your provider**: Uncomment the section for your chosen provider
3. **Install dependencies**: `npm install` (some providers may need additional packages)
4. **Run migrations**: `npm run db:migrate`
5. **Seed data**: `npm run db:seed`
6. **Start the app**: `npm run dev`

---

## 📊 Provider Comparison

| Provider | Type | Setup Time | Cost | Best For |
|----------|------|------------|------|----------|
| **Supabase** | PostgreSQL + Features | ⭐⭐⭐ (5min) | Free tier available | Full-stack apps with real-time |
| **Local PostgreSQL** | Self-hosted | ⭐⭐ (10min) | Free | Development & full control |
| **Neon** | Serverless PostgreSQL | ⭐⭐⭐ (3min) | Free tier available | Serverless deployments |
| **PlanetScale** | Serverless MySQL | ⭐⭐ (8min) | Free tier available | High-scale applications |
| **Railway** | Hosted PostgreSQL | ⭐⭐⭐ (4min) | Pay-as-you-go | Simple deployment |

---

## 🏆 **Supabase** (Recommended)

**Why choose Supabase:**
- ✅ PostgreSQL with additional features (Auth, Storage, Real-time)
- ✅ Generous free tier (500MB database, 2GB bandwidth)
- ✅ Built-in dashboard and SQL editor
- ✅ Real-time subscriptions for live updates

### Setup Steps:

1. **Create Supabase Account**
   ```bash
   # Visit https://supabase.com and create account
   # Create new project
   ```

2. **Get Connection Details**
   - Go to Settings → Database
   - Copy the connection string or individual parameters

3. **Configure Environment**
   ```bash
   # In backend/.env
   DB_PROVIDER=supabase
   SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   
   # Optional: For Supabase-specific features
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Install Dependencies** (if using Supabase features)
   ```bash
   cd backend
   npm install @supabase/supabase-js
   ```

5. **Run Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

### Supabase-Specific Features:
- **Real-time updates**: Automatic UI updates when data changes
- **File storage**: Built-in file upload and management
- **Edge functions**: Serverless functions for custom logic
- **Built-in Auth**: Alternative to JWT (optional)

---

## 🐘 **Local PostgreSQL**

**Why choose Local PostgreSQL:**
- ✅ Complete control over database
- ✅ No external dependencies
- ✅ Great for development and testing
- ✅ High performance

### Setup Steps:

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database and user
   CREATE DATABASE process_pilot;
   CREATE USER postgres WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE process_pilot TO postgres;
   \q
   ```

3. **Configure Environment**
   ```bash
   # In backend/.env
   DB_PROVIDER=postgresql
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=process_pilot
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_SSL=false
   ```

4. **Run Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

---

## ⚡ **Neon** (Serverless)

**Why choose Neon:**
- ✅ Serverless PostgreSQL with branching
- ✅ Scale to zero when not in use
- ✅ Free tier available
- ✅ Great for hobby projects

### Setup Steps:

1. **Create Neon Account**
   ```bash
   # Visit https://neon.tech and create account
   # Create new project
   ```

2. **Get Connection String**
   - Copy the connection string from dashboard
   - Note: Includes SSL by default

3. **Configure Environment**
   ```bash
   # In backend/.env
   DB_PROVIDER=neon
   NEON_DB_URL=postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require
   DB_POOL_MIN=0  # Important: Serverless starts from 0
   DB_POOL_MAX=5  # Keep low for serverless
   ```

4. **Run Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

---

## 🚀 **PlanetScale** (MySQL)

**Why choose PlanetScale:**
- ✅ Serverless MySQL with branching
- ✅ Excellent scaling and performance
- ✅ Schema changes without downtime
- ✅ Free tier available

### Setup Steps:

1. **Create PlanetScale Account**
   ```bash
   # Visit https://planetscale.com and create account
   # Create new database
   ```

2. **Install MySQL Client**
   ```bash
   cd backend
   npm install mysql2
   ```

3. **Get Connection String**
   - Create a branch (e.g., "main")
   - Get connection string from Connect modal

4. **Configure Environment**
   ```bash
   # In backend/.env
   DB_PROVIDER=planetscale
   PLANETSCALE_DB_URL=mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
   ```

5. **Update Migrations** (MySQL syntax differences)
   - Some PostgreSQL-specific syntax may need adjustment
   - UUIDs handled differently in MySQL

6. **Run Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

---

## 🚂 **Railway**

**Why choose Railway:**
- ✅ Simple deployment and management
- ✅ Built-in CI/CD
- ✅ Pay-as-you-go pricing
- ✅ Great developer experience

### Setup Steps:

1. **Create Railway Account**
   ```bash
   # Visit https://railway.app and create account
   # Create new project → Add PostgreSQL service
   ```

2. **Get Connection Details**
   - Click on PostgreSQL service
   - Go to Connect tab
   - Copy connection string or individual parameters

3. **Configure Environment**
   ```bash
   # In backend/.env
   DB_PROVIDER=railway
   RAILWAY_DB_URL=postgresql://postgres:[password]@[host]:[port]/railway
   ```

4. **Run Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

---

## 🔄 **Switching Providers**

To switch between providers:

1. **Update environment variable**:
   ```bash
   DB_PROVIDER=your-new-provider
   ```

2. **Update connection settings** for the new provider

3. **Run migrations** on the new database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## 🧪 **Testing with Different Providers**

The app automatically creates test databases:
- PostgreSQL providers: Appends `_test` to database name
- Connection string providers: Replaces database name with `_test`

Test command works with any provider:
```bash
npm test
```

---

## 🚨 **Production Considerations**

### Environment Variables
```bash
NODE_ENV=production
DB_PROVIDER=your-chosen-provider
# Provider-specific connection details
```

### Security Checklist
- ✅ Use connection strings with SSL
- ✅ Set strong database passwords
- ✅ Enable SSL/TLS encryption
- ✅ Use environment variables for secrets
- ✅ Configure appropriate connection pool limits

### Performance
- Set appropriate `DB_POOL_MIN` and `DB_POOL_MAX` values
- Monitor connection usage
- Enable query logging in development only
- Use read replicas for high-traffic apps (provider-dependent)

---

## 🔧 **Custom Provider Setup**

For providers not listed above, use the generic configuration:

```bash
DB_PROVIDER=generic
DATABASE_URL=your-connection-string
DB_CLIENT=pg  # or mysql2
```

The system will use standard Knex.js configuration for any PostgreSQL or MySQL compatible database.

---

## 📞 **Need Help?**

- **Documentation**: Check each provider's official documentation
- **Issues**: Report issues in the GitHub repository
- **Community**: Join discussions in project issues

Choose the provider that best fits your needs and budget. Supabase is recommended for most use cases due to its comprehensive feature set and generous free tier.