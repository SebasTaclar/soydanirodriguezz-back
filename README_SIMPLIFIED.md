# Sistema de Autenticación - Backend Simplificado

Este proyecto ha sido simplificado para mantener únicamente la funcionalidad de autenticación y gestión básica de usuarios.

## Funciones Azure Functions Disponibles

### Públicas (No requieren autenticación)

- **`funcLogin`** - `POST /api/v1/login` - Autenticación de usuarios
- **`funcHealthDB`** - `GET /api/v1/health/db` - Verificación de salud de la base de datos

### Protegidas (Requieren token JWT)

- **`funcCreateUser`** - `POST /api/v1/user/create` - Creación de nuevos usuarios

## Arquitectura

### Base de Datos

- **PostgreSQL** en Neon
- Solo contiene la tabla `users` con los campos:
  - `id` (autoincrement)
  - `email` (único)
  - `password` (hasheado)
  - `name`
  - `role`
  - `membership_paid`
  - `created_at`
  - `updated_at`

### Tecnologías

- **Azure Functions** (TypeScript)
- **Prisma ORM**
- **JWT** para autenticación
- **PostgreSQL** (Neon)

### Middlewares

- `withApiHandler` - Para endpoints públicos
- `withAuthenticatedApiHandler` - Para endpoints protegidos

## Instalación y Configuración

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno** (`.env`)

   ```env
   DEBUG=true
   NODE_ENV=development
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your_jwt_secret_here"
   JWT_EXPIRATION="3600"
   ```

3. **Ejecutar migraciones**

   ```bash
   npx prisma migrate dev
   ```

4. **Iniciar el proyecto**
   ```bash
   npm start
   ```

## Uso

### 1. Login

```http
POST http://localhost:7071/api/v1/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

### 2. Crear Usuario (requiere token)

```http
POST http://localhost:7071/api/v1/user/create
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "email": "nuevo@ejemplo.com",
  "password": "contraseña123",
  "name": "Nuevo Usuario",
  "role": "user",
  "membershipPaid": false
}
```

### 3. Health Check

```http
GET http://localhost:7071/api/v1/health/db
```

## Archivos de Prueba

- `api-tests.http` - Pruebas de endpoints públicos
- `api-tests-with-auth.http` - Pruebas de endpoints con autenticación

## Estructura del Proyecto

```
├── funcCreateUser/          # Función para crear usuarios
├── funcHealthDB/            # Función de health check
├── funcLogin/               # Función de login
├── src/
│   ├── application/services/
│   │   ├── AuthService.ts   # Lógica de autenticación
│   │   └── HealthService.ts # Lógica de health check
│   ├── domain/
│   │   ├── entities/        # Solo User.ts
│   │   └── interfaces/      # Solo IUserDataSource.ts
│   ├── infrastructure/
│   │   └── DbAdapters/      # Solo UserPrismaAdapter.ts
│   ├── shared/              # Middlewares, utilidades, etc.
│   └── config/              # Configuración de Prisma
├── prisma/
│   ├── schema.prisma        # Solo modelo User
│   └── migrations/          # Solo migración inicial
└── docs/                    # Documentación de autenticación
```

## Roles de Usuario

- `admin` - Administrador del sistema
- `user` - Usuario regular
- `manager` - Gestor (rol intermedio)

## Seguridad

- Passwords hasheados con bcrypt
- Autenticación JWT
- Validación de entrada en todos los endpoints
- Logging completo de operaciones

## Próximos Pasos

Este proyecto está listo para ser extendido con nuevas funcionalidades según las necesidades del negocio.
