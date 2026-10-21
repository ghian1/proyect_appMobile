import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  setDoc,
  getDoc,
  FieldValue,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ItemCompra {
  productId: string;
  nombre: string;
  cantidad: number;        // Cantidad que se va a comprar
  precioCosto: number;     // Precio al que se le compra al proveedor
  subtotal: number;
}

export interface PlanillaCompra {
  id?: string;
  items: ItemCompra[];
  totalEstimado?: number;
  montoTotal?: number;     // Total real del ticket abonado
  estado: 'BORRADOR' | 'FINALIZADA';
  createdAt?: FieldValue | Date;
  finalizadaAt?: FieldValue | Date | any;
}

const COLECCION_PRODUCTOS = 'productos';
const COLECCION_COMPRAS = 'compras';
const DOC_PLANILLA_ACTIVA = 'planilla_borrador'; // Un único documento para el borrador actual

/**
 * 1. Obtener la planilla en borrador actual (si existe)
 */
export const obtenerPlanillaBorrador = async (): Promise<PlanillaCompra | null> => {
  const docRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as PlanillaCompra;
  }
  return null;
};

/**
 * 2. Guardar o actualizar la planilla borrador
 */
export const guardarPlanillaBorrador = async (items: ItemCompra[], totalEstimado: number) => {
  const docRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
  await setDoc(docRef, {
    items,
    totalEstimado,
    estado: 'BORRADOR',
    updatedAt: serverTimestamp(),
  });
};

/**
 * 3. Confirmar la compra: Suma las cantidades al stock de cada producto, registra el costo del ticket y mueve la planilla al historial
 */
export const confirmarCompraYSumarStock = async (items: ItemCompra[], montoTotalFinal: number) => {
  if (items.length === 0) throw new Error('La planilla de compra está vacía.');

  return await runTransaction(db, async (transaction) => {
    // A) Verificación y lecturas previas del stock actual
    const lecturasProductos = await Promise.all(
      items.map((item) => {
        const productRef = doc(db, COLECCION_PRODUCTOS, item.productId);
        return transaction.get(productRef);
      })
    );

    // B) Actualizar e incrementar el stock en cada producto
    lecturasProductos.forEach((prodDoc, index) => {
      const item = items[index];
      if (!prodDoc.exists()) {
        throw new Error(`El producto "${item.nombre}" ya no existe en el inventario.`);
      }

      const stockActual = prodDoc.data()?.stock || 0;
      const nuevoStock = stockActual + item.cantidad;

      transaction.update(prodDoc.ref, {
        stock: nuevoStock,
        precioCosto: item.precioCosto, // Actualiza el precio de costo unitario
        updatedAt: serverTimestamp(),
      });
    });

    // C) Registrar la compra en el historial de compras pasadas con fecha actual
    const nuevaCompraRef = doc(collection(db, COLECCION_COMPRAS));
    transaction.set(nuevaCompraRef, {
      items,
      montoTotal: montoTotalFinal,
      estado: 'FINALIZADA',
      finalizadaAt: serverTimestamp(), // 👈 Registra la marca de tiempo oficial
    });

    // D) Borrar la planilla borrador una vez confirmada
    const borradorRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
    transaction.delete(borradorRef);

    return nuevaCompraRef.id;
  });
};

/**
 * 4. Obtener el historial de compras pasadas ordenadas por fecha
 */
export const obtenerHistorialCompras = async (): Promise<PlanillaCompra[]> => {
  const q = query(collection(db, COLECCION_COMPRAS), orderBy('finalizadaAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((documento) => documento.id !== DOC_PLANILLA_ACTIVA) // Excluimos el borrador activo
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    })) as PlanillaCompra[];
};