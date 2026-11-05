import AsyncStorage from '@react-native-async-storage/async-storage';
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
  cantidad: number;          // Cantidad: unidades o gramos
  gramos?: number;           // Total en gramos si es al peso (0 si es por unidad, NUNCA undefined)
  precioCosto: number;       // Precio de costo de compra (costo unitario o costo cada 100g)
  precioUnitario?: number;   // Precio unitario o por unidad de medida (NUNCA undefined)
  subtotal: number;
  esAlPeso?: boolean;
  unidadMedida?: 'u' | 'g' | 'unidades' | 'gramos';
  detalleFormateado?: string; // Ej: "Comprado: 12 u." o "Comprado: 5 kg (5000 g)"
}

export interface PlanillaCompra {
  id?: string;
  items: ItemCompra[];
  totalEstimado: number;
  montoTotal?: number;       // Total real del ticket abonado
  estado: 'BORRADOR' | 'FINALIZADA';
  createdAt?: FieldValue | Date | string;
  updatedAt?: FieldValue | Date | string;
  finalizadaAt?: FieldValue | Date | any;
}

const COLECCION_PRODUCTOS = 'productos';
const COLECCION_COMPRAS = 'compras';
export const DOC_PLANILLA_ACTIVA = 'planilla_borrador'; // Documento para el borrador actual
export const STORAGE_KEY_BORRADOR_COMPRAS = '@mingo_compras_planilla_borrador';

/**
 * Sanitiza un ítem de compra garantizando que NINGUNA propiedad sea undefined.
 * Asigna valores por defecto seguros:
 * - gramos: 0 si es por unidades, o el valor de cantidad si es al peso.
 * - unidadMedida: 'g' o 'u'.
 * - precioUnitario: precioCosto ?? 0.
 * - detalleFormateado: descripción legible para el historial.
 */
export const sanitizarItemCompra = (item: any): ItemCompra => {
  const esAlPeso = Boolean(
    item?.esAlPeso ||
    item?.unidadMedida === 'g' ||
    item?.unidadMedida === 'gramos'
  );
  const cantidad = Number(item?.cantidad ?? 0);
  const gramos = esAlPeso ? Number(item?.gramos ?? cantidad) : 0;
  const precioCosto = Number(item?.precioCosto ?? item?.precioUnitario ?? 0);
  const precioUnitario = Number(item?.precioUnitario ?? precioCosto);
  const subtotal = Number(item?.subtotal ?? 0);
  const unidadMedida: 'u' | 'g' = esAlPeso ? 'g' : 'u';

  let detalleFormateado = item?.detalleFormateado;
  if (!detalleFormateado) {
    if (esAlPeso) {
      if (cantidad >= 1000) {
        const kg = Number((cantidad / 1000).toFixed(2));
        detalleFormateado = `Comprado: ${kg} kg (${cantidad} g)`;
      } else {
        detalleFormateado = `Comprado: ${cantidad} g`;
      }
    } else {
      detalleFormateado = `Comprado: ${cantidad} u.`;
    }
  }

  return {
    productId: String(item?.productId || ''),
    nombre: String(item?.nombre || 'Producto'),
    cantidad: isNaN(cantidad) ? 0 : cantidad,
    gramos: isNaN(gramos) ? 0 : gramos,
    precioCosto: isNaN(precioCosto) ? 0 : precioCosto,
    precioUnitario: isNaN(precioUnitario) ? 0 : precioUnitario,
    subtotal: isNaN(subtotal) ? 0 : subtotal,
    esAlPeso,
    unidadMedida,
    detalleFormateado: String(detalleFormateado || ''),
  };
};

/**
 * Elimina recursivamente propiedades con valor `undefined` para evitar que Firestore
 * arroje el error "Function setDoc() called with invalid data. Unsupported field value: undefined".
 */
export const limpiarObjetoParaFirestore = <T extends Record<string, any>>(obj: T): T => {
  const limpio: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      typeof (val as any)?.toMillis !== 'function'
    ) {
      limpio[key] = limpiarObjetoParaFirestore(val);
    } else if (Array.isArray(val)) {
      limpio[key] = val.map((elem) =>
        elem !== null && typeof elem === 'object'
          ? limpiarObjetoParaFirestore(elem)
          : (elem ?? null)
      );
    } else {
      limpio[key] = val;
    }
  }
  return limpio as T;
};

/**
 * 1. Obtener la planilla en borrador actual con doble persistencia:
 * - Lee primero de AsyncStorage para acceso instantáneo offline/local.
 * - Sincroniza desde Firestore para obtener la versión más reciente en la nube.
 * - Siempre sanitiza los ítems devueltos para evitar inconsistencias.
 */
export const obtenerPlanillaBorrador = async (): Promise<PlanillaCompra | null> => {
  let borradorLocal: PlanillaCompra | null = null;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_BORRADOR_COMPRAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        borradorLocal = {
          ...parsed,
          items: parsed.items.map(sanitizarItemCompra),
          totalEstimado: Number(parsed.totalEstimado ?? 0),
          estado: 'BORRADOR',
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo borrador local de compras:', err);
  }

  try {
    const docRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const items = Array.isArray(data?.items) ? data.items.map(sanitizarItemCompra) : [];
      const borradorRemoto: PlanillaCompra = {
        id: snap.id,
        items,
        totalEstimado: Number(data?.totalEstimado ?? 0),
        estado: 'BORRADOR',
        updatedAt: data?.updatedAt,
      };

      // Actualizar caché local
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY_BORRADOR_COMPRAS,
          JSON.stringify({
            items,
            totalEstimado: borradorRemoto.totalEstimado,
            estado: 'BORRADOR',
          })
        );
      } catch (_) {}

      return borradorRemoto;
    }
  } catch (err) {
    console.warn('Error leyendo borrador de Firestore, usando caché local si existe:', err);
    if (borradorLocal) return borradorLocal;
  }

  return borradorLocal;
};

