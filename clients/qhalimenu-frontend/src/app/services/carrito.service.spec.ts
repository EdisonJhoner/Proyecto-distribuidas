import { CarritoService } from './carrito.service';

describe('CarritoService', () => {
  let servicio: CarritoService;

  const producto = {
    id: 1,
    nombre: 'Lomo saltado',
    precio: 15,
    stock: 3,
    categoria: 'Almuerzos',
    imagen: 'img/plato-criollo.jpg'
  };

  beforeEach(() => {
    localStorage.clear();
    servicio = new CarritoService();
  });

  afterEach(() => localStorage.clear());

  it('empieza vacío', () => {
    expect(servicio.vacio()).toBeTrue();
    expect(servicio.totalMonto()).toBe(0);
    expect(servicio.totalUnidades()).toBe(0);
  });

  it('agrega productos y calcula totales', () => {
    servicio.agregar(producto, 2);
    expect(servicio.distintas()).toBe(1);
    expect(servicio.cantidadDe(1)).toBe(2);
    expect(servicio.totalUnidades()).toBe(2);
    expect(servicio.totalMonto()).toBe(30);
  });

  it('no supera el stock disponible', () => {
    servicio.agregar(producto, 10);
    expect(servicio.cantidadDe(1)).toBe(3);
    servicio.agregar(producto, 1);
    expect(servicio.cantidadDe(1)).toBe(3);
  });

  it('ignora productos sin stock', () => {
    servicio.agregar({ ...producto, stock: 0 });
    expect(servicio.vacio()).toBeTrue();
  });

  it('cambia cantidades respetando el mínimo de uno', () => {
    servicio.agregar(producto, 2);
    servicio.cambiarCantidad(1, 0);
    expect(servicio.cantidadDe(1)).toBe(1);
    servicio.cambiarCantidad(1, 50);
    expect(servicio.cantidadDe(1)).toBe(3);
  });

  it('quita productos y vacía el carrito', () => {
    servicio.agregar(producto);
    servicio.quitar(1);
    expect(servicio.vacio()).toBeTrue();
    servicio.agregar(producto);
    servicio.vaciar();
    expect(servicio.vacio()).toBeTrue();
  });

  it('sincroniza precio y stock del catálogo', () => {
    servicio.agregar(producto, 3);
    servicio.sincronizarCatalogo([{ ...producto, precio: 18, stock: 1 }]);
    expect(servicio.cantidadDe(1)).toBe(1);
    expect(servicio.items()[0].precio).toBe(18);
  });

  it('retira productos que ya no existen o no tienen stock', () => {
    servicio.agregar(producto, 2);
    servicio.sincronizarCatalogo([{ ...producto, stock: 0 }]);
    expect(servicio.vacio()).toBeTrue();
  });

  it('persiste el carrito en localStorage y lo recupera', () => {
    servicio.agregar(producto, 2);
    const nuevo = new CarritoService();
    expect(nuevo.cantidadDe(1)).toBe(2);
    expect(nuevo.totalMonto()).toBe(30);
  });
});
