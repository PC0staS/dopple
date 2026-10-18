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

    /// Cuenta las filas de `archivos` que alcanzan `tamano_min` bytes.
    /// Devuelve 0 si la tabla todavía no existe (por ejemplo, justo después de `drop_db`).
    pub fn contar_filas(ruta_db: &str, tamano_min: u64) -> i64 {
        let Ok(c) = Connection::open(ruta_db) else {
            return 0;
        };
        c.query_row(
            "SELECT COUNT(*) FROM archivos WHERE tamaño >= ?1",
            [tamano_min as i64],
            |r| r.get(0),
        )
        .unwrap_or(0)
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

/// Página del índice de duplicados.
///
/// Ordena por tamaño descendente para que los duplicados que más espacio ocupan
/// salgan primero. `tamano_min` (en bytes) descarta lo que no llega al umbral, y
/// `LIMIT`/`OFFSET` se resuelven en SQL: el frontend nunca recibe miles de filas de golpe.
pub fn get_ficheros_pagina(
    ruta_db: &str,
    offset: u64,
    limite: u64,
    tamano_min: u64,
) -> rusqlite::Result<Vec<Fichero>> {
    let c = Connection::open(ruta_db)?;
    let mut stmt = c.prepare(
        "SELECT ruta, tamaño FROM archivos
         WHERE tamaño >= ?1
         ORDER BY tamaño DESC, ruta ASC
         LIMIT ?2 OFFSET ?3",
    )?;
    let ficheros_iter = stmt.query_map(
        rusqlite::params![tamano_min as i64, limite as i64, offset as i64],
        |row| Ok((row.get::<_, Vec<u8>>(0)?, row.get::<_, i64>(1)? as u64)),
    )?;

    let mut ficheros = Vec::new();
    for f in ficheros_iter {
        ficheros.push(f?);
    }
    Ok(ficheros)
}
