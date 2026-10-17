// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
fn init_app() {
    // Create db file if it doesn't exist
    let home_dir = dirs::home_dir().unwrap();
    let ruta_db = home_dir.join(".dopple").join("db.sqlite");
    if !ruta_db.exists() {
        std::fs::create_dir_all(ruta_db.parent().unwrap()).unwrap();
        std::fs::File::create(ruta_db).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_app();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
