import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// ESTRUCTURA DE CADA ÍTEM DEL CARRITO DE VENTAS
export interface ItemCarrito {
    idProducto: string;
    nombre: string;
    precio: number;
    cantidad: number;
    subtotal: number;
}

// TIPO DE MEDIO DE PAGO
export type MedioPago = 'Efectivo' | 'Mercado Pago' | 'Transferencia' | 'Fiado';

// ESTRUCTURA DE LA VENTA EN FIRESTORE
export interface Venta {
    id?: string;
    items: ItemCarrito[];
    total: number;
    medioPago: MedioPago;
    idClienteFiado?: string; // Solo si se cobra en modalidad Fiado
    nombreClienteFiado?: string; // Para identificar rápido en el historial de ventas
    fecha: any; // Timestamp del servidor de Firebase
}

const COLECCION_CLIENTES = 'clientes_fiados';

// FUNCIÓN PARA REGISTRAR LA VENTA, IMPACTAR STOCK Y ACTUALIZAR SALDO FIADO EN FIRESTORE
export const registrarVenta = async (
    items: ItemCarrito[],
    total: number,
    medioPago: MedioPago,
    clienteFiadoInfo?: { id: string; nombre: string }
): Promise<string> => {
    try {
        // 1. Guardamos la transacción en la colección 'ventas'
        const docRef = await addDoc(collection(db, 'ventas'), {
            items,
            total,
            medioPago,
            idClienteFiado: clienteFiadoInfo?.id || null,
            nombreClienteFiado: clienteFiadoInfo?.nombre || null,
            fecha: serverTimestamp(),
        });

        // 2. Descontamos el stock de cada producto de forma atómica en 'productos'
        const promesasDescuento = items.map((item) => {
            const productoRef = doc(db, 'productos', item.idProducto);
            return updateDoc(productoRef, {
                stock: increment(-item.cantidad),
            });
        });

        await Promise.all(promesasDescuento);

        // 3. Si el pago es Fiado y tenemos el ID del cliente, registramos el movimiento e incrementamos deudaTotal
        if (medioPago === 'Fiado' && clienteFiadoInfo?.id) {
            // Registrar el ticket en la subcolección de movimientos del cliente
            const movimientosRef = collection(db, COLECCION_CLIENTES, clienteFiadoInfo.id, 'movimientos');
            await addDoc(movimientosRef, {
                clienteId: clienteFiadoInfo.id,
                monto: total,
                tipo: 'FIADO',
                concepto: `Compra en caja (Venta #${docRef.id.slice(0, 5)})`,
                createdAt: serverTimestamp(),
            });

            // Actualizar la deuda acumulada del cliente
            const clienteRef = doc(db, COLECCION_CLIENTES, clienteFiadoInfo.id);
            await updateDoc(clienteRef, {
                deudaTotal: increment(total),
                updatedAt: serverTimestamp(),
            });
        }

        return docRef.id;
    } catch (error) {
        console.error('Error al registrar la venta en Firestore:', error);
        throw error;
    }
};