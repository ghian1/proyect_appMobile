
//Saneamiento de precios(Funcion recomendada por la IA cuando hicimos la documentacion del proyecto.)

//Normaliza cualquier entrada de texto para convertirla en un número decimal válido.

export function sanearImporte(valorTexto: string | number | null | undefined): number {
  // 1. Control de guardia: si el campo está vacío o no existe, retorna 0
    if (valorTexto === null || valorTexto === undefined || valorTexto === "") {
    return 0;
    }

    // .toString(): asegura que podamos manipularlo como cadena de texto.
    // .replace(",", "."): sustituye la coma por punto para compatibilidad con JS.
    // .trim(): elimina espacios al inicio y final.
    const normalizado = valorTexto.toString().replace(",", ".").trim();
    const numero = parseFloat(normalizado);

    if (isNaN(numero) || numero < 0) {
    return 0;
    }

    return numero;
}


//Saneamiento de Cantidades Físicas de Inventario (sanearEntero)


//Normaliza entradas de existencias físicas para asegurar números enteros no negativos.

export function sanearEntero(valorTexto: string | number | null | undefined): number {
  // 1. Control de guardia: campo vacío retorna 0
    if (valorTexto === null || valorTexto === undefined || valorTexto === "") {
    return 0;
    }

    const limpio = valorTexto.toString().trim();
    const numero = parseInt(limpio, 10);

    if (isNaN(numero) || numero < 0) {
    return 0;
    }

    return numero;
}