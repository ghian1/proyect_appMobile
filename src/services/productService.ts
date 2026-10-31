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

  return onSnapshot(
    ref,
    (snapshot) => {
      const categoriasInactivas = new Set<string>();
      const categoriasActivasBD: string[] = [];

      (snapshot?.docs || []).forEach((docSnap) => {
        const data = docSnap.data() || {};
        const nombre = data.nombre || docSnap.id;
        if (!nombre) return;

        if (data.activa === false) {
          categoriasInactivas.add(nombre.toLowerCase());
        } else {
          categoriasActivasBD.push(nombre);
        }
      });

      // Filtramos de las categorías base aquellas que hayan sido desactivadas explícitamente en BD
      const baseFiltradas = CATEGORIAS_BASE.filter(
        (cat) => !categoriasInactivas.has(cat.toLowerCase())
      );

      // Unificamos las categorías base activas con las categorías creadas activas en Firestore
      const listaUnificada = Array.from(new Set([...baseFiltradas, ...categoriasActivasBD]));
      onUpdate(listaUnificada || []);
    },
    (error) => {
      console.error("Error en listener de categorías:", error);
      if (onError) onError(error);
    }
  );
};

// 6. Guardar una categoría nueva creada por el comerciante (Nace activa: true o se reactiva si estaba inactiva)
export const crearCategoriaBD = async (nombre: string): Promise<void> => {
  if (!nombre || !nombre.trim()) return;
  const nombreLimpio = nombre.trim();
  const formateada = nombreLimpio.charAt(0).toUpperCase() + nombreLimpio.slice(1);
  const ref = collection(db, COLECCION_CATEGORIAS);

  // Verificamos si ya existe por campo nombre
  const q = query(ref, where('nombre', '==', formateada));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { activa: true, actualizadoEn: serverTimestamp() });
    });
    await batch.commit();
    return;
  }

  // Verificamos por doc ID directo
  const directDocRef = doc(db, COLECCION_CATEGORIAS, formateada);
  const directDocSnap = await getDoc(directDocRef);
  if (directDocSnap.exists()) {
    await updateDoc(directDocRef, { activa: true, actualizadoEn: serverTimestamp() });
    return;
  }

  // Si no existía previamente, la creamos activa
  await addDoc(ref, { 
    nombre: formateada,
    activa: true, 
    creadoEn: serverTimestamp() 
  });
};

// 7. Borrado Lógico de una categoría (Soft Delete)
export async function eliminarCategoriaBD(nombreCategoria: string): Promise<void> {
  if (!nombreCategoria) throw new Error("Se requiere la categoría.");

  const batch = writeBatch(db);

  // 1. Buscamos todos los documentos en la colección 'categorias' que coincidan con el nombre
  const ref = collection(db, COLECCION_CATEGORIAS);
  const q = query(ref, where('nombre', '==', nombreCategoria));
  const snap = await getDocs(q);

  let docEncontrado = false;
  snap.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { activa: false, actualizadoEn: serverTimestamp() });
    docEncontrado = true;
  });

  // Verificamos si existe un documento cuyo ID sea el nombre de la categoría
  const directDocRef = doc(db, COLECCION_CATEGORIAS, nombreCategoria);
  const directDocSnap = await getDoc(directDocRef);
  if (directDocSnap.exists()) {
    batch.update(directDocRef, { activa: false, actualizadoEn: serverTimestamp() });
    docEncontrado = true;
  }

  // Si no existía ningún documento en Firestore (por ejemplo, categorías base del sistema),
  // creamos el documento con activa: false para persistir el soft-delete
  if (!docEncontrado) {
    batch.set(
      directDocRef,
      {
        nombre: nombreCategoria,
        activa: false,
        actualizadoEn: serverTimestamp(),
        creadoEn: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 2. Limpiamos la categoría de los productos asociados para evitar inconsistencias
  const productosRef = collection(db, COLECCION_PRODUCTOS);
  const snapshotProductos = await getDocs(productosRef);

  (snapshotProductos?.docs || []).forEach((docSnap) => {
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
        categorias: nuevasCategorias.length > 0 ? nuevasCategorias : ['Almacén'],
        categoria: nuevaPrincipal,
      });
    }
  });

  // 3. Ejecutar el lote en Firestore
  await batch.commit();
}
