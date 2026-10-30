import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  FieldValue,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Nombre de la colección en Firestore donde se almacenan los productos
const COLECCION_PRODUCTOS = "productos";
const COLECCION_CATEGORIAS = "categorias";

// Contrato de un producto
export interface Producto {
  id?: string;
  nombre: string;
  categorias?: string[]; 
  categoria?: string; 
  precio: number;
  precioCosto?: number; 
  stock: number;
  descripcion?: string;
  createdAt?: FieldValue | Date;
  imagenUrl?: string | null; 
}

export type NuevoProductoInput = Omit<Producto, "id" | "creadoEn" | "actualizadoEn">;

// 1. Escuchar la lista completa de productos en tiempo real (S02 y S07)
export function suscribirAProductos(
  onData: (productos: Producto[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, COLECCION_PRODUCTOS),
    orderBy("nombre", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista: Producto[] = (snapshot?.docs || []).map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Producto, "id">),
      }));
      onData(lista || []);
    },
    (error) => {
      console.error("Error en listener de productos:", error);
      if (onError) onError(error);
    }
  );
}

// Función para obtener un producto por su ID
export async function obtenerProductoPorId(idProducto: string): Promise<Producto | null> {
  if (!idProducto) throw new Error("Se requiere el ID del producto.");
  const docRef = doc(db, COLECCION_PRODUCTOS, idProducto);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<Producto, "id">),
  };
}

// 2. Crear un nuevo producto (S05)
export async function crearProducto(datos: NuevoProductoInput): Promise<string> {
  if (!datos.nombre || datos.nombre.trim().length < 2) { 
    throw new Error("El nombre del producto debe contener al menos 2 caracteres.");
  }
  if (datos.precio < 0) {
    throw new Error("El precio no puede ser un valor negativo.");
  }
  if (datos.stock < 0) {
    throw new Error("El stock no puede ser negativo (Invariante I-04).");
  }

  const categoriasFinales = datos.categorias && datos.categorias.length > 0 
    ? datos.categorias 
    : (datos.categoria ? [datos.categoria] : ["Almacén"]);

  const payload = {
    nombre: datos.nombre.trim(),
    categorias: categoriasFinales,
    categoria: categoriasFinales[0],
    precio: Number(datos.precio),
    stock: Number(datos.stock),
    descripcion: datos.descripcion ? datos.descripcion.trim() : "",
    imagenUrl: datos.imagenUrl || null,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLECCION_PRODUCTOS), payload);
  return docRef.id;
}

// 3. Actualizar un producto existente
export async function actualizarProducto(
  idProducto: string,
  cambios: Partial<NuevoProductoInput>
): Promise<void> {
  if (!idProducto) throw new Error("Se requiere el ID del producto a actualizar.");

  const docRef = doc(db, COLECCION_PRODUCTOS, idProducto);
  
  const payload: any = {
    ...cambios,
    actualizadoEn: serverTimestamp(),
  };

  if (cambios.nombre) {
    payload.nombre = cambios.nombre.trim();
  }

  if (cambios.categorias && cambios.categorias.length > 0) {
    payload.categorias = cambios.categorias;
    payload.categoria = cambios.categorias[0];
  }

  await updateDoc(docRef, payload);
}

// 4. Categorías fijas de sistema para la barra de filtros superiores
export const CATEGORIAS_BASE: string[] = [
  'Todas',
  'Stock Crítico',
  'Sin Stock',
  'Comestibles',
  'Bebidas',
  'Limpieza',
  'Almacén',
];

// 5. Suscripción en tiempo real a las categorías activas en Firestore
export const suscribirACategorias = (
  onUpdate: (categorias: string[]) => void,
  onError?: (error: Error) => void
) => {
  const ref = collection(db, COLECCION_CATEGORIAS);
  // Filtramos solo las que tengan activa: true (o por defecto si el campo no existiera en viejas)
  const q = query(ref, where('activa', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const catsGuardadas = (snapshot?.docs || [])
        .map((docSnap) => docSnap?.data()?.nombre as string)
        .filter(Boolean);
      const listaUnificada = Array.from(new Set([...CATEGORIAS_BASE, ...catsGuardadas]));
      onUpdate(listaUnificada || []);
    },
    (error) => {
      console.error("Error en listener de categorías:", error);
      if (onError) onError(error);
    }
  );
};

// 6. Guardar una categoría nueva creada por el comerciante (Nace activa: true)
export const crearCategoriaBD = async (nombre: string): Promise<void> => {
  if (!nombre || !nombre.trim()) return;
  const ref = collection(db, COLECCION_CATEGORIAS);
  await addDoc(ref, { 
    nombre: nombre.trim(),
    activa: true, 
    creadoEn: serverTimestamp() 
  });
};

// 7. [MODIFICADO] Borrado Lógico de una categoría (Soft Delete)
export async function eliminarCategoriaBD(nombreCategoria: string): Promise<void> {
  if (!nombreCategoria) throw new Error("Se requiere la categoría.");

  const batch = writeBatch(db);

  // 1. Actualizamos el documento de la categoría para marcarlo como inactivo
  const catRef = doc(db, COLECCION_CATEGORIAS, nombreCategoria);
  batch.update(catRef, { activa: false });

  // 2. Limpiamos la categoría de los productos asociados para evitar inconsistencias
  const productosRef = collection(db, COLECCION_PRODUCTOS);
  const snapshot = await getDocs(productosRef);

  (snapshot?.docs || []).forEach((docSnap) => {
    const data = docSnap.data() || {};
    const categoriasArray: string[] = data.categorias || [];
    const categoriaPrincipal: string = data.categoria || '';

    if (categoriasArray.includes(nombreCategoria) || categoriaPrincipal === nombreCategoria) {
      const nuevasCategorias = (categoriasArray || []).filter((c) => c !== nombreCategoria);
      const nuevaPrincipal =
        categoriaPrincipal === nombreCategoria
          ? nuevasCategorias[0] || 'Almacén'
          : categoriaPrincipal;

      batch.update(docSnap.ref, {
        categorias: nuevasCategorias,
        categoria: nuevaPrincipal,
      });
    }
  });

  // 3. Ejecutar el lote en Firestore
  await batch.commit();
}
