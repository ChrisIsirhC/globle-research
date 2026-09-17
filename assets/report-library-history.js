/* Test-only research-week history library.
   It switches frozen report text and frozen market snapshots, never publication state. */
(() => {
  'use strict';

  const CONFIG = 'assets/report-versions/test-library.json?v=20260916b';
  const countryKey = {美国:'us',德国:'de',法国:'fr',日本:'jp',韩国:'kr',巴西:'br',沙特:'sa',印度:'in'};
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const markdown = value => escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong class="degree">$1</strong>').replace(/\n/g, '<br>');
  const byId = id => document.getElementById(id);
  const blockPages = block => (block.source_pages || []).map(page => `第 ${page} 页`).join('、');
  const parseRows = text => text.trim().split(/\r?\n/).slice(1).map(line => {
    const [category, asset_name, code, date, value] = line.split(',');
    return {category, asset_name, code, date, value:+value};
  }).filter(row => Number.isFinite(row.value));

  const historyStyle = document.createElement('style');
  historyStyle.textContent = `
    .report-library-modal .history-report{position:relative;display:grid;grid-template-columns:122px minmax(0,1fr) auto;gap:22px;align-items:center;padding:20px 22px;border:1px solid var(--line);border-radius:4px;background:var(--paper);overflow:hidden}.report-library-modal .history-report + .history-report{margin-top:10px}.history-report:before{position:absolute;z-index:2;inset:0 auto 0 0;width:3px;background:var(--amber);content:""}.history-report.active{border-color:#103d30;background:radial-gradient(ellipse 70% 125% at 100% 0,rgba(213,170,83,.12),transparent 55%),linear-gradient(105deg,#0c3025,#164838);color:#fff}.history-report.active:before{width:4px;background:#d8ad60}.history-report.active:after{position:absolute;z-index:0;inset:0;content:"";pointer-events:none;background-image:url("assets/patterns/seigaiha-amber-tile.png");background-repeat:repeat;background-position:0 0;background-size:215px auto;mask-image:linear-gradient(90deg,rgb(0 0 0 / .05) 0%,rgb(0 0 0 / .20) 100%);-webkit-mask-image:linear-gradient(90deg,rgb(0 0 0 / .05) 0%,rgb(0 0 0 / .20) 100%)}.history-report.active>div{position:relative;z-index:1}.history-report-date{color:var(--amber);font:650 22px/1 Georgia,"Songti SC",serif}.history-report.active .history-report-date,.history-report.active h2{color:#fff}.history-report-date small{display:block;margin-top:7px;color:#7a867e;font:800 9px "Cascadia Mono",monospace;letter-spacing:.1em}.history-report.active .history-report-date small{color:#ecd18d}.history-report h2{margin:0;color:var(--brand);font-size:17px}.history-report p{margin:7px 0 0;color:var(--muted);font-size:11px;line-height:1.6}.history-report.active p{color:#d4e0d8}.history-report-actions{display:flex;gap:8px;align-items:center}.history-report-actions button,.history-report-actions a{white-space:nowrap}.history-report.active .button{border-color:#d8ad60;background:#d8ad60;color:#163b2e}.history-report.active .button.ghost{border-color:rgba(255,255,255,.3);background:transparent;color:#fff}.archive-only{color:#8a7957;font:800 9px "Cascadia Mono",monospace;letter-spacing:.08em}
    .research-body{max-width:980px;color:#e1e9e3;font-size:13px;line-height:1.95}.research-body>p,.report-paragraphs>p{margin:0 0 16px}.research-body>p:last-child,.report-paragraphs>p:last-child{margin-bottom:0}.report-paragraphs{color:inherit;font-size:13px;line-height:1.95}.search-shell{position:relative;margin-left:auto;align-self:center}.search{margin-left:0}.search-results{position:absolute;top:calc(100% + 8px);right:0;z-index:30;display:none;width:min(560px,calc(100vw - 24px));max-height:490px;overflow:auto;border:1px solid rgba(18,61,49,.2);border-radius:5px;background:#fbfcf9;box-shadow:0 22px 58px rgba(9,35,26,.2)}.search-results.open{display:block}.search-result{display:block;width:100%;border:0;border-top:1px solid #e1e6e0;background:transparent;padding:13px 16px;color:var(--ink);text-align:left}.search-result:first-child{border-top:0}.search-result:hover,.search-result.active{background:#eef3ed}.search-result small{display:block;margin-bottom:5px;color:#718178;font:800 9px "Cascadia Mono",monospace;letter-spacing:.08em}.search-result strong{display:block;font:650 13px/1.45 Georgia,"Songti SC",serif}.search-result p{display:-webkit-box;margin:5px 0 0;overflow:hidden;color:#5f6c64;font-size:11px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.search-result mark{background:transparent;color:#9b691d;font-weight:900}.search-empty{padding:19px 16px;color:#738078;font-size:12px}.search-count{padding:10px 16px;border-bottom:1px solid #e1e6e0;color:#738078;font:800 9px "Cascadia Mono",monospace;letter-spacing:.08em}
    .report-week-marker{display:inline-flex;align-items:center;gap:8px;margin-top:7px;color:#aec1b5;font:800 9px "Cascadia Mono",monospace;letter-spacing:.1em}.report-week-marker i{width:6px;height:6px;border-radius:50%;background:#d1a154}.report-week-marker.review{color:#f0d99d}
    .history-report-actions{position:relative;z-index:1}.research-body>p,.report-paragraphs>p{margin-bottom:20px}.search-results{width:min(600px,calc(100vw - 24px))}
    @media(max-width:1080px){.search-shell{order:3;width:100%;padding:0 0 8px}.search-shell .search{display:block;width:100%;height:32px}.search-results{right:0}}
    @media(max-width:700px){.report-library-modal .history-report{grid-template-columns:1fr;gap:11px;padding:16px}.history-report-actions{flex-wrap:wrap}.search-results{right:-6px;width:calc(100vw - 24px)}}
  `;
  document.head.appendChild(historyStyle);

  let catalog = null;
  let active = null;
  let reviewContent = null;
  let ready = false;
  let legacy = null;
  let legacyFxView = null;
  let legacyMarket = null;
  let legacyComparisonBars = null;
  let searchEntries = [];
  let searchActiveIndex = -1;

  function currentBlocks() { return reviewContent?.blocks || []; }
  function findBlock(section, module) { return currentBlocks().find(block => block.section === section && block.module === module); }
  function blocksForCountry(key, matcher) {
    const name = Object.entries(countryKey).find(([,value]) => value === key)?.[0];
    return currentBlocks().filter(block => block.section === '国家研究' && block.country === name && matcher.test(block.module));
  }
  function paragraphHtml(value) {
    return String(value || '').split(/\n+/).filter(Boolean).map(paragraph => `<p>${markdown(paragraph)}</p>`).join('');
  }
  function blockAnchor(block) { return `research-${String(block.section || '').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g,'-')}-${String(block.country || 'global').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g,'-')}-${String(block.module || '').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g,'-')}`; }
  function sourceBlocks(blocks) {
    if (!blocks.length) return '<p class="research-empty">本期周报未覆盖该研究维度。</p>';
    return blocks.map(block => `<section class="source-block" data-search-anchor="${blockAnchor(block)}"><header><b>${escapeHtml(block.module)}</b></header><div class="research-body">${paragraphHtml(block.body_markdown)}</div></section>`).join('');
  }
  function reportUrl(version) { return `report_versions/${version.report_date}/source/report.pdf`; }
  function isReview() { return active?.content?.kind === 'review-json'; }
  function period() { return active?.window || {from:'2026-08-28',to:'2026-09-04'}; }

  function currentRangeLabel() {
    const range = period();
    return `${range.from} - ${range.to}`;
  }

  function replaceChangeHelpers() {
    mChange = name => {
      const s = mSeries(name), range = period(), start = s.find(row => row.date === range.from), end = s.find(row => row.date === range.to) || s.filter(row => row.date <= range.to).at(-1);
      return start && end ? (end.value / start.value - 1) * 100 : null;
    };
    periodChange = (series, from = period().from, to = period().to) => {
      const start = series.find(row => row.date === from), end = series.find(row => row.date === to) || series.filter(row => row.date <= to).at(-1);
      return start && end ? {v:(end.value / start.value - 1) * 100, from:start.date, to:end.date} : null;
    };
    yChange = key => {
      const s = fSeries('yields', key), range = period(), end = s.find(row => row.date === range.to) || s.filter(row => row.date <= range.to).at(-1), start = s.find(row => row.date === range.from) || s.filter(row => row.date <= range.from).at(-1);
      return start && end && start.date !== end.date ? {bp:(end.value - start.value) * 100, from:start.date, to:end.date} : null;
    };
  }

  function renderWeekSelector() {
    byId('research-week-switcher')?.remove();
  }

  function renderLibraryList() {
    const list = byId('report-list');
    if (!list || !catalog) return;
    const versions = [...catalog.versions].sort((a,b) => b.report_date.localeCompare(a.report_date));
    list.innerHTML = versions.map(version => `<article class="history-report ${version.id === active.id ? 'active' : ''}"><div class="history-report-date">${version.label}<small>${version.badge}</small></div><div><h2>${escapeHtml(version.headline)}</h2><p>${version.state === 'review' ? '已冻结研报与市场数据，内容仍处于审核预览。' : '历史研究周，研报、分析文本与市场数据均已冻结。'}</p></div><div class="history-report-actions">${version.content.kind === 'archive-pdf' ? '<span class="archive-only">仅原文存档</span>' : `<button class="button ${version.id === active.id ? 'ghost' : ''}" type="button" data-research-week="${version.id}">${version.id === active.id ? '当前研究周' : '切换到研究周'}</button>`}<a class="button ghost" target="_blank" href="${reportUrl(version)}">打开原文</a></div></article>`).join('');
  }

  function weeklyKeypoints() {
    const titles = new Set(['开篇判断','全球市场表现','通胀与油价共振','定价分化']);
    return currentBlocks().filter(block => block.section === '首页' && titles.has(block.module) && block.page_route.startsWith('周报库 >'));
  }

  function weeklyNextFocus() {
    return currentBlocks().find(block =>
      block.section === '首页' &&
      block.module === '下周关注' &&
      block.page_route === '周报库 > 周报要点 > 下周关注'
    );
  }

  function sentenceParagraphs(value) {
    const sentences = String(value || '').replace(/\s*\n\s*/g, ' ').trim().match(/[^。！？]+[。！？]?/g) || [];
    return sentences.map(sentence => `<p>${markdown(sentence.trim())}</p>`).join('');
  }

  function homeOverviewParagraphs() {
    return currentBlocks().filter(block => block.section === '首页' && block.page_route.startsWith('首页 >') && block.content_ref).map(reference => {
      const source = currentBlocks().find(block => block.page_route === reference.content_ref);
      if (!source || source.module !== reference.module || source.body_markdown !== reference.body_markdown) {
        console.warn('首页概览段落的 Markdown 内容复用未通过校验：', reference.content_ref);
        return reference;
      }
      // Render from the weekly-report block itself. The home block only carries routing metadata.
      return {...source, content_ref: reference.content_ref, homepage_route: reference.page_route};
    });
  }

  function renderReport() {
    if (!isReview()) { legacy.reportView(); renderWeekSelector(); renderLibraryList(); return; }
    const headline = findBlock('首页','头条'), keypoints = weeklyKeypoints(), nextFocus = weeklyNextFocus();
    byId('report-title').textContent = `${active.label} 周报要点`;
    byId('report-meta').textContent = '策略支持组策略研究周报 · 当前研究周';
    byId('report-library-current').textContent = `${active.label.replace('.', ' 年 ').replace('.', ' 月 ')} 日`;
    byId('report-headline').innerHTML = markdown(headline?.body_markdown || active.headline);
    byId('report-summary').innerHTML = `<span class="report-week-marker"><i></i>周报概览原文 · 研究周 ${active.label}</span>`;
    byId('report-views').innerHTML = keypoints.map((block,index) => `<article class="view"><b>原文 ${String(index + 1).padStart(2,'0')}</b><h3>${escapeHtml(block.module)}</h3><div class="report-paragraphs">${paragraphHtml(block.body_markdown)}</div></article>`).join('');
    const verify = byId('report-verify');
    const verifyTitle = verify?.closest('.verify')?.querySelector('h2');
    const verifyKicker = verify?.closest('.verify')?.querySelector('.kicker');
    if (verifyTitle) verifyTitle.textContent = '下周关注';
    if (verifyKicker) verifyKicker.textContent = 'WEEK AHEAD';
    if (verify) verify.innerHTML = nextFocus ? `<div class="report-paragraphs">${sentenceParagraphs(nextFocus.body_markdown)}</div>` : '<p class="research-empty">本期周报未列出下周关注。</p>';
    renderWeekSelector(); renderLibraryList();
  }

  function renderHome() {
    if (!isReview()) { legacy.home(); return; }
    const headline = findBlock('首页','头条'), themes = findBlock('首页','周报主线'), overview = homeOverviewParagraphs();
    const closing = overview.find(block => block.module === '下周关注');
    const narrativeBlocks = overview.filter(block => block.module !== '下周关注');
    const themeRows = String(themes?.body_markdown || '').split(/\n+/).filter(Boolean);
    const themeCards = themeRows.map((row, index) => `<article class="home-thread"><small>${String(index + 1).padStart(2,'0')}</small><strong>${markdown(row.replace(/^\d+\.\s*/,''))}</strong></article>`).join('');
    const narrative = narrativeBlocks.map((block,index) => `<article class="home-reading-card" data-content-ref="${escapeHtml(block.content_ref)}"><header><span>${String(index + 1).padStart(2,'0')}</span><p class="kicker">周报概览</p></header><h2>${escapeHtml(block.module)}</h2><div class="report-paragraphs">${paragraphHtml(block.body_markdown)}</div></article>`).join('');
    const closingMarkup = closing ? `<article class="home-closing" data-content-ref="${escapeHtml(closing.content_ref)}"><header><p class="kicker">${escapeHtml(closing.module)}</p></header><div class="report-paragraphs">${paragraphHtml(closing.body_markdown)}</div></article>` : '';
    byId('screen-overview').innerHTML = `<section class="home-overview" aria-label="${active.label} 周报概览"><article class="home-lead"><div class="home-lead-copy"><p class="eyebrow">WEEKLY OVERVIEW · ${active.label}</p><h1>${markdown(headline?.body_markdown || active.headline)}</h1><div class="home-reading-meta"><span>策略支持组策略研究周报</span><strong>当前研究周</strong><a href="#" data-go="reports">查看周报要点 →</a></div></div><aside class="home-threads"><p class="kicker">周报主线</p><div>${themeCards}</div></aside></article><section class="home-narrative" aria-label="周报概览原文">${narrative}</section>${closingMarkup}</section>`;
    bind();
  }

  function renderAssetNote(id, key, channel) {
    if (!isReview()) { legacy.assetNote(id, key, channel); return; }
    const root = byId(id); if (!root) return;
    const text = String(channel || '');
    const matcher = /fx|汇率/.test(text) ? /美元|欧元|日元|韩元|雷亚尔|卢比|汇率/ : /rates|债券|利率/.test(text) ? /债券|利率/ : /权益|行业|股市/;
    let blocks = blocksForCountry(key, matcher);
    if (!blocks.length) {
      const module = /fx|汇率/.test(text) ? '汇率' : /rates|债券|利率/.test(text) ? '利率' : '权益';
      blocks = currentBlocks().filter(block => block.section === '全球资产' && block.module === module);
    }
    const countryName = COUNTRIES?.[key]?.n || '';
    root.style.display = blocks.length ? 'block' : 'none';
    root.innerHTML = blocks.length ? `<div class="country-tag"><strong>${countryName || '全球资产'}</strong><small>本周分析 · ${active.label}</small></div><div class="research-copy">${sourceBlocks(blocks)}</div><button class="text-link" data-country-link="${key}">进入${countryName}研究 →</button>` : '';
  }

  function renderCommodityNote() {
    if (!isReview()) { legacy.commodityNote(); return; }
    const oil = byId('commodity-oil-research'), metal = byId('commodity-metals-research');
    if (oil) oil.innerHTML = sourceBlocks(currentBlocks().filter(block => block.section === '商品' && block.module === '能源'));
    if (metal) metal.innerHTML = sourceBlocks(currentBlocks().filter(block => block.section === '商品' && block.module === '贵金属'));
  }

  function renderMacroNote() {
    if (!isReview()) { legacy.macroResearchNote(); return; }
    const root = byId('macro-analysis'); if (!root) return;
    const blocks = blocksForCountry(macroFocus, /经济数据|通胀|增长|物价|就业|景气/);
    root.style.display = blocks.length ? 'block' : 'none';
    root.innerHTML = blocks.length ? `<div class="country-tag"><strong>${COUNTRIES[macroFocus].n}</strong><small>宏观数据 · ${active.label}</small></div><div class="research-copy">${sourceBlocks(blocks)}</div>` : '';
  }

  function renderPolicyNote(key) {
    if (!isReview()) { legacy.policyResearchNote(key); return; }
    const root = byId('rate-analysis'); if (!root) return;
    const keys = rateCountry === 'eu' ? ['de','fr'] : [key];
    const blocks = keys.flatMap(item => blocksForCountry(item, /央行|政策|利率/));
    root.style.display = blocks.length ? 'block' : 'none';
    root.innerHTML = blocks.length ? `<div class="country-tag"><strong>${rateCountry === 'eu' ? '欧元区' : COUNTRIES[key].n}</strong><small>央行与政策 · ${active.label}</small></div><div class="research-copy">${sourceBlocks(blocks)}</div>` : '';
  }

  function renderCountry() {
    legacy.countryView();
    if (!isReview()) return;
    const root = byId('country-analysis'), name = Object.entries(countryKey).find(([,value]) => value === country)?.[0], blocks = currentBlocks().filter(block => block.section === '国家研究' && block.country === name);
    if (root && blocks.length) root.innerHTML = sourceBlocks(blocks);
    const lead = blocks[0]?.body_markdown?.replace(/\*\*/g, '').split('。')[0];
    if (lead) byId('country-lead').textContent = `${lead}。`;
    if (byId('country-pages')) byId('country-pages').textContent = `策略支持组策略研究周报 · ${active.label}`;
    bind();
  }

  function cleanText(value) { return String(value || '').replace(/\*\*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function inferSearchDestination(route, countryName) {
    if (route.startsWith('首页')) return {screen:'overview'};
    if (route.startsWith('全球资产')) return {screen:'markets'};
    if (route.startsWith('央行与政策')) return {screen:'policy'};
    if (route.startsWith('商品')) return {screen:'commodities'};
    return {screen:'countries', country:countryKey[countryName]};
  }
  function buildSearchIndex() {
    const entries = [];
    const push = (route, title, body, countryName = null) => { if (body || title) entries.push({route,title,body:cleanText(body),...inferSearchDestination(route,countryName)}); };
    if (isReview()) {
      currentBlocks().forEach(block => push(block.page_route, block.module, block.body_markdown, block.country));
    } else {
      const currentReport = REPORTS[report];
      if (currentReport) {
        push('首页 > 周报概览', currentReport.headline, currentReport.summary);
        (currentReport.views || []).forEach(([title,body]) => push('首页 > 周报概览', title, body));
      }
      Object.entries(COUNTRIES).forEach(([key, info]) => (info.s || []).forEach(([title,body]) => push(`国家 > ${info.n} > ${title}`, title, body, info.n)));
      (OIL_0906 || []).forEach(item => push('商品 > 能源', item.title, item.body));
      (METALS_0906 || []).forEach(item => push('商品 > 贵金属', item.title, item.body));
    }
    searchEntries = entries;
  }
  function escapePattern(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(value, query) { return escapeHtml(value).replace(new RegExp(`(${escapePattern(query)})`, 'gi'), '<mark>$1</mark>'); }
  function contextFor(entry, query) {
    const source = `${entry.title} ${entry.body}`, index = source.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (index < 0) return source.slice(0, 130);
    const start = Math.max(0, index - 46), end = Math.min(source.length, index + query.length + 92);
    return `${start ? '…' : ''}${source.slice(start,end)}${end < source.length ? '…' : ''}`;
  }
  function closeSearch() { const box = byId('search-results'); if (box) { box.classList.remove('open'); box.innerHTML = ''; } searchActiveIndex = -1; }
  function renderSearch(query) {
    const box = byId('search-results'); if (!box) return;
    const normalized = query.trim(); if (!normalized) { closeSearch(); return; }
    const matched = searchEntries.filter(entry => `${entry.route} ${entry.title} ${entry.body}`.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())).sort((a,b) => `${b.title} ${b.body}`.toLocaleLowerCase().indexOf(normalized.toLocaleLowerCase()) - `${a.title} ${a.body}`.toLocaleLowerCase().indexOf(normalized.toLocaleLowerCase()));
    const results = matched.slice(0,12);
    box.classList.add('open');
    box.innerHTML = results.length ? `<div class="search-count">全局搜索 · ${matched.length} 项匹配${matched.length > results.length ? '（展示前 12 项）' : ''} · ${active.label}</div>${results.map((entry,index) => `<button class="search-result ${index === searchActiveIndex ? 'active' : ''}" type="button" data-search-result="${index}"><small>${highlight(entry.route,normalized)}</small><strong>${highlight(entry.title,normalized)}</strong><p>${highlight(contextFor(entry,normalized),normalized)}</p></button>`).join('')}` : '<div class="search-empty">未找到匹配的标题或正文。</div>';
    box._results = results;
  }
  function goSearchResult(index) {
    const box = byId('search-results'), entry = box?._results?.[index]; if (!entry) return;
    if (entry.country) country = entry.country;
    nav(entry.screen);
    requestAnimationFrame(() => {
      const matching = currentBlocks().find(block => block.page_route === entry.route && block.module === entry.title && (!entry.country || block.country === Object.entries(countryKey).find(([,key]) => key === entry.country)?.[0]));
      const target = matching && document.querySelector(`[data-search-anchor="${blockAnchor(matching)}"]`);
      target?.scrollIntoView({behavior:'smooth', block:'center'});
    });
    closeSearch();
    byId('search').value = '';
  }
  function bindSearch() {
    const input = byId('search'), box = byId('search-results'); if (!input || !box || input.dataset.bound) return;
    input.dataset.bound = 'true';
    input.addEventListener('input', () => { searchActiveIndex = -1; renderSearch(input.value); });
    input.addEventListener('focus', () => { if (input.value.trim()) renderSearch(input.value); });
    input.addEventListener('keydown', event => {
      const results = box._results || [];
      if (event.key === 'Escape') { closeSearch(); input.blur(); }
      if (!results.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); searchActiveIndex = event.key === 'ArrowDown' ? Math.min(results.length - 1, searchActiveIndex + 1) : Math.max(0, searchActiveIndex - 1); renderSearch(input.value); }
      if (event.key === 'Enter' && searchActiveIndex >= 0) { event.preventDefault(); goSearchResult(searchActiveIndex); }
    });
    document.addEventListener('click', event => { const result = event.target.closest?.('[data-search-result]'); if (result) { goSearchResult(+result.dataset.searchResult); return; } if (!event.target.closest?.('.search-shell')) closeSearch(); });
  }

  async function switchVersion(id) {
    const target = catalog?.versions.find(version => version.id === id);
    if (!target || target.id === active?.id || !ready) return;
    const [csv, formula, content] = await Promise.all([
      fetch(target.market_snapshot.rows).then(response => { if (!response.ok) throw new Error('无法读取市场快照'); return response.text(); }),
      fetch(target.market_snapshot.formula).then(response => { if (!response.ok) throw new Error('无法读取宏观快照'); return response.json(); }),
      target.content.kind === 'review-json' ? fetch(target.content.path).then(response => response.json()) : Promise.resolve(null),
    ]);
    active = target; reviewContent = content; rows = parseRows(csv); f = formula; report = target.content.kind === 'legacy-script' ? target.id : report;
    if (typeof hiddenSeries !== 'undefined') Object.values(hiddenSeries).forEach(set => set.clear());
    buildSearchIndex(); renderHome(); market(); policyView(); commodities(); renderCountry(); renderReport(); bind();
    const dialog = byId('report-library-dialog'); if (dialog?.open) dialog.close();
  }

  function installOverrides() {
    legacy = {home, reportView, countryView, assetNote, commodityNote, macroResearchNote, policyResearchNote};
    legacyComparisonBars = comparisonBars;
    comparisonBars = function historyComparisonBars(id, items, opt = {}) {
      if (!isReview()) return legacyComparisonBars(id, items, opt);
      const range = period();
      const detail = value => String(value || '').replace(/\d{4}-\d{2}-\d{2}\s*至\s*\d{4}-\d{2}-\d{2}/g, `${range.from} 至 ${range.to}`);
      const adjustedItems = items.map(item => ({...item, detail: detail(item.detail)}));
      const adjusted = {...opt, range: id === 'yield-bars' ? `上一周收盘 ${range.from}，各市场截至最新有效日` : currentRangeLabel()};
      return legacyComparisonBars(id, adjustedItems, adjusted);
    };
    legacyMarket = market;
    market = function historyMarket() {
      legacyMarket();
      if (!isReview()) return;
      const range = period(), change = mChange(equity), node = byId('equity-change');
      if (node) {
        node.textContent = `较上周（${short(range.from)}-${short(range.to)}）${sign(change)}`;
        node.className = tone(change);
      }
      const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
      setText('#market-equity .section-desc', `主要股指与波动率的日频走势，以及 ${range.from} 至 ${range.to} 的周度表现。`);
      setText('#market-equity .performance-head p', `${range.from.replaceAll('-', '.')}–${range.to.replaceAll('-', '.')}，红涨绿跌`);
      setText('#market-bonds .performance-head p', `上一周收盘 ${range.from}，各市场截至最新有效日`);
      setText('#market-fx .performance-head p', `${range.from.replaceAll('-', '.')}–${range.to.replaceAll('-', '.')}，红涨绿跌`);
    };
    home = renderHome;
    reportView = renderReport;
    countryView = renderCountry;
    assetNote = renderAssetNote;
    commodityNote = renderCommodityNote;
    macroResearchNote = renderMacroNote;
    policyResearchNote = renderPolicyNote;
    legacyFxView = fxView;
    fxView = function historyFxView() {
      legacyFxView();
      if (isReview()) {
        const key = FX[fxPair]?.c;
        if (key) renderAssetNote('fx-analysis', key, 'fx');
        renderAssetNote('fx-dollar-analysis', 'us', 'fx');
      }
    };
    replaceChangeHelpers();
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-research-week]');
      if (!button) return;
      event.preventDefault();
      switchVersion(button.dataset.researchWeek).catch(error => console.error('研究周切换失败：', error));
    });
  }

  async function initialise() {
    try {
      catalog = await fetch(CONFIG).then(response => { if (!response.ok) throw new Error('无法读取研究周目录'); return response.json(); });
      active = catalog.versions.find(version => version.state === 'published') || catalog.versions.find(version => version.id === '20260906') || catalog.versions[0];
      const [csv, formula, content] = await Promise.all([
        fetch(active.market_snapshot.rows).then(response => { if (!response.ok) throw new Error('无法读取历史市场快照'); return response.text(); }),
        fetch(active.market_snapshot.formula).then(response => { if (!response.ok) throw new Error('无法读取历史宏观快照'); return response.json(); }),
        active.content.kind === 'review-json' ? fetch(active.content.path).then(response => { if (!response.ok) throw new Error('无法读取当前研究周内容'); return response.json(); }) : Promise.resolve(null),
      ]);
      rows = parseRows(csv);
      f = formula;
      reviewContent = content;
      report = active.content.kind === 'legacy-script' ? active.id : '20260906';
      const input = byId('search'); if (input) { input.placeholder = '全局搜索标题、正文与国家…'; input.setAttribute('aria-label', '全局搜索'); }
      ready = true;
      installOverrides();
      buildSearchIndex(); bindSearch(); renderHome(); market(); policyView(); commodities(); renderCountry(); renderReport(); bind();
    } catch (error) {
      console.error('历史周报库未加载：', error);
    }
  }

  window.addEventListener('load', initialise, {once:true});
})();
