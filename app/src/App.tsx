import './App.css'
import { useState, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { confirm } from '@tauri-apps/plugin-dialog'
import BarraHerramientas, { Progreso } from './components/BarraHerramientas'
import Resultados from './components/Resultados'
import {
  PaginaFicheros,
  borrarBaseDeDatos,
  buscarDuplicados,
  cargarPagina,
  elegirCarpeta,
} from './commands'

/** Filas por página de la tabla de resultados. */
const POR_PAGINA = 25

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

  return (
    <main className="flex h-screen flex-col bg-app text-fg">
      <header className="flex shrink-0 items-center gap-3 border-b border-edge px-5 py-3.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent font-mono text-[13px] font-semibold text-accent-ink">
          D
        </span>
        <h1 className="text-[15px] font-semibold tracking-tight">Dopple</h1>
        <span className="text-[13px] text-fg-dim">Detector de archivos duplicados</span>
      </header>

      <BarraHerramientas
        ruta={ruta}
        escaneando={escaneando}
        progreso={progreso}
        error={error}
        puedeBorrarIndice={pagina.total > 0}
        onElegirCarpeta={seleccionarCarpeta}
        onBuscarDuplicados={handleBuscarDuplicados}
        onBorrarBaseDeDatos={handleBorrarBaseDeDatos}
      />

      <Resultados
        pagina={pagina}
        offset={offset}
        porPagina={POR_PAGINA}
        minMb={minMb}
        minBytes={minBytes}
        onCambiarMinMb={setMinMb}
        onCambiarOffset={setOffset}
      />
    </main>
  )
}

export default App
