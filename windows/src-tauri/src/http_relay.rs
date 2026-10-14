// HTTP Relay server for Hermes and external hooks on http://127.0.0.1:4040.
// Allows local and remote (via SSH reverse tunnel) Hermes instances to drive Mochi.

use std::net::SocketAddr;
use std::time::Duration;
use serde_json::Value;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use crate::island::WINDOW_LABEL;
use crate::log;

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let addr: SocketAddr = match "127.0.0.1:4040".parse() {
            Ok(a) => a,
            Err(_) => return,
        };
        let listener = match TcpListener::bind(addr).await {
            Ok(l) => {
                log::line(format!("HTTP relay listening on http://{}", addr));
                l
            }
            Err(err) => {
                log::line(format!("Cannot bind HTTP relay on {}: {}", addr, err));
                return;
            }
        };

        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        handle_client(app, stream).await;
                    });
                }
                Err(_) => {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        }
    });
}

async fn handle_client(app: AppHandle, mut stream: TcpStream) {
    let mut buf = Vec::new();
    let mut chunk = [0u8; 4096];

    let mut header_end = None;
    while header_end.is_none() && buf.len() < 65536 {
        match stream.read(&mut chunk).await {
            Ok(0) => break,
            Ok(n) => {
                buf.extend_from_slice(&chunk[..n]);
                if let Some(pos) = find_subsequence(&buf, b"\r\n\r\n") {
                    header_end = Some(pos);
                    break;
                }
            }
            Err(_) => return,
        }
    }

    let Some(header_pos) = header_end else {
        return;
    };

    let header_bytes = &buf[..header_pos];
    let header_str = String::from_utf8_lossy(header_bytes);
    let mut lines = header_str.lines();
    let Some(first_line) = lines.next() else { return };
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 { return; }
    let method = parts[0];

    if method == "OPTIONS" {
        let resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    if method == "GET" {
        let body = r#"{"status":"ok","coucou":"masdevv","relay":"hermes"}"#;
        let resp = format!(
            "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    if method == "POST" {
        let mut content_length = 0;
        for line in lines {
            if let Some((k, v)) = line.split_once(':') {
                if k.trim().eq_ignore_ascii_case("content-length") {
                    content_length = v.trim().parse::<usize>().unwrap_or(0);
                }
            }
        }

        let body_start = header_pos + 4;
        while buf.len() < body_start + content_length && buf.len() < 1048576 {
            match stream.read(&mut chunk).await {
                Ok(0) => break,
                Ok(n) => buf.extend_from_slice(&chunk[..n]),
                Err(_) => break,
            }
        }

        let body_bytes = if buf.len() >= body_start {
            let end = (body_start + content_length).min(buf.len());
            &buf[body_start..end]
        } else {
            &[]
        };

        if let Ok(mut payload) = serde_json::from_slice::<Value>(body_bytes) {
            if payload.is_object() {
                if payload.get("coucou_agent").is_none() {
                    if let Some(map) = payload.as_object_mut() {
                        map.insert("coucou_agent".to_string(), Value::String("hermes".to_string()));
                    }
                }
                log::line(format!("HTTP hook event: {:?}", payload.get("hook_event_name")));
                let _ = app.emit_to(WINDOW_LABEL, "hook", payload);
            }
        }

        let resp_body = r#"{"status":"ok"}"#;
        let resp = format!(
            "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
            resp_body.len(),
            resp_body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
    }
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}
