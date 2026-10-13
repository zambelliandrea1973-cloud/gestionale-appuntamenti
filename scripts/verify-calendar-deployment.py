"""Check public release metadata and frontend bytes; never log in or access user data."""
import argparse
import json
from pathlib import Path
import re
import time
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ORIGIN = "https://gestionale-appuntamenti.sliplane.app"


def fetch(url):
    request = Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "Calendar-release-verifier"})
    with urlopen(request, timeout=15) as response:
        if urlparse(response.url).netloc != urlparse(ORIGIN).netloc:
            raise ValueError("Unexpected redirect away from the application")
        return response.headers.get("Content-Type", ""), response.read(16 * 1024 * 1024).decode("utf-8", "replace")


def verify(expected, reader=fetch):
    content_type, body = reader(ORIGIN + "/api/calendar-release")
    if "application/json" not in content_type:
        raise ValueError("The live server does not expose the updated release endpoint")
    if json.loads(body).get("release") != expected:
        raise ValueError("The live server is still serving a different release")
    _, html = reader(ORIGIN + "/")
    assets = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']', html, re.I)
    bundles = [urljoin(ORIGIN, asset) for asset in assets if "/assets/" in asset and ".js" in asset]
    if not bundles:
        raise ValueError("No production frontend bundle found")
    for bundle in bundles:
        if urlparse(bundle).netloc != urlparse(ORIGIN).netloc:
            continue
        if expected in reader(bundle)[1]:
            return
    raise ValueError("The served frontend does not contain the expected release")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeout", type=int, default=600)
    args = parser.parse_args()
    source = (Path(__file__).resolve().parents[1] / "shared/calendarRelease.ts").read_text()
    expected = re.search(r"CALENDAR_RELEASE\s*=\s*['\"]([^'\"]+)", source).group(1)
    deadline = time.monotonic() + args.timeout
    while True:
        try:
            verify(expected)
            print(f"Confirmed public server AND frontend release: {expected}", flush=True)
            return
        except Exception as error:
            # Never print response bodies: these are unnecessary to diagnose the release.
            reason = str(error) if isinstance(error, ValueError) else type(error).__name__
            if time.monotonic() >= deadline:
                raise SystemExit(f"Release {expected} was NOT confirmed: {reason}. Inspect Sliplane deployment logs.")
            print(f"Waiting for release {expected}: {reason}", flush=True)
            time.sleep(20)


if __name__ == "__main__":
    main()
