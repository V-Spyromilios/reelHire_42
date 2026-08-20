import json

import httpx
import pytest

from app.core.config import Settings
from app.services.github_repository import parse_github_repository_url
from app.services.repository_evaluation_service import (
    MAX_CHALLENGE_CHARACTERS,
    OPENROUTER_COMPLETIONS_URL,
    RepositoryFile,
    RepositoryEvaluationContext,
    RepositoryEvaluationError,
    RepositoryEvaluationService,
    RepositorySnapshot,
)


def analysis_payload() -> dict:
    return {
        "overall_score": 84,
        "code_quality": 82,
        "architecture": 88,
        "testing": 78,
        "documentation": 86,
        "summary": "The repository separates application concerns and documents its setup clearly.",
        "strengths": ["Clear package boundaries", "Useful setup documentation"],
        "concerns": ["More edge-case tests would strengthen confidence."],
        "evidence": [
            {
                "label": "Architecture",
                "file": "src/main.py",
                "lines": "1-18",
                "note": "The entry point delegates work to a dedicated service module.",
            },
            {
                "label": "Ignored hallucination",
                "file": "not-in-snapshot.py",
                "lines": "1-4",
                "note": "This must not reach the persisted analysis.",
            },
        ],
    }


def github_and_openrouter_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if request.url.host == "api.github.com" and path == "/repos/acme/queue-service":
        return httpx.Response(200, json={"default_branch": "main", "description": "A queue service", "language": "Python"})
    if request.url.host == "api.github.com" and path == "/repos/acme/queue-service/commits/main":
        return httpx.Response(200, json={"sha": "a" * 40})
    if request.url.host == "api.github.com" and path == f"/repos/acme/queue-service/git/trees/{'a' * 40}":
        return httpx.Response(
            200,
            json={
                "truncated": False,
                "tree": [
                    {"path": "README.md", "type": "blob", "size": 120},
                    {"path": "src/main.py", "type": "blob", "size": 180},
                    {"path": "tests/test_main.py", "type": "blob", "size": 150},
                    {"path": ".env", "type": "blob", "size": 20},
                    {"path": "package-lock.json", "type": "blob", "size": 10},
                ],
            },
        )
    if request.url.host == "raw.githubusercontent.com":
        contents = {
            "/acme/queue-service/" + "a" * 40 + "/README.md": "# Queue service\nA small task queue.",
            "/acme/queue-service/" + "a" * 40 + "/src/main.py": "from service import run\nrun()\n",
            "/acme/queue-service/" + "a" * 40 + "/tests/test_main.py": "def test_run():\n    assert True\n",
        }
        content = contents.get(path)
        if content is not None:
            return httpx.Response(200, text=content)
        return httpx.Response(404)
    if str(request.url) == OPENROUTER_COMPLETIONS_URL:
        request_body = json.loads(request.content)
        assert request.headers["Authorization"] == "Bearer test-openrouter-key"
        assert request_body["models"] == [
            "nvidia/nemotron-3-super-120b-a12b:free",
            "openai/gpt-4.1-mini",
        ]
        assert request_body["provider"] == {"require_parameters": True}
        assert request_body["response_format"]["json_schema"]["strict"] is True
        user_message = request_body["messages"][1]["content"]
        assert "src/main.py" in user_message
        assert ".env" not in user_message
        return httpx.Response(
            200,
            json={
                "model": "nvidia/nemotron-3-super-120b-a12b:free",
                "choices": [{"message": {"content": json.dumps(analysis_payload())}}],
            },
        )
    raise AssertionError(f"Unexpected request: {request.method} {request.url}")


@pytest.mark.asyncio
async def test_repository_evaluation_reads_bounded_github_context_and_validates_result() -> None:
    service = RepositoryEvaluationService(
        Settings(openrouter_api_key="test-openrouter-key"),
        transport=httpx.MockTransport(github_and_openrouter_handler),
    )

    result = await service.evaluate(
        "https://github.com/acme/queue-service",
        RepositoryEvaluationContext(
            role_title="Backend Engineer",
            challenge_title="Build a queue",
            challenge_description="Build a resilient queue service with documented retries.",
            skills=("Python", "Postgres"),
        ),
    )

    assert result.commit_sha == "a" * 40
    assert result.model == "nvidia/nemotron-3-super-120b-a12b:free"
    assert result.analysis.overall_score == 84
    assert [item.file for item in result.analysis.evidence] == ["src/main.py"]


@pytest.mark.asyncio
async def test_repository_evaluation_rejects_missing_openrouter_key() -> None:
    service = RepositoryEvaluationService(Settings(openrouter_api_key=None))

    with pytest.raises(RepositoryEvaluationError, match="not configured"):
        await service.evaluate(
            "https://github.com/acme/queue-service",
            RepositoryEvaluationContext(
                role_title="Backend Engineer",
                challenge_title="Build a queue",
                challenge_description="Build a resilient queue service with documented retries.",
                skills=("Python",),
            ),
        )


