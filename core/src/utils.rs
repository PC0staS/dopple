use std::path::Path;

pub fn es_ruta_virtual(path: &Path) -> bool {
    const VIRTUALES: [&str; 4] = ["/proc", "/sys", "/dev", "/run"];
    VIRTUALES.iter().any(|v| path.starts_with(v))
}
