# Nuevas Funciones Implementadas

## 1. funcResendEmail - Reenvío de Emails

**Propósito**: Permite reenviar emails de confirmación cuando los usuarios digitaron mal su email.

**Endpoint**: `POST /api/funcResendEmail`
**Headers**: `Authorization: Bearer <token>`

**Body de ejemplo**:

```json
{
  "purchaseId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Validaciones**:

- La compra debe existir
- La compra debe estar APPROVED o COMPLETED
- Solo se puede reenviar el email de la propia compra

---

## 2. funcUpdatePurchase - Actualizar Información de Compra

**Propósito**: Permite actualizar información de una compra existente.

**Endpoint**: `PUT /api/funcUpdatePurchase/{purchaseId}`
**Headers**: `Authorization: Bearer <token>`

**Body de ejemplo**:

```json
{
  "buyerEmail": "nuevo@email.com",
  "buyerName": "Nuevo Nombre",
  "buyerContactNumber": "+57300123456"
}
```

**Validaciones**:

- La compra debe existir
- Solo se puede actualizar la propia compra
- Email debe ser válido si se proporciona
- Los wallpapers deben estar entre 1 y 5000

---

## 3. funcBackupTimer - Backup Automático

**Propósito**: Envía automáticamente emails con backup de datos y estadísticas.

**Horarios**:

- 12:30 PM hora Colombia
- 9:00 PM hora Colombia

**Destinatarios configurados**:

- bustostejedor@gmail.com
- ingeniero.mec.sebastian@gmail.com

**Contenido del email**:

- Estadísticas del día
- Total de compras y ingresos
- Archivo JSON adjunto con todos los datos

---

## Configuración de Entorno

Asegúrate de que estas variables estén en `local.settings.json`:

```json
{
  "BACKUP_TIMER_SCHEDULE": "0 30 17,2 * * *",
  "BACKUP_EMAIL": "bustostejedor@gmail.com,ingeniero.mec.sebastian@gmail.com"
}
```

**Nota**: El horario usa UTC, por eso 17:30 y 02:00 UTC = 12:30 PM y 9:00 PM Colombia.

---

## Correcciones Realizadas

1. **Validación de wallpapers**: Actualizada de 1-1000 a 1-5000 en:

   - PurchaseService.ts
   - WompiPurchaseService.ts

2. **Emails múltiples**: El timer de backup ahora envía a múltiples destinatarios.

3. **Logging mejorado**: Todas las funciones tienen logging detallado para debugging.

---

## Pruebas Recomendadas

1. **Probar funcResendEmail**:

   - Crear una compra
   - Usar el endpoint para reenviar el email
   - Verificar que llegue el email

2. **Probar funcUpdatePurchase**:

   - Actualizar el email de una compra
   - Verificar que se guarde correctamente

3. **Probar funcBackupTimer**:
   - Ejecutar manualmente o esperar a los horarios programados
   - Verificar que lleguen los emails a ambos destinatarios

---

## Archivos Modificados/Creados

### Nuevos archivos:

- `funcResendEmail/function.json`
- `funcResendEmail/index.ts`
- `funcUpdatePurchase/function.json`
- `funcUpdatePurchase/index.ts`
- `funcBackupTimer/function.json`
- `funcBackupTimer/index.ts`

### Archivos modificados:

- `src/application/services/PurchaseService.ts`
- `src/application/services/WompiPurchaseService.ts`
- `local.settings.json`

Todas las funciones siguen las mejores prácticas del proyecto y están listas para producción.
