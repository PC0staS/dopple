import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { Fichero } from './models'

export type PaginaFicheros = {
  ficheros: Fichero[]
  total: number
}

/**
 * `tamanoMin` va en bytes; 0 significa sin filtro.
 * Tauri renombra los argumentos: camelCase en JS → snake_case en Rust (`tamano_min`).
 */
export async function cargarPagina(
  offset: number,
  limite: number,
  tamanoMin: number,
): Promise<PaginaFicheros> {
  return await invoke<PaginaFicheros>('listar_ficheros_pagina', { offset, limite, tamanoMin })
}

export async function buscarDuplicados(raiz: string): Promise<void> {
  await invoke('buscar_duplicados', { raiz })
}

export async function borrarBaseDeDatos(): Promise<void> {
  await invoke('drop_database')
}

/** Abre el selector nativo de carpetas del sistema. Devuelve `null` si se cancela. */
export async function elegirCarpeta(): Promise<string | null> {
  const seleccion = await open({
    directory: true,
    multiple: false,
    title: 'Selecciona la carpeta que quieres escanear',
  })
  return typeof seleccion === 'string' ? seleccion : null
}