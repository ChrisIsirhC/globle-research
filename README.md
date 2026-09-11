# 海外策略研究平台

这是一个以周报为研究主线、联动全球资产和宏观数据的研究平台。原始前端保留在 `index.html`；`app.py` 将页面及运行所需的 CSV、JSON、周报正文、封面和 PDF 内嵌后交给 Streamlit 展示，因此可直接部署到 Streamlit Community Cloud。

## 本地运行

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
