use crate::models::FileMap;
use crate::utils::es_ruta_virtual;
use std::collections::{HashMap, HashSet};
use std::os::unix::fs::MetadataExt; // ← añade este (te da dev() e ino())
use std::path::Path;

pub fn explore_files(path: &Path) -> FileMap {
    let mut file_map: FileMap = HashMap::new();
    let mut inodos_vistos: HashSet<(u64, u64)> = HashSet::new();

    for entry in walkdir::WalkDir::new(path)
        .into_iter()
        // Filtrar rutas virtuales
        .filter_entry(|entry| !es_ruta_virtual(entry.path()))
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // Ignorar errores al leer directorios
        };
        if entry.file_type().is_symlink() {
            continue; // Ignorar enlaces simbólicos
        }
        if entry.file_type().is_file() {
            let file_path = entry.path().to_path_buf();
            let file_size = match entry.metadata() {
                Ok(metadata) => {
                    let size = metadata.len();
                    if size == 0 {
                        continue; // Ignorar tamaño cero
                    }
                    // Dedup por fichero físico: mismo (dev, ino) = mismo fichero
                    if !inodos_vistos.insert((metadata.dev(), metadata.ino())) {
                        continue; // Ignorar si ya se ha visto este inodo
                    }
                    size
                }
                Err(_) => continue, // Ignorar errores al obtener metadatos
            };
            file_map
                .entry(file_size)
                // si no existe la clave, se crea un vector vacío y luego se agrega el path del archivo
                .or_default()
                .push(file_path);
        }
    }

    file_map
}
