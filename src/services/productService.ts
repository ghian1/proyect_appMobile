import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  FieldValue,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

//Nombre de la colección en Firestore donde se almacenan los productos
const COLECCION_PRODUCTOS = "productos";

//Contrato de un producto, que define las propiedades que debe tener un producto en la base de datos.
export interface Producto {
  id?: string;
  nombre: string;
  categoria: string; // 'Comestibles' | 'Bebidas' | 'Limpieza' | 'Almacén'
  precio: number;
  stock: number;
  descripcion?: string;
  imagenUrl?: string;
  createdAt?: FieldValue | Date;
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
      const lista: Producto[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Producto, "id">),
      }));
      onData(lista);
    },
    (error) => {
      console.error("Error en listener de productos:", error);
      if (onError) onError(error);
    }
  );
}


// 2. Crear un nuevo producto (S05)
export async function crearProducto(datos: NuevoProductoInput): Promise<string> {
  // Validación defensiva en capa de servicio

  //Le agregamos manejo de errores que no habia. 
  if (!datos.nombre || datos.nombre.trim().length < 2) { 
    throw new Error("El nombre del producto debe contener al menos 2 caracteres.");
  }
  if (datos.precio < 0) {
    throw new Error("El precio no puede ser un valor negativo.");
  }
  if (datos.stock < 0) {
    throw new Error("El stock no puede ser negativo (Invariante I-04).");
  }

  const payload = {
    nombre: datos.nombre.trim(),
    categoria: datos.categoria || "Almacén",
    precio: Number(datos.precio),
    stock: Number(datos.stock),
    descripcion: datos.descripcion ? datos.descripcion.trim() : "",
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

  await updateDoc(docRef, payload);
}

// 4. Eliminar un producto (S03)
export async function eliminarProducto(idProducto: string): Promise<void> {
  if (!idProducto) throw new Error("Se requiere el ID del producto a eliminar.");
  const docRef = doc(db, COLECCION_PRODUCTOS, idProducto);
  await deleteDoc(docRef);
}