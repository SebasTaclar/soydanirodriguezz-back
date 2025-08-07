import { ApiResponse } from '../shared/ApiResponse';

// Tipos específicos para respuestas de autenticación
export interface LoginData {
  token: string;
}

export interface UserData {
  id: string;
  username: string;
  name: string;
  role: string;
  membershipPaid: boolean;
}

// Tipos de respuesta para funciones específicas
export type LoginResponse = ApiResponse<LoginData>;
export type UserResponse = ApiResponse<UserData>;
export type UsersListResponse = ApiResponse<UserData[]>;

// Tipos para respuestas de operaciones CRUD genéricas
export interface CreateResponse {
  id: string;
  message: string;
}

export interface UpdateResponse {
  id: string;
  message: string;
}

export interface DeleteResponse {
  id: string;
  message: string;
}

// Tipos de respuesta para operaciones CRUD
export type CreateOperationResponse = ApiResponse<CreateResponse>;
export type UpdateOperationResponse = ApiResponse<UpdateResponse>;
export type DeleteOperationResponse = ApiResponse<DeleteResponse>;

// Tipo para respuestas de paginación
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;
