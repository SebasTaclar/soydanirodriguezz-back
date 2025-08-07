# Guía de Paginación para Rentas

## Resumen

Se ha implementado paginación para las **rentas finalizadas** debido al alto volumen de datos (7000+ registros). Las **rentas activas** mantienen el comportamiento anterior sin paginación (máximo 200 registros).

## Uso de la API

### 1. Rentas Activas (SIN paginación)

```http
GET /api/funcGetRents?type=active
GET /api/funcGetRents?type=active&clientName=Juan&productName=Taladro
```

**Respuesta:**

```json
{
  "success": true,
  "data": [...], // Array de rentas activas
  "count": 15,
  "type": "active"
}
```

### 2. Rentas Finalizadas (CON paginación)

#### Sin paginación (comportamiento por defecto)

```http
GET /api/funcGetRents?type=finished
```

Retorna las primeras 25 rentas finalizadas.

#### Con paginación específica

```http
GET /api/funcGetRents?type=finished&page=1&pageSize=25
GET /api/funcGetRents?type=finished&page=5&pageSize=50
```

#### Con filtros y paginación

```http
GET /api/funcGetRents?type=finished&page=2&pageSize=20&clientName=García&isPaid=true
GET /api/funcGetRents?type=finished&page=1&pageSize=30&startDate=2024-01-01&endDate=2024-12-31
```

**Respuesta con paginación:**

```json
{
  "success": true,
  "data": [...], // Array de rentas en la página actual
  "count": 25, // Cantidad de rentas en esta página
  "type": "finished",
  "pagination": {
    "totalCount": 7000, // Total de rentas finalizadas
    "totalPages": 280, // Total de páginas disponibles
    "currentPage": 1, // Página actual
    "pageSize": 25 // Tamaño de página usado
  }
}
```

## Parámetros de Consulta

### Paginación

- `page`: Número de página (por defecto: 1)
- `pageSize`: Registros por página (por defecto: 25, recomendado: 20-50)

### Filtros Disponibles

- `code`: Código de producto (búsqueda parcial)
- `productName`: Nombre del producto (búsqueda parcial)
- `clientName`: Nombre del cliente (búsqueda parcial)
- `clientRut`: RUT del cliente (búsqueda parcial)
- `isPaid`: Estado de pago (true/false)
- `startDate`: Fecha inicio (ISO string)
- `endDate`: Fecha fin (ISO string)
- `paymentMethod`: Método de pago

## Recomendaciones de Uso

### Para el Frontend

1. **Rentas Activas**: Cargar todas de una vez (máximo 200)
2. **Rentas Finalizadas**: Implementar paginación con:
   - Tamaño de página: 20-25 registros
   - Controles de navegación (Anterior/Siguiente)
   - Selector de página específica
   - Filtros de búsqueda para reducir resultados

### Ejemplos de Navegación

```javascript
// Página inicial
const response = await fetch('/api/funcGetRents?type=finished&page=1&pageSize=25');

// Navegar a página específica
const pageResponse = await fetch('/api/funcGetRents?type=finished&page=5&pageSize=25');

// Buscar con filtros
const searchResponse = await fetch(
  '/api/funcGetRents?type=finished&page=1&pageSize=25&clientName=García&isPaid=false'
);
```

## Consideraciones de Rendimiento

- **Óptimo**: 20-25 registros por página
- **Máximo recomendado**: 50 registros por página
- **Total de páginas**: ~280-350 páginas con 7000 registros
- **Tiempo de respuesta**: <500ms por página con filtros
- **Índices de BD**: Optimizados para `createdAt`, `isFinished`, `clientName`, `productName`

## Migración desde la API Anterior

Si tu frontend ya usa `getFinishedRents()`, la migración es simple:

### Antes:

```javascript
const rents = await api.getFinishedRents(filters);
// rents era un array simple
```

### Después:

```javascript
const result = await api.getFinishedRents(filters, { page: 1, pageSize: 25 });
// result.data contiene el array de rentas
// result.pagination contiene la información de paginación
```

## Implementación Técnica

La paginación se implementa usando:

- **Offset/Limit**: Método clásico de paginación
- **Base de datos**: Optimizado tanto para PostgreSQL (Prisma) como MongoDB
- **Ordenamiento**: Por fecha de creación descendente (más recientes primero)
- **Índices**: Creados automáticamente para campos de filtro frecuentes
