# Ejemplos de uso de los endpoints con autenticación

## Endpoints públicos (no requieren autenticación)

### Login

```http
POST {{baseUrl}}/api/funcLogin
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

### Health Check de la base de datos

```http
GET {{baseUrl}}/api/funcHealthDB
```

## Endpoints protegidos (requieren autenticación)

### Crear usuario (requiere token JWT)

```http
POST {{baseUrl}}/api/funcCreateUser
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "Nuevo Usuario",
  "email": "nuevo@ejemplo.com",
  "password": "contraseña123",
  "role": "user"
}
```

## Flujo típico de autenticación

1. **Hacer login** para obtener el token:

   ```http
   POST {{baseUrl}}/api/funcLogin
   Content-Type: application/json

   {
     "email": "admin@ejemplo.com",
     "password": "admin123"
   }
   ```

2. **Extraer el token** de la respuesta:

   ```json
   {
     "success": true,
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     },
     "message": "Login successful"
   }
   ```

3. **Usar el token** en las siguientes peticiones:

   ```http
   POST {{baseUrl}}/api/funcCreateUser
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Content-Type: application/json

   {
     "name": "Usuario Test",
     "email": "test@ejemplo.com",
     "password": "test123",
     "role": "user"
   }
   ```

## Respuestas de error de autenticación

### Sin token de autorización

```json
{
  "success": false,
  "message": "Unauthorized: Missing authorization header",
  "timestamp": "2025-08-03T10:30:00.000Z"
}
```

### Token inválido o expirado

```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token",
  "timestamp": "2025-08-03T10:30:00.000Z"
}
```

### Formato de token incorrecto

```json
{
  "success": false,
  "message": "Unauthorized: Missing or invalid token",
  "timestamp": "2025-08-03T10:30:00.000Z"
}
```
