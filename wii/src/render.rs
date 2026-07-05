// Setlist PNG rendering, a pure-Rust port of generateSetlistImage() in
// src/index.ts. Coordinates, font sizes and theme colors match the original
// @napi-rs/canvas output; drawing is done by a small manual rasterizer
// (png + ab_glyph) so it cross-compiles to ppc32 without native skia.

use std::sync::OnceLock;

use ab_glyph::{point, Font, FontRef, PxScale, ScaleFont};

use crate::setlist::SetlistData;

pub type Error = Box<dyn std::error::Error + Send + Sync>;

const W: usize = 1280;
const H: usize = 720;
const FONT_BYTES: &[u8] = include_bytes!("../../assets/ipag.ttf");

type Rgb = [u8; 3];

struct Theme {
    bg0: Rgb,
    bg1: Rgb,
    title: Rgb,
    date: Rgb,
    num: Rgb,
    song: Rgb,
    accent: Rgb,
    divider: Rgb,
}

fn theme(name: &str) -> Theme {
    match name {
        "light" => Theme {
            bg0: hex("f4f4f4"), bg1: hex("ffffff"), title: hex("333333"),
            date: hex("888888"), num: hex("e05555"), song: hex("333333"),
            accent: hex("e05555"), divider: hex("dddddd"),
        },
        "neon" => Theme {
            bg0: hex("000000"), bg1: hex("0d0d0d"), title: hex("ff2df7"),
            date: hex("888888"), num: hex("ff2df7"), song: hex("00f0c0"),
            accent: hex("ff2df7"), divider: hex("222222"),
        },
        "vintage" => Theme {
            bg0: hex("f5e6c8"), bg1: hex("edd9a3"), title: hex("7a3b1e"),
            date: hex("9a7040"), num: hex("7a3b1e"), song: hex("3e2612"),
            accent: hex("7a3b1e"), divider: hex("c4a06a"),
        },
        // "dark" and any unknown theme fall back to dark, as in index.ts.
        _ => Theme {
            bg0: hex("1a1a2e"), bg1: hex("16213e"), title: hex("ff6b6b"),
            date: hex("888888"), num: hex("ff6b6b"), song: hex("eeeeee"),
            accent: hex("ff6b6b"), divider: hex("2a2a5a"),
        },
    }
}

const fn hex(s: &str) -> Rgb {
    let b = s.as_bytes();
    [
        (nib(b[0]) << 4) | nib(b[1]),
        (nib(b[2]) << 4) | nib(b[3]),
        (nib(b[4]) << 4) | nib(b[5]),
    ]
}

const fn nib(c: u8) -> u8 {
    match c {
        b'0'..=b'9' => c - b'0',
        b'a'..=b'f' => c - b'a' + 10,
        b'A'..=b'F' => c - b'A' + 10,
        _ => 0,
    }
}

fn font() -> &'static FontRef<'static> {
    static F: OnceLock<FontRef<'static>> = OnceLock::new();
    F.get_or_init(|| FontRef::try_from_slice(FONT_BYTES).expect("ipag.ttf parse"))
}

struct Canvas {
    buf: Vec<u8>, // RGB, opaque throughout
}

impl Canvas {
    fn new() -> Self {
        Self { buf: vec![0u8; W * H * 3] }
    }

    fn put(&mut self, x: usize, y: usize, c: Rgb) {
        let i = (y * W + x) * 3;
        self.buf[i] = c[0];
        self.buf[i + 1] = c[1];
        self.buf[i + 2] = c[2];
    }

    // Alpha-blend `c` over the existing pixel with coverage `a` in [0,1].
    fn blend(&mut self, x: i32, y: i32, c: Rgb, a: f32) {
        if x < 0 || y < 0 || x >= W as i32 || y >= H as i32 {
            return;
        }
        let i = (y as usize * W + x as usize) * 3;
        let inv = 1.0 - a;
        for k in 0..3 {
            let dst = self.buf[i + k] as f32;
            self.buf[i + k] = (c[k] as f32 * a + dst * inv).round().clamp(0.0, 255.0) as u8;
        }
    }

    fn fill_rect(&mut self, x: i32, y: i32, w: i32, h: i32, c: Rgb) {
        let x0 = x.max(0);
        let y0 = y.max(0);
        let x1 = (x + w).min(W as i32);
        let y1 = (y + h).min(H as i32);
        for yy in y0..y1 {
            for xx in x0..x1 {
                self.put(xx as usize, yy as usize, c);
            }
        }
    }

    // Diagonal linear gradient (0,0)->(W,H), matching ctx.createLinearGradient.
    fn fill_gradient(&mut self, a: Rgb, b: Rgb) {
        let bx = W as f32;
        let by = H as f32;
        let denom = bx * bx + by * by;
        for y in 0..H {
            let yb = y as f32 * by;
            for x in 0..W {
                let t = ((x as f32 * bx + yb) / denom).clamp(0.0, 1.0);
                let c = [
                    lerp(a[0], b[0], t),
                    lerp(a[1], b[1], t),
                    lerp(a[2], b[2], t),
                ];
                self.put(x, y, c);
            }
        }
    }

