import './App.css'
import { useState, useEffect } from 'react'
import Table from './Table'
import { listen } from '@tauri-apps/api/event'
import { confirm } from '@tauri-apps/plugin-dialog'
import {
  PaginaFicheros,
  borrarBaseDeDatos,
  buscarDuplicados,
  cargarPagina,
  elegirCarpeta,
} from './commands'

type Progreso = {
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

const nf = new Intl.NumberFormat('es-ES')

/** Filas por página de la tabla de resultados. */
const POR_PAGINA = 25

const BOTON =
  'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border px-3.5 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'
const BOTON_SECUNDARIO = `${BOTON} border-edge bg-panel-2 text-fg hover:border-edge-strong hover:bg-panel-3 disabled:hover:border-edge disabled:hover:bg-panel-2`
const BOTON_PRIMARIO = `${BOTON} border-transparent bg-accent text-accent-ink hover:bg-accent-hover disabled:hover:bg-accent`
const BOTON_PELIGRO = `${BOTON} border-transparent bg-transparent text-danger hover:bg-danger/10 disabled:hover:bg-transparent`
const BOTON_PAGINA =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-edge text-fg-muted transition-colors hover:border-edge-strong hover:bg-panel-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-edge disabled:hover:bg-transparent disabled:hover:text-fg-muted'

function IconoCarpeta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1a2 2 0 0 1 1.5.7l1 1.1a2 2 0 0 0 1.5.7h5.9A2.5 2.5 0 0 1 21 10v6.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    </svg>
  )
}

function IconoPapelera() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    </svg>
  )
}

function IconoFlecha({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4.5 ${direccion === 'izquierda' ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function App() {
  const [pagina, setPagina] = useState<PaginaFicheros>({ ficheros: [], total: 0 })
  const [offset, setOffset] = useState(0)
  const [minMb, setMinMb] = useState('')
  const [minBytes, setMinBytes] = useState(0)
  const [progreso, setProgreso] = useState<Progreso | null>(null)
  const [ruta, setRuta] = useState<string | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seleccionarCarpeta = async () => {
    setError(null)
    try {
      const seleccion = await elegirCarpeta()
      if (seleccion) setRuta(seleccion)
    } catch (e) {
      setError(`No se pudo abrir el selector de carpetas: ${String(e)}`)
    }
  }

  const handleBuscarDuplicados = async () => {
    if (!ruta || escaneando) return
    setError(null)
    setEscaneando(true)
    setProgreso({ fase: 'Iniciando' })
    try {
      await buscarDuplicados(ruta)
      setOffset(0)
      await recargar(0, minBytes)
    } catch (e) {
      setError(String(e))
    } finally {
      setEscaneando(false)
      setProgreso(null)
    }
  }

  const handleBorrarBaseDeDatos = async () => {
    const ok = await confirm(
      'Se borrará todo el índice de duplicados. Esta acción no se puede deshacer.',
      { title: 'Vaciar índice', kind: 'warning' },
    )
    if (!ok) return

    setError(null)
    try {
      await borrarBaseDeDatos()
      setOffset(0)
      await recargar(0, minBytes)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    let cancelado = false
    let dejarDeEscuchar: (() => void) | undefined

    listen<Progreso>('progreso', event => {
      if (!cancelado) {
        setProgreso(event.payload)
      }
    }).then(unlisten => {
      if (cancelado) {
        unlisten()
      } else {
        dejarDeEscuchar = unlisten
      }
    })

    return () => {
      cancelado = true
      dejarDeEscuchar?.()
    }
  }, [])

  async function recargar(desde: number, minimo: number) {
    setPagina(await cargarPagina(desde, POR_PAGINA, minimo))
  }

  useEffect(() => {
    recargar(offset, minBytes).catch(e => setError(String(e)))
  }, [offset, minBytes])

  // El input es texto libre, así que esperamos a que deje de escribir antes de
  // traducirlo a bytes y volver a consultar. Siempre volvemos a la página 1.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      const mb = Number.parseFloat(minMb.replace(',', '.'))
      setMinBytes(Number.isFinite(mb) && mb > 0 ? Math.round(mb * 1024 * 1024) : 0)
      setOffset(0)
    }, 250)

    return () => clearTimeout(temporizador)
  }, [minMb])

  const contador = (() => {
    if (!progreso || progreso.fase === 'Iniciando') return null
    if (typeof progreso.ficheros === 'number') return `${nf.format(progreso.ficheros)} ficheros`
    if (typeof progreso.hechos === 'number' && typeof progreso.total === 'number') {
      return `${nf.format(progreso.hechos)} / ${nf.format(progreso.total)}`
    }
    return null
  })()

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / POR_PAGINA))
  const paginaActual = Math.floor(offset / POR_PAGINA) + 1

  const pct =
    progreso &&
    typeof progreso.hechos === 'number' &&
    typeof progreso.total === 'number' &&
    progreso.total > 0
      ? Math.min(100, Math.round((progreso.hechos / progreso.total) * 100))
      : null

  return (
    <main className="flex h-screen flex-col bg-app text-fg">
      <header className="flex shrink-0 items-center gap-3 border-b border-edge px-5 py-3.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent font-mono text-[13px] font-semibold text-accent-ink">
          D
        </span>
        <h1 className="text-[15px] font-semibold tracking-tight">Dopple</h1>
        <span className="text-[13px] text-fg-dim">Detector de archivos duplicados</span>
      </header>

      <section className="shrink-0 border-b border-edge px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" className={BOTON_SECUNDARIO} onClick={seleccionarCarpeta}>
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
            onClick={handleBuscarDuplicados}
            disabled={!ruta || escaneando}
          >
            {escaneando ? 'Escaneando…' : 'Buscar duplicados'}
          </button>

          <button
            type="button"
            className={BOTON_PELIGRO}
            onClick={handleBorrarBaseDeDatos}
            disabled={pagina.total === 0 || escaneando}
            title="Borrar todo el índice de duplicados"
          >
            <IconoPapelera />
            Vaciar índice
          </button>
        </div>

        {ruta == '/' && (
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
              onChange={e => setMinMb(e.target.value)}
              placeholder="0"
              aria-label="Tamaño mínimo en megabytes"
              className="h-8 w-20 rounded-md border border-edge bg-panel px-2 text-center font-mono text-[13.5px] text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
            />
            MB
            {minMb && (
              <button
                type="button"
                onClick={() => setMinMb('')}
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
              : `${nf.format(pagina.total)} duplicados · mostrando ${nf.format(offset + 1)}–${nf.format(Math.min(offset + POR_PAGINA, pagina.total))}`}
          </span>

          {pagina.total > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={BOTON_PAGINA}
                onClick={() => setOffset(o => Math.max(0, o - POR_PAGINA))}
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
                onClick={() => setOffset(o => o + POR_PAGINA)}
                disabled={offset + POR_PAGINA >= pagina.total}
                aria-label="Página siguiente"
              >
                <IconoFlecha direccion="derecha" />
              </button>
            </div>
          )}
        </footer>
      </section>
    </main>
  )
}

export default App
