from __future__ import annotations

import base64
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.html"
REPORT_SCRIPT = ROOT / "assets" / "report-content.js"
MARKET_CSV = ROOT / "market_data" / "weekly_workpapers" / "weekly_market_2026-08-07_2026-09-04_daily.csv"
FORMULA_JSON = ROOT / "market_data" / "formula_data.json"


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


@st.cache_data(show_spinner=False)
def build_embedded_page() -> str:
    """Build a self-contained copy of the existing HTML app for Streamlit Cloud."""
    html = INDEX_FILE.read_text(encoding="utf-8")
    csv_text = MARKET_CSV.read_text(encoding="utf-8")
    formula_text = FORMULA_JSON.read_text(encoding="utf-8")

    # The browser app expects fetch() calls. Resolve those calls from embedded data
    # so the iframe remains independent of Streamlit's static-file routing.
    fetch_expression = (
        "Promise.all([fetch(CSV).then(r=>r.text()),fetch(FORMULA).then(r=>r.json())])"
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

components.html(build_embedded_page(), height=5200, scrolling=True)
