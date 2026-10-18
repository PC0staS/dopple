use crate::hash::hash_completo;
use crate::hash::hash_parcial;
use crate::models::{FileMap, GrupoCompleto, GrupoParcial};
use crate::progreso::Progreso;
use rayon::prelude::*;
use std::collections::HashMap;
use std::path::PathBuf;

pub fn agrupar_por_parcial(grupos: FileMap, mut on_progreso: impl FnMut(Progreso)) -> GrupoParcial {
    // 1. APLANAR: Vec<(size, PathBuf)> solo de grupos con >1
    let candidatos: Vec<(u64, PathBuf)> = grupos
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .flat_map(|(size, paths)| paths.into_iter().map(move |p| (size, p)))
        .collect();

    // 2. CALCULAR EN PARALELO
    let calculados: Vec<((u64, [u8; 32]), PathBuf)> = candidatos
        .into_par_iter()
        .filter_map(|(size, path)| hash_parcial(&path, size).map(|h| ((size, h), path)))
        .collect();

    let total = calculados.len();

    // 3. REAGRUPAR
    let mut grupo_parciales: GrupoParcial = HashMap::new();
    for (hechos, (clave, path)) in calculados.into_iter().enumerate() {
        grupo_parciales.entry(clave).or_default().push(path);
        on_progreso(Progreso::AgrupandoParcial {
            hechos: hechos + 1,
            total,
        });
    }

    let fallos = total - grupo_parciales.values().map(|v| v.len()).sum::<usize>();
    if fallos > 0 {
        eprintln!("Se produjeron {fallos} fallos al calcular los hashes parciales.");
    }

    grupo_parciales
}

pub fn agrupar_por_completo(
    grupos: GrupoParcial,
    mut on_progreso: impl FnMut(Progreso),
) -> GrupoCompleto {
    // 1. APLANAR: solo grupos con >1; ahora cada elemento es solo la ruta
    let candidatos: Vec<PathBuf> = grupos
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .flat_map(|(_clave, paths)| paths)
        .collect();

    // 2. CALCULAR EN PARALELO (mismo patrón)
    let calculados: Vec<([u8; 32], PathBuf)> = candidatos
        .into_par_iter()
        .filter_map(|path| hash_completo(&path).map(|h| (h, path)))
        .collect();

    let total = calculados.len();

    // 3. REAGRUPAR
    let mut grupos: GrupoCompleto = HashMap::new();
    for (hechos, (hash, path)) in calculados.into_iter().enumerate() {
        grupos.entry(hash).or_default().push(path);
        on_progreso(Progreso::HashCompleto {
            hechos: hechos + 1,
            total,
        });
    }

    let fallos = total - grupos.values().map(|v| v.len()).sum::<usize>();
    if fallos > 0 {
        eprintln!("Fallo al leer {fallos} ficheros en el hash completo.");
    }

    grupos
}
