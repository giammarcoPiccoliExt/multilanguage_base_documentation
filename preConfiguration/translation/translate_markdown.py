#!/usr/bin/env python3
# Robust markdown translation helper
# Version: improved — preserves indentation, fixes admonitions handling, fixes caching and file iteration
from __future__ import annotations
import re
import argparse
import pathlib
import json
import hashlib
import logging
import fnmatch
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

LOG = logging.getLogger("mdtrans")

class TranslationBackend:
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        return text

class NoOpBackend(TranslationBackend):
    pass

class ArgosBackend(TranslationBackend):
    def __init__(self, source_lang: str, target_lang: str):
        self.source_lang = source_lang
        self.target_lang = target_lang
        try:
            # Try to import what argostranslate typically exposes; handle robustly
            import argostranslate.translate as _translate
            import argostranslate.package as _package
        except Exception:
            LOG.warning("argostranslate non installato o non importabile: uso NoOp")
            self._translate = None
            self._package = None
        else:
            self._translate = _translate
            self._package = _package

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self._translate:
            return text
        try:
            # Typical API: argostranslate.translate.translate(text, from_code, to_code)
            return self._translate.translate(text, source_lang, target_lang)
        except Exception:
            LOG.exception("Argos translate fallito, ritorno testo originale")
            return text

@dataclass
class Extraction:
    code_blocks: List[str]
    inline_codes: List[str]

# Patterns
CODE_BLOCK_RE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
DIRECTIVE_RE = re.compile(r"^(?:--8<--|!!swagger[^\n]*|:::\s*.*|!!!\s+.*)$", re.IGNORECASE)
TABLE_LINE_RE = re.compile(r"^\s*\|.*\|\s*$")
PLACE_CODE_BLOCK = "__CODE_BLOCK_{i}__"
PLACE_INLINE_CODE = "__INLINE_CODE_{i}__"
HEADING_RE = re.compile(r'^\s{0,3}(#{1,6})(\s+)(.*)$')
MUSIC_NOTES = set(['♪','♫','♩','♬','♭','♯'])
ONLY_HASHES_RE = re.compile(r'^#{3,}\s*$')


def extract_protected(md: str) -> Tuple[str, Extraction]:
    cb: List[str] = []
    def rcb(m):
        i = len(cb)
        cb.append(m.group(0))
        return PLACE_CODE_BLOCK.format(i=i)
    tmp = CODE_BLOCK_RE.sub(rcb, md)
    inl: List[str] = []
    def ril(m):
        i = len(inl)
        inl.append(m.group(0))
        return PLACE_INLINE_CODE.format(i=i)
    tmp2 = INLINE_CODE_RE.sub(ril, tmp)
    return tmp2, Extraction(cb, inl)


def restore_protected(processed: str, ex: Extraction) -> str:
    # restore inline codes first (they were replaced after code blocks)
    for i, v in enumerate(ex.inline_codes):
        processed = processed.replace(PLACE_INLINE_CODE.format(i=i), v)
    for i, v in enumerate(ex.code_blocks):
        processed = processed.replace(PLACE_CODE_BLOCK.format(i=i), v)
    return processed


def sanitize_line(orig: str, trans: str) -> str:
    # Preserve the original leading indentation
    leading = re.match(r"^\s*", orig).group(0)
    orig_core = orig.strip()
    trans_core = trans.strip()
    # If translation is a placeholder for protected content, keep it but preserve indentation
    placeholder_prefix = PLACE_CODE_BLOCK.split('{')[0]
    inline_placeholder_prefix = PLACE_INLINE_CODE.split('{')[0]
    if trans_core.startswith(placeholder_prefix) or trans_core.startswith(inline_placeholder_prefix):
        return leading + trans_core
    # Only-hashes lines: keep original if original had alnum characters
    if ONLY_HASHES_RE.match(trans_core):
        return orig if re.search(r'[A-Za-z0-9]', orig_core) else ''
    # Music notes-only lines
    if trans_core and all(ch in MUSIC_NOTES for ch in trans_core):
        return orig if re.search(r'[A-Za-z0-9]', orig_core) else ''
    def strip_notes(s: str) -> str:
        a = 0; b = len(s)
        while a < b and s[a] in MUSIC_NOTES: a += 1
        while b > a and s[b-1] in MUSIC_NOTES: b -= 1
        return s[a:b]
    cleaned = strip_notes(trans_core)
    # Return with original leading whitespace preserved
    return leading + cleaned


