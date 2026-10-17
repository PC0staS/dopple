use crate::agrupar::{agrupar_por_completo, agrupar_por_parcial};
use crate::db::guardar_duplicados;
use crate::explorar::explore_files;
use crate::models::GrupoCompleto;
use std::path::Path;

/// Resultado de un escaneo completo.
pub struct Resumen {
    pub escaneados: usize,
    pub grupos_dup: usize,
    pub ficheros_dup: usize,
    pub guardados: usize,
}

/// Pipeline completo: recorrer → agrupar → guardar duplicados en la DB.
pub fn buscar_duplicados(raiz: &Path, ruta_db: &str) -> rusqlite::Result<Resumen> {
    let file_map = explore_files(raiz);
    let escaneados = file_map.values().map(|v| v.len()).sum();

    let parciales = agrupar_por_parcial(file_map);
    let completos: GrupoCompleto = agrupar_por_completo(parciales);

    let grupos_dup = completos.values().filter(|v| v.len() > 1).count();
    let ficheros_dup = completos
        .values()
        .filter(|v| v.len() > 1)
        .map(|v| v.len())
        .sum();

    let guardados = guardar_duplicados(&completos, ruta_db)?;

    Ok(Resumen {
        escaneados,
        grupos_dup,
        ficheros_dup,
        guardados,
    })
}
