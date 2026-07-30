#!/usr/bin/env python3
"""Build the browser manifest for Markdown files in blog/."""

from __future__ import annotations

import datetime as dt
import html
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "blog"
OUTPUT_FILE = ROOT / "assets" / "blog-posts.js"
TITLE_PATTERN = re.compile(r"^#\s+(.+?)\s*$")
DATE_PATTERN = re.compile(r"^>\s*(\d{4}-\d{2}-\d{2})\s*$")
FENCE_PATTERN = re.compile(r"^\s*```(?:[^`]*)$")
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
UNORDERED_PATTERN = re.compile(r"^\s*[-*+]\s+(.+)$")
ORDERED_PATTERN = re.compile(r"^\s*\d+[.)]\s+(.+)$")
IMAGE_PATTERN = re.compile(r"!\[([^]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
LINK_PATTERN = re.compile(r"(?<!!)\[([^]]+)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def fail(path: Path, message: str) -> None:
    raise ValueError(f"{path.relative_to(ROOT)}: {message}")


def safe_url(value: str, image: bool = False) -> str | None:
    value = html.unescape(value).strip()
    if not value or re.match(r"(?i)\s*(?:javascript|vbscript|data):", value):
        return None
    if re.match(r"(?i)https?://", value) or not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", value):
        return value
    return None


def inline_markdown(text: str) -> str:
    escaped = html.escape(text, quote=True)

    def image(match: re.Match[str]) -> str:
        source = safe_url(match.group(2), image=True)
        return f'<img src="{html.escape(source, quote=True)}" alt="{match.group(1)}">' if source else match.group(0)

    def link(match: re.Match[str]) -> str:
        target = safe_url(match.group(2))
        if not target:
            return match.group(1)
        external = ' target="_blank" rel="noopener"' if target.startswith(("http://", "https://")) else ""
        return f'<a href="{html.escape(target, quote=True)}"{external}>{match.group(1)}</a>'

    escaped = IMAGE_PATTERN.sub(image, escaped)
    escaped = LINK_PATTERN.sub(link, escaped)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*|__(.+?)__", lambda m: f"<strong>{m.group(1) or m.group(2)}</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)", lambda m: f"<em>{m.group(1) or m.group(2)}</em>", escaped)
    return escaped


def render_markdown(lines: list[str]) -> str:
    output: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if FENCE_PATTERN.match(line):
            index += 1
            code: list[str] = []
            while index < len(lines) and not FENCE_PATTERN.match(lines[index]):
                code.append(lines[index])
                index += 1
            if index == len(lines):
                raise ValueError("Unclosed fenced code block")
            output.append(f"<pre><code>{html.escape(chr(10).join(code))}</code></pre>")
            index += 1
            continue
        if re.match(r"^\s{0,3}([-*_])(?:\s*\1){2,}\s*$", line):
            output.append("<hr>")
            index += 1
            continue
        heading = HEADING_PATTERN.match(line)
        if heading:
            level = len(heading.group(1))
            output.append(f"<h{level}>{inline_markdown(heading.group(2))}</h{level}>")
            index += 1
            continue
        if line.startswith(">"):
            quote: list[str] = []
            while index < len(lines) and lines[index].startswith(">"):
                quote.append(lines[index][1:].lstrip())
                index += 1
            output.append(f"<blockquote><p>{inline_markdown(' '.join(quote))}</p></blockquote>")
            continue
        kind = "ul" if UNORDERED_PATTERN.match(line) else "ol" if ORDERED_PATTERN.match(line) else None
        if kind:
            pattern = UNORDERED_PATTERN if kind == "ul" else ORDERED_PATTERN
            items: list[str] = []
            while index < len(lines):
                item = pattern.match(lines[index])
                if not item:
                    break
                items.append(f"<li>{inline_markdown(item.group(1))}</li>")
                index += 1
            output.append(f"<{kind}>{''.join(items)}</{kind}>")
            continue
        paragraph: list[str] = []
        while index < len(lines) and lines[index].strip() and not FENCE_PATTERN.match(lines[index]) and not HEADING_PATTERN.match(lines[index]) and not lines[index].startswith(">") and not UNORDERED_PATTERN.match(lines[index]) and not ORDERED_PATTERN.match(lines[index]):
            if re.match(r"^\s{0,3}([-*_])(?:\s*\1){2,}\s*$", lines[index]):
                break
            paragraph.append(lines[index].strip())
            index += 1
        output.append(f"<p>{inline_markdown(' '.join(paragraph))}</p>")
    return "\n".join(output)


def preview_for(lines: list[str]) -> str:
    text = " ".join(line.strip() for line in lines if line.strip() and not FENCE_PATTERN.match(line))
    text = re.sub(r"!?(\[([^]]*)\]\([^)]+\))", r"\2", text)
    text = re.sub(r"<[^>]*>", "", text)
    text = re.sub(r"[`*_>#-]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:220].rstrip() + ("…" if len(text) > 220 else "")


def build_post(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if len(lines) < 2:
        fail(path, "expected title on line 1 and date on line 2")
    title = TITLE_PATTERN.match(lines[0])
    if not title:
        fail(path, "line 1 must be '# Title'")
    date = DATE_PATTERN.match(lines[1])
    if not date:
        fail(path, "line 2 must be '> YYYY-MM-DD'")
    try:
        dt.date.fromisoformat(date.group(1))
    except ValueError:
        fail(path, "line 2 must contain a real ISO date")
    body = lines[2:]
    try:
        rendered = render_markdown(body)
    except ValueError as error:
        fail(path, str(error))
    return {"id": path.stem, "title": title.group(1), "date": date.group(1), "preview": preview_for(body), "html": rendered}


def main() -> int:
    SOURCE_DIR.mkdir(exist_ok=True)
    posts: list[dict[str, str]] = []
    try:
        for path in sorted(SOURCE_DIR.glob("*.md")):
            posts.append(build_post(path))
    except ValueError as error:
        print(f"Blog build failed: {error}", file=sys.stderr)
        return 1
    posts.sort(key=lambda post: post["date"], reverse=True)
    OUTPUT_FILE.write_text("/* Generated by scripts/build_blog.py. Do not edit directly. */\nwindow.BLOG_POSTS = " + json.dumps(posts, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Built {len(posts)} blog post{'s' if len(posts) != 1 else ''} -> {OUTPUT_FILE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
