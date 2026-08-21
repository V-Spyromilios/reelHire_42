import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException, status

from app.schemas.evaluation import RepositoryEvidence, RepositoryFileEvidence

IGNORED_DIRS = {
    ".git",
    ".next",
    ".cache",
    "__pycache__",
    "build",
    "coverage",
    "DerivedData",
    "dist",
    "node_modules",
    "Pods",
    "vendor",
    "venv",
    ".venv",
}

TEXT_EXTENSIONS = {
    "",
    ".c",
    ".cc",
    ".cpp",
    ".cs",
    ".css",
    ".dockerfile",
    ".go",
    ".h",
    ".html",
    ".java",
    ".js",
    ".jsx",
    ".json",
    ".kt",
    ".md",
    ".mjs",
    ".py",
    ".rb",
    ".rs",
    ".sh",
    ".swift",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}

LANGUAGE_BY_EXT = {
    ".go": "Go",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".kt": "Kotlin",
    ".py": "Python",
    ".rs": "Rust",
    ".swift": "Swift",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
}

MAX_FILES = 40
MAX_TOTAL_CHARS = 100_000
MAX_FILE_CHARS = 18_000
CLONE_TIMEOUT_SECONDS = 25


class RepositoryCloneError(Exception):
    pass


def normalize_github_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or parsed.netloc.lower() not in {"github.com", "www.github.com"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only public HTTPS GitHub repository URLs are supported.")
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a public GitHub repository URL.")
    owner, repo = parts[0], parts[1].removesuffix(".git")
    if not owner or not repo or any(part in {"..", ""} for part in (owner, repo)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid public GitHub repository URL.")
    return f"https://github.com/{owner}/{repo}.git"


class GitHubRepositoryInspector:
    def inspect(self, github_url: str) -> RepositoryEvidence:
        clone_url = normalize_github_url(github_url)
        with tempfile.TemporaryDirectory(prefix="reelhire-repo-") as temp_dir:
            repo_dir = Path(temp_dir) / "repo"
            self._clone(clone_url, repo_dir)
            return self._collect(clone_url.removesuffix(".git"), repo_dir)

    def _clone(self, clone_url: str, repo_dir: Path) -> None:
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", clone_url, str(repo_dir)],
                check=True,
                capture_output=True,
                text=True,
                timeout=CLONE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            raise RepositoryCloneError("GitHub clone timed out.") from exc
        except (FileNotFoundError, subprocess.CalledProcessError) as exc:
            raise RepositoryCloneError("Could not clone the public GitHub repository.") from exc

    def _collect(self, repository_url: str, repo_dir: Path) -> RepositoryEvidence:
        candidates = [path for path in repo_dir.rglob("*") if path.is_file() and self._is_useful_path(path, repo_dir)]
        candidates.sort(key=lambda path: self._priority(path.relative_to(repo_dir).as_posix()))

        files: list[RepositoryFileEvidence] = []
        tree: list[str] = []
        total_chars = 0
        readme: str | None = None
        languages: set[str] = set()
        has_tests = False

        for path in candidates:
            rel_path = path.relative_to(repo_dir).as_posix()
            if len(files) >= MAX_FILES or total_chars >= MAX_TOTAL_CHARS:
                break
            content = self._read_text(path)
            if content is None:
                continue
            chunk = content[:MAX_FILE_CHARS]
            if total_chars + len(chunk) > MAX_TOTAL_CHARS:
                chunk = chunk[: MAX_TOTAL_CHARS - total_chars]
            if not chunk:
                continue
            total_chars += len(chunk)
            tree.append(rel_path)
            if rel_path.lower().startswith("readme") and readme is None:
                readme = chunk
            if self._looks_like_test(rel_path):
                has_tests = True
            language = LANGUAGE_BY_EXT.get(path.suffix.lower())
            if language:
                languages.add(language)
            files.append(RepositoryFileEvidence(path=rel_path, content=chunk))

        return RepositoryEvidence(
            url=repository_url,
            file_count_examined=len(files),
            languages_detected=sorted(languages),
            has_readme=readme is not None,
            has_tests=has_tests,
            tree=tree,
            readme=readme,
            files=files,
        )

    def _is_useful_path(self, path: Path, repo_dir: Path) -> bool:
        rel_parts = path.relative_to(repo_dir).parts
        if any(part in IGNORED_DIRS for part in rel_parts):
            return False
        suffix = path.suffix.lower()
        if path.name in {"Dockerfile", "docker-compose.yml", "go.mod", "Package.swift", "package.json", "pyproject.toml", "requirements.txt"}:
            return True
        return suffix in TEXT_EXTENSIONS

    def _read_text(self, path: Path) -> str | None:
        try:
            with path.open("rb") as file:
                sample = file.read(MAX_FILE_CHARS + 1024)
        except OSError:
            return None
        if b"\x00" in sample:
            return None
        try:
            return sample.decode("utf-8", errors="replace")
        except UnicodeDecodeError:
            return None

    def _looks_like_test(self, rel_path: str) -> bool:
        lower = rel_path.lower()
        return "/tests/" in f"/{lower}" or "test_" in lower or "_test." in lower or "tests" in rel_path

    def _priority(self, rel_path: str) -> tuple[int, str]:
        lower = rel_path.lower()
        if lower.startswith("readme"):
            return (0, rel_path)
        if self._looks_like_test(rel_path):
            return (1, rel_path)
        if Path(rel_path).name in {"package.json", "pyproject.toml", "requirements.txt", "go.mod", "Package.swift", "Dockerfile", "docker-compose.yml"}:
            return (2, rel_path)
        if Path(rel_path).suffix.lower() in LANGUAGE_BY_EXT:
            return (3, rel_path)
        return (4, rel_path)