def fix_admonitions(text: str) -> str:
    lines = text.split('\n')
    res: List[str] = []
    adm_start = re.compile(r'^!!!\s+(info|warning|note|tip|abstract|summary|faq|danger|error|success|question|quote)\b', re.I)
    codef = re.compile(r'^\s*```')
    i = 0
    while i < len(lines):
        ln = lines[i]
        if adm_start.match(ln):
            res.append(ln)
            i += 1
            # collect following lines that belong to the admonition
            while i < len(lines):
                nx = lines[i]
                # blank lines inside admonition -> keep as indented blank
                if nx.strip() == '':
                    res.append('    ')
                    i += 1
                    continue
                # terminate admonition if next is a new admonition or a top-level heading
                if adm_start.match(nx) or (nx.lstrip().startswith('#') and not nx.startswith('    ') and not nx.startswith('\t')):
                    break
                # code fence inside admonition: indent whole fence
                if codef.match(nx):
                    # add opening fence indented
                    res.append('    ' + nx.lstrip())
                    i += 1
                    # copy until closing fence
                    while i < len(lines):
                        inner = lines[i]
                        if inner.strip() == '':
                            res.append('    ')
                        else:
                            res.append('    ' + inner.lstrip())
                        i += 1
                        if codef.match(inner):
                            break
                    continue
                # normal content: ensure indentation of 4 spaces (unless already indented)
                if nx.startswith('    ') or nx.startswith('\t'):
                    res.append(nx)
                else:
                    res.append('    ' + nx)
                i += 1
            continue
        else:
            res.append(ln)
            i += 1
    return '\n'.join(res)


def normalize_headings_outside_admonitions(text: str) -> str:
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        l = lines[i]
        if l.startswith('    #'):
            # unindent the heading
            lines[i] = l[4:]
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if not nxt.strip():
                    break
                # stop if next is an admonition or already a heading at column 0 or a code fence
                if nxt.startswith('!!! ') or nxt.startswith('#') or nxt.startswith('    ```'):
                    break
                if nxt.startswith('    ') and not nxt.startswith('    ```'):
                    lines[j] = nxt[4:]
                    j += 1
                    continue
                break
            i = j
            continue
        i += 1
    return '\n'.join(lines)


