import { Injectable, computed, signal } from '@angular/core';

export interface ItemCarrito {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  cantidad: number;
  imagen?: string;
  categoria?: string;
}

export interface ProductoCarrito {
  id: number;
  nombre: string;
  precio: number;
  stock?: number;
  categoria?: string;
  imagen?: string;
}

const CLAVE = 'qhalimenu-carrito';
const MAXIMO_POR_ITEM = 99;

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly itemsSignal = signal<ItemCarrito[]>(this.leer());

  readonly items = this.itemsSignal.asReadonly();
  readonly totalUnidades = computed(() =>
    this.itemsSignal().reduce((suma, item) => suma + item.cantidad, 0));
  readonly totalMonto = computed(() =>
    this.itemsSignal().reduce((suma, item) => suma + item.precio * item.cantidad, 0));
  readonly vacio = computed(() => this.itemsSignal().length === 0);
  readonly distintas = computed(() => this.itemsSignal().length);

  cantidadDe(id: number): number {
    return this.itemsSignal().find(item => item.id === id)?.cantidad ?? 0;
  }

  agregar(producto: ProductoCarrito, cantidad = 1): void {
    const stock = Math.max(0, producto.stock ?? 0);
    const unidades = Math.max(1, Math.floor(cantidad) || 1);
    if (stock <= 0) {
      return;
    }
    this.itemsSignal.update(items => {
      const copia = items.map(item => ({ ...item }));
      const existente = copia.find(item => item.id === producto.id);
      if (existente) {
        existente.stock = stock;
        existente.precio = producto.precio;
        existente.nombre = producto.nombre;
        existente.imagen = producto.imagen ?? existente.imagen;
        existente.categoria = producto.categoria ?? existente.categoria;
        existente.cantidad = Math.min(stock, MAXIMO_POR_ITEM, existente.cantidad + unidades);
      } else {
        copia.push({
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          stock,
          cantidad: Math.min(stock, MAXIMO_POR_ITEM, unidades),
          imagen: producto.imagen,
          categoria: producto.categoria
        });
      }
      this.persistir(copia);
      return copia;
    });
  }

  cambiarCantidad(id: number, cantidad: number): void {
    this.itemsSignal.update(items => {
      const copia = items.map(item => {
        if (item.id !== id) {
          return item;
        }
        const tope = Math.max(0, Math.min(item.stock, MAXIMO_POR_ITEM));
        const nueva = Math.min(tope, Math.max(1, Math.floor(cantidad) || 1));
        if (nueva === item.cantidad) {
          return item;
        }
        return { ...item, cantidad: nueva };
      });
      this.persistir(copia);
      return copia;
    });
  }

  quitar(id: number): void {
    this.itemsSignal.update(items => {
      const copia = items.filter(item => item.id !== id);
      this.persistir(copia);
      return copia;
    });
  }

  vaciar(): void {
    this.persistir([]);
    this.itemsSignal.set([]);
  }

  /**
   * Refresca precio, stock e imagen con los datos vigentes del catálogo.
   * Si un producto ya no existe o se quedó sin stock, se retira del carrito.
   */
  sincronizarCatalogo(productos: ProductoCarrito[]): void {
    this.itemsSignal.update(items => {
      const copia = items.flatMap(item => {
        const producto = productos.find(p => p.id === item.id);
        if (!producto) {
          return [];
        }
        const stock = Math.max(0, producto.stock ?? 0);
        const cantidad = Math.min(item.cantidad, stock, MAXIMO_POR_ITEM);
        if (cantidad < 1) {
          return [];
        }
        return [{
          ...item,
          nombre: producto.nombre,
          precio: producto.precio,
          stock,
          cantidad,
          imagen: producto.imagen ?? item.imagen,
          categoria: producto.categoria ?? item.categoria
        }];
      });
      this.persistir(copia);
      return copia;
    });
  }

  private persistir(items: ItemCarrito[]): void {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // Almacenamiento no disponible (modo privado): el carrito vive en memoria.
    }
  }

  private leer(): ItemCarrito[] {
    try {
      const bruto = localStorage.getItem(CLAVE);
      if (!bruto) {
        return [];
      }
      const parsed: unknown = JSON.parse(bruto);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item): item is ItemCarrito =>
          !!item && typeof item === 'object'
          && typeof (item as ItemCarrito).id === 'number'
          && typeof (item as ItemCarrito).precio === 'number')
        .map(item => ({
          ...item,
          cantidad: Math.max(1, Math.floor(item.cantidad) || 1),
          stock: Math.max(0, Math.floor(item.stock) || 0)
        }))
        .filter(item => item.stock > 0);
    } catch {
      return [];
    }
  }
}
