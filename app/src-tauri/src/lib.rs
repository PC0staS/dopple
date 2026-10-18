// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;

fn init_app() {
    // Create db file if it doesn't exist
    let home_dir = dirs::home_dir().unwrap();
    let ruta_db = home_dir.join(".dopple").join("db.sqlite");
    if !ruta_db.exists() {
        std::fs::create_dir_all(ruta_db.parent().unwrap()).unwrap();
        std::fs::File::create(&ruta_db).unwrap();
    }
}
pub fn get_db_path() -> String {
    let home_dir = dirs::home_dir().unwrap();
    let ruta_db = home_dir.join(".dopple").join("db.sqlite");
    ruta_db.to_str().unwrap().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_app();

    // Workaround WebKitGTK (solo Linux): en Wayland con drivers NVIDIA (o híbridos
    // Intel+NVIDIA) el renderer DMA-BUF falla de forma intermitente y la app aborta con
    //   "Gdk-Message: Error 71 (Error de protocolo) dispatching to Wayland display."
    // Hay que desactivarlo ANTES de que se cree la webview, así que se fija aquí y no en
    // el shell: de este modo el fix también viaja en el binario de release.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // SAFETY: se ejecuta al principio de `run()`, antes de crear cualquier hilo que
        // lea el entorno; GTK y la webview se inicializan más abajo, dentro de `.run()`.
        unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1") };
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::listar_ficheros_pagina,
            commands::buscar_duplicados,
            commands::drop_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
