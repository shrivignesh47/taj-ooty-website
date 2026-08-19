use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct BusinessConfig {
    pub restaurant_name: String,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub license_key: String,
    pub license_type: String,
    pub license_expires: String,
    pub logo_path: Option<String>,
    pub primary_color: Option<String>,
}

#[tauri::command]
pub async fn get_business_config(app: AppHandle) -> Result<Option<BusinessConfig>, String> {
    let store = app.store("tajpos.bin").map_err(|e| e.to_string())?;
    match store.get("business_config") {
        Some(val) => {
            let config: BusinessConfig = serde_json::from_value(val)
                .map_err(|e| e.to_string())?;
            Ok(Some(config))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn set_business_config(app: AppHandle, config: BusinessConfig) -> Result<(), String> {
    let store = app.store("tajpos.bin").map_err(|e| e.to_string())?;
    store.set("business_config", serde_json::to_value(config).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn validate_license(app: AppHandle, license_key: String) -> Result<bool, String> {
    // Phase 3: replace with real super admin API call
    let store = app.store("tajpos.bin").map_err(|e| e.to_string())?;
    store.set("license_key", serde_json::Value::String(license_key));
    store.save().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn check_for_updates(_app: AppHandle) -> Result<String, String> {
    Ok("Checking for updates...".to_string())
}

#[tauri::command]
pub async fn print_receipt(receipt_text: String) -> Result<(), String> {
    // Phase 2: implement ESC/POS via serial port
    println!("PRINT: {}", receipt_text);
    Ok(())
}

#[tauri::command]
pub async fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}
