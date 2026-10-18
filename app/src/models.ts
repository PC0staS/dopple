/**
 * Fichero tal y como lo expone `dopple-core`: `(ruta como bytes, tamaño en bytes)`.
 * Serde serializa la tupla de Rust como un array JSON: `[[...bytes], tamano]`.
 */
export type Fichero = [ruta: number[], tamano: number]

const decodificador = new TextDecoder()

/** La ruta viaja como bytes para poder representar nombres no-UTF-8. */
export function rutaDeFichero([ruta]: Fichero): string {
  return decodificador.decode(new Uint8Array(ruta))
}

const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'

  let valor = bytes
  let i = 0
  while (valor >= 1024 && i < UNIDADES.length - 1) {
    valor /= 1024
    i += 1
  }

  const decimales = i === 0 ? 0 : valor < 10 ? 2 : 1
  return `${valor.toFixed(decimales)} ${UNIDADES[i]}`
}