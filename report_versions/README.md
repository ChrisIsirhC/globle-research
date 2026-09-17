# 周报版本库

每一个目录是一份可回溯的研究周版本，而不是一份网页副本。内容、PDF 和市场数据快照冻结在同一个日期目录；通用网页代码和设计语言不按周复制。

```text
report_versions/YYYY-MM-DD/
├─ source/              PDF 副本、原文拆解和原文预览
├─ review/              待审核 Markdown、内容 JSON 和检查统计
├─ market_snapshot/     该版本使用的市场数据文件及快照索引
└─ manifest.json        当前版本唯一状态记录
```

## 状态流转

```text
review -> approved -> published
```

- `review`：内容已拆解、数据已冻结，仍可能包含待审核项；不会改变网页。
- `approved`：审核人明确确认后才可进入该状态。
- `published`：生成 `assets/report-versions/YYYY-MM-DD/content.json`，并更新 `assets/report-versions/current.json`。当前网页尚未读取这个内容包，接入版本选择器前不会改变网页展示。

## 使用方式

准备待审核版本：

```powershell
& 'C:\Users\chris\AppData\Local\Programs\Python\Python310\python.exe' tools\manage_weekly_report_version.py prepare --pdf <PDF路径> --review-draft <审核稿路径>
```

审核确认后批准。若检查报告仍有待审核项，必须显式确认：

```powershell
& 'C:\Users\chris\AppData\Local\Programs\Python\Python310\python.exe' tools\manage_weekly_report_version.py approve --date YYYY-MM-DD --approved-by <审核人> --acknowledge-unresolved
```

最后发布内容包：

```powershell
& 'C:\Users\chris\AppData\Local\Programs\Python\Python310\python.exe' tools\manage_weekly_report_version.py publish --date YYYY-MM-DD
```

`review/review_check.json` 是每周先看的检查摘要：内容块数量、页面分布、国家模块数量、缺失的路由/页码/原文依据/正文、覆盖审计和待审核项均在其中。
