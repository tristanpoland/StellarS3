// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod s3;
mod types;
mod commands;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::connect_to_s3,
            commands::list_buckets,
            commands::list_objects,
            commands::upload_file,
            commands::upload_data,
            commands::download_file,
            commands::delete_object,
            commands::create_bucket,
            commands::delete_bucket,
            commands::get_object_metadata,
            commands::copy_object,
            commands::move_object,
            commands::get_presigned_url,
            commands::test_connection
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}