import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Modelo del estado del control de caja
export interface EstadoCaja {
  estado: 'abierta' | 'cerrada';
  fechaApertura?: any;
  fechaCierre?: any;
  totalFacturadoAlCierre?: number;
  cantidadVentasAlCierre?: number;
}

const COLECCION_CAJA = 'control_caja';
const DOC_ESTADO_ACTUAL = 'estado_actual';
const COLECCION_HISTORIAL_CIERRES = 'cierres_caja';

// Escuchar el estado de la caja en tiempo real desde Firestore
export const suscribirAEstadoCaja = (
  onData: (estado: EstadoCaja) => void,
  onError?: (error: Error) => void
) => {
  const docRef = doc(db, COLECCION_CAJA, DOC_ESTADO_ACTUAL);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as EstadoCaja);
      } else {
        // Si aún no se inicializó en Firestore, por defecto la caja se considera abierta
        onData({ estado: 'abierta' });
      }
    },
    (error) => {
      console.error('Error al escuchar el estado de la caja:', error);
      if (onError) onError(error);
    }
  );
};

// Abrir la caja de la jornada (inicia nuevo turno y resetea recaudación a $0)
export const abrirCaja = async (): Promise<void> => {
  const docRef = doc(db, COLECCION_CAJA, DOC_ESTADO_ACTUAL);
  await setDoc(
    docRef,
    {
      estado: 'abierta',
      fechaApertura: serverTimestamp(),
      fechaCierre: null,
      totalFacturadoAlCierre: 0,
      cantidadVentasAlCierre: 0,
    },
    { merge: true }
  );
};

// Cerrar la caja del día y registrar el balance en el historial
export const cerrarCaja = async (resumen?: {
  totalFacturado: number;
  cantidadVentas: number;
  desglose?: any;
}): Promise<void> => {
  const docRef = doc(db, COLECCION_CAJA, DOC_ESTADO_ACTUAL);
  const datosCierre = {
    estado: 'cerrada',
    fechaCierre: serverTimestamp(),
    totalFacturadoAlCierre: resumen?.totalFacturado || 0,
    cantidadVentasAlCierre: resumen?.cantidadVentas || 0,
  };

  await setDoc(docRef, datosCierre, { merge: true });

  // Guardar en el historial de cierres para auditoría y futuras consultas
  try {
    await addDoc(collection(db, COLECCION_HISTORIAL_CIERRES), {
      ...datosCierre,
      desglose: resumen?.desglose || null,
      fechaRegistro: serverTimestamp(),
    });
  } catch (error) {
    console.warn('No se pudo guardar el registro en historial de cierres:', error);
  }
};

// [NUEVA FUNCIÓN] Obtener el historial de cierres de caja ordenados por fecha más reciente
export const obtenerHistorialCajas = async (): Promise<any[]> => {
  try {
    const q = query(
      collection(db, COLECCION_HISTORIAL_CIERRES),
      orderBy('fechaRegistro', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const historial: any[] = [];
    querySnapshot.forEach((docSnap) => {
      historial.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });
    return historial;
  } catch (error) {
    console.error('Error al obtener el historial de cajas:', error);
    throw error;
  }
};
