# Ejemplos de Uso - API de Rentas con Paginación

## Ejemplo Frontend - React/JavaScript

```javascript
// Hook personalizado para manejar paginación de rentas
import { useState, useEffect } from 'react';

export const useRentsPagination = () => {
  const [finishedRents, setFinishedRents] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 25,
    totalPages: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  const fetchFinishedRents = async (page = 1, newFilters = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: 'finished',
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...newFilters,
      });

      const response = await fetch(`/api/funcGetRents?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setFinishedRents(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Error fetching rents:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    fetchFinishedRents(page, filters);
  };

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    fetchFinishedRents(1, newFilters); // Reset to first page
  };

  useEffect(() => {
    fetchFinishedRents();
  }, []);

  return {
    finishedRents,
    pagination,
    loading,
    goToPage,
    applyFilters,
  };
};

// Componente de tabla con paginación
const FinishedRentsTable = () => {
  const { finishedRents, pagination, loading, goToPage, applyFilters } = useRentsPagination();
  const [searchFilters, setSearchFilters] = useState({
    clientName: '',
    productName: '',
    isPaid: '',
  });

  const handleSearch = () => {
    const activeFilters = Object.fromEntries(
      Object.entries(searchFilters).filter(([_, value]) => value !== '')
    );
    applyFilters(activeFilters);
  };

  return (
    <div>
      {/* Filtros de búsqueda */}
      <div className="search-filters">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={searchFilters.clientName}
          onChange={(e) => setSearchFilters({ ...searchFilters, clientName: e.target.value })}
        />
        <input
          type="text"
          placeholder="Nombre del producto"
          value={searchFilters.productName}
          onChange={(e) => setSearchFilters({ ...searchFilters, productName: e.target.value })}
        />
        <select
          value={searchFilters.isPaid}
          onChange={(e) => setSearchFilters({ ...searchFilters, isPaid: e.target.value })}
        >
          <option value="">Estado de pago</option>
          <option value="true">Pagado</option>
          <option value="false">Pendiente</option>
        </select>
        <button onClick={handleSearch}>Buscar</button>
      </div>

      {/* Información de paginación */}
      <div className="pagination-info">
        Mostrando {finishedRents.length} de {pagination.totalCount} rentas finalizadas (Página{' '}
        {pagination.currentPage} de {pagination.totalPages})
      </div>

      {/* Tabla de rentas */}
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cliente</th>
              <th>Precio Total</th>
              <th>Estado Pago</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {finishedRents.map((rent) => (
              <tr key={rent.id}>
                <td>{rent.code}</td>
                <td>{rent.productName}</td>
                <td>{rent.clientName}</td>
                <td>${rent.totalPrice || 'N/A'}</td>
                <td>{rent.isPaid ? 'Pagado' : 'Pendiente'}</td>
                <td>{new Date(rent.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Controles de paginación */}
      <div className="pagination-controls">
        <button
          disabled={pagination.currentPage === 1}
          onClick={() => goToPage(pagination.currentPage - 1)}
        >
          Anterior
        </button>

        <span>
          Página {pagination.currentPage} de {pagination.totalPages}
        </span>

        <button
          disabled={pagination.currentPage === pagination.totalPages}
          onClick={() => goToPage(pagination.currentPage + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};
```

## Ejemplo Backend - Consultas Directas

```typescript
// Ejemplo en un servicio o controlador
import { RentService } from './RentService';
import { PaginationOptions } from '../interfaces/IRentDataSource';

export class RentController {
  private rentService: RentService;

  // Obtener rentas activas (sin paginación)
  async getActiveRents(filters?: any) {
    const activeRents = await this.rentService.getActiveRents(filters);
    return {
      success: true,
      data: activeRents,
      count: activeRents.length,
      type: 'active',
    };
  }

  // Obtener rentas finalizadas (con paginación)
  async getFinishedRents(filters?: any, page: number = 1, pageSize: number = 25) {
    const pagination: PaginationOptions = { page, pageSize };
    const result = await this.rentService.getFinishedRents(filters, pagination);

    return {
      success: true,
      data: result.data,
      count: result.data.length,
      type: 'finished',
      pagination: {
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
      },
    };
  }

  // Ejemplo de búsqueda específica
  async searchFinishedRents(searchTerm: string, page: number = 1) {
    const filters = {
      // Buscar en múltiples campos
      $or: [
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { productName: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    return this.getFinishedRents(filters, page, 20);
  }
}
```

## Ejemplo Pruebas con cURL

```bash
# Obtener rentas activas
curl -X GET "http://localhost:7071/api/funcGetRents?type=active"

# Obtener primera página de rentas finalizadas
curl -X GET "http://localhost:7071/api/funcGetRents?type=finished&page=1&pageSize=25"

# Buscar rentas finalizadas por cliente
curl -X GET "http://localhost:7071/api/funcGetRents?type=finished&page=1&pageSize=20&clientName=García"

# Buscar rentas finalizadas no pagadas
curl -X GET "http://localhost:7071/api/funcGetRents?type=finished&page=1&pageSize=30&isPaid=false"

# Buscar por rango de fechas
curl -X GET "http://localhost:7071/api/funcGetRents?type=finished&page=1&pageSize=25&startDate=2024-01-01&endDate=2024-12-31"
```

## Respuestas de Ejemplo

### Rentas Activas

```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "code": "PROD-001",
      "productName": "Taladro Bosch",
      "clientName": "Juan Pérez",
      "isFinished": false,
      "isPaid": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 25,
  "type": "active"
}
```

### Rentas Finalizadas (con paginación)

```json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "code": "PROD-002",
      "productName": "Martillo",
      "clientName": "María García",
      "isFinished": true,
      "isPaid": true,
      "totalDays": 5,
      "totalPrice": 15000,
      "observations": "Entregado en perfecto estado",
      "createdAt": "2024-01-10T14:20:00Z"
    }
  ],
  "count": 25,
  "type": "finished",
  "pagination": {
    "totalCount": 7000,
    "totalPages": 280,
    "currentPage": 1,
    "pageSize": 25
  }
}
```

## Migración Gradual

Si ya tienes código que usa la API anterior, puedes migrar gradualmente:

```javascript
// Paso 1: Detectar si hay paginación en la respuesta
const handleRentsResponse = (response) => {
  if (response.pagination) {
    // Nueva API con paginación
    return {
      rents: response.data,
      hasMore: response.pagination.currentPage < response.pagination.totalPages,
      totalCount: response.pagination.totalCount,
    };
  } else {
    // API antigua sin paginación
    return {
      rents: response.data || response,
      hasMore: false,
      totalCount: response.count || response.length,
    };
  }
};

// Paso 2: Usar wrapper que funciona con ambas APIs
const fetchRents = async (type, page = 1) => {
  let url = `/api/funcGetRents?type=${type}`;

  if (type === 'finished') {
    url += `&page=${page}&pageSize=25`;
  }

  const response = await fetch(url);
  const result = await response.json();

  return handleRentsResponse(result);
};
```
