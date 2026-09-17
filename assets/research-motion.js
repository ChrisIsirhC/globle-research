/* Motion choreography for the research terminal. It never changes market data or report copy. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    seenSingleStates: new Set(),
    seenMultiEntries: new Set(),
    visibleSeries: new Map(),
    pendingWeekSwitch: false,
  };
  const canAnimate = () => !reduceMotion.matches;
  const revealSelector = [
    '.screen.active > .head', '.screen.active .home-lead',
    '.screen.active .home-lead-data > article', '.screen.active .home-narrative > article',
    '.screen.active .home-closing', '.screen.active .reports > .reportmain',
    '.screen.active .reports > .verify', '.screen.active .panel',
    '.screen.active .country-nav', '.screen.active .intro',
    '.screen.active .country-data-workspace', '.screen.active .yieldgrid > .yield',
    '.screen.active .asset-research', '.screen.active #country-analysis > .analysis-row',
    '.screen.active .views > .view', '.screen.active .reportlist > .report',
    '.screen.active .quotes > article', '.screen.active .macro > article',
    '.screen.active .rate-snapshot > article'
  ].join(',');

  let revealObserver;
  let chartObserver;

  function chartRootFor(stage) { return stage.closest('[id]'); }
  function chartSignature(stage) {
    const svg = stage.querySelector('svg');
    if (!svg) return '';
    /* Geometry only: focus/opacity/label state is interactive and must not cancel a queued draw. */
    return `${svg.getAttribute('viewBox') || ''}|${[...svg.querySelectorAll('polyline, path')]
      .map(path => `${path.tagName}:${path.getAttribute('points') || path.getAttribute('d') || ''}:${path.getAttribute('stroke') || ''}`)
      .join('|')}`;
  }
  function screenKey(stage) {
    const screen = stage.closest('.screen');
    return `${screen?.id || 'workspace'}:${screen?.dataset.motionEpoch || '0'}`;
  }
  function seriesSelector(series) {
    return series?.length ? series.map(key => `[data-motion-series="${CSS.escape(key)}"]`).join(',') : 'polyline, path';
  }
  function markerSelector(series) {
    return series?.length ? series.map(key => `[data-motion-marker="${CSS.escape(key)}"]`).join(',') : '[data-motion-marker]';
  }

  /* Annotate the existing renderers instead of changing their data or SVG geometry. */
  function annotateSingle(root) {
    if (!root) return;
    root.dataset.motionKind = 'single';
    const stage = root.querySelector('.chart-stage');
    stage?.querySelectorAll('polyline, path').forEach(path => { path.dataset.motionSeries = 'single'; });
    stage?.querySelectorAll('circle:not(.dot)').forEach(marker => { marker.dataset.motionMarker = 'single'; });
  }
  function annotateMulti(root, entries, opt) {
    if (!root) return;
    root.dataset.motionKind = 'multi';
    if (opt?.step) root.dataset.motionStep = 'true'; else delete root.dataset.motionStep;
    const stage = root.querySelector('.chart-stage');
    if (!stage) return;
    const labels = [...stage.querySelectorAll('[data-series-toggle]')];
    const visible = labels
      .filter(label => label.dataset.seriesVisible !== 'false')
      .map(label => label.dataset.seriesToggle);
    const paths = [...stage.querySelectorAll('polyline, path')];
    const markers = [...stage.querySelectorAll('circle:not(.dot)')];
    paths.forEach((path, index) => {
      const key = visible[index] || entries?.[index]?.k;
      if (key) path.dataset.motionSeries = key;
      if (key && markers[index]) markers[index].dataset.motionMarker = key;
    });
    root.dataset.motionVisibleSeries = visible.join('|');
  }
  function addScaleGhost(root, priorStage) {
    if (!root || !priorStage) return;
    const priorSvg = priorStage.querySelector('svg');
    if (!priorSvg) return;
    root.style.position = 'relative';
    const ghost = document.createElement('div');
    ghost.className = 'motion-chart-ghost';
    ghost.append(priorSvg.cloneNode(true));
    root.append(ghost);
    requestAnimationFrame(() => ghost.classList.add('motion-settle'));
    window.setTimeout(() => ghost.remove(), 340);
  }
  function wrapRenderers() {
    if (window.__researchMotionRendererWrapped) return;
    const baseLine = window.line;
    const baseMultiLine = window.multiLine;
    const baseComparisonBars = window.comparisonBars;
    if (typeof baseLine === 'function') {
      window.line = function motionLine(id) {
        const result = baseLine.apply(this, arguments);
        const root = document.getElementById(id);
        annotateSingle(root);
        window.__prepareResearchMotionChart?.(root);
        return result;
      };
    }
    if (typeof baseMultiLine === 'function') {
      window.multiLine = function motionMultiLine(id, entries, opt) {
        const root = document.getElementById(id);
        const oldStage = root?.querySelector('.chart-stage');
        const before = root?.dataset.motionVisibleSeries || '';
        const result = baseMultiLine.apply(this, arguments);
        annotateMulti(root, entries, opt);
        const after = root?.dataset.motionVisibleSeries || '';
        if (before && before !== after) addScaleGhost(root, oldStage);
        window.__prepareResearchMotionChart?.(root);
        return result;
      };
    }
    if (typeof baseComparisonBars === 'function') {
      window.comparisonBars = function motionBars(id) {
        const result = baseComparisonBars.apply(this, arguments);
        const root = document.getElementById(id);
        if (root) root.dataset.motionKind = 'bar';
        window.__prepareResearchMotionChart?.(root);
        return result;
      };
    }
    window.__researchMotionRendererWrapped = true;
  }

  function prepareReveal(root = document) {
    if (!canAnimate()) return;
    root.querySelectorAll?.(revealSelector).forEach((node, index) => {
      if (node.dataset.motionReveal) return;
      node.dataset.motionReveal = 'true';
      node.style.transitionDelay = `${Math.min(index * 22, 176)}ms`;
      revealObserver.observe(node);
    });
  }
  function resetReveals(screen) {
    screen?.querySelectorAll?.('[data-motion-reveal]').forEach(node => {
      node.removeAttribute('data-motion-reveal');
      node.classList.remove('motion-visible');
      node.style.removeProperty('transition-delay');
    });
  }

  function primeLines(stage, targetSeries = []) {
    stage.querySelectorAll(seriesSelector(targetSeries)).forEach(path => {
      try {
        const length = path.getTotalLength();
        if (!Number.isFinite(length) || length <= 0) return;
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.transition = 'none';
      } catch (_) { /* SVG elements without a measurable length are skipped. */ }
    });
  }
  function primeMarkers(stage, targetSeries = []) {
    stage.querySelectorAll(markerSelector(targetSeries)).forEach(marker => {
      marker.style.transition = 'none';
      marker.style.opacity = '0';
    });
  }
  function fadeBars(stage) {
    const units = stage.querySelectorAll('.motion-bar-unit');
    if (units.length) {
      units.forEach(unit => {
        unit.dataset.motionBar = 'true';
        unit.style.opacity = '0';
      });
      return;
    }
    stage.querySelectorAll('rect:not(.hit):not(.multi-hit):not(.bar-hit)').forEach(bar => {
      const fill = bar.getAttribute('fill') || '';
      if (!fill || fill === 'transparent' || bar.closest('.series-label') || bar.closest('[data-series-toggle]')) return;
      bar.dataset.motionBar = 'true';
      bar.style.opacity = '0';
    });
  }
  function drawChart(stage, signature, targetSeries = []) {
    if (!stage.isConnected || chartSignature(stage) !== signature) return;
    requestAnimationFrame(() => {
      stage.querySelectorAll(seriesSelector(targetSeries)).forEach(path => {
        path.style.transition = 'stroke-dashoffset 540ms cubic-bezier(.16,1,.3,1)';
        path.style.strokeDashoffset = '0';
      });
      stage.querySelectorAll(markerSelector(targetSeries)).forEach(marker => {
        marker.style.transition = 'opacity 180ms cubic-bezier(.16,1,.3,1) 360ms';
        marker.style.removeProperty('opacity');
      });
      if (!targetSeries.length && stage.closest('[data-motion-kind="bar"]')) {
        stage.querySelectorAll('[data-motion-bar]').forEach((bar, index) => {
          bar.style.removeProperty('opacity');
          bar.classList.add('motion-bar');
          bar.style.animationDelay = `${Math.min(index * 18, 144)}ms`;
        });
      }
    });
  }
  function queueChart(stage, targetSeries = [], delay = 120) {
    const signature = chartSignature(stage);
    if (!signature) return;
    stage.dataset.motionChartSignature = signature;
    stage.dataset.motionTargetSeries = targetSeries.join('|');
    stage.dataset.motionChartDelay = String(delay);
    if (targetSeries.length || stage.closest('[data-motion-kind="bar"]')) {
      chartObserver.observe(stage);
      return;
    }
    chartObserver.observe(stage);
  }

  function prepareChartRoot(root) {
    if (!canAnimate() || !root) return;
    const stage = root.querySelector('.chart-stage');
    const screen = root.closest('.screen');
    if (!stage || !screen || !screen.classList.contains('active')) return;
    const kind = root.dataset.motionKind || (stage.querySelectorAll('polyline, path').length > 1 ? 'multi' : 'single');
    const entry = screenKey(stage);
    const parent = stage.closest('[data-motion-reveal]');
    const cardDelay = Number.parseInt(parent?.style.transitionDelay || '0', 10) || 0;
    const aboveFold = stage.getBoundingClientRect().top < window.innerHeight * .95;
    const delay = cardDelay + (aboveFold ? 110 : 150);

    if (kind === 'bar') {
      const key = `${entry}:${root.id}:bar`;
      if (state.seenMultiEntries.has(key)) return;
      state.seenMultiEntries.add(key);
      fadeBars(stage);
      queueChart(stage, [], delay);
      return;
    }
    if (kind === 'single') {
      const signature = chartSignature(stage);
      const key = `${entry}:${root.id}:${signature}`;
      if (state.seenSingleStates.has(key)) return;
      state.seenSingleStates.add(key);
      primeLines(stage);
      primeMarkers(stage);
      queueChart(stage, [], delay);
      return;
    }

    const visible = (root.dataset.motionVisibleSeries || '').split('|').filter(Boolean);
    const key = `${entry}:${root.id}`;
    const previous = state.visibleSeries.get(key);
    state.visibleSeries.set(key, new Set(visible));
    if (!state.seenMultiEntries.has(key)) {
      state.seenMultiEntries.add(key);
      primeLines(stage);
      primeMarkers(stage);
      queueChart(stage, [], delay);
      return;
    }
    const restored = visible.filter(series => !previous?.has(series));
    if (!restored.length) return;
    primeLines(stage, restored);
    primeMarkers(stage, restored);
    queueChart(stage, restored, 30);
  }
  function prepareCharts(root = document) {
    root.querySelectorAll?.('[data-motion-kind], [id]').forEach(node => {
      const isChartRoot = [...node.children].some(child => child.classList.contains('chart-stage'));
      if (isChartRoot) prepareChartRoot(node);
    });
  }

  function animateScreen(screen, weekSwitch = false) {
    if (!screen || !canAnimate()) return;
    screen.dataset.motionEpoch = String(Number.parseInt(screen.dataset.motionEpoch || '0', 10) + 1);
    resetReveals(screen);
    prepareReveal(screen);
    prepareCharts(screen);
    screen.classList.remove('motion-screen-in', 'motion-week-in');
    void screen.offsetWidth;
    screen.classList.add(weekSwitch ? 'motion-week-in' : 'motion-screen-in');
    window.setTimeout(() => screen.classList.remove('motion-screen-in', 'motion-week-in'), 560);
  }
  function installNavigationMotion() {
    if (window.__researchMotionNavigationInstalled || typeof window.nav !== 'function') return;
    const baseNav = window.nav;
    window.nav = function motionNav(name) {
      const result = baseNav.apply(this, arguments);
      animateScreen(document.getElementById(`screen-${name}`));
      return result;
    };
    window.__researchMotionNavigationInstalled = true;
  }
  function updateTopBar() {
    document.querySelector('.top')?.classList.toggle('motion-scrolled', window.scrollY > 8);
  }

  function install() {
    document.body.classList.add('motion-ready');
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('motion-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .06, rootMargin: '0px 0px -10px' });
    chartObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const stage = entry.target;
        chartObserver.unobserve(stage);
        const delay = Number.parseInt(stage.dataset.motionChartDelay || '120', 10);
        const series = (stage.dataset.motionTargetSeries || '').split('|').filter(Boolean);
        const signature = stage.dataset.motionChartSignature || chartSignature(stage);
        window.setTimeout(() => drawChart(stage, signature, series), delay);
      });
    }, { threshold: .08, rootMargin: '0px 0px -8px' });
    wrapRenderers();
    window.__prepareResearchMotionChart = root => prepareChartRoot(root);
    installNavigationMotion();
    animateScreen(document.querySelector('.screen.active'));
    updateTopBar();
    window.addEventListener('scroll', updateTopBar, { passive: true });

    const app = document.querySelector('.app');
    if (app) {
      new MutationObserver(records => {
        if (!records.some(record => record.addedNodes.length)) return;
        requestAnimationFrame(() => {
          const activeScreen = document.querySelector('.screen.active');
          if (state.pendingWeekSwitch) {
            state.pendingWeekSwitch = false;
            animateScreen(activeScreen, true);
            return;
          }
          prepareReveal(activeScreen || app);
          prepareCharts(activeScreen || app);
        });
      }).observe(app, { childList: true, subtree: true });
    }
    document.addEventListener('click', event => {
      if (!event.target.closest?.('[data-research-week]')) return;
      state.pendingWeekSwitch = true;
      window.setTimeout(() => { state.pendingWeekSwitch = false; }, 4000);
    }, true);
    reduceMotion.addEventListener?.('change', () => {
      if (reduceMotion.matches) document.querySelectorAll('[data-motion-reveal]').forEach(node => node.classList.add('motion-visible'));
    });
  }

  wrapRenderers();
  /* Loaded immediately before the initial data render so strokes are hidden before first paint. */
  install();
})();
