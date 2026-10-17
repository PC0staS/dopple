pub type FileMap = std::collections::HashMap<u64, Vec<std::path::PathBuf>>;
pub type GrupoParcial = std::collections::HashMap<(u64, [u8; 32]), Vec<std::path::PathBuf>>;
pub type GrupoCompleto = std::collections::HashMap<[u8; 32], Vec<std::path::PathBuf>>;
/// (ruta como bytes, tamaño). Ruta en bytes: soporta nombres no-UTF-8.
pub type Fichero = (Vec<u8>, u64);