def translate_markdown_content(text: str, source_lang: str, target_lang: str, backend: TranslationBackend, glossary: Optional["Glossary"], cache: "TranslationCache", translate_tables: bool=False) -> str:
    working, extraction = extract_protected(text)
    def protect(line: str) -> bool:
        return bool(DIRECTIVE_RE.match(line.strip()))
    out_lines: List[str] = []

    # Translate visible link text first so that link syntax isn't broken
    def link_sub(m):
        vis, url = m.group(1), m.group(2)
        c = cache.get(vis, source_lang, target_lang)
        if c is None:
            tv = backend.translate(vis, source_lang, target_lang)
            if glossary: tv = glossary.apply(tv)
            cache.put(vis, source_lang, target_lang, tv)
            c = tv
        return f"[{c}]({url})"
    working_links = LINK_RE.sub(link_sub, working)

    # Split paragraphs by blank lines (preserve multiple blank lines semantics by splitting on two or more newlines)
    paragraphs = re.split(r'\n\s*\n', working_links)
    total = len(paragraphs)
    for idx, para in enumerate(paragraphs, start=1):
        LOG.debug("[TRANSLATE] paragraph %d/%d", idx, total)
        if not para.strip():
            out_lines.append('')
            continue
        lines = para.splitlines()
        if any(protect(ln) for ln in lines):
            out_lines.extend(lines)
            out_lines.append('')
            continue
        if any(TABLE_LINE_RE.match(ln) for ln in lines) and not translate_tables:
            out_lines.extend(lines)
            out_lines.append('')
            continue
        first = lines[0]
        h = HEADING_RE.match(first)
        if h:
            hashes, space, txt = h.groups()
            if not txt.strip():
                out_lines.append(first)
                out_lines.append('')
                continue
            cached = cache.get(txt, source_lang, target_lang)
            if cached is None:
                t = backend.translate(txt, source_lang, target_lang)
                if glossary: t = glossary.apply(t)
                cache.put(txt, source_lang, target_lang, t)
                cached = t
            translated_heading = f"{hashes}{space}{cached}"
            out_lines.append(sanitize_line(first, translated_heading))
            body = '\n'.join(lines[1:])
            if body.strip():
                b_cached = cache.get(body, source_lang, target_lang)
                if b_cached is None:
                    b_trans = backend.translate(body, source_lang, target_lang)
                    if glossary: b_trans = glossary.apply(b_trans)
                    cache.put(body, source_lang, target_lang, b_trans)
                    b_cached = b_trans
                orig_lines = lines[1:]
                tr_lines = b_cached.splitlines()
                for i in range(max(len(orig_lines), len(tr_lines))):
                    o = orig_lines[i] if i < len(orig_lines) else ''
                    t = tr_lines[i] if i < len(tr_lines) else ''
                    out_lines.append(sanitize_line(o, t))
            out_lines.append('')
            continue
        # Normal paragraph
        cached = cache.get(para, source_lang, target_lang)
        if cached is None:
            tr = backend.translate(para, source_lang, target_lang)
            if glossary: tr = glossary.apply(tr)
            cache.put(para, source_lang, target_lang, tr)
            cached = tr
            LOG.debug("[TRANSLATE] paragraph %d: translated (backend)", idx)
        else:
            LOG.debug("[TRANSLATE] paragraph %d: from cache", idx)
        orig_lines = para.splitlines()
        tr_lines = cached.splitlines()
        for i in range(max(len(orig_lines), len(tr_lines))):
            o = orig_lines[i] if i < len(orig_lines) else ''
            t = tr_lines[i] if i < len(tr_lines) else ''
            out_lines.append(sanitize_line(o, t))
        out_lines.append('')
    processed = '\n'.join(out_lines).rstrip('\n')
    restored = restore_protected(processed, extraction)
    restored = fix_admonitions(restored)
    restored = normalize_headings_outside_admonitions(restored)
    return restored


class Glossary:
    def __init__(self, mapping: Dict[str, str]):
        # sort by length to apply longest-first replacement
        self.items = sorted(mapping.items(), key=lambda x: len(x[0]), reverse=True)
    def apply(self, text: str) -> str:
        for src, tgt in self.items:
            # word-boundary aware; preserve case of the rest
            text = re.sub(rf"\b{re.escape(src)}\b", tgt, text)
        return text


class TranslationCache:
    def __init__(self, path: Optional[pathlib.Path]):
        self.path = pathlib.Path(path) if path else None
        self.data: Dict[str, str] = {}
        if self.path and self.path.exists():
            try:
                self.data = json.loads(self.path.read_text(encoding='utf-8'))
            except Exception:
                LOG.exception("Impossibile leggere cache, ricominciando vuota")
                self.data = {}
    def key(self, text: str, src: str, tgt: str) -> str:
        return hashlib.sha256((src + '\0' + tgt + '\0' + text).encode('utf-8')).hexdigest()
    def get(self, text: str, src: str, tgt: str) -> Optional[str]:
        return self.data.get(self.key(text, src, tgt))
    def put(self, text: str, src: str, tgt: str, translated: str) -> None:
        # always cache in-memory; flush() will persist if path set
        self.data[self.key(text, src, tgt)] = translated
    def flush(self) -> None:
        if not self.path:
            return
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(self.data, ensure_ascii=False, indent=2), encoding='utf-8')
        except Exception:
            LOG.exception("Impossibile scrivere cache su disco")


def process_file(src: pathlib.Path, dst: pathlib.Path, source_lang: str, target_lang: str, backend: TranslationBackend, glossary: Optional[Glossary], cache: TranslationCache, overwrite: bool, translate_tables: bool=False):
    if not src.exists():
        LOG.warning("[SKIP] Missing source %s", src)
        return
    if dst.exists() and not overwrite:
        LOG.info("[SKIP] Exists %s", dst)
        return
    text = src.read_text(encoding='utf-8')
    translated = translate_markdown_content(text, source_lang, target_lang, backend, glossary, cache, translate_tables=translate_tables)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(translated, encoding='utf-8')
    LOG.info("[OK] %s -> %s", src, dst)


