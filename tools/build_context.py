#!/usr/bin/env python3
"""
Build an LLM-friendly codebase context snapshot.

This tool is intended to live in /tools and read settings from:

  tools/build_context_settings.config

Default settings should point the scanner at:

  ../src
  ../game-assets
  ../config

That means the generated snapshot covers the app source directory,
public game asset data/manifests, and public config files, while still
excluding node_modules, build output, project metadata, and unrelated folders.

Usage:
  python tools/build_context.py
  python tools/build_context.py --config tools/build_context_settings.config
  python tools/build_context.py --scan-root src
  python tools/build_context.py --scan-root src --scan-root game-assets --scan-root config
  python tools/build_context.py --tree-only
  python tools/build_context.py --include-svg
  python tools/build_context.py --include-lockfiles
"""

from __future__ import annotations

import argparse
import configparser
import datetime as dt
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = SCRIPT_DIR / "build_context_settings.config"


SKIP_DIR_NAMES = {
    ".git",
    ".hg",
    ".svn",
    ".idea",
    ".vscode",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".cache",
    "node_modules",
    "vendor",
    "dist",
    "build",
    "out",
    "coverage",
    "tmp",
    "temp",
    "logs",
}


BINARY_OR_LOW_VALUE_EXTENSIONS = {
    # Images
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".ico",
    ".tif",
    ".tiff",

    # Design/source art
    ".psd",
    ".ai",
    ".eps",
    ".indd",
    ".sketch",
    ".fig",

    # Fonts
    ".ttf",
    ".otf",
    ".woff",
    ".woff2",
    ".eot",

    # Audio/video
    ".mp3",
    ".wav",
    ".ogg",
    ".flac",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",

    # Archives/packages
    ".zip",
    ".tar",
    ".gz",
    ".tgz",
    ".rar",
    ".7z",

    # Binaries/installers
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".bin",
    ".app",
    ".msi",
    ".deb",
    ".rpm",

    # Databases / generated local state
    ".sqlite",
    ".sqlite3",
    ".db",
    ".log",

    # Documents usually not useful as source context
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
}


LOCKFILES = {
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "composer.lock",
    "poetry.lock",
    "Pipfile.lock",
}


SECRET_FILE_NAMES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    "secrets.json",
    "secret.json",
    "credentials.json",
}


SECRET_EXTENSIONS = {
    ".pem",
    ".key",
    ".p12",
    ".pfx",
}


SECRET_PATTERNS = [
    re.compile(r"\bAPI[_-]?KEY\b", re.IGNORECASE),
    re.compile(r"\bSECRET\b", re.IGNORECASE),
    re.compile(r"\bPASSWORD\b", re.IGNORECASE),
    re.compile(r"\bPASSWD\b", re.IGNORECASE),
    re.compile(r"\bTOKEN\b", re.IGNORECASE),
    re.compile(r"\bPRIVATE[_-]?KEY\b", re.IGNORECASE),
    re.compile(r"\bDB[_-]?PASS\b", re.IGNORECASE),
    re.compile(r"\bAUTH[_-]?KEY\b", re.IGNORECASE),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate an LLM-friendly source-context snapshot."
    )

    parser.add_argument(
        "--config",
        default=str(DEFAULT_CONFIG_PATH),
        help=(
            "Path to build_context_settings.config. "
            "Defaults to tools/build_context_settings.config."
        ),
    )

    parser.add_argument(
        "--scan-root",
        action="append",
        help=(
            "Override configured scan roots. "
            "Repeat this option to include multiple roots."
        ),
    )

    parser.add_argument(
        "--output",
        help="Override the configured output_file path.",
    )

    parser.add_argument(
        "--max-file-kb",
        type=int,
        help="Override the configured max_file_kb value.",
    )

    parser.add_argument(
        "--include-svg",
        action="store_true",
        help="Include SVG files as text.",
    )

    parser.add_argument(
        "--include-lockfiles",
        action="store_true",
        help="Include dependency lockfiles.",
    )

    parser.add_argument(
        "--tree-only",
        action="store_true",
        help="Only generate tree and metadata, without file contents.",
    )

    return parser.parse_args()


def load_config(config_path: Path) -> configparser.ConfigParser:
    config = configparser.ConfigParser()

    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    config.read(config_path)

    if "paths" not in config:
        raise ValueError("Config file is missing required [paths] section.")

    return config


