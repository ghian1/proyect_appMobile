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
  FieldValue,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Modelo de Cliente
export interface ClienteFiado {
  id?: string;
  nombre: string;
  telefono?: string;
  deudaTotal: number;
  notas?: string;
  updatedAt?: FieldValue | Date;
  createdAt?: FieldValue | Date;
}

// Modelo para el historial de movimientos (compras fiadas o pagos)
export interface MovimientoFiado {
  id?: string;
  clienteId: string;
  monto: number; // Positivo si es compra/deuda, negativo si es pago
  tipo: 'FIADO' | 'PAGO';
  concepto: string;
  createdAt?: FieldValue | Date;
}

const COLECCION_CLIENTES = 'clientes_fiados';

// 1. Escuchar la lista de clientes en tiempo real
export const subscribeToClientesFiados = (callback: (clientes: ClienteFiado[]) => void) => {
  const q = query(collection(db, COLECCION_CLIENTES), orderBy('nombre', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const clientes: ClienteFiado[] = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    })) as ClienteFiado[];

    callback(clientes);
  });
};

// 2. Registrar un nuevo cliente
export const crearClienteFiado = async (cliente: Omit<ClienteFiado, 'id' | 'deudaTotal'>) => {
  return await addDoc(collection(db, COLECCION_CLIENTES), {
    ...cliente,
    deudaTotal: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// 3. Registrar un nuevo movimiento (compra o pago) y actualizar la deuda del cliente
export const registrarMovimientoFiado = async (
  clienteId: string,
  monto: number,
  tipo: 'FIADO' | 'PAGO',
  concepto: string
) => {
  // Ajustar el monto según el tipo (FIADO aumenta deuda, PAGO la reduce)
  const ajusteDeuda = tipo === 'FIADO' ? monto : -monto;

  // Registrar en la subcolección de movimientos del cliente
  const movimientosRef = collection(db, COLECCION_CLIENTES, clienteId, 'movimientos');
  await addDoc(movimientosRef, {
    clienteId,
    monto,
    tipo,
    concepto,
    createdAt: serverTimestamp(),
  });

  // Actualizar el acumulado de deuda en el documento principal del cliente
  const clienteRef = doc(db, COLECCION_CLIENTES, clienteId);
  return await updateDoc(clienteRef, {
    deudaTotal: increment(ajusteDeuda),
    updatedAt: serverTimestamp(),
  });
};

// 4. Eliminar un cliente
export const eliminarClienteFiado = async (clienteId: string) => {
  const docRef = doc(db, COLECCION_CLIENTES, clienteId);
  return await deleteDoc(docRef);
};