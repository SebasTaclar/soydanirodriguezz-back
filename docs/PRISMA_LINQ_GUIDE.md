# Prisma ORM Integration Guide

This guide shows you how to use Prisma ORM for LINQ-like database operations with PostgreSQL.

## What is Prisma?

Prisma is a next-generation ORM that provides:

- **Type-safe database queries** - Similar to LINQ in .NET
- **Auto-generated client** - Type-safe database operations
- **IntelliSense support** - Full autocomplete for queries
- **Migration management** - Database schema versioning
- **Query optimization** - Automatic query optimization

## Setup

### 1. Configuration

Set up your environment variables in `local.settings.json`:

```json
{
  "Values": {
    "DATABASE_TYPE": "prisma",
    "DATABASE_URL": "postgresql://username:password@localhost:5432/database_name"
  }
}
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate
```

### 3. View Database (Optional)

```bash
# Open Prisma Studio - visual database browser
npm run db:studio
```

## LINQ-like Query Examples

### Basic Queries

```typescript
// Get all users
const users = await userService.getAll();

// Get user by ID
const user = await userService.getById('1');

// Create new user
const newUser = await userService.create({
  username: 'johndoe',
  password: 'password123',
  name: 'John Doe',
  role: 'user',
});
```

### Advanced Filtering (LINQ Where equivalent)

```typescript
// Filter users by role
const admins = await userService.getAll({ role: 'admin' });

// Search products by name (case-insensitive)
const products = await productService.getAll({
  name: 'laptop', // Contains search
});

// Filter clients by company name
const clients = await clientService.getAll({
  companyName: 'tech',
});
```

### Additional LINQ-like Methods

The Prisma adapters provide additional methods beyond the basic interface:

```typescript
// User-specific queries
const user = await userAdapter.findByUsername('johndoe');
const adminUsers = await userAdapter.findByRole('admin');
const userCount = await userAdapter.count();

// Client-specific queries
const client = await clientAdapter.findByRut('12345678-9');
const frequentClients = await clientAdapter.findFrequentClients();
const searchResults = await clientAdapter.searchByName('acme');

// Product-specific queries
const product = await productAdapter.findByCode('PROD001');
const brandProducts = await productAdapter.findByBrand('Dell');
const rentedProducts = await productAdapter.findRentedProducts();
const priceRangeProducts = await productAdapter.findByPriceRange(100, 500);
const avgPrice = await productAdapter.getAveragePrice();
```

### Complex Filtering

```typescript
// Multiple conditions (similar to LINQ Where with &&)
const expensiveProducts = await productService.getAll({
  minPrice: 1000,
  maxPrice: 5000,
  brand: 'Dell',
  rented: false,
});

// Text search across multiple fields (similar to LINQ Contains)
const searchResults = await productAdapter.searchByNameOrCode('laptop');
```

## Comparison with LINQ

| LINQ (.NET)                            | Prisma (TypeScript)                      |
| -------------------------------------- | ---------------------------------------- |
| `users.Where(u => u.Role == "admin")`  | `findMany({ where: { role: "admin" } })` |
| `users.OrderBy(u => u.Name)`           | `findMany({ orderBy: { name: 'asc' } })` |
| `users.FirstOrDefault(u => u.Id == 1)` | `findUnique({ where: { id: 1 } })`       |
| `users.Count()`                        | `count()`                                |
| `products.Average(p => p.Price)`       | `aggregate({ _avg: { price: true } })`   |
| `users.Select(u => u.Name)`            | `findMany({ select: { name: true } })`   |

## Type Safety

Prisma provides full type safety:

```typescript
// ✅ This works - 'username' is a valid field
const user = await prisma.user.findUnique({
  where: { username: 'johndoe' },
});

// ❌ This fails at compile time - 'invalidField' doesn't exist
const user = await prisma.user.findUnique({
  where: { invalidField: 'value' }, // TypeScript error!
});

// ✅ Auto-completion for all fields and methods
const users = await prisma.user.findMany({
  where: {
    // IntelliSense shows: username, password, name, role, etc.
  },
  orderBy: {
    // IntelliSense shows: username, name, createdAt, etc.
  },
});
```

## Database Schema Management

### Updating the Schema

1. Modify `prisma/schema.prisma`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  name      String
  role      String
  email     String?  // New field added
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

2. Generate new client:

```bash
npm run db:generate
```

3. Apply changes to database:

```bash
npm run db:push
# OR for production
npm run db:migrate
```

### Migrations vs Push

- **`db:push`**: Direct schema sync (good for development)
- **`db:migrate`**: Creates migration files (recommended for production)

## Performance Benefits

Prisma provides several performance optimizations:

1. **Connection Pooling**: Automatic connection management
2. **Query Optimization**: Optimized SQL generation
3. **Lazy Loading**: Only fetch needed data
4. **Caching**: Built-in query result caching

## Error Handling

Prisma provides specific error types:

```typescript
try {
  const user = await userAdapter.update('999', userData);
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      // Record not found
      return null;
    }
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('Username already exists');
    }
  }
  throw error;
}
```

## Switching to Prisma

To switch from MongoDB or raw PostgreSQL to Prisma:

1. Change `DATABASE_TYPE` to `"prisma"` in `local.settings.json`
2. Set up `DATABASE_URL`
3. Run `npm run db:push` to create tables
4. Restart your application

The application will automatically use the Prisma adapters with full LINQ-like functionality!

## Benefits over Raw SQL

- ✅ **Type Safety**: Compile-time error checking
- ✅ **IntelliSense**: Full auto-completion
- ✅ **LINQ-like Syntax**: Familiar for .NET developers
- ✅ **Migration Management**: Version-controlled schema changes
- ✅ **Performance**: Optimized queries and connection pooling
- ✅ **Security**: Protection against SQL injection
- ✅ **Maintenance**: Easier to refactor and maintain