    // Draw `text` with the baseline at (x0, baseline). `bold` synthesizes weight
    // by overprinting one pixel to the right (ipag.ttf ships a single weight).
    fn draw_text(&mut self, px: f32, x0: f32, baseline: f32, c: Rgb, text: &str, bold: bool) {
        let f = font();
        let scaled = f.as_scaled(PxScale::from(px));
        let mut caret = x0;
        for ch in text.chars() {
            let gid = f.glyph_id(ch);
            let g = gid.with_scale_and_position(px, point(caret, baseline));
            if let Some(outline) = f.outline_glyph(g) {
                let bb = outline.px_bounds();
                outline.draw(|dx, dy, cov| {
                    let xi = (bb.min.x + dx as f32).round() as i32;
                    let yi = (bb.min.y + dy as f32).round() as i32;
                    self.blend(xi, yi, c, cov);
                    if bold {
                        self.blend(xi + 1, yi, c, cov);
                    }
                });
            }
            caret += scaled.h_advance(gid);
        }
    }

    fn encode_png(&self) -> Result<Vec<u8>, Error> {
        let mut out = Vec::new();
        let mut enc = png::Encoder::new(&mut out, W as u32, H as u32);
        enc.set_color(png::ColorType::Rgb);
        enc.set_depth(png::BitDepth::Eight);
        let mut writer = enc.write_header()?;
        writer.write_image_data(&self.buf)?;
        writer.finish()?;
        Ok(out)
    }
}

fn lerp(a: u8, b: u8, t: f32) -> u8 {
    (a as f32 + (b as f32 - a as f32) * t).round().clamp(0.0, 255.0) as u8
}

pub fn render_png(d: &SetlistData) -> Result<Vec<u8>, Error> {
    let t = theme(&d.theme);
    let mut cv = Canvas::new();

    cv.fill_gradient(t.bg0, t.bg1);

    // Accent line.
    cv.fill_rect(80, 32, 180, 4, t.accent);

    // Title (baseline y=115).
    let title = if d.title.is_empty() { "セットリスト" } else { &d.title };
    cv.draw_text(54.0, 80.0, 115.0, t.title, &format!("♪ {title}"), true);

    // Date + list start offset.
    let mut start_y = 178i32;
    if !d.date.is_empty() {
        cv.draw_text(28.0, 84.0, 158.0, t.date, &d.date, false);
        start_y = 210;
    }

    // Divider line just above the list.
    cv.fill_rect(80, start_y - 8, W as i32 - 160, 1, t.divider);

    // Song list.
    let n = d.songs.len().max(1) as i32;
    let line_height = (((H as i32 - start_y - 40) / n).min(64)).max(1);
    let font_size = ((line_height as f32 * 0.72).floor() as i32).min(36).max(1);
    let fs = font_size as f32;
    for (i, song) in d.songs.iter().enumerate() {
        let y = (start_y + i as i32 * line_height + font_size) as f32;
        cv.draw_text(fs, 80.0, y, t.num, &format!("{}.", i + 1), true);
        cv.draw_text(fs, 80.0 + fs * 2.2, y, t.song, song, false);
    }

    cv.encode_png()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(theme: &str, songs: usize) -> SetlistData {
        SetlistData {
            theme: theme.into(),
            title: "夏フェス2026".into(),
            date: "2026-08-01".into(),
            songs: (1..=songs).map(|i| format!("曲{i}")).collect(),
        }
    }

    fn decode_dims(png_bytes: &[u8]) -> (u32, u32) {
        let dec = png::Decoder::new(png_bytes);
        let reader = dec.read_info().expect("valid png");
        let info = reader.info();
        (info.width, info.height)
    }

    #[test]
    fn hex_parses() {
        assert_eq!(hex("ff6b6b"), [0xff, 0x6b, 0x6b]);
        assert_eq!(hex("000000"), [0, 0, 0]);
    }

    #[test]
    fn all_themes_render_1280x720() {
        for th in ["dark", "light", "neon", "vintage", "unknown"] {
            let png = render_png(&sample(th, 5)).expect("render");
            assert_eq!(decode_dims(&png), (W as u32, H as u32), "theme {th}");
        }
    }

    #[test]
    fn handles_no_date_and_many_songs() {
        let mut d = sample("dark", 30);
        d.date = String::new();
        let png = render_png(&d).expect("render");
        assert_eq!(decode_dims(&png), (W as u32, H as u32));
    }

    #[test]
    fn handles_single_song() {
        let png = render_png(&sample("neon", 1)).expect("render");
        assert_eq!(decode_dims(&png), (W as u32, H as u32));
    }
}
