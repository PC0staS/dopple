use crate::get_db_path;
use dopple_core::db;
use dopple_core::models::Fichero;
use dopple_core::progreso::Progreso;
use std::time::{Duration, Instant};
use tauri::Emitter;

#[derive(serde::Serialize)]
pub struct PaginaFicheros {
    ficheros: Vec<Fichero>,
    total: i64,
}

/// Página del índice de duplicados. La paginación y el filtro por tamaño mínimo se
/// resuelven en SQL, así que el frontend solo recibe `limite` filas por llamada y el
/// `total` que devuelve ya viene filtrado.
#[tauri::command]
pub fn listar_ficheros_pagina(offset: u64, limite: u64, tamano_min: u64) -> PaginaFicheros {
    let ruta_db = get_db_path();
    PaginaFicheros {
        ficheros: db::get_ficheros_pagina(&ruta_db, offset, limite, tamano_min).unwrap_or_default(),
        total: db::Escritor::contar_filas(&ruta_db, tamano_min),
    }
}

#[tauri::command]
pub async fn buscar_duplicados(app: tauri::AppHandle, raiz: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let ruta_db = get_db_path();
        let path = std::path::Path::new(&raiz);

        let intervalo = Duration::from_millis(100);
        let mut ultimo_aviso = Instant::now();
        let mut fase_anterior = String::new();

        // |progreso| {} es un callback que se invoca cada vez que hay un cambio de fase o un progreso significativo.
        dopple_core::busqueda::buscar_duplicados(path, &ruta_db, |progreso| {
            let fase = match &progreso {
                Progreso::Escaneando { .. } => "escaneando",
                Progreso::AgrupandoParcial { .. } => "agrupando_parcial",
                Progreso::HashCompleto { .. } => "hash_completo",
            };

            // Cortamos ANTES de construir el JSON: si no toca emitir, no gastamos nada.
            let cambia_de_fase = fase_anterior != fase;
            if !cambia_de_fase && ultimo_aviso.elapsed() < intervalo {
                return;
            }
            fase_anterior = fase.to_string();
            ultimo_aviso = Instant::now();

            let payload = match progreso {
                Progreso::Escaneando { ficheros } => {
                    serde_json::json!({ "fase": "escaneando", "ficheros": ficheros })
                }
                Progreso::AgrupandoParcial { hechos, total } => serde_json::json!({
                    "fase": "agrupando_parcial",
                    "hechos": hechos,
                    "total": total,
                }),
                Progreso::HashCompleto { hechos, total } => serde_json::json!({
                    "fase": "hash_completo",
                    "hechos": hechos,
                    "total": total,
                }),
            };

            let _ = app.emit("progreso", payload);
        })
        .map(|_| ()) // Ignoramos el resultado final, que es un `Result<(), String>`; el error ya se emitió por el callback.
        .map_err(|e| e.to_string()) // Convertimos el error a String para que pueda ser devuelto por la función async.
    })
    .await
    .map_err(|e| format!("La tarea de escaneo terminó de forma inesperada: {e}"))? // Convertimos el JoinError a String para que pueda ser devuelto por la función async.
}

#[tauri::command]
pub fn drop_database() -> Result<(), String> {
    let ruta_db = get_db_path();
    let mut esc = db::Escritor::nuevo(&ruta_db, 5000).map_err(|e| e.to_string())?;
    esc.drop_db().map_err(|e| e.to_string())
}
