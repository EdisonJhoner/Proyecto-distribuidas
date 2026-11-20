import { Producto } from '../models/catalogo.models';
import { EstadoOrden, Orden } from '../models/orden.models';
import { Pago } from '../models/pago.models';

export const MONEDA = 'PEN';

const IMAGENES = {
  criollo: 'img/plato-criollo.jpg',
  pescado: 'img/salmon.jpg',
  brochetas: 'img/bowl-grano.jpg',
  bowl: 'img/bowl-quinoa.jpg',
  integral: 'img/bowl-integral.jpg',
  pasta: 'img/pasta.jpg',
  guiso: 'img/guiso.jpg',
  sopa: 'img/sopa.jpg',
  bebida: 'img/limonada.jpg',
  smoothie: 'img/smoothie.jpg',
  ensalada: 'img/ensalada.jpg',
  desayuno: 'img/desayuno.jpg',
  huevos: 'img/huevos.jpg',
  postre: 'img/postre.jpg',
  wrap: 'img/wrap2.jpg',
  sandwich: 'img/wrap.jpg',
  hero: 'img/hero-bowl.jpg',
  mesa: 'img/mesa.jpg'
} as const;

/**
 * El backend no almacena una fotografía por producto. Se resuelve una imagen
 * local coherente a partir del nombre/categoría, con una imagen genérica de
 * respaldo. No representa información nutricional ni comercial.
 */
export function imagenProducto(producto?: Pick<Producto, 'nombre' | 'categoria'> | null): string {
  const nombre = (producto?.nombre ?? '').toLowerCase();
  const categoria = (producto?.categoria?.nombre ?? '').toLowerCase();

  // Postres con nombre propio (antes de bebidas para no confundir la infusión de peras).
  if (/(mousse|trufa|gelatina|brownie|paleta|peras? pochada|manzana|pudín de arroz|nice cream|postre)/.test(nombre)) {
    return IMAGENES.postre;
  }

  // Bebidas y batidos (el "té" lleva tilde para no coincidir con camote o papillote).
  if (/(batido|smoothie|licuado)/.test(nombre)) return IMAGENES.smoothie;
  if (/(chicha|limonada|jugo|bebida|refresco|agua|infusi|té|matcha|latte|leche dorada|caf)/.test(nombre)) {
    return IMAGENES.bebida;
  }

  // Helados que no son bebida.
  if (/(helado|nice cream)/.test(nombre)) return IMAGENES.postre;

  // Pescados y mariscos.
  if (/(ceviche|pescado|marisco|salm|trucha|tiradito|atún|atun)/.test(nombre)) return IMAGENES.pescado;

  // Sopas, cremas y guisos.
  if (/(minestrone|guiso|lenteja)/.test(nombre)) return IMAGENES.guiso;
  if (/(sopa|caldo|crema|aguadito)/.test(nombre)) return IMAGENES.sopa;

  // Desayunos con huevo, tostadas y panqueques.
  if (/(tostada|panqueque|arepa|tortilla|revuelto)/.test(nombre)) return IMAGENES.huevos;
  if (/(overnight|avena|oats|yogur|granola|chía|chia|pudín|fruta)/.test(nombre)) return IMAGENES.desayuno;

  // Wraps y sándwiches.
  if (/(sándwich|sandwich)/.test(nombre)) return IMAGENES.sandwich;
  if (/(wrap)/.test(nombre)) return IMAGENES.wrap;

  // Brochetas y parrilla.
  if (/(brocheta|parrilla|anticucho)/.test(nombre)) return IMAGENES.brochetas;

  // Ensaladas y tacos de lechuga (aunque incluyan pollo o carne).
  if (/(^ensalada|lechuga|taco)/.test(nombre)) return IMAGENES.ensalada;

  // Bowls, quinua, curry y tofu.
  if (/(bowl|quinua|quinoa|curry|tofu)/.test(nombre)) return IMAGENES.bowl;

  // Pastas integrales.
  if (/(pasta|tallarín|tallarin|fideo|spaghetti)/.test(nombre)) return IMAGENES.pasta;

  // Platos de fondo con proteína o arroz.
  if (/(lomo|carne|res|pollo|saltado|arroz|seco|hamburguesa|berenjena|calabacín|calabacin|wok|chaufa)/.test(nombre)) {
    return IMAGENES.criollo;
  }

  // Verduras al plato.
  if (/(espinaca|brócoli|brocoli|veget|verdura|garbanzo)/.test(nombre)) return IMAGENES.ensalada;

  // Respaldo por categoría.
  if (categoria.includes('postre')) return IMAGENES.postre;
  if (categoria.includes('bebida')) return IMAGENES.bebida;
  if (categoria.includes('desayuno')) return IMAGENES.desayuno;
  if (categoria.includes('almuerzo') || categoria.includes('plato')) return IMAGENES.integral;
  return IMAGENES.mesa;
}

