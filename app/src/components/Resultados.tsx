import Table from '../Table'
import { nf } from '../formato'
import { BOTON_PAGINA } from '../estilos'
import { IconoFlecha } from './Iconos'
import { PaginaFicheros } from '../commands'

type Props = {
  pagina: PaginaFicheros
  offset: number
  porPagina: number
  minMb: string
  minBytes: number
  onCambiarMinMb: (valor: string) => void
  onCambiarOffset: (offset: number) => void
}

export default function Resultados({
  pagina,
  offset,
  porPagina,
  minMb,
  minBytes,
  onCambiarMinMb,
  onCambiarOffset,
}: Props) {
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / porPagina))
  const paginaActual = Math.floor(offset / porPagina) + 1

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5">
        <h2 className="text-[12px] font-semibold tracking-[0.08em] text-fg-dim uppercase">
          Duplicados
        </h2>

        <label className="flex items-center gap-2.5 text-[13px] text-fg-muted">
          Ocultar menores de
          <input
            type="text"
            inputMode="decimal"
            value={minMb}
            onChange={e => onCambiarMinMb(e.target.value)}
            placeholder="0"
            aria-label="Tamaño mínimo en megabytes"
            className="h-8 w-20 rounded-md border border-edge bg-panel px-2 text-center font-mono text-[13.5px] text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
          />
          MB
          {minMb && (
            <button
              type="button"
              onClick={() => onCambiarMinMb('')}
              className="text-fg-dim transition-colors hover:text-danger"
              aria-label="Quitar el filtro de tamaño"
            >
              ✕
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
        {pagina.total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-[15px] text-fg-muted">
              {minBytes > 0
                ? `Ningún duplicado alcanza ${minMb} MB`
                : 'Sin duplicados en el índice'}
            </p>
            <p className="text-[13.5px] text-fg-dim">
              {minBytes > 0
                ? 'Baja el filtro para ver más resultados.'
                : 'Elige una carpeta y lanza un escaneo para empezar.'}
            </p>
          </div>
        ) : (
          <Table ficheros={pagina.ficheros} />
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-edge px-5 py-2.5">
        <span className="text-[13px] text-fg-dim">
          {pagina.total === 0
            ? 'Índice vacío'
            : `${nf.format(pagina.total)} duplicados · mostrando ${nf.format(offset + 1)}–${nf.format(Math.min(offset + porPagina, pagina.total))}`}
        </span>

        {pagina.total > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={BOTON_PAGINA}
              onClick={() => onCambiarOffset(Math.max(0, offset - porPagina))}
              disabled={offset === 0}
              aria-label="Página anterior"
            >
              <IconoFlecha direccion="izquierda" />
            </button>

            <span className="min-w-20 text-center font-mono text-[13px] text-fg-muted">
              {paginaActual} / {totalPaginas}
            </span>

            <button
              type="button"
              className={BOTON_PAGINA}
              onClick={() => onCambiarOffset(offset + porPagina)}
              disabled={offset + porPagina >= pagina.total}
              aria-label="Página siguiente"
            >
              <IconoFlecha direccion="derecha" />
            </button>
          </div>
        )}
      </footer>
    </section>
  )
}
