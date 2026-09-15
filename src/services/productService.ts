import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Modelo / Interfaz de Producto
export interface Producto {
  id?: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  descripcion?: string;
  imagenUrl?: string;
  createdAt?: FieldValue | Date;
}

const COLECCION = 'productos';

// 1. Escuchar la lista completa de productos en tiempo real (S02 y S07)
export const subscribeToProducts = (callback: (productos: Producto[]) => void) => {
  const q = query(collection(db, COLECCION), orderBy('nombre', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const productos: Producto[] = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    })) as Producto[];
    
    callback(productos);
  });
};

// 2. Crear un nuevo producto (S05)
export const crearProducto = async (producto: Omit<Producto, 'id'>) => {
  return await addDoc(collection(db, COLECCION), {
    ...producto,
    createdAt: serverTimestamp(),
  });
};

// 3. Actualizar un producto existente (S05)
export const actualizarProducto = async (id: string, datos: Partial<Producto>) => {
  const docRef = doc(db, COLECCION, id);
  return await updateDoc(docRef, datos);
};

// 4. Eliminar un producto (S03)
export const eliminarProducto = async (id: string) => {
  const docRef = doc(db, COLECCION, id);
  return await deleteDoc(docRef);
};