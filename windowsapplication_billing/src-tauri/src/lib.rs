use tauri::Manager;
use tauri_plugin_store::StoreExt;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::new()
            .add_migrations("sqlite:tajpos.db", vec![])
            .build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let store = app.store("tajpos.bin")?;
            let license_key = store.get("license_key");
            if license_key.is_none() {
                // First run — frontend will detect and show /activate
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_business_config,
            commands::set_business_config,
            commands::validate_license,
            commands::check_for_updates,
            commands::print_receipt,
            commands::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
