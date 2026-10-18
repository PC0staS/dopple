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
  'inline-flex items-center justify-center gap-2.5 border px-5 py-3 font-mono text-[11px] font-medium tracking-[0.16em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acid-400 disabled:cursor-not-allowed disabled:opacity-35'
const BOTON_SECUNDARIO = `${BOTON} border-ink-600 text-ink-200 hover:border-acid-400 hover:text-acid-300`
const BOTON_PRIMARIO = `${BOTON} border-acid-400 bg-acid-400 font-semibold text-ink-950 hover:border-acid-300 hover:bg-acid-300`
const BOTON_PELIGRO = `${BOTON} border-red-500/40 text-red-300/90 hover:border-red-400 hover:bg-red-500/10 hover:text-red-200`
const BOTON_PAGINA =
  'inline-flex size-9 items-center justify-center border border-ink-600 text-ink-200 transition-colors hover:border-acid-400 hover:text-acid-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acid-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink-600 disabled:hover:text-ink-200'
const PANEL = 'border border-ink-700 bg-ink-900/90 backdrop-blur-sm'

function IconoCarpeta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
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
      className="size-4 shrink-0"
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
      className={`size-4 ${direccion === 'izquierda' ? 'rotate-180' : ''}`}
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
    <main className="relative min-h-screen overflow-x-hidden bg-ink-950">
      <div className="dopple-grid" aria-hidden="true" />
      <div className="dopple-glow" aria-hidden="true" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10">
        <header className="dopple-reveal flex flex-wrap items-end justify-between gap-6 border-b border-ink-700 pb-7">
          <div>
            <h1 className="font-display text-4xl leading-none font-black tracking-tight text-white sm:text-5xl">
              DOPPLE<span className="text-acid-400">.</span>
            </h1>
            <p className="mt-3 font-mono text-[10px] tracking-[0.34em] text-ink-400 uppercase">
              Detector de archivos duplicados
            </p>
          </div>
          <div className="font-mono text-[11px] tracking-[0.2em] text-ink-400 uppercase">
            <span className="text-acid-400">{nf.format(pagina.total)}</span> duplicados en índice
          </div>
        </header>

        <section className={`dopple-reveal ${PANEL} p-6 sm:p-7`} style={{ animationDelay: '90ms' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <button type="button" className={BOTON_SECUNDARIO} onClick={seleccionarCarpeta}>
              <IconoCarpeta />
              Elegir carpeta
            </button>

            <div>
              <div className="flex min-w-0 flex-1 items-center border border-ink-700 bg-ink-950/70 px-4 py-3 font-mono text-[13px]">
                {ruta ? (
                  <span className="truncate text-ink-200" title={ruta}>
                    {ruta}
                  </span>
                ) : (
                  <span className="text-ink-500 italic">sin carpeta seleccionada</span>
                )}
              </div>
              {ruta == '/' && (
                <span className="ml-2 rounded bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                  ¡Cuidado! Escanear la raíz del disco puede tardar mucho y generar muchos
                  duplicados.
                </span>
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
              Vaciar
            </button>
          </div>

          {progreso && (
            <div className="mt-6 border-t border-ink-700 pt-5">
              <div className="flex items-baseline justify-between gap-4 font-mono text-[11px] tracking-[0.2em] uppercase">
                <span className="text-acid-400">
                  {ETIQUETA_FASE[progreso.fase] ?? progreso.fase}
                </span>
                {contador && <span className="text-ink-200">{contador}</span>}
              </div>
              <div className="relative mt-4 h-0.75 w-full overflow-hidden bg-ink-800">
                <div
                  className={
                    pct === null
                      ? 'dopple-sweep relative h-full w-1/4 bg-acid-400'
                      : 'h-full bg-acid-400 transition-[width] duration-300 ease-out'
                  }
                  style={pct === null ? undefined : { width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-5 border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-[12px] text-red-300">
              {error}
            </p>
          )}
        </section>

        <section className="dopple-reveal flex flex-col gap-4" style={{ animationDelay: '180ms' }}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ink-700 pb-3">
            <h2 className="font-display text-sm font-bold tracking-[0.24em] text-ink-200 uppercase">
              Resultados
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
                Ocultar &lt;
                <input
                  type="text"
                  inputMode="decimal"
                  value={minMb}
                  onChange={e => setMinMb(e.target.value)}
                  placeholder="0"
                  aria-label="Tamaño mínimo en megabytes"
                  className="w-14 border border-ink-600 bg-ink-950/70 px-2 py-1 text-center font-mono text-[12px] tracking-normal text-ink-200 normal-case placeholder:text-ink-600 focus:border-acid-400 focus:outline-none"
                />
                MB
                {minMb && (
                  <button
                    type="button"
                    onClick={() => setMinMb('')}
                    className="text-ink-500 transition-colors hover:text-red-300"
                    aria-label="Quitar el filtro de tamaño"
                  >
                    ✕
                  </button>
                )}
              </label>

              <span className="font-mono text-[11px] text-ink-400">
                {nf.format(pagina.total)} duplicados
              </span>
            </div>
          </div>

          {pagina.total === 0 ? (
            <div className={`${PANEL} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
              <span className="font-mono text-3xl text-ink-600">∅</span>
              <p className="font-display text-sm text-ink-400">
                {minBytes > 0
                  ? `Ningún duplicado alcanza ${minMb} MB. Baja el filtro para ver más.`
                  : 'Sin duplicados en el índice. Elige una carpeta y lanza un escaneo.'}
              </p>
            </div>
          ) : (
            <>
              <Table ficheros={pagina.ficheros} />

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <span className="font-mono text-[11px] text-ink-400">
                  mostrando {nf.format(offset + 1)}–
                  {nf.format(Math.min(offset + POR_PAGINA, pagina.total))} de{' '}
                  {nf.format(pagina.total)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={BOTON_PAGINA}
                    onClick={() => setOffset(o => Math.max(0, o - POR_PAGINA))}
                    disabled={offset === 0}
                    aria-label="Página anterior"
                  >
                    <IconoFlecha direccion="izquierda" />
                  </button>

                  <span className="min-w-20 text-center font-mono text-[11px] tracking-[0.16em] text-ink-200 uppercase">
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
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
