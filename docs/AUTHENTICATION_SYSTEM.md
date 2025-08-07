# Sistema de Autenticación con JWT

Este proyecto implementa un sistema de autenticación basado en JWT (JSON Web Tokens) para proteger los endpoints de Azure Functions.

## Arquitectura

### Middlewares Disponibles

1. **`withApiHandler`** - Para endpoints públicos (sin autenticación)
2. **`withAuthenticatedApiHandler`** - Para endpoints protegidos (con autenticación JWT)

### Flujo de Autenticación

```
Cliente → Login → JWT Token → Endpoint Protegido → Respuesta
```

## Endpoints

### Públicos (No requieren autenticación)

- `funcLogin` - Autenticación de usuario
- `funcHealthDB` - Verificación de salud de la base de datos

### Protegidos (Requieren token JWT)

- `funcCreateUser` - Creación de nuevos usuarios

## Implementación

### 1. Middleware de Autenticación (`authMiddleware.ts`)

```typescript
// Para endpoints públicos
export default withApiHandler(myHandler);

// Para endpoints protegidos
export default withAuthenticatedApiHandler(myHandler);
```

### 2. Estructura del Handler Autenticado

```typescript
const myProtectedHandler = async (
  context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser // ← Usuario autenticado disponible
): Promise<unknown> => {
  // El usuario ya está autenticado y validado
  log.info(`Request from user: ${user.email} (Role: ${user.role})`);

  // Tu lógica aquí...
};
```

### 3. Información del Usuario Autenticado

```typescript
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  membershipPaid: boolean;
}
```

## Uso del Token JWT

### 1. Obtener Token (Login)

```http
POST /api/funcLogin
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### 2. Usar Token en Endpoints Protegidos

```http
POST /api/funcCreateUser
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "Nuevo Usuario",
  "email": "nuevo@ejemplo.com",
  "password": "contraseña123",
  "role": "user"
}
```

## Respuestas de Error

### Error 401 - Sin Token

```json
{
  "success": false,
  "message": "Unauthorized: Missing authorization header",
  "statusCode": 401
}
```

### Error 401 - Token Inválido

```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token",
  "statusCode": 401
}
```

### Error 401 - Formato Incorrecto

```json
{
  "success": false,
  "message": "Unauthorized: Missing or invalid token",
  "statusCode": 401
}
```

## Configuración del JWT

### Variables de Entorno Requeridas

```bash
JWT_SECRET=tu_clave_secreta_super_segura
```

### Configuración del Token

- **Algoritmo:** HS256
- **Expiración:** 1 hora
- **Campos del payload:**
  - `id` - ID del usuario
  - `email` - Email del usuario
  - `name` - Nombre del usuario
  - `role` - Rol del usuario
  - `membershipPaid` - Estado de membresía

## Cómo Agregar Nuevos Endpoints

### Endpoint Público

```typescript
import { withApiHandler } from '../src/shared/apiHandler';

const myPublicHandler = async (context, req, log) => {
  // No requiere autenticación
};

export default withApiHandler(myPublicHandler);
```

### Endpoint Protegido

```typescript
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { AuthenticatedUser } from '../src/shared/authMiddleware';

const myProtectedHandler = async (context, req, log, user: AuthenticatedUser) => {
  // Usuario autenticado disponible en 'user'
  // Puedes acceder a user.id, user.email, user.role, etc.
};

export default withAuthenticatedApiHandler(myProtectedHandler);
```

## Archivos de Prueba

- `api-tests.http` - Pruebas básicas (algunos endpoints fallarán por falta de auth)
- `api-tests-with-auth.http` - Pruebas completas con autenticación
- `docs/AUTHENTICATION_EXAMPLES.md` - Ejemplos detallados

## Validaciones de Seguridad

1. **Verificación de Token:** Cada request protegido valida el JWT
2. **Expiración:** Los tokens expiran en 1 hora
3. **Formato:** Se requiere el formato `Bearer <token>`
4. **Logs de Seguridad:** Todos los intentos de autenticación se registran

## Próximas Mejoras Sugeridas

1. **Control de Roles:** Implementar verificación de permisos por rol
2. **Refresh Tokens:** Permitir renovación de tokens
3. **Rate Limiting:** Limitar intentos de login
4. **Blacklist de Tokens:** Invalidar tokens comprometidos
