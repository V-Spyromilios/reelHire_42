import re
from dataclasses import dataclass
from urllib.parse import unquote, urlparse


CANONICAL_GITHUB_REPOSITORY_MESSAGE = (
    "Enter a public GitHub repository URL in the form https://github.com/owner/repository."
)
GITHUB_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


@dataclass(frozen=True)
class GitHubRepository:
    owner: str
    name: str

    @property
    def slug(self) -> str:
        return f"{self.owner}/{self.name}"

    @property
    def url(self) -> str:
        return f"https://github.com/{self.slug}"


def parse_github_repository_url(value: str) -> GitHubRepository:
    parsed = urlparse(value)
    hostname = (parsed.hostname or "").lower()
    if (
        parsed.scheme != "https"
        or hostname not in {"github.com", "www.github.com"}
        or parsed.username
        or parsed.password
        or parsed.port
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError(CANONICAL_GITHUB_REPOSITORY_MESSAGE)

    parts = [unquote(part) for part in parsed.path.split("/") if part]
    if len(parts) != 2:
        raise ValueError(CANONICAL_GITHUB_REPOSITORY_MESSAGE)

    owner, name = parts
    if name.lower().endswith(".git"):
        name = name[:-4]

    if not owner or not name or not GITHUB_NAME_PATTERN.fullmatch(owner) or not GITHUB_NAME_PATTERN.fullmatch(name):
        raise ValueError(CANONICAL_GITHUB_REPOSITORY_MESSAGE)

    return GitHubRepository(owner=owner, name=name)
