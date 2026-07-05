// Port of stripMarkdown() from src/index.ts.

pub fn strip_markdown(text: &str) -> String {
    let s = replace_delimited(text, "**");
    let s = replace_delimited(&s, "*");
    let s = strip_headings(&s);
    let s = replace_list_markers(&s);
    let s = remove_inline_code(&s);
    let s = replace_links(&s);
    let s = collapse_newlines(&s);
    s.trim().to_string()
}

// `**bold**` / `*italic*` -> inner text; pair must sit on one line.
fn replace_delimited(text: &str, delim: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    loop {
        match rest.find(delim) {
            None => {
                out.push_str(rest);
                break;
            }
            Some(start) => {
                let after = &rest[start + delim.len()..];
                match after.find(delim) {
                    Some(close) if !after[..close].contains('\n') => {
                        out.push_str(&rest[..start]);
                        out.push_str(&after[..close]);
                        rest = &after[close + delim.len()..];
                    }
                    _ => {
                        out.push_str(&rest[..start + delim.len()]);
                        rest = after;
                    }
                }
            }
        }
    }
    out
}

fn strip_headings(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for line in text.split_inclusive('\n') {
        let hashes = line.bytes().take_while(|&b| b == b'#').count();
        if (1..=6).contains(&hashes) {
            let rest = &line[hashes..];
            let stripped = rest.trim_start_matches([' ', '\t']);
            if stripped.len() < rest.len() {
                out.push_str(stripped);
                continue;
            }
        }
        out.push_str(line);
    }
    out
}

fn replace_list_markers(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for line in text.split_inclusive('\n') {
        if let Some(rest) = line.strip_prefix(['-', '*', '+']) {
            let stripped = rest.trim_start_matches([' ', '\t']);
            if stripped.len() < rest.len() {
                out.push('・');
                out.push_str(stripped);
                continue;
            }
        }
        out.push_str(line);
    }
    out
}

// `{1,3}[^`\n]*`{1,3} -> removed, with regex-style backtracking on the
// opening run so bare `` and fenced ``` markers vanish like in JS.
fn remove_inline_code(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    'outer: while i < chars.len() {
        if chars[i] == '`' {
            let mut avail = 0;
            while i + avail < chars.len() && chars[i + avail] == '`' {
                avail += 1;
            }
            for open in (1..=avail.min(3)).rev() {
                let mut j = i + open;
                while j < chars.len() && chars[j] != '`' && chars[j] != '\n' {
                    j += 1;
                }
                if j < chars.len() && chars[j] == '`' {
                    let mut close = 0;
                    while j + close < chars.len() && chars[j + close] == '`' && close < 3 {
                        close += 1;
                    }
                    i = j + close;
                    continue 'outer;
                }
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

// [text](url) -> text
fn replace_links(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    'outer: while i < chars.len() {
        if chars[i] == '[' {
            if let Some(cb) = find_from(&chars, i + 1, ']') {
                if cb > i + 1 && cb + 1 < chars.len() && chars[cb + 1] == '(' {
                    if let Some(cp) = find_from(&chars, cb + 2, ')') {
                        if cp > cb + 2 {
                            out.extend(&chars[i + 1..cb]);
                            i = cp + 1;
                            continue 'outer;
                        }
                    }
                }
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

fn find_from(chars: &[char], start: usize, needle: char) -> Option<usize> {
    chars[start..].iter().position(|&c| c == needle).map(|p| start + p)
}

fn collapse_newlines(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut run = 0usize;
    for c in text.chars() {
        if c == '\n' {
            run += 1;
        } else {
            flush_newlines(&mut out, run);
            run = 0;
            out.push(c);
        }
    }
    flush_newlines(&mut out, run);
    out
}

fn flush_newlines(out: &mut String, run: usize) {
    let n = if run >= 3 { 2 } else { run };
    for _ in 0..n {
        out.push('\n');
    }
}

#[cfg(test)]
mod tests {
    use super::strip_markdown;

    #[test]
    fn bold_and_italic() {
        assert_eq!(strip_markdown("**bold** and *italic*"), "bold and italic");
    }

    #[test]
    fn headings() {
        assert_eq!(strip_markdown("## 見出し\ntext"), "見出し\ntext");
        assert_eq!(strip_markdown("###### deep\nx"), "deep\nx");
        assert_eq!(strip_markdown("#nospace"), "#nospace");
    }

    #[test]
    fn list_markers() {
        assert_eq!(strip_markdown("- one\n* two\n+ three"), "・one\n・two\n・three");
    }

    #[test]
    fn inline_code_removed() {
        assert_eq!(strip_markdown("use `foo()` here"), "use  here");
        assert_eq!(strip_markdown("a ```code``` b"), "a  b");
    }

    #[test]
    fn links_keep_text() {
        assert_eq!(strip_markdown("see [ここ](https://example.com) を"), "see ここ を");
    }

    #[test]
    fn collapse_blank_lines_and_trim() {
        assert_eq!(strip_markdown("a\n\n\n\nb"), "a\n\nb");
        assert_eq!(strip_markdown("  hello  "), "hello");
    }

    #[test]
    fn delimiter_edge_cases() {
        // A lone `*` with no closing pair stays.
        assert_eq!(strip_markdown("2 * 3 = 6"), "2 * 3 = 6");
        // `**...**` across a newline: the `**` pass can't span the newline, but
        // the following `*` pass strips both star pairs — matches the original
        // JS two-pass behavior (verified against node).
        assert_eq!(strip_markdown("**open\nclose**"), "open\nclose");
    }

    #[test]
    fn combined() {
        let input = "## セトリ\n\n- **曲A**\n- 曲B\n\n\n\n[詳細](http://x.jp)";
        assert_eq!(strip_markdown(input), "セトリ\n\n・曲A\n・曲B\n\n詳細");
    }
}
