// Saneamiento y normalización de precios

// Normaliza cualquier entrada de texto para convertirla en un número decimal válido.
export function sanearImporte(valorTexto: string | number | null | undefined): number {
  // 1. Control de guardia: si el campo está vacío o no existe, retorna 0
  if (valorTexto === null || valorTexto === undefined || valorTexto === '') {
    return 0;
  }

  // .toString(): asegura que podamos manipularlo como cadena de texto.
  // .replace(",", "."): sustituye la coma por punto para compatibilidad con JS.
  // .trim(): elimina espacios al inicio y final.
  const normalizado = valorTexto.toString().replace(',', '.').trim();
  const numero = parseFloat(normalizado);

  if (isNaN(numero) || numero < 0) {
    return 0;
  }

  return numero;
}

// Saneamiento de Cantidades Físicas de Inventario (sanearEntero)
// Normaliza entradas de existencias físicas para asegurar números enteros no negativos.
export function sanearEntero(valorTexto: string | number | null | undefined): number {
  // 1. Control de guardia: campo vacío retorna 0
  if (valorTexto === null || valorTexto === undefined || valorTexto === '') {
    return 0;
  }

  const limpio = valorTexto.toString().trim();
  const numero = parseInt(limpio, 10);

  if (isNaN(numero) || numero < 0) {
    return 0;
  }

  return numero;
}

/**
 * Formatea el stock disponible para mostrar en badges y pantallas de forma amigable.
 * - Si stock <= 0: "SIN STOCK"
 * - Si esAlPeso es true y stock >= 1000g: muestra en "kg" con decimales (ej: 4.5 kg)
 * - Si esAlPeso es true y stock < 1000g: muestra directamente en "g" (ej: 350 g)
 * - Si no es al peso: "Stock: X unidades."
 */
export function formatearStock(stock: number, esAlPeso?: boolean): string {
  if (stock <= 0) return 'SIN STOCK';
  if (!esAlPeso) {
    return `Stock: ${stock} unidades.`;
  }
  if (stock >= 1000) {
    const kg = Number((stock / 1000).toFixed(2));
    return `Stock: ${kg} kg`;
  }
  return `Stock: ${stock} g`;
}

/**
 * Calcula el subtotal de un ítem en el carrito:
 * - Si esAlPeso: (cantidad_gramos / 100) * precio_cada_100g
 * - Si no: cantidad_unidades * precio_unitario
 */
export function calcularSubtotalItem(precio: number, cantidad: number, esAlPeso?: boolean): number {
  if (esAlPeso) {
    return Number(((cantidad / 100) * precio).toFixed(2));
  }
  return Number((cantidad * precio).toFixed(2));
}
