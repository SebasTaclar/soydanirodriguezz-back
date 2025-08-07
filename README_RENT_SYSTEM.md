# Rent Management System - Azure Functions Implementation

## Overview

This implementation provides a complete rent management system for the ED90MAS1 application using Azure Functions, following the existing project architecture patterns.

## 🏗️ Architecture Components Created

### 1. Domain Layer

- **Rent Entity** (`src/domain/entities/Rent.ts`): Core rent business object
- **IRentDataSource Interface** (`src/domain/interfaces/IRentDataSource.ts`): Repository contract

### 2. Application Layer

- **RentDto** (`src/application/dtos/RentDto.ts`): Data transfer objects for API communication
- **RentService** (`src/application/services/RentService.ts`): Business logic layer with validation and orchestration

### 3. Infrastructure Layer

- **RentMongoDbAdapter** (`src/infrastructure/DbAdapters/RentMongoDbAdapter.ts`): MongoDB data access implementation
- **RentPrismaAdapter** (`src/infrastructure/DbAdapters/RentPrismaAdapter.ts`): PostgreSQL/Prisma data access implementation

### 4. Factory Pattern

- **RentFactory** (`src/factories/RentFactory.ts`): Dependency injection factory for database selection

### 5. Azure Functions

- **funcGetRents**: Retrieves rents with filtering (active/finished/all)
- **funcCreateRent**: Creates new rental records
- **funcUpdateRent**: Updates existing rental records
- **funcDeleteRent**: Deletes rental records
- **funcFinishRent**: Marks rentals as finished with delivery date

## 📊 Database Schema

### Prisma Schema (PostgreSQL)

```sql
model Rent {
  id               Int      @id @default(autoincrement())
  code             String   @unique
  productName      String   @map("product_name")
  quantity         Int      @default(1)
  totalValuePerDay Decimal  @default(0) @map("total_value_per_day") @db.Decimal(10, 2)
  clientRut        String   @map("client_rut")
  deliveryDate     String?  @map("delivery_date")
  paymentMethod    String   @map("payment_method")
  clientName       String   @map("client_name")
  warrantyValue    Decimal  @default(0) @map("warranty_value") @db.Decimal(10, 2)
  creationDate     String   @map("creation_date")
  isFinished       Boolean  @default(false) @map("is_finished")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("rents")
}
```

## 🔗 API Endpoints

### GET `/api/funcGetRents`

**Purpose**: Retrieve rental records with optional filtering

**Query Parameters**:

- `type`: Filter by rent status (`active`, `finished`, or omit for all)
- `code`: Filter by rent code (partial match)
- `productName`: Filter by product name (partial match)
- `clientName`: Filter by client name (partial match)
- `clientRut`: Filter by client RUT (partial match)

**Examples**:

```http
GET /api/funcGetRents                     # All rents
GET /api/funcGetRents?type=active         # Active rents only
GET /api/funcGetRents?type=finished       # Finished rents only
GET /api/funcGetRents?clientName=Darwin   # Search by client name
```

### POST `/api/funcCreateRent`

**Purpose**: Create a new rental record

**Required Fields**:

```json
{
  "code": "string",
  "productName": "string",
  "quantity": "number",
  "totalValuePerDay": "number",
  "clientRut": "string",
  "paymentMethod": "string",
  "clientName": "string",
  "warrantyValue": "number"
}
```

### PUT `/api/funcUpdateRent?id={id}`

**Purpose**: Update an existing rental record

### PATCH `/api/funcFinishRent?id={id}`

**Purpose**: Mark a rental as finished with delivery date

### DELETE `/api/funcDeleteRent?id={id}`

**Purpose**: Delete a rental record

## 🛡️ Security & Error Handling

### Security Features

- **CORS Configuration**: All endpoints include proper CORS headers
- **Input Validation**: Required field validation and type checking
- **SQL Injection Protection**: Parameterized queries through Prisma/MongoDB drivers
- **Error Logging**: Comprehensive error logging using the existing LogModel

### Error Handling

- **400 Bad Request**: Missing required fields or invalid data
- **404 Not Found**: Rent record not found
- **500 Internal Server Error**: Database or system errors
- **Detailed Error Messages**: User-friendly error responses

## 🔧 Database Adapter Pattern

The system supports dual database backends:

### MongoDB Adapter

- Uses existing MongoDB connection infrastructure
- Document-based storage with flexible schema
- Optimized for rapid prototyping and document queries

### Prisma Adapter (PostgreSQL)

- Uses existing Prisma client configuration
- Relational database with strict schema
- LINQ-style querying with type safety
- Automatic migrations support

**Selection**: Controlled by `DATABASE_TYPE` environment variable in `.env`

## 🚀 Key Features

### 1. Flexible Query System

- **Type-based filtering**: Separate active and finished rental views
- **Search functionality**: Multi-field search across code, product, client
- **LINQ-style operations**: OrderBy, Where, Contains operations

### 2. Business Logic

- **Automatic ID generation**: For new rentals
- **Timestamp management**: Creation and delivery dates
- **Status management**: Active/finished rental lifecycle
- **Validation**: Required field checking and data type validation

### 3. Performance Optimizations

- **Connection pooling**: Reused database connections
- **Efficient queries**: Indexed lookups and filtered queries
- **Minimal data transfer**: Only required fields in responses

## 📋 Frontend Integration

The Azure Functions are designed to work seamlessly with the provided Vue.js frontend:

### Active Rents View

```javascript
// Fetch active rents
const response = await fetch('/api/funcGetRents?type=active');
const { data } = await response.json();
```

### Finished Rents View

```javascript
// Fetch finished rents
const response = await fetch('/api/funcGetRents?type=finished');
const { data } = await response.json();
```

### Search Integration

```javascript
// Search with query
const response = await fetch(`/api/funcGetRents?type=active&clientName=${searchQuery}`);
```

## 🔄 Migration Notes

### Database Migration

- **Prisma Migration**: Automatically applied during setup
- **MongoDB**: No migration required (schema-less)
- **Backward Compatibility**: Existing data remains intact

### Deployment Considerations

- **Environment Variables**: Ensure `DATABASE_TYPE` is properly configured
- **Connection Strings**: Verify database connection strings
- **Azure Function Configuration**: Standard Azure Functions deployment process

## 🧪 Testing

### API Testing

Use the provided `api-tests.http` file with REST Client extension:

```http
### Test active rents
GET http://localhost:7071/api/funcGetRents?type=active

### Test rent creation
POST http://localhost:7071/api/funcCreateRent
Content-Type: application/json

{
  "code": "TEST001",
  "productName": "Test Generator",
  "quantity": 1,
  "totalValuePerDay": 15000,
  "clientRut": "12345678-9",
  "paymentMethod": "debito",
  "clientName": "Test Client",
  "warrantyValue": 500000
}
```

## 📈 Next Steps

1. **Frontend Integration**: Connect Vue.js components to new API endpoints
2. **Authentication**: Implement JWT validation if required
3. **Caching**: Add Redis caching for frequently accessed data
4. **Monitoring**: Set up Application Insights for performance monitoring
5. **Rate Limiting**: Implement request throttling for production use

This implementation follows Azure and TypeScript best practices with proper error handling, logging, security considerations, and performance optimizations.
