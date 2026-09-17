from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.html"
REPORT_SCRIPT = ROOT / "assets" / "report-content.js"
CURRENT_MARKET_CSV = ROOT / "market_data" / "weekly_workpapers" / "weekly_market_current_daily.csv"
LEGACY_MARKET_CSV = ROOT / "market_data" / "weekly_workpapers" / "weekly_market_2026-08-07_2026-09-04_daily.csv"
FORMULA_JSON = ROOT / "market_data" / "formula_data.json"
MOTION_CSS = ROOT / "assets" / "research-motion.css"
MOTION_SCRIPT = ROOT / "assets" / "research-motion.js"
HISTORY_SCRIPT = ROOT / "assets" / "report-library-history.js"
HISTORY_CONFIG = ROOT / "assets" / "report-versions" / "test-library.json"


def _data_uri(path: Path) -> str:
    mime = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
    }.get(path.suffix.lower(), "application/octet-stream")
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _text_asset_map() -> dict[str, str]:
    """Return the frozen assets fetched by the research-week history library."""
    asset_map: dict[str, str] = {}
    for path in ROOT.glob("assets/report-versions/**/*.json"):
        asset_map[path.relative_to(ROOT).as_posix()] = path.read_text(encoding="utf-8")
    for path in ROOT.glob("report_versions/*/market_snapshot/*"):
        if path.suffix.lower() in {".csv", ".json"}:
            asset_map[path.relative_to(ROOT).as_posix()] = path.read_text(encoding="utf-8")
    return asset_map


def _binary_asset_map() -> dict[str, str]:
    """Expose report originals and the archive pattern without static-file routing."""
    paths = [
        ROOT / "assets" / "patterns" / "seigaiha-amber-tile.png",
        *(ROOT / "report_versions").glob("*/source/report.pdf"),
        *(ROOT / "assets" / "reports").glob("*.pdf"),
        *(ROOT / "assets").glob("strategy-weekly-*-cover.png"),
    ]
    return {
        path.relative_to(ROOT).as_posix(): _data_uri(path)
        for path in paths
        if path.is_file()
    }


def _fetch_bridge(text_assets: dict[str, str], binary_assets: dict[str, str]) -> str:
    """Serve relative assets from memory inside Streamlit's isolated iframe."""
    payload: dict[str, Any] = {**text_assets, **binary_assets}
    return f"""
<script>
(() => {{
  const assets = {json.dumps(payload, ensure_ascii=False)};
  const normalise = value => String(value || '').split('?')[0].replace(/^\.\//, '');
  const nativeFetch = window.fetch.bind(window);
  window.__embeddedAssetUrl = path => assets[normalise(path)] || path;
  window.fetch = (input, init) => {{
    const key = normalise(typeof input === 'string' ? input : input?.url);
    if (!(key in assets)) return nativeFetch(input, init);
    const value = assets[key];
    return Promise.resolve({{
      ok: true,
      status: 200,
      text: () => Promise.resolve(value),
      json: () => Promise.resolve(JSON.parse(value)),
    }});
  }};
}})();
</script>
"""


@st.cache_data(show_spinner=False)
def build_embedded_page() -> str:
    """Build a self-contained copy of the existing HTML app for Streamlit Cloud."""
    html = INDEX_FILE.read_text(encoding="utf-8")
    # The launcher creates the stable "current" file after each successful
    # update. Retain the original report-period workpaper as a first-run
    # fallback so the platform remains usable before the first refresh.
    market_csv = CURRENT_MARKET_CSV if CURRENT_MARKET_CSV.exists() else LEGACY_MARKET_CSV
    csv_text = market_csv.read_text(encoding="utf-8")
    formula_text = FORMULA_JSON.read_text(encoding="utf-8")

    # The browser app expects fetch() calls. Resolve those calls from embedded data
    # so the iframe remains independent of Streamlit's static-file routing.
    fetch_expression = (
        "Promise.all([loadCsv(),fetch(FORMULA).then(r=>r.json())])"
    )
    embedded_expression = (
        f"Promise.resolve([{json.dumps(csv_text, ensure_ascii=False)},"
        f"{formula_text}])"
    )
    html = html.replace(fetch_expression, embedded_expression)

    report_tag = '<script src="assets/report-content.js?v=20260911c"></script>'
    html = html.replace(
        report_tag,
        f"<script>\n{REPORT_SCRIPT.read_text(encoding='utf-8')}\n</script>",
    )

    # Inline every active interface dependency. The remaining fetch calls are
    # resolved by the in-memory bridge below, including frozen weekly snapshots.
    html = html.replace(
        '<link rel="stylesheet" href="assets/research-motion.css?v=20260916i">',
        f"<style>\n{MOTION_CSS.read_text(encoding='utf-8')}\n</style>",
    )
    html = html.replace(
        '<script src="assets/research-motion.js?v=20260916i"></script>',
        f"<script>\n{MOTION_SCRIPT.read_text(encoding='utf-8')}\n</script>",
    )
    history_source = HISTORY_SCRIPT.read_text(encoding="utf-8").replace(
        "function reportUrl(version) { return `report_versions/${version.report_date}/source/report.pdf`; }",
        "function reportUrl(version) { return window.__embeddedAssetUrl?.(`report_versions/${version.report_date}/source/report.pdf`) || `report_versions/${version.report_date}/source/report.pdf`; }",
    )
    history_source = history_source.replace(
        'url("assets/patterns/seigaiha-amber-tile.png")',
        f'url("{_data_uri(ROOT / "assets" / "patterns" / "seigaiha-amber-tile.png")}")',
    )
    history_tag = '<script src="assets/report-library-history.js?v=20260916b"></script>'
    html = html.replace(
        history_tag,
        _fetch_bridge(_text_asset_map(), _binary_asset_map()) + f"<script>\n{history_source}\n</script>",
    )

    # Reports are referenced from the data object by relative paths. Inline the
    # small set of user-facing binary assets so report links also work in Cloud.
    for relative in (
        "assets/strategy-weekly-20260906-cover.png",
        "assets/strategy-weekly-20260830-cover.png",
        "assets/reports/strategy-weekly-20260906.pdf",
        "assets/reports/strategy-weekly-20260830.pdf",
    ):
        html = html.replace(relative, _data_uri(ROOT / relative))

    return html


st.set_page_config(
    page_title="海外策略研究",
    page_icon="G",
    layout="wide",
    initial_sidebar_state="collapsed",
)
st.markdown(
    """
    <style>
      [data-testid="stHeader"] { display: none; }
      [data-testid="stToolbar"] { display: none; }
      [data-testid="stMainBlockContainer"] { padding: 0; max-width: none; }
      .stApp { background: #eef0ec; }
      iframe { border: 0; }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(build_embedded_page(), height=7200, scrolling=True)
