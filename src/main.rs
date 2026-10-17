use dopple_core::agrupar::agrupar_por_completo;
use dopple_core::agrupar::agrupar_por_parcial;
use dopple_core::explorar::explore_files;
use std::path::Path;
fn main() {
    let path = Path::new("/");
    let file_map = explore_files(path);
    let total_f = file_map.values().map(|v| v.len()).sum::<usize>();
    println!("Ficheros escaneados: {total_f}");
    let parciales = agrupar_por_parcial(file_map);
    let completos = agrupar_por_completo(parciales);

    let grupos_dup = completos.values().filter(|v| v.len() > 1).count();
    let ficheros_dup = completos
        .values()
        .filter(|v| v.len() > 1)
        .map(|v| v.len())
        .sum::<usize>();

    println!("Duplicados REALES (fase 3): {grupos_dup} grupos, {ficheros_dup} ficheros");

    let mut recuperable: u64 = 0;
    let mut grupos_grandes = 0;
    for rutas in completos.values().filter(|v| v.len() > 1) {
        if let Ok(m) = std::fs::metadata(&rutas[0]) {
            let extra = (rutas.len() as u64 - 1) * m.len();
            recuperable += extra;
            if extra > 1024 * 1024 {
                // grupos que liberan > 1 MB
                grupos_grandes += 1;
            }
        }
    }
    println!("Recuperable: {:.2} GB", recuperable as f64 / 1e9);
    println!("Grupos que liberan >1MB: {grupos_grandes}");

    let mut con_peso: Vec<_> = completos
        .values()
        .filter(|v| v.len() > 1)
        .filter_map(|rutas| {
            let size = std::fs::metadata(&rutas[0]).ok()?.len();
            Some(((rutas.len() as u64 - 1) * size, rutas.len(), size, rutas))
        })
        .collect();
    con_peso.sort_by_key(|(bytes, _, _, _)| std::cmp::Reverse(*bytes));

    for (bytes, n, size, rutas) in con_peso.iter().take(1) {
        println!("{:.1} MB | {n} x {size}", *bytes as f64 / 1e6);
        for r in *rutas {
            println!("    {}", r.display());
        }
    }
}
