use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
const BLOQUE: u64 = 64 * 1024;

pub fn hash_parcial(path: &std::path::Path, size: u64) -> Option<[u8; 32]> {
    let mut file = File::open(path).ok()?;
    let mut hasher = blake3::Hasher::new();
    let mut buf = [0u8; BLOQUE as usize];

    if size <= BLOQUE {
        let n = file.read(&mut buf[..size as usize]).ok()?;
        hasher.update(&buf[..n]);
    } else {
        // Calcular los offsets para los tres bloques: primer bloque, bloque del medio y último bloque
        let offsets: [u64; 3] = [0, size / 2 - BLOQUE / 2, size - BLOQUE];
        for &offset in &offsets {
            file.seek(SeekFrom::Start(offset)).ok()?;
            let read = file.read(&mut buf).ok()?;
            hasher.update(&buf[..read]);
        }
    }
    return Some(hasher.finalize().into());
}

pub fn hash_completo(path: &std::path::Path) -> Option<[u8; 32]> {
    let mut file = File::open(path).ok()?;
    let mut hasher = blake3::Hasher::new();
    let mut buf = [0u8; BLOQUE as usize];

    loop {
        let n = file.read(&mut buf).ok()?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    return Some(hasher.finalize().into());
}
