#!/usr/bin/env python3

import requests, json, os

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {os.getenv('OPEN_ROUTER_API')}",
    "Content-Type": "application/json",
}


def load(path):
    with open(path) as f:
        return json.dumps(json.load(f), separators=(",", ":"))


def get_score():
    example   = load("example.json")
    applicant = load("applicant.json")
    company   = load("company.json")

    system = f"""You match an applicant profile against a company profile.
    Match the categories, then output a score from 0 to 100 and a reason for that score.
    Respond with JSON only, no markdown fences, matching this schema:
    {example}"""

    user = f"""<applicant>
    {applicant}
    </applicant>

    <company>
    {company}
    </company>"""

    payload = {
        "model": "nvidia/nemotron-3.5-lightning",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }

    r = requests.post(url, headers=headers, json=payload)
    r.raise_for_status()
    result = json.loads(r.json()["choices"][0]["message"]["content"])

    result["fit"] = round(
        (result['skill']['score'] +
         result['seniority']['score'] +
         result['logistics']['score'] +
         result['comp']['score'] +
         result['trajectory']['score']) / 5
    )

    with open('output.json', mode='w+') as f:
        f.write(json.dumps(result, indent=2))


if __name__ == "__main__":
    get_score()