export function imagenHero(): string {
  return IMAGENES.hero;
}

export function imagenAmbiente(): string {
  return IMAGENES.mesa;
}

export function imagenEnsalada(): string {
  return IMAGENES.ensalada;
}

export function imagenBowl(): string {
  return IMAGENES.bowl;
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADA: 'Pagada · por recoger',
  ENTREGADA: 'Entregada',
  CANCELADA: 'Cancelada'
};

export function etiquetaEstadoOrden(estado?: string): string {
  if (!estado) return '—';
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

export function claseEstadoOrden(estado?: string): string {
  switch (estado) {
    case 'PAGADA':
      return 'is-paid';
    case 'ENTREGADA':
      return 'is-done';
    case 'CANCELADA':
      return 'is-cancelled';
    case 'PENDIENTE_PAGO':
      return 'is-pending';
    default:
      return 'is-neutral';
  }
}

export function etiquetaEstadoPago(estado?: string): string {
  switch (estado) {
    case 'PROCESADO':
      return 'Procesado';
    case 'PENDIENTE':
      return 'Pendiente';
    case 'RECHAZADO':
      return 'Rechazado';
    default:
      return estado || '—';
  }
}

export function claseEstadoPago(estado?: string): string {
  switch (estado) {
    case 'PROCESADO':
      return 'is-done';
    case 'RECHAZADO':
      return 'is-cancelled';
    case 'PENDIENTE':
      return 'is-pending';
    default:
      return 'is-neutral';
  }
}

export function etiquetaMetodoPago(metodo?: string): string {
  switch (metodo) {
    case 'TARJETA':
      return 'Tarjeta';
    case 'YAPE':
      return 'Yape';
    case 'PLIN':
      return 'Plin';
    case 'YAPE_PLIN':
      return 'Yape / Plin';
    case 'EFECTIVO':
      return 'Efectivo en caja';
    case 'MERCADOPAGO':
      return 'Mercado Pago';
    default:
      return metodo || '—';
  }
}

export function iconoMetodoPago(metodo?: string): string {
  switch (metodo) {
    case 'TARJETA':
    case 'MERCADOPAGO':
      return 'card';
    case 'YAPE':
    case 'PLIN':
    case 'YAPE_PLIN':
      return 'wallet';
    case 'EFECTIVO':
      return 'cash';
    default:
      return 'card';
  }
}

/** Convierte la fecha ISO del backend (LocalDateTime) a Date local. */
export function fechaLocal(valor?: string | null): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function esMismoDia(fecha: Date, referencia = new Date()): boolean {
  return fecha.getFullYear() === referencia.getFullYear()
    && fecha.getMonth() === referencia.getMonth()
    && fecha.getDate() === referencia.getDate();
}

export function esHoy(valor?: string | null): boolean {
  const fecha = fechaLocal(valor);
  return !!fecha && esMismoDia(fecha);
}

export function claveDia(fecha: Date): string {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function unidadesDeOrden(orden: Orden): number {
  return (orden.detalles ?? []).reduce((total, detalle) => total + (detalle.cantidad ?? 0), 0);
}

export function esOrdenPagada(orden: Orden): boolean {
  return orden.estado === 'PAGADA' || orden.estado === 'ENTREGADA';
}

export function totalProcesado(pagos: Pago[]): number {
  return pagos
    .filter(pago => pago.estadoPago === 'PROCESADO')
    .reduce((total, pago) => total + Number(pago.monto || 0), 0);
}

export function cortar(texto: string | undefined, maximo = 110): string {
  if (!texto) return '';
  const limpio = texto.trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1).trimEnd()}…` : limpio;
}

export function estadoOrdenPermiteCancelar(orden: Orden): boolean {
  return orden.estado === 'PENDIENTE_PAGO' || orden.estado === 'PAGADA';
}

export function porcentaje(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

export function fechaCorta(valor?: string | null): string {
  const fecha = fechaLocal(valor);
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export function horaCorta(valor?: string | null): string {
  const fecha = fechaLocal(valor);
  if (!fecha) return '—';
  return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export type Tono = 'pendiente' | 'pagada' | 'entregada' | 'cancelada';

export function tonoEstado(estado?: EstadoOrden | string): Tono {
  switch (estado) {
    case 'PAGADA':
      return 'pagada';
    case 'ENTREGADA':
      return 'entregada';
    case 'CANCELADA':
      return 'cancelada';
    default:
      return 'pendiente';
  }
}
