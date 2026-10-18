import { nf } from '../formato'
import { BOTON_PELIGRO, BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../estilos'
import { IconoCarpeta, IconoPapelera } from './Iconos'

export type Progreso = {
  fase: string
  ficheros?: number
  hechos?: number
  total?: number
}

const ETIQUETA_FASE: Record<string, string> = {
  Iniciando: 'Preparando',
  escaneando: 'Recorriendo el disco',
  agrupando_parcial: 'Pre-agrupando candidatos',
  hash_completo: 'Verificando con hash',
}

type Props = {
  ruta: string | null
  escaneando: boolean
  progreso: Progreso | null
  error: string | null
  puedeBorrarIndice: boolean
  onElegirCarpeta: () => void
  onBuscarDuplicados: () => void
  onBorrarBaseDeDatos: () => void
}

export default function BarraHerramientas({
  ruta,
  escaneando,
  progreso,
  error,
  puedeBorrarIndice,
  onElegirCarpeta,
  onBuscarDuplicados,
  onBorrarBaseDeDatos,
}: Props) {
  const contador = (() => {
    if (!progreso || progreso.fase === 'Iniciando') return null
    if (typeof progreso.ficheros === 'number') return `${nf.format(progreso.ficheros)} ficheros`
    if (typeof progreso.hechos === 'number' && typeof progreso.total === 'number') {
      return `${nf.format(progreso.hechos)} / ${nf.format(progreso.total)}`
    }
    return null
  })()

  const pct =
    progreso &&
    typeof progreso.hechos === 'number' &&
    typeof progreso.total === 'number' &&
    progreso.total > 0
      ? Math.min(100, Math.round((progreso.hechos / progreso.total) * 100))
      : null

  return (
    <section className="shrink-0 border-b border-edge px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" className={BOTON_SECUNDARIO} onClick={onElegirCarpeta}>
          <IconoCarpeta />
          Elegir carpeta
        </button>

        <div className="flex h-9 min-w-52 flex-1 items-center rounded-md border border-edge bg-panel px-3.5">
          {ruta ? (
            <span className="truncate font-mono text-[13.5px] text-fg-muted" title={ruta}>
              {ruta}
            </span>
          ) : (
            <span className="text-[13.5px] text-fg-dim">Ninguna carpeta seleccionada</span>
          )}
        </div>

        <button
          type="button"
          className={BOTON_PRIMARIO}
          onClick={onBuscarDuplicados}
          disabled={!ruta || escaneando}
        >
          {escaneando ? 'Escaneando…' : 'Buscar duplicados'}
        </button>

        <button
          type="button"
          className={BOTON_PELIGRO}
          onClick={onBorrarBaseDeDatos}
          disabled={!puedeBorrarIndice || escaneando}
          title="Borrar todo el índice de duplicados"
        >
          <IconoPapelera />
          Vaciar índice
        </button>
      </div>

      {ruta === '/' && (
        <p className="mt-2.5 rounded-md bg-danger/10 px-3.5 py-2 text-[13px] text-danger">
          ¡Cuidado! Escanear la raíz del disco puede tardar mucho y generar muchos duplicados.
        </p>
      )}

      {progreso && (
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between gap-4 text-[13px]">
            <span className="text-fg-muted">{ETIQUETA_FASE[progreso.fase] ?? progreso.fase}</span>
            {contador && <span className="font-mono text-fg-dim">{contador}</span>}
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-panel-3">
            <div
              className={
                pct === null
                  ? 'h-full w-full animate-pulse bg-accent'
                  : 'h-full rounded-full bg-accent transition-[width] duration-200 ease-out'
              }
              style={pct === null ? undefined : { width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3.5 rounded-md bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