/**
 * 2. Guardar o actualizar la planilla borrador:
 * - Sanitiza todos los ítems para garantizar que NINGÚN campo sea undefined.
 * - Guarda inmediatamente en AsyncStorage para persistencia local infalible al navegar.
 * - Actualiza Firestore (planilla_borrador) sanitizado de manera segura.
 */
export const guardarPlanillaBorrador = async (items: ItemCompra[], totalEstimado: number): Promise<void> => {
  const itemsSanitizados = (items || []).map(sanitizarItemCompra);
  const total = Number(totalEstimado ?? 0);

  // 1. Guardar en AsyncStorage
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_BORRADOR_COMPRAS,
      JSON.stringify({
        items: itemsSanitizados,
        totalEstimado: total,
        estado: 'BORRADOR',
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('Error guardando borrador en AsyncStorage:', err);
  }

  // 2. Guardar en Firestore con sanitización defensiva
  try {
    const docRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
    const payload = limpiarObjetoParaFirestore({
      items: itemsSanitizados,
      totalEstimado: total,
      estado: 'BORRADOR',
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, payload);
  } catch (err) {
    console.error('Error guardando borrador en Firestore:', err);
    throw err;
  }
};

/**
 * Elimina la planilla borrador tanto de AsyncStorage como de Firestore.
 */
export const borrarPlanillaBorrador = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_BORRADOR_COMPRAS);
  } catch (_) {}

  try {
    const docRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
    await setDoc(docRef, {
      items: [],
      totalEstimado: 0,
      estado: 'BORRADOR',
      updatedAt: serverTimestamp(),
    });
  } catch (_) {}
};

/**
 * 3. Confirmar la compra:
 * - Suma las cantidades al stock de cada producto en Firestore dentro de una transacción.
 * - Si es al peso o unidadMedida es 'g', suma el monto exacto en GRAMOS al stock.
 * - Si es por unidades, suma las unidades normalmente.
 * - Sanitiza exhaustivamente el documento de compra antes de Transaction.set() para NUNCA enviar undefined.
 * - Borra el borrador activo tanto de Firestore como de AsyncStorage.
 */
export const confirmarCompraYSumarStock = async (
  items: ItemCompra[],
  montoTotalFinal: number
): Promise<string> => {
  if (!items || items.length === 0) {
    throw new Error('La planilla de compra está vacía.');
  }

  const itemsSanitizados = items.map(sanitizarItemCompra);

  const compraId = await runTransaction(db, async (transaction) => {
    // A) Verificación y lecturas previas del stock actual de cada producto
    const lecturasProductos = await Promise.all(
      itemsSanitizados.map((item) => {
        const productRef = doc(db, COLECCION_PRODUCTOS, item.productId);
        return transaction.get(productRef);
      })
    );

    // B) Actualizar e incrementar el stock en cada producto
    lecturasProductos.forEach((prodDoc, index) => {
      const item = itemsSanitizados[index];
      if (!prodDoc.exists()) {
        throw new Error(`El producto "${item.nombre}" ya no existe en el inventario.`);
      }

      const dataProducto = prodDoc.data() || {};
      const stockActual = Number(dataProducto.stock ?? 0);
      // Si es al peso o unidadMedida 'g', se suman los gramos exactos; sino las unidades
      const cantidadASumar = item.esAlPeso ? Number(item.gramos || item.cantidad) : Number(item.cantidad);
      const nuevoStock = stockActual + cantidadASumar;

      transaction.update(
        prodDoc.ref,
        limpiarObjetoParaFirestore({
          stock: nuevoStock,
          precioCosto: Number(item.precioCosto ?? 0),
          updatedAt: serverTimestamp(),
        })
      );
    });

    // C) Registrar la compra en el historial pasadas asegurando CERO undefined
    const nuevaCompraRef = doc(collection(db, COLECCION_COMPRAS));
    const compraPayload = limpiarObjetoParaFirestore({
      items: itemsSanitizados,
      montoTotal: Number(montoTotalFinal ?? 0),
      estado: 'FINALIZADA',
      finalizadaAt: serverTimestamp(),
    });

    transaction.set(nuevaCompraRef, compraPayload);

    // D) Borrar la planilla borrador de Firestore una vez confirmada
    const borradorRef = doc(db, COLECCION_COMPRAS, DOC_PLANILLA_ACTIVA);
    transaction.delete(borradorRef);

    return nuevaCompraRef.id;
  });

  // Limpiar borrador de AsyncStorage
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_BORRADOR_COMPRAS);
  } catch (_) {}

  return compraId;
};

/**
 * 4. Obtener el historial de compras pasadas ordenadas por fecha
 */
export const obtenerHistorialCompras = async (): Promise<PlanillaCompra[]> => {
  const q = query(collection(db, COLECCION_COMPRAS), orderBy('finalizadaAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((documento) => documento.id !== DOC_PLANILLA_ACTIVA)
    .map((documento) => {
      const data = documento.data() || {};
      const rawItems = Array.isArray(data.items) ? data.items : [];
      return {
        id: documento.id,
        ...data,
        items: rawItems.map(sanitizarItemCompra),
        montoTotal: Number(data.montoTotal ?? 0),
      } as PlanillaCompra;
    });
};
