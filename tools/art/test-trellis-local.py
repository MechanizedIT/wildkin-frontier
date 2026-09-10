"""Run one reproducible, local TRELLIS.2 FastAPI image-to-GLB trial.

This script calls only a loopback server started from the TRELLIS portable
release. It does not send the image to a cloud service and uses no credentials.
Each output directory is deliberately single-use so a failed or successful run
cannot overwrite an earlier result.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = REPOSITORY_ROOT / ".dream-loop" / "all3d-targets" / "mossling-image3d-input.png"
POLL_SECONDS = 5.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Transparent PNG to send to local TRELLIS.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="A new, empty directory for raw.glb and trial metadata.",
    )
    parser.add_argument("--port", type=int, default=7960, help="Loopback TRELLIS FastAPI port.")
    parser.add_argument("--resolution", type=int, choices=(512, 1024), default=512, help="TRELLIS pipeline resolution.")
    parser.add_argument("--seed", type=int, default=1234, help="Fixed seed for reproducible comparison.")
    parser.add_argument("--faces", type=int, default=60000, help="GLB export decimation target, 10,000 through 1,000,000.")
    parser.add_argument("--texture-size", type=int, choices=(1024, 2048, 3072, 4096), default=1024)
    parser.add_argument("--steps", type=int, default=12, help="Inference steps for each of the three sampler stages.")
    parser.add_argument("--timeout-seconds", type=int, default=7200, help="HTTP timeout for a local generation request.")
    return parser.parse_args()


def read_json(url: str, timeout: int = 15) -> Any:
    with urlopen(url, timeout=timeout) as response:  # nosec B310: URL is constructed from loopback port
        return json.loads(response.read().decode("utf-8"))


def encode_multipart(fields: dict[str, str], file_field: str, file_path: Path) -> tuple[bytes, str]:
    boundary = f"----trellis-local-{uuid.uuid4().hex}"
    line = f"--{boundary}\r\n".encode("ascii")
    body = bytearray()
    for name, value in fields.items():
        body.extend(line)
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    body.extend(line)
    body.extend(
        f'Content-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'.encode("utf-8")
    )
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("ascii"))
    body.extend(file_path.read_bytes())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("ascii"))
    return bytes(body), boundary


class GpuPoller:
    """Collect lightweight nvidia-smi samples without affecting generation."""

    def __init__(self) -> None:
        self.samples: list[dict[str, Any]] = []
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="trellis-gpu-poller", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=POLL_SECONDS + 2)

    def _run(self) -> None:
        query = "name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw"
        while not self._stop.is_set():
            sample: dict[str, Any] = {"utc": datetime.now(timezone.utc).isoformat()}
            try:
                result = subprocess.run(
                    ["nvidia-smi", f"--query-gpu={query}", "--format=csv,noheader,nounits"],
                    capture_output=True,
                    text=True,
                    timeout=4,
                    check=False,
                )
                sample["returncode"] = result.returncode
                sample["rows"] = [row.strip() for row in result.stdout.splitlines() if row.strip()]
                if result.stderr.strip():
                    sample["stderr"] = result.stderr.strip()
            except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
                sample["error"] = str(exc)
            self.samples.append(sample)
            self._stop.wait(POLL_SECONDS)


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def fail(output_dir: Path, metadata: dict[str, Any], message: str) -> int:
    metadata["finished_utc"] = datetime.now(timezone.utc).isoformat()
    metadata["outcome"] = "failed"
    metadata["error"] = message
    write_json(output_dir / "trial.json", metadata)
    print(f"TRELLIS local trial failed: {message}", file=sys.stderr)
    print(f"Failure metadata: {output_dir / 'trial.json'}", file=sys.stderr)
    return 1


def main() -> int:
    args = parse_args()
    image_path = args.input.resolve()
    output_dir = args.output_dir.resolve()
    if not image_path.is_file():
        raise SystemExit(f"Input image does not exist: {image_path}")
    if not 10_000 <= args.faces <= 1_000_000:
        raise SystemExit("--faces must be between 10000 and 1000000.")
    if not 1 <= args.steps <= 50:
        raise SystemExit("--steps must be between 1 and 50.")
    if output_dir.exists():
        raise SystemExit(f"Refusing to reuse output directory: {output_dir}")
    output_dir.mkdir(parents=True)

    data = image_path.read_bytes()
    host = f"http://127.0.0.1:{args.port}/"
    fields = {
        "seed": str(args.seed),
        "guidance_scale": "7.5",
        "num_inference_steps": str(args.steps),
        "resolution": str(args.resolution),
        # The server expects thousands and multiplies this value by 1000.
        "mesh_simplify": str(args.faces // 1000),
        "apply_texture": "true",
        "texture_size": str(args.texture_size),
        "tex_rescale_t": "3.0",
        "tex_guidance_strength": "1.0",
        "output_format": "glb",
    }
    metadata: dict[str, Any] = {
        "runner": "tools/art/test-trellis-local.py",
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "input": {"path": str(image_path), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()},
        "endpoint": host,
        "parameters": {**fields, "decimation_target_faces": args.faces},
    }
    try:
        metadata["ping_before"] = read_json(urljoin(host, "ping"))
        metadata["status_before"] = read_json(urljoin(host, "status"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        return fail(output_dir, metadata, f"Local API is not ready at {host}: {exc}")

    payload, boundary = encode_multipart(fields, "file", image_path)
    request = Request(
        urljoin(host, "generate_no_preview"),
        data=payload,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "Content-Length": str(len(payload))},
    )
    poller = GpuPoller()
    started = time.monotonic()
    poller.start()
    try:
        with urlopen(request, timeout=args.timeout_seconds) as response:  # nosec B310: URL is loopback-only
            response_body = response.read().decode("utf-8")
            metadata["generation_http_status"] = response.status
        metadata["generation_response"] = json.loads(response_body)
    except HTTPError as exc:
        metadata["generation_http_status"] = exc.code
        metadata["generation_response_body"] = exc.read().decode("utf-8", errors="replace")
        metadata["elapsed_seconds"] = round(time.monotonic() - started, 3)
        poller.stop()
        metadata["gpu_samples"] = poller.samples
        return fail(output_dir, metadata, f"Generation API returned HTTP {exc.code}")
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        metadata["elapsed_seconds"] = round(time.monotonic() - started, 3)
        poller.stop()
        metadata["gpu_samples"] = poller.samples
        return fail(output_dir, metadata, f"Generation request failed: {exc}")
    finally:
        if not poller._stop.is_set():
            poller.stop()

    metadata["elapsed_seconds"] = round(time.monotonic() - started, 3)
    metadata["gpu_samples"] = poller.samples
    try:
        model_url = metadata["generation_response"]["model_url"]
        with urlopen(urljoin(host, model_url), timeout=120) as response:  # nosec B310: server returned loopback-relative path
            glb = response.read()
        if not glb:
            return fail(output_dir, metadata, "Local API returned an empty GLB download.")
        (output_dir / "raw.glb").write_bytes(glb)
        metadata["raw_glb"] = {"path": "raw.glb", "bytes": len(glb), "sha256": hashlib.sha256(glb).hexdigest()}
        metadata["status_after"] = read_json(urljoin(host, "status"))
    except (KeyError, HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        return fail(output_dir, metadata, f"Generation response did not yield a downloadable GLB: {exc}")

    metadata["finished_utc"] = datetime.now(timezone.utc).isoformat()
    metadata["outcome"] = "succeeded"
    write_json(output_dir / "trial.json", metadata)
    print(f"TRELLIS local trial succeeded in {metadata['elapsed_seconds']}s")
    print(f"GLB: {output_dir / 'raw.glb'}")
    print(f"Metadata: {output_dir / 'trial.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
