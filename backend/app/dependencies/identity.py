from dataclasses import dataclass


@dataclass(frozen=True)
class EmployerIdentity:
    id: str = "emp-nova"
    company_name: str = "Nova Systems"
    recruiter_name: str = "Mira Patel"
    location: str = "Berlin, DE"
    logo_url: str = "https://api.dicebear.com/9.x/shapes/svg?seed=nova"
    recruiter_avatar_url: str = "https://api.dicebear.com/9.x/avataaars/svg?seed=mira"


@dataclass(frozen=True)
class CandidateIdentity:
    id: str = "cand-alex"
    name: str = "Alex Morgan"
    avatar_url: str = "https://api.dicebear.com/9.x/avataaars/svg?seed=alex"
    headline: str = "Backend engineer focused on resilient distributed systems"
    location: str = "Lisbon, PT"
    skills: tuple[str, ...] = ("Go", "Postgres", "Kubernetes", "Observability")
    github_username: str = "alexmorgan-dev"


def get_current_employer() -> EmployerIdentity:
    return EmployerIdentity()


def get_current_candidate() -> CandidateIdentity:
    return CandidateIdentity()
