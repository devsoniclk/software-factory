use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

pub struct SidecarState {
    backend: Mutex<Option<Child>>,
    ollama: Mutex<Option<Child>>,
}

fn find_executable(candidates: &[&str]) -> Option<String> {
    for candidate in candidates {
        if Command::new(candidate).arg("--version").output().is_ok() {
            return Some(candidate.to_string());
        }
    }
    None
}

fn start_python_backend() -> Option<Child> {
    let python = find_executable(&["python3", "python"])?;
    let cwd = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    Command::new(&python)
        .args([
            "-m", "uvicorn",
            "backend.api.app:app",
            "--host", "127.0.0.1",
            "--port", "8099",
            "--log-level", "warning",
        ])
        .current_dir(cwd)
        .spawn()
        .ok()
}

fn start_ollama() -> Option<Child> {
    let ollama = find_executable(&[
        "/opt/homebrew/bin/ollama",
        "/usr/local/bin/ollama",
        "ollama",
    ])?;
    if std::net::TcpStream::connect("127.0.0.1:11434").is_ok() {
        return None; // already running
    }
    Command::new(&ollama).arg("serve").spawn().ok()
}

#[tauri::command]
fn get_backend_status() -> serde_json::Value {
    let running = std::net::TcpStream::connect("127.0.0.1:8099").is_ok();
    serde_json::json!({ "backend_running": running, "port": 8099 })
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "python": find_executable(&["python3", "python"]),
        "ollama": find_executable(&["/opt/homebrew/bin/ollama", "/usr/local/bin/ollama", "ollama"]),
    })
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> serde_json::Value {
    use tauri_plugin_updater::UpdaterExt;
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => serde_json::json!({
                "available": true,
                "version": update.version,
                "notes": update.body.unwrap_or_default(),
                "date": update.date.map(|d| d.to_string()).unwrap_or_default(),
            }),
            Ok(None) => serde_json::json!({ "available": false }),
            Err(e) => serde_json::json!({ "error": e.to_string() }),
        },
        Err(e) => serde_json::json!({ "error": e.to_string() }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SidecarState {
            backend: Mutex::new(None),
            ollama: Mutex::new(None),
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let state = app.state::<SidecarState>();
            if let Some(child) = start_python_backend() {
                *state.backend.lock().unwrap() = Some(child);
            }
            if let Some(child) = start_ollama() {
                *state.ollama.lock().unwrap() = Some(child);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<SidecarState>();
                {
                    let mut backend = state.backend.lock().unwrap();
                    if let Some(mut child) = backend.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
                {
                    let mut ollama = state.ollama.lock().unwrap();
                    if let Some(mut child) = ollama.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_backend_status,
            get_system_info,
            check_for_updates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
