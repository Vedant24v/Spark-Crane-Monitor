import json
from pathlib import Path
from urllib import request


API_URL = "http://localhost:8000/api/readings"
SEED_FILE = Path(__file__).resolve().parents[2] / "readings_seed.json"


def main() -> None:
    readings = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    body = json.dumps(readings).encode("utf-8")
    req = request.Request(
        API_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with request.urlopen(req) as response:
        result = json.loads(response.read().decode("utf-8"))

    print(
        f"Seeded {result['inserted']} readings, {result['alerts_created']} alerts created"
    )


if __name__ == "__main__":
    main()