@pytest.mark.asyncio
async def test_repository_evaluation_retries_transient_openrouter_failure() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        if str(request.url) == OPENROUTER_COMPLETIONS_URL:
            attempts += 1
            if attempts == 1:
                return httpx.Response(503, headers={"Retry-After": "0"})
        return github_and_openrouter_handler(request)

    service = RepositoryEvaluationService(
        Settings(openrouter_api_key="test-openrouter-key"),
        transport=httpx.MockTransport(handler),
    )
    result = await service.evaluate(
        "https://github.com/acme/queue-service",
        RepositoryEvaluationContext(
            role_title="Backend Engineer",
            challenge_title="Build a queue",
            challenge_description="Build a resilient queue service with documented retries.",
            skills=("Python",),
        ),
    )

    assert result.analysis.overall_score == 84
    assert attempts == 2


@pytest.mark.asyncio
async def test_repository_evaluation_retries_invalid_free_output_with_paid_fallback() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        if str(request.url) == OPENROUTER_COMPLETIONS_URL:
            attempts += 1
            request_body = json.loads(request.content)
            if attempts == 1:
                assert request_body["models"][0] == "nvidia/nemotron-3-super-120b-a12b:free"
                return httpx.Response(
                    200,
                    json={
                        "model": "nvidia/nemotron-3-super-120b-a12b:free",
                        "choices": [{"message": {"content": "not valid json"}}],
                    },
                )
            assert request_body["model"] == "openai/gpt-4.1-mini"
            return httpx.Response(
                200,
                json={
                    "model": "openai/gpt-4.1-mini",
                    "choices": [{"message": {"content": json.dumps(analysis_payload())}}],
                },
            )
        return github_and_openrouter_handler(request)

    service = RepositoryEvaluationService(
        Settings(openrouter_api_key="test-openrouter-key"),
        transport=httpx.MockTransport(handler),
    )
    result = await service.evaluate(
        "https://github.com/acme/queue-service",
        RepositoryEvaluationContext(
            role_title="Backend Engineer",
            challenge_title="Build a queue",
            challenge_description="Build a resilient queue service with documented retries.",
            skills=("Python",),
        ),
    )

    assert result.model == "openai/gpt-4.1-mini"
    assert result.analysis.overall_score == 84
    assert attempts == 2


@pytest.mark.asyncio
async def test_repository_evaluation_rejects_private_repository_before_model_call() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.github.com" and request.url.path == "/repos/acme/private-service":
            return httpx.Response(200, json={"private": True, "default_branch": "main"})
        raise AssertionError(f"Unexpected request after private-repository check: {request.url}")

    service = RepositoryEvaluationService(
        Settings(openrouter_api_key="test-openrouter-key"),
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(RepositoryEvaluationError, match="must be public"):
        await service.evaluate(
            "https://github.com/acme/private-service",
            RepositoryEvaluationContext(
                role_title="Backend Engineer",
                challenge_title="Build a queue",
                challenge_description="Build a resilient queue service with documented retries.",
                skills=("Python",),
            ),
        )


def test_analysis_prompt_bounds_opportunity_text_and_rejects_control_character_paths() -> None:
    repository = parse_github_repository_url("https://github.com/acme/queue-service")
    snapshot = RepositorySnapshot(
        repository=repository,
        commit_sha="a" * 40,
        description=None,
        language="Python",
        default_branch="main",
        tree_truncated=False,
        files=(RepositoryFile(path="src/main.py", content="print('ok')"),),
    )
    messages = RepositoryEvaluationService._build_messages(
        snapshot,
        RepositoryEvaluationContext(
            role_title="Backend Engineer",
            challenge_title="Build a queue",
            challenge_description="x" * MAX_CHALLENGE_CHARACTERS + "SHOULD_NOT_APPEAR",
            skills=("s" * 101,),
        ),
    )

    assert "SHOULD_NOT_APPEAR" not in messages[1]["content"]
    assert "s" * 101 not in messages[1]["content"]
    assert RepositoryEvaluationService._is_supported_path("src/bad\nname.py") is False


def test_openrouter_model_routing_deduplicates_fallbacks() -> None:
    settings = Settings(
        openrouter_model="nvidia/nemotron-3-super-120b-a12b:free",
        openrouter_fallback_models="openai/gpt-4.1-mini, nvidia/nemotron-3-super-120b-a12b:free",
    )

    assert settings.openrouter_models == [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openai/gpt-4.1-mini",
    ]


def test_structured_response_requires_actual_model_attribution() -> None:
    body = {"choices": [{"message": {"content": json.dumps(analysis_payload())}}]}

    with pytest.raises(ValueError, match="model attribution"):
        RepositoryEvaluationService._parse_analysis_response(body)


@pytest.mark.parametrize(
    "url",
    [
        "http://github.com/acme/queue-service",
        "https://github.com/acme/queue-service/tree/main",
        "https://github.com/acme/queue-service?tab=readme",
        "https://github.com/acme/queue service",
        "https://example.com/acme/queue-service",
    ],
)
def test_parse_github_repository_url_rejects_noncanonical_urls(url: str) -> None:
    with pytest.raises(ValueError):
        parse_github_repository_url(url)


def test_parse_github_repository_url_accepts_git_suffix() -> None:
    repository = parse_github_repository_url("https://github.com/acme/queue-service.git")

    assert repository.slug == "acme/queue-service"
