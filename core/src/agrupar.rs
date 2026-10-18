use crate::hash::hash_completo;
use crate::hash::hash_parcial;
use crate::models::{FileMap, GrupoCompleto, GrupoParcial};
use crate::progreso::Progreso;
use rayon::prelude::*;
use std::collections::HashMap;
use std::path::PathBuf;

// Candidatos por tanda antes de reportar progreso.
const LOTE: usize = 4096;

pub fn agrupar_por_parcial(grupos: FileMap, mut on_progreso: impl FnMut(Progreso)) -> GrupoParcial {
    // 1. APLANAR: Vec<(size, PathBuf)> solo de grupos con >1
    let mut candidatos: Vec<(u64, PathBuf)> = grupos
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .flat_map(|(size, paths)| paths.into_iter().map(move |p| (size, p)))
        .collect();

    let total = candidatos.len();

    // 2. CALCULAR EN PARALELO
    //    En tandas en vez de en una sola: un único `into_par_iter().collect()` recorre
    //    todo sin emitir nada, así que el progreso se queda parado y salta al final.
    let mut calculados: Vec<((u64, [u8; 32]), PathBuf)> = Vec::with_capacity(total);
    let mut hechos = 0;
    while !candidatos.is_empty() {
        let n = LOTE.min(candidatos.len());
        let tanda: Vec<(u64, PathBuf)> = candidatos.drain(..n).collect();

        calculados.par_extend(
            tanda
                .into_par_iter()
                .filter_map(|(size, path)| hash_parcial(&path, size).map(|h| ((size, h), path))),
        );

        hechos += n;
        on_progreso(Progreso::AgrupandoParcial { hechos, total });
    }

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

pub fn agrupar_por_completo(
    grupos: GrupoParcial,
    mut on_progreso: impl FnMut(Progreso),
) -> GrupoCompleto {
    // 1. APLANAR: solo grupos con >1; ahora cada elemento es solo la ruta
    let mut candidatos: Vec<PathBuf> = grupos
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .flat_map(|(_clave, paths)| paths)
        .collect();

    let total = candidatos.len();

    // 2. CALCULAR EN PARALELO (mismo patrón)
    let mut calculados: Vec<([u8; 32], PathBuf)> = Vec::with_capacity(total);
    let mut hechos = 0;
    while !candidatos.is_empty() {
        let n = LOTE.min(candidatos.len());
        let tanda: Vec<PathBuf> = candidatos.drain(..n).collect();

        calculados.par_extend(
            tanda
                .into_par_iter()
                .filter_map(|path| hash_completo(&path).map(|h| (h, path))),
        );

        hechos += n;
        on_progreso(Progreso::HashCompleto { hechos, total });
    }

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
