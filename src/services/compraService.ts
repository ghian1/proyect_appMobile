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
  deleteDoc,
  FieldValue,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Producto, suscribirAProductos } from './productService';

export interface ItemCompra {
  productId: string;
  nombre: string;
  cantidad: number;        // Cantidad que se va a comprar
  precioCosto: number;     // Precio al que le compra al proveedor
  subtotal: number;
}

export interface PlanillaCompra {
  id?: string;
  items: ItemCompra[];
  totalEstimado: number;
  estado: 'BORRADOR' | 'FINALIZADA';
  createdAt?: FieldValue | Date;
  finalizadaAt?: FieldValue | Date;
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
 * 2. Guardar o actualizar la planilla borrador para no perder los datos al salir de la pantalla
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
 * 3. Confirmar la compra: Suma las cantidades al stock de cada producto y mueve la planilla al historial
 */
export const confirmarCompraYSumarStock = async (items: ItemCompra[], totalEstimado: number) => {
  if (items.length === 0) throw new Error('La planilla de compra está vacía.');

  return await runTransaction(db, async (transaction) => {
    // A) Verificación y lecturas previas de stock actual
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

      // Sumamos la cantidad comprada al stock actual
      transaction.update(prodDoc.ref, {
        stock: nuevoStock,
        precioCosto: item.precioCosto, // Actualiza opcionalmente el precio de costo
        updatedAt: serverTimestamp(),
      });
    });

    // C) Registrar la compra en el historial de compras pasadas
    const nuevaCompraRef = doc(collection(db, COLECCION_COMPRAS));
    transaction.set(nuevaCompraRef, {
      items,
      totalEstimado,
      estado: 'FINALIZADA',
      finalizadaAt: serverTimestamp(),
    });

    // D) Borrar la planilla borrador una vez confirmada
    const borradorRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
    transaction.delete(borradorRef);

    return nuevaCompraRef.id;
  });
};

/**
 * 4. Obtener el historial de compras pasadas
 */
export const obtenerHistorialCompras = async (): Promise<PlanillaCompra[]> => {
  const q = query(collection(db, COLECCION_COMPRAS), orderBy('finalizadaAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs
    .filter((documento) => documento.id !== DOC_PLANILLA_ACTIVA) // Excluimos el borrador
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    })) as PlanillaCompra[];
};