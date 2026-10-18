const BOTON =
  'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border px-3.5 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'

export const BOTON_SECUNDARIO = `${BOTON} border-edge bg-panel-2 text-fg hover:border-edge-strong hover:bg-panel-3 disabled:hover:border-edge disabled:hover:bg-panel-2`
export const BOTON_PRIMARIO = `${BOTON} border-transparent bg-accent text-accent-ink hover:bg-accent-hover disabled:hover:bg-accent`
export const BOTON_PELIGRO = `${BOTON} border-transparent bg-transparent text-danger hover:bg-danger/10 disabled:hover:bg-transparent`

export const BOTON_PAGINA =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-edge text-fg-muted transition-colors hover:border-edge-strong hover:bg-panel-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-edge disabled:hover:bg-transparent disabled:hover:text-fg-muted'
