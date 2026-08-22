//! Platform keychain storage for BYOK API keys.
//!
//! - macOS: Keychain (`apple-native` feature, no substitutes)
//! - Windows: Credential Manager (`windows-native` feature)
//!
//! The frontend talks to `secrets_get`, `secrets_set`, `secrets_delete`,
//! and `secrets_get_all` — no platform branching in JS.

fn entry(service: &str, account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(service, account).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn secrets_get(service: String, account: String) -> Result<Option<String>, String> {
    let e = entry(&service, &account)?;
    match e.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn secrets_set(
    service: String,
    account: String,
    password: String,
) -> Result<(), String> {
    let e = entry(&service, &account)?;
    e.set_password(&password).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn secrets_delete(service: String, account: String) -> Result<(), String> {
    let e = entry(&service, &account)?;
    match e.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

/// Batch read — single IPC roundtrip for the cold-boot fan-out.
#[tauri::command]
pub async fn secrets_get_all(
    service: String,
    accounts: Vec<String>,
) -> Result<Vec<Option<String>>, String> {
    Ok(accounts
        .into_iter()
        .map(|a| {
            keyring::Entry::new(&service, &a)
                .ok()
                .and_then(|e| e.get_password().ok())
        })
        .collect())
}
