"""Run one repository evaluation without the database, frontend, or AWS."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.services.repository_evaluation_service import (
    RepositoryEvaluationContext,
    RepositoryEvaluationError,
    RepositoryEvaluationService,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", help="Canonical public GitHub repository URL")
    parser.add_argument("--role", default="Software Engineer")
    parser.add_argument("--challenge-title", default="Submitted project review")
    parser.add_argument(
        "--challenge-description",
        default="Review the implementation quality, architecture, testing, and documentation of the submitted project.",
    )
    parser.add_argument("--skills", default="", help="Comma-separated relevant skills")
    return parser.parse_args()


async def run() -> int:
    args = parse_args()
    context = RepositoryEvaluationContext(
        role_title=args.role,
        challenge_title=args.challenge_title,
        challenge_description=args.challenge_description,
        skills=tuple(skill.strip() for skill in args.skills.split(",") if skill.strip()),
    )
    try:
        result = await RepositoryEvaluationService(get_settings()).evaluate(args.repository, context)
    except RepositoryEvaluationError as error:
        print(f"Evaluation failed: {error}", file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "repository": args.repository,
                "commit_sha": result.commit_sha,
                "model": result.model,
                "analysis": result.analysis.model_dump(mode="json"),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
