import {
  crearCategoriaBD,
  eliminarCategoriaBD,
} from '../../src/services/productService';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

describe('Módulo de Stock - Servicio productService (Categorías)', () => {
  let mockBatch: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(async () => Promise.resolve()),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
  });

  it('debe desactivar una categoría existente (soft delete con activa: false) sin fallar si el doc ID es autogenerado', async () => {
    // Simulamos que en Firestore existe un doc con ID generado 'doc_123' y campo nombre 'Papa'
    const docPapa = {
      id: 'doc_123',
      ref: { _path: 'categorias/doc_123' },
      data: () => ({ nombre: 'Papa', activa: true }),
    };

    (getDocs as jest.Mock)
      // 1. Búsqueda de la categoría
      .mockResolvedValueOnce({
        docs: [docPapa],
        forEach: (cb: any) => [docPapa].forEach(cb),
      })
      // 2. Búsqueda de productos que tengan la categoría
      .mockResolvedValueOnce({
        docs: [
          {
            ref: { _path: 'productos/prod_1' },
            data: () => ({
              nombre: 'Papa Blanca',
              categorias: ['Papa', 'Verdulería'],
              categoria: 'Papa',
            }),
          },
        ],
        forEach: (cb: any) =>
          [
            {
              ref: { _path: 'productos/prod_1' },
              data: () => ({
                nombre: 'Papa Blanca',
                categorias: ['Papa', 'Verdulería'],
                categoria: 'Papa',
              }),
            },
          ].forEach(cb),
      });

    await eliminarCategoriaBD('Papa');

    // Debe actualizar el doc encontrado a activa: false
    expect(mockBatch.update).toHaveBeenCalledWith(
      docPapa.ref,
      expect.objectContaining({ activa: false })
    );

    // Debe limpiar la categoría de los productos
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'productos/prod_1' }),
      expect.objectContaining({
        categorias: ['Verdulería'],
        categoria: 'Verdulería',
      })
    );

    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('debe persistir soft-delete de una categoría base que aún no tenía documento en Firestore', async () => {
    // No existe documento previo
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [], forEach: jest.fn() }) // categorias
      .mockResolvedValueOnce({ docs: [], forEach: jest.fn() }); // productos

    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await eliminarCategoriaBD('Comestibles');

    // Debe hacer batch.set con merge para registrar activa: false
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Comestibles' }),
      expect.objectContaining({ nombre: 'Comestibles', activa: false }),
      { merge: true }
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('debe reactivar una categoría si ya existía previamente marcada como inactiva', async () => {
    const docInactivo = {
      id: 'doc_inactivo_99',
      ref: { _path: 'categorias/doc_inactivo_99' },
      data: () => ({ nombre: 'Bebidas', activa: false }),
    };

    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [docInactivo],
      forEach: (cb: any) => [docInactivo].forEach(cb),
    });

    await crearCategoriaBD('Bebidas');

    expect(mockBatch.update).toHaveBeenCalledWith(
      docInactivo.ref,
      expect.objectContaining({ activa: true })
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });
});
