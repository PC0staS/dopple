# Dopple

Detector de archivos duplicados para Linux. Recorre una carpeta, agrupa los ficheros por
tamaño, confirma los candidatos con hashes BLAKE3 y guarda el resultado en SQLite para
consultarlo después.

## Cómo funciona

Comparar cada fichero contra todos sería inviable, así que el pipeline descarta candidatos
en tres pasadas, de la más barata a la más cara:

1. **Recorrido** — agrupa por **tamaño**. Un fichero con un tamaño único no puede ser
   duplicado de nada, así que se descarta sin abrirlo.
2. **Hash parcial** — de los que comparten tamaño, hashea 3 bloques de 64 KB (principio,
   medio y final). Descarto casi todos sin leer el fichero entero.
3. **Hash completo** — solo a los que siguen empatando. Estos ya sí son duplicados reales.

Solo se guardan en la base de datos los grupos con más de una copia.

## Estructura

```
core/   dopple-core — la lógica, en Rust puro. No sabe nada de Tauri ni de interfaz.
app/    la aplicación de escritorio: src-tauri (Rust + Tauri) y src (React + Vite).
```

`core` no depende de Tauri a propósito: recibe un *callback* de progreso y quien lo llama
decide qué hacer con él (la app lo convierte en eventos hacia la interfaz).

## Requisitos

- Rust (edition 2024) y Cargo
- [Bun](https://bun.sh/) para el frontend
- Linux con WebKitGTK 4.1 y GTK 3

En Arch / CachyOS:

```sh
sudo pacman -S --needed base-devel webkit2gtk-4.1
```

En Debian / Ubuntu:

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl file libxdo-dev \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Uso

```sh
make dev        # desarrollo, con recarga en caliente
make build      # binario de release + AppImage, .deb y .rpm
make install    # lo instala en ~/.local (sin sudo)
make check      # comprueba que compila, sin generar binarios
```

`make` sin argumentos lista todos los objetivos.

## Instalación manual

`make install` copia el binario a `~/.local/bin` y crea el lanzador y los iconos en
`~/.local/share`. Después aparecerá como *Dopple* en el menú de aplicaciones. Para
deshacerlo, `make uninstall`.

Si prefieres no instalar nada, el **AppImage** de `app/src-tauri/target/release/bundle/`
es portable: `chmod +x` y listo.

## Notas

- **Solo Linux.** El core usa `std::os::unix` para leer las rutas como bytes (y así
  soportar nombres no-UTF-8) y para deduplicar por inodo. Windows no compila.
- **Wayland + NVIDIA.** La app desactiva el renderer DMA-BUF de WebKitGTK al arrancar
  porque, si no, WebKit aborta de forma intermitente con
  `Gdk-Message: Error 71 (Error de protocolo) dispatching to Wayland display`. Está en
  `app/src-tauri/src/lib.rs` y se puede sobreescribir desde el entorno.
- El binario compilado en esta máquina exige **glibc 2.39** (Arch trae 2.44). Para
  soportar distros con glibc más antigua hay que compilar en un contenedor con la versión
  objetivo como base.
