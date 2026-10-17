#[derive(Debug, Clone)]
pub enum Progreso {
    /// Fase 1
    Escaneando { ficheros: usize },
    /// Fase 2
    AgrupandoParcial { hechos: usize, total: usize },
    /// Fase 3
    HashCompleto { hechos: usize, total: usize },
}
