import { cerrarCaja, obtenerHistorialCajas } from '../../src/services/cajaService';
import { addDoc, collection, doc, getDocs, setDoc } from 'firebase/firestore';

describe('Módulo de Caja y Métricas - Servicio cajaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe registrar el cierre de caja con totalFacturado y cantidadVentas en el historial', async () => {
    const resumenMock = {
      totalFacturado: 20000,
      cantidadVentas: 3,
      desglose: {
        efectivo: { monto: 20000, cantidad: 3 },
      },
    };

    await cerrarCaja(resumenMock);

    // 1. Debe actualizar el doc 'estado_actual' a 'cerrada'
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'control_caja', 'estado_actual');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        estado: 'cerrada',
        totalFacturado: 20000,
        totalFacturadoAlCierre: 20000,
        cantidadVentas: 3,
        cantidadVentasAlCierre: 3,
      }),
      { merge: true }
    );

    // 2. Debe guardar el cierre en la colección 'cierres_caja' con totalFacturado
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'cierres_caja');
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        estado: 'cerrada',
        totalFacturado: 20000,
        totalFacturadoAlCierre: 20000,
        cantidadVentas: 3,
        cantidadVentasAlCierre: 3,
        desglose: resumenMock.desglose,
      })
    );
  });

  it('debe retornar el historial de cierres ordenado cronológicamente descendente', async () => {
    const docsMock = [
      {
        id: 'cierre_1',
        data: () => ({
          totalFacturado: 10000,
          cantidadVentas: 1,
          fechaRegistro: { seconds: 1000 },
        }),
      },
      {
        id: 'cierre_2',
        data: () => ({
          totalFacturado: 20000,
          cantidadVentas: 2,
          fechaRegistro: { seconds: 2000 },
        }),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: (cb: any) => docsMock.forEach(cb),
    });

    const historial = await obtenerHistorialCajas();

    expect(historial.length).toBe(2);
    // El más reciente (seconds: 2000) debe estar primero
    expect(historial[0].id).toBe('cierre_2');
    expect(historial[0].totalFacturado).toBe(20000);
    expect(historial[1].id).toBe('cierre_1');
    expect(historial[1].totalFacturado).toBe(10000);
  });
});
