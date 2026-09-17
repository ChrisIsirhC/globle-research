# 海外策略研究平台

这是一个以周报为研究主线、联动全球资产和宏观数据的研究平台。原始前端保留在 `index.html`；`app.py` 将页面及运行所需的 CSV、JSON、周报正文、封面和 PDF 内嵌后交给 Streamlit 展示，因此可直接部署到 Streamlit Community Cloud。

## 本地运行

最简方式是在项目根目录双击：

- `启动研究平台.cmd`：启动本地平台，浏览器地址为 `http://localhost:4173/`。
- `更新数据并启动平台.cmd`：逐步显示刷新状态与实际覆盖日期，并将摘要写入根目录的 `更新摘要.txt` 和 `update_summary.json`。完成后可选择立即启动平台。

当前四周市场行情会写入 `market_data/weekly_workpapers/weekly_market_current_daily.csv`，历史日期版底稿会保留在同一目录，便于回溯。

周报库的研究周目录在 `assets/report-versions/test-library.json`，按报告日期降序展示。每个版本同时冻结 PDF、市场快照与分析内容；切换研究周会同步首页、全球资产、宏观政策、商品和国家页面。历史版本首次接入时由 `tools/create_historical_review_content.py` 生成逐句路由草稿，`tools/audit_review_coverage.py` 用于检查原文句子是否在审核稿中保留；审核稿仍需人工确认后才能进入发布流程。

也可以手工运行：

```bash
python -m pip install -r requirements.txt
streamlit run app.py
```

## Streamlit Cloud 配置

- Repository：选择本仓库
- Branch：`main`
- Main file path：`app.py`
- Python：使用 Streamlit Cloud 默认 Python 版本即可

每次将更新后的 `index.html`、`assets/` 或 `market_data/` 提交到仓库后，Streamlit Cloud 会重新构建并展示最新内容。
