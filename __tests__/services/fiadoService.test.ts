import {
  crearClienteFiado,
  eliminarClienteFiado,
  registrarMovimientoFiado,
  subscribeToClientesFiados,
} from '../../src/services/fiadoService';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

describe('Módulo de Fiados (Cuentas Corrientes) - Servicio fiadoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearClienteFiado', () => {
    it('debe registrar un nuevo cliente con deuda inicial en $0 y timestamps del servidor', async () => {
      const nuevoCliente = {
        nombre: 'Don Carlos Vecino',
        telefono: '1134567890',
        notas: 'Vecino de enfrente, paga los viernes',
      };

      await crearClienteFiado(nuevoCliente);

      expect(collection).toHaveBeenCalledWith(expect.anything(), 'clientes_fiados');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Don Carlos Vecino',
          telefono: '1134567890',
          notas: 'Vecino de enfrente, paga los viernes',
          deudaTotal: 0,
          createdAt: 'MOCK_SERVER_TIMESTAMP',
          updatedAt: 'MOCK_SERVER_TIMESTAMP',
        })
      );
      expect(serverTimestamp).toHaveBeenCalled();
    });
  });

  describe('registrarMovimientoFiado', () => {
    const clienteIdMock = 'cliente_abc_123';

    it('debe registrar una compra fiada (tipo FIADO): suma monto a la subcolección e incrementa deudaTotal', async () => {
      const montoCompra = 4500;
      const concepto = 'Compra de fideos y aceite';

      await registrarMovimientoFiado(clienteIdMock, montoCompra, 'FIADO', concepto);

      // 1. Guarda el movimiento en la subcolección 'movimientos'
      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        'clientes_fiados',
        clienteIdMock,
        'movimientos'
      );
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clienteId: clienteIdMock,
          monto: 4500,
          tipo: 'FIADO',
          concepto: 'Compra de fideos y aceite',
          createdAt: 'MOCK_SERVER_TIMESTAMP',
        })
      );

      // 2. Incrementa de forma atómica la deuda del cliente con valor positivo (+4500)
      expect(increment).toHaveBeenCalledWith(4500);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'clientes_fiados', clienteIdMock);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deudaTotal: expect.objectContaining({ _methodName: 'increment', _val: 4500 }),
          updatedAt: 'MOCK_SERVER_TIMESTAMP',
        })
      );
    });

    it('debe registrar una entrega/pago (tipo PAGO): guarda movimiento y reduce la deudaTotal con saldo negativo', async () => {
      const montoPago = 2000;
      const concepto = 'Entrega a cuenta viernes';

      await registrarMovimientoFiado(clienteIdMock, montoPago, 'PAGO', concepto);

      // 1. Subcolección de movimientos
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clienteId: clienteIdMock,
          monto: 2000,
          tipo: 'PAGO',
          concepto: 'Entrega a cuenta viernes',
        })
      );

      // 2. Decremento atómico de la deuda con valor negativo (-2000)
      expect(increment).toHaveBeenCalledWith(-2000);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deudaTotal: expect.objectContaining({ _methodName: 'increment', _val: -2000 }),
        })
      );
    });
  });

  describe('eliminarClienteFiado', () => {
    it('debe eliminar el documento del cliente en Firestore según su ID', async () => {
      const clienteIdAEliminar = 'cliente_para_borrar_999';

      await eliminarClienteFiado(clienteIdAEliminar);

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'clientes_fiados', clienteIdAEliminar);
      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeToClientesFiados', () => {
    it('debe ordenar los clientes alfabéticamente por nombre y enviar los datos parseados al callback', () => {
      const mockSnapshotData = {
        docs: [
          {
            id: 'doc1',
            data: () => ({ nombre: 'Ana Gómez', deudaTotal: 1500 }),
          },
          {
            id: 'doc2',
            data: () => ({ nombre: 'Beto Pérez', deudaTotal: 0 }),
          },
        ],
      };

      (onSnapshot as jest.Mock).mockImplementationOnce((_query, callback) => {
        callback(mockSnapshotData);
        return jest.fn(); // desuscribir
      });

      const callbackMock = jest.fn();
      subscribeToClientesFiados(callbackMock);

      expect(collection).toHaveBeenCalledWith(expect.anything(), 'clientes_fiados');
      expect(orderBy).toHaveBeenCalledWith('nombre', 'asc');
      expect(query).toHaveBeenCalled();
      expect(onSnapshot).toHaveBeenCalled();

      expect(callbackMock).toHaveBeenCalledWith([
        { id: 'doc1', nombre: 'Ana Gómez', deudaTotal: 1500 },
        { id: 'doc2', nombre: 'Beto Pérez', deudaTotal: 0 },
      ]);
    });
  });
});
