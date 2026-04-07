(function () {
  // ---- Config ----
  const FONT_SIZE = 14;
  const LINE_HEIGHT = 26;
  const FONT = FONT_SIZE + 'px "JetBrains Mono", monospace';
  const PAD_X = 28;
  const PAD_Y = 24;
  const ANIM_DURATION = 350;

  const COL_BG        = '#131318';
  const COL_TEXT       = '#e4e4ef';
  const COL_DIM        = '#6e6e8a';
  const COL_GREEN      = '#4ade80';
  const COL_GREEN_BG   = 'rgba(74,222,128,0.10)';
  const COL_RED        = '#f87171';
  const COL_RED_BG     = 'rgba(248,113,113,0.10)';

  // ---- LCS line diff ----
  function diffLines(before, after) {
    const a = before.split('\n'), b = after.split('\n');
    const N = a.length, M = b.length;
    const dp = Array.from({ length: N + 1 }, () => new Uint16Array(M + 1));
    for (let i = 1; i <= N; i++)
      for (let j = 1; j <= M; j++)
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const ops = [];
    let i = N, j = M;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        ops.push({ t: 'k', v: a[--i] }); j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        ops.push({ t: 'd', v: a[--i] });
      } else {
        ops.push({ t: 'i', v: b[--j] });
      }
    }
    while (i > 0) ops.push({ t: 'd', v: a[--i] });
    while (j > 0) ops.push({ t: 'i', v: b[--j] });
    ops.reverse();
    return ops;
  }

  // ---- DOM ----
  const canvas  = document.getElementById('codeCanvas');
  const ctx     = canvas.getContext('2d');
  const $pf     = document.getElementById('progFill');
  const $ab     = document.getElementById('animateBtn');
  const $rb     = document.getElementById('resetBtn');
  const $sp     = document.getElementById('speedSlider');
  const $sv     = document.getElementById('speedVal');
  const $ld     = document.getElementById('liveDot');
  const $si     = document.getElementById('stepIndicator');
  const $tabs   = document.getElementById('stepsTabs');
  const $panels = document.getElementById('stepsPanels');
  const $addBtn = document.getElementById('addStepBtn');

  const PLAY  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const PAUSE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  const XICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  let dpr = window.devicePixelRatio || 1;
  let rafId = null;
  let running = false;

  // ---- Steps state ----
  let steps = [];
  let activeTabIdx = 0;

  const defaultSteps = [
    'const kineticConfig: Config = {\n  formulas: [\n    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",\n  ]\n}',
    'const kineticConfig: Config = {\n  formulas: [\n    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",\n  ],\n  variables: {\n    K: { name: "Kinetic Energy" },\n  },\n}',
    'const kineticConfig: Config = {\n  formulas: [\n    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",\n  ],\n  variables: {\n    K: { name: "Kinetic Energy", unit: "J" },\n    m: { name: "Mass", unit: "kg" },\n    v: { name: "Velocity", unit: "m/s" },\n  },\n}',
  ];

  function addStep(content) {
    const idx = steps.length;
    steps.push(content || '');

    // Create tab
    const tab = document.createElement('div');
    tab.className = 'step-tab';
    tab.dataset.idx = idx;
    tab.innerHTML = '<span class="step-num">' + (idx + 1) + '</span>'
      + '<span class="step-label">Step ' + (idx + 1) + '</span>'
      + '<button class="step-remove">' + XICON + '</button>';
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.step-remove')) return;
      switchTab(parseInt(tab.dataset.idx));
    });
    tab.querySelector('.step-remove').addEventListener('click', () => {
      removeStep(parseInt(tab.dataset.idx));
    });
    $tabs.appendChild(tab);

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'step-panel';
    panel.dataset.idx = idx;
    const ta = document.createElement('textarea');
    ta.spellcheck = false;
    ta.placeholder = 'Paste code for step ' + (idx + 1) + '...';
    ta.value = content || '';
    ta.addEventListener('input', () => {
      steps[parseInt(panel.dataset.idx)] = ta.value;
    });
    ta.addEventListener('keydown', handleTab);
    panel.appendChild(ta);
    $panels.appendChild(panel);

    switchTab(idx);
    updateRemoveButtons();
  }

  function removeStep(idx) {
    if (steps.length <= 2) return;
    steps.splice(idx, 1);
    rebuildTabs();
  }

  function rebuildTabs() {
    $tabs.innerHTML = '';
    $panels.innerHTML = '';
    const saved = steps.slice();
    steps = [];
    const newActive = Math.min(activeTabIdx, saved.length - 1);
    saved.forEach(s => {
      const i = steps.length;
      steps.push(s);

      const tab = document.createElement('div');
      tab.className = 'step-tab';
      tab.dataset.idx = i;
      tab.innerHTML = '<span class="step-num">' + (i + 1) + '</span>'
        + '<span class="step-label">Step ' + (i + 1) + '</span>'
        + '<button class="step-remove">' + XICON + '</button>';
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.step-remove')) return;
        switchTab(parseInt(tab.dataset.idx));
      });
      tab.querySelector('.step-remove').addEventListener('click', () => {
        removeStep(parseInt(tab.dataset.idx));
      });
      $tabs.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'step-panel';
      panel.dataset.idx = i;
      const ta = document.createElement('textarea');
      ta.spellcheck = false;
      ta.placeholder = 'Paste code for step ' + (i + 1) + '...';
      ta.value = s;
      ta.addEventListener('input', () => {
        steps[parseInt(panel.dataset.idx)] = ta.value;
      });
      ta.addEventListener('keydown', handleTab);
      panel.appendChild(ta);
      $panels.appendChild(panel);
    });
    switchTab(newActive);
    updateRemoveButtons();
  }

  function switchTab(idx) {
    activeTabIdx = idx;
    $tabs.querySelectorAll('.step-tab').forEach((t, i) => {
      t.classList.toggle('active', i === idx);
    });
    $panels.querySelectorAll('.step-panel').forEach((p, i) => {
      p.classList.toggle('active', i === idx);
    });
  }

  function updateRemoveButtons() {
    const btns = $tabs.querySelectorAll('.step-remove');
    btns.forEach(b => {
      b.style.display = steps.length <= 2 ? 'none' : '';
    });
  }

  function handleTab(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  }

  // ---- Speed ----
  $sp.addEventListener('input', () => {
    $sv.textContent = ($sp.value / 5).toFixed(1) + 'x';
  });
  function lineDelay() { return 150 / ($sp.value / 5); }

  // ---- Canvas ----
  function sizeCanvas(h) {
    const container = canvas.parentElement;
    const w = container.clientWidth;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearCanvas(h) {
    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, canvas.width / dpr, h);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawLines(lines) {
    ctx.font = FONT;
    ctx.textBaseline = 'top';

    let totalH = PAD_Y;
    for (const line of lines) {
      if (line.type === 'd' || line.type === 'i') {
        totalH += LINE_HEIGHT * line.progress;
      } else {
        totalH += LINE_HEIGHT;
      }
    }
    totalH += PAD_Y;
    totalH = Math.max(240, totalH);

    sizeCanvas(totalH);
    clearCanvas(totalH);
    ctx.font = FONT;
    ctx.textBaseline = 'top';

    let y = PAD_Y;
    for (const line of lines) {
      const text = line.text || '';

      if (line.type === 'k') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = COL_TEXT;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        y += LINE_HEIGHT;
      } else if (line.type === 'd') {
        const h = LINE_HEIGHT * line.progress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, canvas.width / dpr, h);
        ctx.clip();
        ctx.globalAlpha = line.progress * 0.6;
        ctx.fillStyle = COL_RED_BG;
        ctx.fillRect(0, y, canvas.width / dpr, LINE_HEIGHT);
        ctx.globalAlpha = line.progress;
        ctx.fillStyle = COL_RED;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      } else if (line.type === 'i') {
        const h = LINE_HEIGHT * line.progress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, canvas.width / dpr, h);
        ctx.clip();
        ctx.globalAlpha = line.progress * 0.6;
        ctx.fillStyle = COL_GREEN_BG;
        ctx.fillRect(0, y, canvas.width / dpr, LINE_HEIGHT);
        ctx.globalAlpha = line.progress;
        ctx.fillStyle = COL_GREEN;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      }
    }
  }

  function drawStaticText(text) {
    const lines = text.split('\n');
    const h = Math.max(240, PAD_Y * 2 + lines.length * LINE_HEIGHT);
    sizeCanvas(h);
    clearCanvas(h);
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL_TEXT;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], PAD_X, PAD_Y + i * LINE_HEIGHT + (LINE_HEIGHT - FONT_SIZE) / 2);
    }
  }

  function drawPlaceholder() {
    sizeCanvas(240);
    clearCanvas(240);
    ctx.font = '14px "DM Sans", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL_DIM;
    ctx.globalAlpha = 0.5;
    ctx.fillText('Press Animate All to see the transitions...', PAD_X, PAD_Y + (LINE_HEIGHT - FONT_SIZE) / 2);
    ctx.globalAlpha = 1;
  }

  // ---- Animate a single transition, returns a Promise ----
  function animateTransition(before, after, progressCb) {
    return new Promise((resolve) => {
      const ops = diffLines(before, after);
      const delOps = [];
      const insOps = [];
      ops.forEach((op, i) => {
        if (op.t === 'd') delOps.push(i);
        if (op.t === 'i') insOps.push(i);
      });
      const totalSteps = delOps.length + insOps.length;

      if (totalSteps === 0) {
        drawStaticText(after);
        progressCb(1);
        resolve();
        return;
      }

      const lineStates = ops.map(op => ({
        text: op.v,
        type: op.t,
        progress: op.t === 'i' ? 0 : 1,
        animating: false,
        animStart: 0,
      }));

      let step = 0;
      const delay = lineDelay();
      const startTime = performance.now();

      drawLines(lineStates);

      function tick(now) {
        if (!running) { resolve(); return; }

        const elapsed = now - startTime - 300;
        if (elapsed < 0) {
          rafId = requestAnimationFrame(tick);
          return;
        }

        const targetStep = Math.min(totalSteps, Math.floor(elapsed / delay) + 1);

        while (step < targetStep) {
          if (step < delOps.length) {
            const idx = delOps[step];
            lineStates[idx].animating = true;
            lineStates[idx].animStart = now;
          } else {
            const idx = insOps[step - delOps.length];
            lineStates[idx].animating = true;
            lineStates[idx].animStart = now;
          }
          step++;
        }

        let anyAnimating = false;
        for (const ls of lineStates) {
          if (!ls.animating) continue;
          const t = Math.min(1, (now - ls.animStart) / ANIM_DURATION);
          const eased = easeOutCubic(t);
          if (ls.type === 'd') {
            ls.progress = 1 - eased;
          } else if (ls.type === 'i') {
            ls.progress = eased;
          }
          if (t >= 1) {
            ls.animating = false;
            ls.progress = ls.type === 'd' ? 0 : 1;
          } else {
            anyAnimating = true;
          }
        }

        drawLines(lineStates);
        progressCb(Math.min(step, totalSteps) / totalSteps);

        if (step < totalSteps || anyAnimating) {
          rafId = requestAnimationFrame(tick);
        } else {
          setTimeout(() => {
            drawStaticText(after);
            resolve();
          }, 200);
        }
      }

      rafId = requestAnimationFrame(tick);
    });
  }

  // ---- Main animation across all steps ----
  function halt() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    running = false;
    $ld.classList.remove('on');
    $ab.innerHTML = PLAY + ' Animate All';
    $si.textContent = '';
  }

  async function animateAll() {
    if (running) { halt(); return; }
    if (steps.length < 2) return;

    running = true;
    $ld.classList.add('on');
    $ab.innerHTML = PAUSE + ' Pause';

    const totalTransitions = steps.length - 1;

    for (let i = 0; i < totalTransitions; i++) {
      if (!running) break;

      $si.textContent = 'Step ' + (i + 1) + ' → ' + (i + 2);

      await animateTransition(steps[i], steps[i + 1], (p) => {
        const overallProgress = (i + p) / totalTransitions;
        $pf.style.width = (overallProgress * 100) + '%';
      });

      // Brief pause between transitions
      if (running && i < totalTransitions - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (running) {
      $pf.style.width = '100%';
      halt();
    }
  }

  function reset() {
    halt();
    drawPlaceholder();
    $pf.style.width = '0%';
  }

  $ab.addEventListener('click', animateAll);
  $rb.addEventListener('click', reset);
  $addBtn.addEventListener('click', () => addStep(''));

  // Handle resize
  window.addEventListener('resize', () => {
    dpr = window.devicePixelRatio || 1;
    if (!running) drawPlaceholder();
  });

  // Initialize with default steps
  document.fonts.ready.then(() => {
    dpr = window.devicePixelRatio || 1;
    defaultSteps.forEach(s => addStep(s));
    switchTab(0);
    drawPlaceholder();
  });
})();
