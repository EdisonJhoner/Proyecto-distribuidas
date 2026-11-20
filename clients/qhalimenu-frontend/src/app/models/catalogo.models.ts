export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  activo: boolean;
  stock: number;
  categoria?: Categoria;
}

export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
  stock: number;
  categoriaId: number;
}

export interface CategoriaRequest {
  nombre: string;
  descripcion: string;
}
