import { registrarVenta, ItemCarrito } from '../../src/services/saleService';
import {
  addDoc,
  collection,
  doc,
  increment,
  updateDoc,
} from 'firebase/firestore';

describe('Módulo de Ventas - Servicio saleService', () => {
  const itemsCarritoMock: ItemCarrito[] = [
    {
      idProducto: 'prod_leche',
      nombre: 'Leche Entera 1L',
      precio: 1200,
      cantidad: 2,
      subtotal: 2400,
    },
    {
      idProducto: 'prod_pan',
      nombre: 'Pan Lactal',
      precio: 1600,
      cantidad: 1,
      subtotal: 1600,
    },
  ];
  const totalMock = 4000;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe registrar la venta en efectivo y descontar el stock de los productos vendidos', async () => {
    const idVenta = await registrarVenta(itemsCarritoMock, totalMock, 'Efectivo');

    // 1. Registro en la colección 'ventas'
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'ventas');
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        items: itemsCarritoMock,
        total: 4000,
        medioPago: 'Efectivo',
        idClienteFiado: null,
        nombreClienteFiado: null,
      })
    );

    // 2. Descuento atómico de stock para cada producto
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'productos', 'prod_leche');
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'productos', 'prod_pan');
    expect(increment).toHaveBeenCalledWith(-2);
    expect(increment).toHaveBeenCalledWith(-1);
    expect(updateDoc).toHaveBeenCalledTimes(2);

    expect(idVenta).toBeDefined();
  });

  it('debe registrar una venta en modalidad Fiado, impactando la deuda del cliente en su subcolección', async () => {
    const clienteFiado = {
      id: 'cliente_esteban_88',
      nombre: 'Esteban Quito',
    };

    await registrarVenta(itemsCarritoMock, totalMock, 'Fiado', clienteFiado);

    // 1. Guarda la venta con los datos del cliente
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        total: 4000,
        medioPago: 'Fiado',
        idClienteFiado: 'cliente_esteban_88',
        nombreClienteFiado: 'Esteban Quito',
      })
    );

    // 2. Guarda el movimiento en la subcolección del cliente
    expect(collection).toHaveBeenCalledWith(
      expect.anything(),
      'clientes_fiados',
      'cliente_esteban_88',
      'movimientos'
    );
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clienteId: 'cliente_esteban_88',
        monto: 4000,
        tipo: 'FIADO',
      })
    );

    // 3. Incrementa la deuda total del cliente en +4000
    expect(increment).toHaveBeenCalledWith(4000);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        deudaTotal: expect.objectContaining({ _methodName: 'increment', _val: 4000 }),
      })
    );
  });
});
