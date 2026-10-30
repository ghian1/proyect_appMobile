import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  FieldValue,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp, 
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Nombre de la colección en Firestore donde se almacenan los productos
const COLECCION_PRODUCTOS = "productos";

// Contrato de un producto, que define las propiedades que debe tener un producto en la base de datos.
export interface Producto {
  id?: string;
  nombre: string;
  categorias?: string[]; // Lo hice un array de strings para permitir múltiples categorías por producto. 
  categoria?: string; // La categoría principal del producto, que puede ser una cadena de texto o undefined si no se especifica
  precio: number;
  precioCosto?: number; // Precio directo del proveedor, no al que se vende.
  stock: number;
  descripcion?: string;
  createdAt?: FieldValue | Date;
  imagenUrl?: string | null; // Contrato para la URL de la imagen del producto, que puede ser una cadena de texto o null si no hay imagen
}

export type NuevoProductoInput = Omit<Producto, "id" | "creadoEn" | "actualizadoEn">;

// 1. Escuchar la lista completa de productos en tiempo real (S02 y S07)
export function suscribirAProductos(
  onData: (productos: Producto[]) => void,
  onError?: (error: Error) => void
) {
  // Consulta ordenada alfabéticamente por nombre
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

// Función para obtener un producto por su ID. Lo usamos para el useEffect de recuperar los datos del producto(AltaEditarScreen).
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
  // Validación defensiva en capa de servicio
  if (!datos.nombre || datos.nombre.trim().length < 2) { 
    throw new Error("El nombre del producto debe contener al menos 2 caracteres.");
  }
  if (datos.precio < 0) {
    throw new Error("El precio no puede ser un valor negativo.");
  }
  if (datos.stock < 0) {
    throw new Error("El stock no puede ser negativo (Invariante I-04).");
  }

  // Normalizamos: si viene el array de categorías lo usamos, si viene una sola la metemos en array
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

// 3. Actualizar un producto existente (precio, stock o descripción)
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

  // Si vienen categorías nuevas, las asignamos al payload
  if (cambios.categorias && cambios.categorias.length > 0) {
    payload.categorias = cambios.categorias;
    payload.categoria = cambios.categorias[0];
  }

  await updateDoc(docRef, payload);
}

// 4. Categorías por defecto para la barra de filtros superiores
export const CATEGORIAS_BASE: string[] = [
  'Todas',
  'Stock Crítico',
  'Sin Stock',
  'Comestibles',
  'Bebidas',
  'Limpieza',
  'Almacén',
];

// 5. Suscripción en tiempo real a la colección de categorías en Firestore
export const suscribirACategorias = (
  onUpdate: (categorias: string[]) => void,
  onError?: (error: Error) => void
) => {
  const ref = collection(db, 'categorias');
  return onSnapshot(
    query(ref),
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

// 6. Guardar una categoría nueva creada por el comerciante en Firestore
export const crearCategoriaBD = async (nombre: string): Promise<void> => {
  if (!nombre || !nombre.trim()) return;
  const ref = collection(db, 'categorias');
  await addDoc(ref, { 
    nombre: nombre.trim(),
    creadoEn: serverTimestamp() 
  });
};

// 7. Eliminar una categoría de la base de datos y limpiarla de los productos asociados
export async function eliminarCategoriaBD(nombreCategoria: string): Promise<void> {
  if (!nombreCategoria) throw new Error("Se requiere el nombre de la categoría.");

  const batch = writeBatch(db);

  // 1. Borrar la categoría de la colección 'categorias'
  const catRef = doc(db, "categorias", nombreCategoria);
  batch.delete(catRef);

  // 2. Buscar todos los productos que tengan esa categoría asignada y removerla
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

  // 3. Ejecutar todas las operaciones en lote en Firestore
  await batch.commit();
}
