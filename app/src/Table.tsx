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

/** Espacio que se recupera si te quedas con una sola copia del grupo. */
function recuperableDe(grupo: Grupo): number {
  return grupo.tamano * (grupo.ficheros.length - 1)
}

/** Parte la ruta en carpeta y nombre, para poder darles pesos visuales distintos. */
function partirRuta(ruta: string): [string, string] {
  const corte = ruta.lastIndexOf('/')
  return corte === -1 ? ['', ruta] : [ruta.slice(0, corte + 1), ruta.slice(corte + 1)]
}

export default function Table({ ficheros }: { ficheros: Fichero[] }) {
  const grupos = agruparPorTamano(ficheros)

  return (
    <div className="border border-edge bg-panel shadow-[0_1px_3px_rgb(0_0_0/0.5)]">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-panel-2">
          <tr className="border-b border-edge">
            <th className="px-5 py-2.5 text-[13px] font-medium text-fg-muted">Ruta</th>
            <th className="px-5 py-2.5 text-right text-[13px] font-medium text-fg-muted">Copia</th>
          </tr>
        </thead>

        {grupos.map(grupo => {
          const recuperable = recuperableDe(grupo)

          return (
            <tbody
              key={`${grupo.tamano}-${grupo.ficheros.length}-${rutaDeFichero(grupo.ficheros[0])}`}
            >
              <tr className="border-y border-edge bg-panel-2">
                <th colSpan={2} className="px-5 py-2.5 text-left font-normal">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span className="font-mono text-[14px] font-semibold text-fg">
                      {formatearTamano(grupo.tamano)}
                    </span>
                    <span className="text-[13px] text-fg-dim">{grupo.ficheros.length} copias</span>

                    {recuperable > 0 && (
                      <span className="ml-auto shrink-0 font-mono text-[13px] text-accent">
                        {formatearTamano(recuperable)} recuperables
                      </span>
                    )}
                  </div>
                </th>
              </tr>

              {grupo.ficheros.map((fichero, i) => {
                const [carpeta, nombre] = partirRuta(rutaDeFichero(fichero))
                return (
                  <tr
                    key={`${i}-${nombre}`}
                    className="border-b border-edge last:border-0 hover:bg-panel-2/60"
                  >
                    <td className="px-5 py-2">
                      <span className="font-mono text-[13.5px] leading-relaxed break-all">
                        <span className="text-fg-dim">{carpeta}</span>
                        <span className="text-fg">{nombre}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-[13.5px] whitespace-nowrap text-fg-dim">
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
  )
}
