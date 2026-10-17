use crate::models::Fichero;
use crate::models::GrupoCompleto;
use rusqlite::Connection;
use std::os::unix::ffi::OsStrExt;
use std::sync::mpsc::Receiver;

pub struct Escritor {
    conn: Connection,
    lote: usize,
}

impl Escritor {
    pub fn nuevo(ruta_db: &str, lote: usize) -> rusqlite::Result<Self> {
        let conn = Connection::open(ruta_db)?;
        Ok(Self { conn, lote })
    }
    pub fn esquema(&self) -> rusqlite::Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS archivos (
                ruta BLOB PRIMARY KEY,
                tamaño INTEGER NOT NULL
            );
            ",
        )
    }

    /// Inserta un lote ya preparado. Uso secuencial (sin canal).
    pub fn guardar(&mut self, mut items: Vec<Fichero>) -> rusqlite::Result<usize> {
        self.volcar(&mut items)
    }

    pub fn escribir(&mut self, rx: Receiver<Fichero>) -> rusqlite::Result<usize> {
        let mut buffer: Vec<Fichero> = Vec::with_capacity(self.lote);
        let mut filas = 0;

        while let Ok(msg) = rx.recv() {
            buffer.push(msg);
            if buffer.len() >= self.lote {
                filas += self.volcar(&mut buffer)?;
            }
        }
        if !buffer.is_empty() {
            filas += self.volcar(&mut buffer)?;
        }
        Ok(filas)
    }
    /// Volcar los archivos del buffer a la base de datos.
    fn volcar(&mut self, buffer: &mut Vec<Fichero>) -> rusqlite::Result<usize> {
        let tx_db = self.conn.transaction()?; // presta &mut conn
        {
            let mut stmt = tx_db
                .prepare_cached("INSERT OR REPLACE INTO archivos (ruta, tamaño) VALUES (?1, ?2)")?;
            for (ruta, tam) in buffer.iter() {
                stmt.execute(rusqlite::params![ruta, *tam as i64])?;
            }
        }
        tx_db.commit()?;
        let n = buffer.len();
        buffer.clear();
        Ok(n)
    }

    pub fn contar_filas(ruta_db: &str) -> i64 {
        let c = Connection::open(ruta_db).unwrap();
        c.query_row("SELECT COUNT(*) FROM archivos", [], |r| r.get(0))
            .unwrap()
    }

    pub fn drop_db(&mut self) -> rusqlite::Result<()> {
        self.conn.execute_batch("DROP TABLE IF EXISTS archivos;")
    }
}

/// Guarda en la DB solo los ficheros que están duplicados.
pub fn guardar_duplicados(completos: &GrupoCompleto, ruta_db: &str) -> rusqlite::Result<usize> {
    let mut esc = Escritor::nuevo(ruta_db, 5000)?;
    esc.esquema()?;

    let mut lote: Vec<Fichero> = Vec::new();
    for rutas in completos.values().filter(|v| v.len() > 1) {
        let Ok(m) = std::fs::metadata(&rutas[0]) else {
            continue;
        };
        for r in rutas {
            lote.push((r.as_os_str().as_bytes().to_vec(), m.len()));
        }
    }
    esc.guardar(lote)
}
