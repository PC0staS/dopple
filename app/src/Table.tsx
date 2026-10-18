import { Fichero, formatearTamano, rutaDeFichero } from './models'

type Grupo = {
  tamano: number
  ficheros: Fichero[]
}

/**
 * Agrupa filas consecutivas que comparten tamaño. El backend ya devuelve el índice
 * ordenado por tamaño descendente, así que basta con recorrer en orden.
 */
function agruparPorTamano(ficheros: Fichero[]): Grupo[] {
  const grupos: Grupo[] = []

  for (const fichero of ficheros) {
    const actual = grupos[grupos.length - 1]
    if (actual && actual.tamano === fichero[1]) {
      actual.ficheros.push(fichero)
    } else {
      grupos.push({ tamano: fichero[1], ficheros: [fichero] })
    }
  }

  return grupos
}

export default function Table({ ficheros }: { ficheros: Fichero[] }) {
  const grupos = agruparPorTamano(ficheros)

  return (
    <div className="overflow-hidden border border-ink-700 bg-ink-900">
      <div className="max-h-[62vh] overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-ink-850">
            <tr className="border-b border-ink-700">
              <th className="px-5 py-3 font-mono text-[10px] font-medium tracking-[0.24em] text-ink-400 uppercase">
                Ruta
              </th>
              <th className="px-5 py-3 text-right font-mono text-[10px] font-medium tracking-[0.24em] text-ink-400 uppercase">
                Copia
              </th>
            </tr>
          </thead>

          {grupos.map(grupo => {
            // Espacio que se recupera si te quedas con una sola copia del grupo.
            const recuperable = grupo.tamano * (grupo.ficheros.length - 1)

            return (
              <tbody
                key={`${grupo.tamano}-${grupo.ficheros.length}-${rutaDeFichero(grupo.ficheros[0])}`}
              >
                <tr className="border-y border-ink-700 bg-ink-850/70">
                  <th colSpan={2} className="px-5 py-2 text-left">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.2em] uppercase">
                      <span className="text-acid-400">{formatearTamano(grupo.tamano)}</span>
                      <span className="text-ink-400">{grupo.ficheros.length} copias</span>
                      {recuperable > 0 && (
                        <span className="text-amber-300/80">
                          {formatearTamano(recuperable)} recuperables
                        </span>
                      )}
                    </div>
                  </th>
                </tr>

                {grupo.ficheros.map((fichero, i) => {
                  const ruta = rutaDeFichero(fichero)
                  return (
                    <tr
                      key={`${i}-${ruta}`}
                      className="group border-b border-ink-800 last:border-0 hover:bg-acid-400/5"
                    >
                      <td className="px-5 py-2.5">
                        <span className="block font-mono text-[12.5px] leading-relaxed break-all text-ink-300 group-hover:text-white">
                          {ruta}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-[12.5px] whitespace-nowrap text-ink-500">
                        {i + 1}/{grupo.ficheros.length}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}