def resolve_config_path(path_value: str, config_dir: Path) -> Path:
    path = Path(path_value).expanduser()

    if not path.is_absolute():
        path = config_dir / path

    return path.resolve()

def split_config_paths(path_value: str) -> list[str]:
    paths: list[str] = []

    for line in path_value.replace(",", "\n").splitlines():
        path = line.strip()

        if path:
            paths.append(path)

    return paths

def get_bool_config(
    config: configparser.ConfigParser,
    section: str,
    option: str,
    fallback: bool,
) -> bool:
    if not config.has_option(section, option):
        return fallback

    return config.getboolean(section, option)


def get_int_config(
    config: configparser.ConfigParser,
    section: str,
    option: str,
    fallback: int,
) -> int:
    if not config.has_option(section, option):
        return fallback

    return config.getint(section, option)


def relative_path(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def should_skip_dir(path: Path) -> bool:
    return path.name in SKIP_DIR_NAMES


def is_context_output_file(path: Path) -> bool:
    return path.name.startswith("codebase-context") and path.suffix == ".txt"


def is_secret_file(path: Path) -> bool:
    return path.name in SECRET_FILE_NAMES or path.suffix.lower() in SECRET_EXTENSIONS


def is_lockfile(path: Path) -> bool:
    return path.name in LOCKFILES


def is_binary_by_probe(path: Path) -> bool:
    try:
        with path.open("rb") as file:
            chunk = file.read(4096)
    except OSError:
        return True

    return b"\x00" in chunk


def should_include_file(
    path: Path,
    output_path: Path,
    max_file_bytes: int,
    include_svg: bool,
    include_lockfiles: bool,
) -> tuple[bool, str | None]:
    if path.resolve() == output_path:
        return False, "skipped current output file"

    if is_context_output_file(path):
        return False, "skipped generated context snapshot"

    if is_secret_file(path):
        return False, "skipped possible secret/credential file"

    if is_lockfile(path) and not include_lockfiles:
        return False, "skipped dependency lockfile"

    suffix = path.suffix.lower()

    if suffix == ".svg" and not include_svg:
        return False, "skipped SVG asset; use --include-svg to include"

    if suffix in BINARY_OR_LOW_VALUE_EXTENSIONS:
        return False, f"skipped binary/media/low-context file type: {suffix}"

    try:
        size = path.stat().st_size
    except OSError:
        return False, "skipped unreadable file"

    if size > max_file_bytes:
        return False, f"skipped oversized file: {size:,} bytes"

    if is_binary_by_probe(path):
        return False, "skipped binary file detected by content probe"

    return True, None


def iter_project_files(root: Path) -> Iterable[Path]:
    for current_root, dir_names, file_names in os.walk(root):
        current_path = Path(current_root)

        dir_names[:] = sorted(
            [name for name in dir_names if not should_skip_dir(current_path / name)]
        )

        for file_name in sorted(file_names):
            yield current_path / file_name


def build_tree(root: Path, root_label: str | None = None) -> tuple[list[str], int, int]:
    lines = [root_label or "."]
    dir_count = 0
    file_count = 0

    def visible_entries(directory: Path) -> list[Path]:
        try:
            children = list(directory.iterdir())
        except OSError:
            return []

        entries = []

        for child in children:
            if child.is_dir() and should_skip_dir(child):
                continue

            entries.append(child)

        return sorted(entries, key=lambda item: (not item.is_dir(), item.name.lower()))

    def walk(directory: Path, prefix: str = "") -> None:
        nonlocal dir_count, file_count

        entries = visible_entries(directory)

        for index, entry in enumerate(entries):
            connector = "└── " if index == len(entries) - 1 else "├── "
            lines.append(f"{prefix}{connector}{entry.name}")

            if entry.is_dir():
                dir_count += 1
                extension = "    " if index == len(entries) - 1 else "│   "
                walk(entry, prefix + extension)
            else:
                file_count += 1

    walk(root)
    return lines, dir_count, file_count


def find_git_root(start_path: Path) -> Path | None:
    current = start_path.resolve()

    if current.is_file():
        current = current.parent

    while True:
        if (current / ".git").exists():
            return current

        if current.parent == current:
            return None

        current = current.parent


def run_git_command(git_root: Path, args: list[str]) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(git_root), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except OSError:
        return None

    if result.returncode != 0:
        return None

    return result.stdout.strip()


def get_git_metadata(scan_root: Path) -> list[str]:
    git_root = find_git_root(scan_root)

    if git_root is None:
        return ["Git: not a Git repository or Git unavailable"]

    branch = run_git_command(git_root, ["branch", "--show-current"]) or "(detached HEAD)"
    commit = run_git_command(git_root, ["rev-parse", "--short", "HEAD"]) or "unknown"
    status = run_git_command(git_root, ["status", "--short"]) or ""

    lines = [
        f"Git root: {git_root}",
        f"Git branch: {branch}",
        f"Git commit: {commit}",
    ]

    if status:
        lines.append("Git status: uncommitted changes present")
        lines.append("")
        lines.append("Uncommitted changes:")
        lines.extend(status.splitlines())
    else:
        lines.append("Git status: clean working tree")

    return lines


def read_text_file(path: Path) -> str:
    encodings = ["utf-8", "utf-8-sig", "latin-1"]

    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue

    return path.read_text(errors="replace")


def scan_for_secret_warnings(rel_path: str, contents: str) -> list[str]:
    warnings = []

    for line_number, line in enumerate(contents.splitlines(), start=1):
        for pattern in SECRET_PATTERNS:
            if pattern.search(line):
                warnings.append(
                    f"{rel_path}:{line_number} matched possible secret term: {pattern.pattern}"
                )
                break

    return warnings


def rotate_existing_output(output_path: Path) -> None:
    if not output_path.exists():
        return

    old_path = output_path.with_name(f"{output_path.stem}.old{output_path.suffix}")

    if old_path.exists():
        timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        archived_old_path = output_path.with_name(
            f"{output_path.stem}.old.{timestamp}{output_path.suffix}"
        )
        old_path.rename(archived_old_path)

    output_path.rename(old_path)


def build_context(
    scan_roots: list[Path],
    output_path: Path,
    max_file_kb: int,
    include_svg: bool,
    include_lockfiles: bool,
    tree_only: bool,
) -> str:
    max_file_bytes = max_file_kb * 1024
    generated_at = dt.datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")

    git_lines = get_git_metadata(scan_roots[0])

    tree_sections: list[str] = []
    total_dir_count = 0
    total_file_count = 0

    for scan_root in scan_roots:
        tree_lines, dir_count, file_count = build_tree(
            scan_root,
            scan_root.name,
        )

        if tree_sections:
            tree_sections.append("")

        tree_sections.extend(tree_lines)
        total_dir_count += dir_count
        total_file_count += file_count

    included_files: list[tuple[str, str]] = []
    skipped_files: list[str] = []
    secret_warnings: list[str] = []

    if not tree_only:
        for scan_root in scan_roots:
            root_label = scan_root.name

            for path in iter_project_files(scan_root):
                include, reason = should_include_file(
                    path=path,
                    output_path=output_path,
                    max_file_bytes=max_file_bytes,
                    include_svg=include_svg,
                    include_lockfiles=include_lockfiles,
                )

                rel = f"{root_label}/{relative_path(path, scan_root)}"

                if not include:
                    skipped_files.append(f"{rel} — {reason}")
                    continue

                try:
                    contents = read_text_file(path)
                except OSError as exc:
                    skipped_files.append(f"{rel} — skipped unreadable file: {exc}")
                    continue

                included_files.append((rel, contents))
                secret_warnings.extend(scan_for_secret_warnings(rel, contents))

    lines: list[str] = []

    lines.extend(
        [
            "# CODEBASE CONTEXT SNAPSHOT",
            "",
            f"Generated: {generated_at}",
            "Scan roots:",
        ]
    )

    for scan_root in scan_roots:
        lines.append(f"- {scan_root}")

    lines.extend(
        [
            f"Output file: {output_path}",
            f"Max included file size: {max_file_kb} KB",
            "",
            "This file is a source/context snapshot for LLM review.",
            "It is generated from the configured scan roots only.",
            "Do not assume omitted files are empty.",
            "Files listed in the tree but not included were skipped because they are binary, generated, ignored, secret-like, too large, or otherwise low-context.",
            "When proposing code changes, preserve existing behavior unless specifically asked to alter it.",
            "",
            "---",
            "",
            "# GIT METADATA",
            "",
        ]
    )

    lines.extend(git_lines)

    lines.extend(
        [
            "",
            "---",
            "",
            "# DIRECTORY TREE",
            "",
        ]
    )

    lines.extend(tree_sections)
    lines.append("")
    lines.append(f"{total_dir_count} directories, {total_file_count} files")

    lines.extend(
        [
            "",
            "---",
            "",
            "# INCLUDED FILES",
            "",
        ]
    )

    if tree_only:
        lines.append("Tree-only mode enabled; file contents were not included.")
    elif included_files:
        lines.extend(rel for rel, _contents in included_files)
    else:
        lines.append("No files included.")

    lines.extend(
        [
            "",
            "---",
            "",
            "# SKIPPED FILES",
            "",
        ]
    )

    if skipped_files:
        lines.extend(skipped_files)
    else:
        lines.append("No files skipped.")

    lines.extend(
        [
            "",
            "---",
            "",
            "# POSSIBLE SECRET WARNINGS",
            "",
        ]
    )

    if secret_warnings:
        lines.append(
            "Review these before uploading this context file anywhere outside your local machine."
        )
        lines.append("")
        lines.extend(secret_warnings)
    else:
        lines.append("No possible secret terms detected in included files.")

    lines.extend(
        [
            "",
            "---",
            "",
            "# FILE CONTENTS",
            "",
        ]
    )

    if tree_only:
        lines.append("Tree-only mode enabled; file contents were not included.")
    elif not included_files:
        lines.append("No file contents included.")
    else:
        for rel, contents in included_files:
            lines.append(f"<<<FILE: {rel}>>>")
            lines.append(contents.rstrip())
            lines.append(f"<<<END FILE: {rel}>>>")
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"

def main() -> int:
    args = parse_args()

    try:
        config_path = Path(args.config).expanduser().resolve()
        config = load_config(config_path)
        config_dir = config_path.parent

        if args.scan_root:
            scan_root_values = args.scan_root
        elif config.has_option("paths", "scan_roots"):
            scan_root_values = split_config_paths(
                config.get("paths", "scan_roots"),
            )
        else:
            configured_scan_root = config.get(
                "paths",
                "scan_root",
                fallback="../src",
            )

            scan_root_values = split_config_paths(
                configured_scan_root,
            )

        configured_output_file = config.get(
            "paths",
            "output_file",
            fallback="../codebase-context.txt",
        )

        output_value = args.output or configured_output_file

        scan_roots = [
            resolve_config_path(scan_root_value, config_dir)
            for scan_root_value in scan_root_values
        ]

        output_path = resolve_config_path(output_value, config_dir)

        max_file_kb = (
            args.max_file_kb
            if args.max_file_kb is not None
            else get_int_config(config, "options", "max_file_kb", 250)
        )

        include_svg = args.include_svg or get_bool_config(
            config,
            "options",
            "include_svg",
            False,
        )

        include_lockfiles = args.include_lockfiles or get_bool_config(
            config,
            "options",
            "include_lockfiles",
            False,
        )

        tree_only = args.tree_only or get_bool_config(
            config,
            "options",
            "tree_only",
            False,
        )

        if not scan_roots:
            raise ValueError("No scan roots configured.")

        for scan_root in scan_roots:
            if not scan_root.exists():
                raise FileNotFoundError(f"Configured scan root does not exist: {scan_root}")

            if not scan_root.is_dir():
                raise NotADirectoryError(
                    f"Configured scan root is not a directory: {scan_root}"
                )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        context = build_context(
            scan_roots=scan_roots,
            output_path=output_path,
            max_file_kb=max_file_kb,
            include_svg=include_svg,
            include_lockfiles=include_lockfiles,
            tree_only=tree_only,
        )

        rotate_existing_output(output_path)
        output_path.write_text(context, encoding="utf-8")

        print(f"Created context snapshot: {output_path}")
        print("Scanned source directories:")
        for scan_root in scan_roots:
            print(f"- {scan_root}")

        old_path = output_path.with_name(f"{output_path.stem}.old{output_path.suffix}")
        if old_path.exists():
            print(f"Previous snapshot rotated to: {old_path}")

        return 0

    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
