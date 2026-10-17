use crate::hash::hash_completo;
use crate::hash::hash_parcial;
use crate::models::{FileMap, GrupoCompleto, GrupoParcial};
use rayon::prelude::*;
use std::collections::HashMap;
use std::path::PathBuf;

pub fn agrupar_por_parcial(grupos: FileMap) -> GrupoParcial {
    // 1. APLANAR: Vec<(size, PathBuf)> solo de grupos con >1
    let candidatos: Vec<(u64, PathBuf)> = grupos
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .flat_map(|(size, paths)| paths.into_iter().map(move |p| (size, p)))
        .collect();

    let total = candidatos.len();

    // 2. CALCULAR EN PARALELO
    let calculados: Vec<((u64, [u8; 32]), PathBuf)> = candidatos
        .into_par_iter()
        .filter_map(|(size, path)| hash_parcial(&path, size).map(|h| ((size, h), path)))
        .collect();

    // 3. REAGRUPAR
    let mut grupo_parciales: GrupoParcial = HashMap::new();
    for (clave, path) in calculados {
        grupo_parciales.entry(clave).or_default().push(path);
    }

    let fallos = total - grupo_parciales.values().map(|v| v.len()).sum::<usize>();
    if fallos > 0 {
        eprintln!("Se produjeron {fallos} fallos al calcular los hashes parciales.");
    }

    grupo_parciales
}

pub fn agrupar_por_completo(grupos: GrupoParcial) -> GrupoCompleto {
    // 1. APLANAR: solo grupos con >1; ahora cada elemento es solo la ruta
    let candidatos: Vec<PathBuf> = grupos
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .flat_map(|(_clave, paths)| paths)
        .collect();

    let total = candidatos.len();

    // 2. CALCULAR EN PARALELO (mismo patrón)
    let calculados: Vec<([u8; 32], PathBuf)> = candidatos
        .into_par_iter()
        .filter_map(|path| hash_completo(&path).map(|h| (h, path)))
        .collect();

    // 3. REAGRUPAR
    let mut grupos: GrupoCompleto = HashMap::new();
    for (hash, path) in calculados {
        grupos.entry(hash).or_default().push(path);
    }

    let fallos = total - grupos.values().map(|v| v.len()).sum::<usize>();
    if fallos > 0 {
        eprintln!("Fallo al leer {fallos} ficheros en el hash completo.");
    }

    grupos
}
