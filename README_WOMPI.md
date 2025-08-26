# Integración con Wompi - Guía de Implementación

## 🚀 ¿Qué es Wompi?

Wompi es una pasarela de pagos colombiana moderna que permite recibir pagos **directamente en tu cuenta bancaria** sin intermediarios como MercadoPago. Es perfecta para startups y proyectos que buscan:

- ✅ Comisiones más bajas (2.59% + IVA)
- ✅ Dinero directo a tu cuenta bancaria
- ✅ API moderna y fácil de integrar
- ✅ Sin dispersión de fondos

## 📋 Configuración Inicial

### 1. Registro en Wompi

1. Visita [wompi.co](https://wompi.co)
2. Crea tu cuenta empresarial
3. Completa el proceso de verificación
4. Obtén tus llaves de API (sandbox y producción)

### 2. Configuración de Variables de Entorno

Actualiza tu archivo `.env`:

```env
# Wompi Configuration
WOMPI_PUBLIC_KEY="pub_test_your_public_key_here"
WOMPI_PRIVATE_KEY="prv_test_your_private_key_here"
WOMPI_REDIRECT_URL="https://your-frontend-domain.com/payment-success"
```

**Para Sandbox (Pruebas):**

- Public Key: `pub_test_xxxxx`
- Private Key: `prv_test_xxxxx`

**Para Producción:**

- Public Key: `pub_prod_xxxxx`
- Private Key: `prv_prod_xxxxx`

### 3. Actualizar Base de Datos

Ejecuta la migración para agregar soporte de Wompi:

```bash
npx prisma migrate dev --name add_wompi_support
```

## 🔧 Endpoints Disponibles

### Crear Pago con Wompi

```http
POST /api/v1/wompi/payments
Content-Type: application/json

{
  "wallpaperNumbers": [1, 5, 10],
  "buyerEmail": "cliente@email.com",
  "buyerName": "Juan Pérez",
  "buyerIdentificationNumber": "12345678",
  "buyerContactNumber": "3001234567",
  "amount": 45000
}
```

**Respuesta Exitosa:**

```json
{
  "success": true,
  "data": {
    "message": "Wompi payment created successfully",
    "purchase": {
      "id": "123",
      "wallpaperNumbers": [1, 5, 10],
      "amount": 45000,
      "currency": "COP",
      "status": "PENDING",
      "provider": "WOMPI"
    },
    "payment": {
      "transactionId": "wompi_txn_xxx",
      "paymentUrl": "https://checkout.wompi.co/l/xxxxx",
      "reference": "wallpapers_1-5-10_1640995200000"
    }
  }
}
```

### Webhook para Notificaciones

Wompi enviará notificaciones a: `/api/v1/webhook/wompi`

## 💳 Métodos de Pago Soportados

- **PSE** (Pagos Seguros en Línea)
- **Tarjetas de Crédito** (Visa, Mastercard, Amex)
- **Tarjetas de Débito**
- **Nequi**
- **Bancolombia** (Botón de Pagos)

## 🧪 Pruebas

### Datos de Prueba

Para sandbox, usa estos datos de prueba:

**Tarjeta de Crédito Exitosa:**

- Número: `4242424242424242`
- Vencimiento: `12/25`
- CVV: `123`

**Tarjeta que Falla:**

- Número: `4000000000000002`
- Vencimiento: `12/25`
- CVV: `123`

### Archivo de Pruebas API

Usa `api-tests-wompi.http` para probar los endpoints:

```bash
# Instalar REST Client en VS Code
# Luego abrir api-tests-wompi.http y ejecutar las pruebas
```

## 🔐 Seguridad

### Validación de Webhook

El webhook incluye validación de firmas para garantizar que los eventos provienen de Wompi:

```typescript
// El servicio automáticamente valida las firmas
const isValid = wompiService.validateWebhookSignature(payload, signature);
```

### Variables de Entorno

**⚠️ IMPORTANTE:** Nunca expongas tus llaves privadas en el frontend o en repositorios públicos.

## 📊 Flujo de Pago

1. **Cliente solicita compra** → Frontend llama a `/api/v1/wompi/payments`
2. **Crear transacción** → Wompi genera URL de pago
3. **Redirigir cliente** → Cliente completa pago en Wompi
4. **Webhook recibido** → Wompi notifica resultado
5. **Actualizar estado** → Base de datos se actualiza automáticamente

## 🔄 Estados de Transacción

| Estado Wompi | Estado Interno | Descripción     |
| ------------ | -------------- | --------------- |
| `PENDING`    | `PENDING`      | Pago en proceso |
| `APPROVED`   | `COMPLETED`    | Pago exitoso    |
| `DECLINED`   | `FAILED`       | Pago rechazado  |
| `VOIDED`     | `CANCELLED`    | Pago cancelado  |

## 💰 Comisiones

- **Tarjetas de Crédito:** 2.59% + IVA
- **PSE:** 2.59% + IVA
- **Nequi:** 2.59% + IVA

## 🚨 Troubleshooting

### Error: "Invalid API Key"

- Verifica que las llaves sean correctas
- Asegúrate de usar llaves de sandbox en desarrollo

### Error: "Amount too low"

- Wompi requiere mínimo $1,000 COP

### Webhook no llega

- Verifica que la URL del webhook sea pública
- Usa ngrok para desarrollo local: `ngrok http 7071`

## 🔗 Recursos Útiles

- [Documentación Oficial Wompi](https://docs.wompi.co)
- [Dashboard Wompi](https://wompi.co/dashboard)
- [Soporte Wompi](mailto:soporte@wompi.co)

## 🆚 Comparación con MercadoPago

| Aspecto               | Wompi       | MercadoPago        |
| --------------------- | ----------- | ------------------ |
| **Comisión**          | 2.59% + IVA | 3.5% + IVA         |
| **Dinero directo**    | ✅ Sí       | ❌ No (dispersión) |
| **API Calidad**       | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐           |
| **Tiempo desembolso** | 1-2 días    | 2-7 días           |

---

¡Ya tienes Wompi integrado! 🎉 El dinero llegará directamente a tu cuenta bancaria sin intermediarios.
