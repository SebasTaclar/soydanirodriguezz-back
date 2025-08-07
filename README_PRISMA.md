# ED90MAS1 Backend - Multi-Database Support

This Azure Functions application supports **MongoDB** and **Prisma ORM** as data sources.

## Database Options

### 1. MongoDB (Document Database)

- Flexible schema
- JSON-like documents
- Rapid prototyping

### 2. Prisma ORM (Recommended)

- **LINQ-like queries** for .NET developers
- **Type-safe** database operations
- **Auto-completion** and IntelliSense
- **Migration management**
- **Performance optimized**

## Quick Setup

### Option 1: Prisma ORM (LINQ-like, Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp local.settings.example.json local.settings.json
```

Edit `local.settings.json`:

```json
{
  "Values": {
    "DATABASE_TYPE": "prisma",
    "DATABASE_URL": "postgresql://username:password@localhost:5432/database"
  }
}
```

```bash
# 3. Setup database
npm run db:push

# 4. Start application
npm run build
npm start
```

### Option 2: MongoDB

```json
{
  "Values": {
    "DATABASE_TYPE": "mongodb",
    "MONGO_DB_URI": "mongodb://localhost:27017",
    "MONGO_DB_DATABASE": "ed90mas1"
  }
}
```

## LINQ-like Queries with Prisma

Perfect for .NET developers! The Prisma adapters provide LINQ-like syntax:

```typescript
// Get all users (similar to LINQ)
const users = await userService.getAll();

// Filter by condition (like LINQ Where)
const admins = await userService.getAll({ role: 'admin' });

// Find by specific field (like LINQ FirstOrDefault)
const user = await userAdapter.findByUsername('johndoe');

// Complex filtering
const products = await productService.getAll({
  minPrice: 100,
  maxPrice: 500,
  brand: 'Dell',
});

// Aggregations (like LINQ Average)
const avgPrice = await productAdapter.getAveragePrice();
```

See the [Prisma LINQ Guide](docs/PRISMA_LINQ_GUIDE.md) for detailed examples.

## Available Scripts

- `npm run build` - Compile TypeScript
- `npm run start` - Start Azure Functions host
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Sync schema to database
- `npm run db:migrate` - Create migration files
- `npm run db:studio` - Open Prisma Studio (database browser)

## Switching Between Databases

Simply change the `DATABASE_TYPE` environment variable:

- `DATABASE_TYPE=prisma` - Use Prisma ORM (LINQ-like)
- `DATABASE_TYPE=mongodb` - Use MongoDB

No code changes required - the factory pattern handles adapter selection automatically.

## Why Choose Prisma?

If you're coming from .NET and love LINQ, Prisma is perfect because it provides:

✅ **LINQ-like syntax** - `findMany({ where: { role: "admin" } })`  
✅ **Type safety** - Compile-time error checking  
✅ **IntelliSense** - Full auto-completion  
✅ **Migration management** - Version-controlled schema  
✅ **Performance** - Optimized queries and connection pooling  
✅ **Security** - SQL injection protection

## API Endpoints

All endpoints work with any database type:

- **Users**: `/api/funcGetUsers`, `/api/funcLogin`
- **Clients**: `/api/funcGetClients`, `/api/funcCreateClient`, `/api/funcUpdateClient`, `/api/funcDeleteClient`
- **Products**: `/api/funcGetProducts`, `/api/funcCreateProduct`

## Documentation

- [Prisma LINQ Guide](docs/PRISMA_LINQ_GUIDE.md) - Complete LINQ-like usage guide

## Development Tips

1. **For .NET developers**: Use Prisma for familiar LINQ-like syntax
2. **For rapid prototyping**: Use MongoDB
3. **For production**: Prisma recommended

The factory pattern makes switching between databases seamless!