def iter_files(base: pathlib.Path, pattern: str, exclude: List[str]) -> List[pathlib.Path]:
    files: List[pathlib.Path] = []
    for p in base.rglob('*'):
        if not p.is_file():
            continue
        if not fnmatch.fnmatch(p.name, pattern):
            continue
        rel = p.relative_to(base).as_posix()
        if any(fnmatch.fnmatch(rel, x) for x in exclude):
            continue
        files.append(p)
    return files


def main():
    ap = argparse.ArgumentParser(description="Translate Markdown preserving structure (robust)")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--src', type=str, help='single source file')
    g.add_argument('--src-dir', type=str, help='source directory')
    ap.add_argument('--dst', type=str, help='single destination file')
    ap.add_argument('--dst-dir', type=str, help='destination directory')
    ap.add_argument('--from', dest='from_lang', default='en', help='source language code')
    ap.add_argument('--to', required=True, help='target language code')
    ap.add_argument('--include', default='*.md')
    ap.add_argument('--exclude', nargs='*', default=[], help='exclude patterns relative to src-dir')
    ap.add_argument('--overwrite', action='store_true')
    ap.add_argument('--translate-tables', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--engine', choices=['noop','argos'], default='noop')
    ap.add_argument('--glossary', type=str)
    ap.add_argument('--cache', type=str)
    ap.add_argument('--auto-setup', dest='auto_setup', action='store_true')
    ap.add_argument('--verbose', action='store_true')
    args = ap.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format='%(levelname)s: %(message)s')

    if args.engine == 'argos':
        if args.auto_setup:
            try:
                from argostranslate import package
                installed = package.get_installed_packages()
                already = [p for p in installed if p.from_code == args.from_lang and p.to_code == args.to]
                if not already:
                    LOG.info("Nessun pacchetto Argos %s->%s installato: download...", args.from_lang, args.to)
                    available = package.get_available_packages()
                    candidates = [p for p in available if p.from_code == args.from_lang and p.to_code == args.to]
                    if candidates:
                        pkg = candidates[0]
                        path = pkg.download()
                        package.install_from_path(path)
                        LOG.info("Installato pacchetto Argos %s->%s", pkg.from_code, pkg.to_code)
                    else:
                        LOG.warning("Nessun pacchetto disponibile per %s->%s", args.from_lang, args.to)
                else:
                    LOG.info("Pacchetto Argos %s->%s già installato", args.from_lang, args.to)
            except Exception:
                LOG.exception("Auto-setup Argos fallito")
        backend: TranslationBackend = ArgosBackend(args.from_lang, args.to) if args.engine == 'argos' else NoOpBackend()
    else:
        backend = NoOpBackend()

    glossary = None
    if args.glossary:
        gpath = pathlib.Path(args.glossary)
        if gpath.exists():
            try:
                glossary = Glossary(json.loads(gpath.read_text(encoding='utf-8')))
            except Exception:
                LOG.exception("Glossario non valido")

    cache = TranslationCache(pathlib.Path(args.cache) if args.cache else None)

    if args.src:
        if not args.dst:
            ap.error('--dst required in single file mode')
        srcp = pathlib.Path(args.src)
        dstp = pathlib.Path(args.dst)
        if not args.dry_run:
            process_file(srcp, dstp, args.from_lang, args.to, backend, glossary, cache, args.overwrite, args.translate_tables)
    else:
        if not args.dst_dir:
            ap.error('--dst-dir required in directory mode')
        src_base = pathlib.Path(args.src_dir)
        dst_base = pathlib.Path(args.dst_dir)
        for f in iter_files(src_base, args.include, args.exclude):
            rel = f.relative_to(src_base)
            target = dst_base / rel
            if not args.dry_run:
                process_file(f, target, args.from_lang, args.to, backend, glossary, cache, args.overwrite, args.translate_tables)
    cache.flush()

if __name__ == '__main__':
    main()
