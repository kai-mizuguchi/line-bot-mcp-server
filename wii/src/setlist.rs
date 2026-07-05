// Port of parseSetlistData() from src/index.ts. Rendering comes in Phase 2;
// Phase 1 sends the text fallback built by fallback_text().

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SetlistData {
    pub theme: String,
    pub title: String,
    pub date: String,
    pub songs: Vec<String>,
}

pub fn parse_setlist_data(text: &str) -> Option<SetlistData> {
    let start = text.find("SETLIST_IMAGE")?;
    let end = start + text[start..].find("END_SETLIST")?;
    let block = &text[start..end + "END_SETLIST".len()];

    let mut theme = "dark".to_string();
    let mut title = "セットリスト".to_string();
    let mut date = String::new();
    let mut songs: Vec<String> = Vec::new();

    for line in block.split('\n').map(str::trim) {
        if line.is_empty() || line == "SETLIST_IMAGE" || line == "END_SETLIST" {
            continue;
        }
        if let Some(v) = line.strip_prefix("theme:") {
            let v = v.trim();
            if !v.is_empty() {
                theme = v.to_string();
            }
        } else if let Some(v) = line.strip_prefix("title:") {
            let v = v.trim();
            if !v.is_empty() {
                title = v.to_string();
            }
        } else if let Some(v) = line.strip_prefix("date:") {
            date = v.trim().to_string();
        } else if let Some(song) = strip_number_prefix(line) {
            songs.push(song.to_string());
        }
    }

    if songs.is_empty() {
        None
    } else {
        Some(SetlistData { theme, title, date, songs })
    }
}

// `N. song` -> song (requires whitespace after the dot, like /^\d+\.\s/)
fn strip_number_prefix(line: &str) -> Option<&str> {
    let digits = line.bytes().take_while(u8::is_ascii_digit).count();
    if digits == 0 {
        return None;
    }
    let rest = line[digits..].strip_prefix('.')?;
    let stripped = rest.trim_start();
    if stripped.len() == rest.len() {
        return None;
    }
    Some(stripped)
}

// Same text as the index.ts image-error fallback reply.
pub fn fallback_text(d: &SetlistData) -> String {
    let songs = d
        .songs
        .iter()
        .enumerate()
        .map(|(i, s)| format!("{}. {}", i + 1, s))
        .collect::<Vec<_>>()
        .join("\n");
    let date_part = if d.date.is_empty() {
        String::new()
    } else {
        format!("\n{}", d.date)
    };
    format!("🎸 {}{}\n\n{}", d.title, date_part, songs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_block() {
        let text = "了解！\nSETLIST_IMAGE\ntheme: neon\ntitle: 夏フェス\ndate: 2026-08-01\n1. 曲A\n2. 曲B\nEND_SETLIST\n以上！";
        let d = parse_setlist_data(text).unwrap();
        assert_eq!(d.theme, "neon");
        assert_eq!(d.title, "夏フェス");
        assert_eq!(d.date, "2026-08-01");
        assert_eq!(d.songs, vec!["曲A", "曲B"]);
    }

    #[test]
    fn missing_markers() {
        assert!(parse_setlist_data("ただのテキスト").is_none());
        assert!(parse_setlist_data("SETLIST_IMAGE\n1. 曲A").is_none()); // no END_SETLIST
        assert!(parse_setlist_data("1. 曲A\nEND_SETLIST").is_none()); // no SETLIST_IMAGE
    }

    #[test]
    fn no_songs_is_none() {
        assert!(parse_setlist_data("SETLIST_IMAGE\ntitle: x\nEND_SETLIST").is_none());
    }

    #[test]
    fn defaults_and_empty_values() {
        let d = parse_setlist_data("SETLIST_IMAGE\ntheme:\ntitle:\n1. Song\nEND_SETLIST").unwrap();
        assert_eq!(d.theme, "dark");
        assert_eq!(d.title, "セットリスト");
        assert_eq!(d.date, "");
    }

    #[test]
    fn number_prefix_requires_whitespace() {
        assert!(parse_setlist_data("SETLIST_IMAGE\n1.NoSpace\nEND_SETLIST").is_none());
        let d = parse_setlist_data("SETLIST_IMAGE\n12.  Wide Gap\nEND_SETLIST").unwrap();
        assert_eq!(d.songs, vec!["Wide Gap"]);
    }

    #[test]
    fn fallback_text_format() {
        let d = SetlistData {
            theme: "dark".into(),
            title: "ライブ".into(),
            date: "2026/07/05".into(),
            songs: vec!["A".into(), "B".into()],
        };
        assert_eq!(fallback_text(&d), "🎸 ライブ\n2026/07/05\n\n1. A\n2. B");

        let no_date = SetlistData { date: String::new(), ..d };
        assert_eq!(fallback_text(&no_date), "🎸 ライブ\n\n1. A\n2. B");
    }
}
