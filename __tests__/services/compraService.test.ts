import {
  confirmarCompraYSumarStock,
  guardarPlanillaBorrador,
  obtenerPlanillaBorrador,
  sanitizarItemCompra,
  ItemCompra,
} from '../../src/services/compraService';
import { runTransaction, setDoc, getDoc } from 'firebase/firestore';

describe('Módulo de Compras - Servicio compraService', () => {
  let mockTransaction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction = {
      get: jest.fn(),
      update: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    (runTransaction as jest.Mock).mockImplementation(async (db, updateFunction) => {
      return await updateFunction(mockTransaction);
    });
  });

  it('debe sumar el stock en gramos exactos cuando se compran gramos para un producto al peso', async () => {
    const itemAlPeso: ItemCompra = {
      productId: 'prod_queso_1',
      nombre: 'Queso Cremoso La Paulina',
      cantidad: 5000, // 5000 gramos exactos
      precioCosto: 600,
      subtotal: 30000,
      esAlPeso: true,
      unidadMedida: 'g',
      detalleFormateado: 'Comprado: 5 kg (5000 g)',
    };

    // Simulamos que el producto ya tiene 2000 gramos en Firestore
    mockTransaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nombre: 'Queso Cremoso La Paulina',
        stock: 2000, // 2 kg previos en gramos
        esAlPeso: true,
      }),
      ref: { _path: 'productos/prod_queso_1' },
    });

    await confirmarCompraYSumarStock([itemAlPeso], 30000);

    // Debe sumar 2000g + 5000g = 7000g exactos
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'productos/prod_queso_1' }),
      expect.objectContaining({
        stock: 7000,
        precioCosto: 600,
      })
    );

    // Debe registrar en el historial
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        montoTotal: 30000,
        estado: 'FINALIZADA',
        items: expect.arrayContaining([
          expect.objectContaining({
            nombre: 'Queso Cremoso La Paulina',
            cantidad: 5000,
          }),
        ]),
      })
    );
  });

  it('debe sumar unidades normalmente cuando esAlPeso === false y unidadMedida === u', async () => {
    const itemUnidades: ItemCompra = {
      productId: 'prod_fideos_1',
      nombre: 'Fideos Marolio 500g',
      cantidad: 20, // 20 paquetes
      precioCosto: 850,
      subtotal: 17000,
      esAlPeso: false,
      unidadMedida: 'u',
      detalleFormateado: 'Comprado: 20 u.',
    };

    mockTransaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nombre: 'Fideos Marolio 500g',
        stock: 10, // 10 unidades previas
        esAlPeso: false,
      }),
      ref: { _path: 'productos/prod_fideos_1' },
    });

    await confirmarCompraYSumarStock([itemUnidades], 17000);

    // Debe sumar 10 + 20 = 30 unidades
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'productos/prod_fideos_1' }),
      expect.objectContaining({
        stock: 30,
        precioCosto: 850,
      })
    );
  });

  it('debe usar guardas defensivas si el stock previo en base de datos es undefined o null', async () => {
    const itemAlPeso: ItemCompra = {
      productId: 'prod_jamon_1',
      nombre: 'Jamón Cocido',
      cantidad: 3500, // 3.5 kg
      precioCosto: 720,
      subtotal: 25200,
      esAlPeso: true,
      unidadMedida: 'g',
    };

    mockTransaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nombre: 'Jamón Cocido',
        stock: undefined, // Simulación de valor indefinido
        esAlPeso: true,
      }),
      ref: { _path: 'productos/prod_jamon_1' },
    });

    await confirmarCompraYSumarStock([itemAlPeso], 25200);

    // Con guarda defensiva 0 + 3500 = 3500
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'productos/prod_jamon_1' }),
      expect.objectContaining({
        stock: 3500,
      })
    );
  });

  it('guardarPlanillaBorrador debe sanitizar y nunca enviar valores undefined a setDoc en compras por unidades', async () => {
    // Ítem con propiedades undefined intencionales
    const itemIncompleto = {
      productId: 'prod_gaseosa_1',
      nombre: 'Coca-Cola 500ml',
      cantidad: 5,
      gramos: undefined as any, // simulando el bug anterior
      precioCosto: 3000,
      subtotal: 15000,
      esAlPeso: false,
      unidadMedida: 'u' as const,
    };

    await guardarPlanillaBorrador([itemIncompleto], 15000);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: 'prod_gaseosa_1',
            nombre: 'Coca-Cola 500ml',
            cantidad: 5,
            gramos: 0, // Sanitizado a 0, nunca undefined
            precioCosto: 3000,
            precioUnitario: 3000,
            subtotal: 15000,
            esAlPeso: false,
            unidadMedida: 'u',
          }),
        ],
        totalEstimado: 15000,
        estado: 'BORRADOR',
      })
    );

    // Validar que en ninguna llamada a setDoc exista una propiedad undefined
    const callArgs = (setDoc as jest.Mock).mock.calls[0][1];
    const itemGuardado = callArgs.items[0];
    for (const [key, val] of Object.entries(itemGuardado)) {
      expect(val).not.toBeUndefined();
    }
  });

  it('confirmarCompraYSumarStock nunca debe enviar campos undefined a Transaction.set', async () => {
    const itemIncompleto = {
      productId: 'prod_gaseosa_1',
      nombre: 'Coca-Cola 500ml',
      cantidad: 5,
      gramos: undefined as any,
      precioCosto: 3000,
      subtotal: 15000,
      esAlPeso: false,
      unidadMedida: 'u' as const,
    };

    mockTransaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nombre: 'Coca-Cola 500ml',
        stock: 10,
        esAlPeso: false,
      }),
      ref: { _path: 'productos/prod_gaseosa_1' },
    });

    await confirmarCompraYSumarStock([itemIncompleto], 15000);

    const setPayload = mockTransaction.set.mock.calls[0][1];
    expect(setPayload.items[0].gramos).toBe(0);
    expect(setPayload.items[0].precioUnitario).toBe(3000);
    for (const [key, val] of Object.entries(setPayload.items[0])) {
      expect(val).not.toBeUndefined();
    }
  });

  it('obtenerPlanillaBorrador sanitiza los ítems leídos de Firestore', async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'planilla_borrador',
      data: () => ({
        totalEstimado: 2000,
        items: [
          {
            productId: 'prod_1',
            nombre: 'Alfajor',
            cantidad: 2,
            precioCosto: 1000,
            subtotal: 2000,
          },
        ],
      }),
    });

    const borrador = await obtenerPlanillaBorrador();
    expect(borrador).not.toBeNull();
    expect(borrador?.items[0].gramos).toBe(0);
    expect(borrador?.items[0].unidadMedida).toBe('u');
    expect(borrador?.items[0].precioUnitario).toBe(1000);
    expect(borrador?.items[0].detalleFormateado).toBe('Comprado: 2 u.');
  });
});
