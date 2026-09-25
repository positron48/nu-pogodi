(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = key => NP_I18N.t(key);
  const cpu = new SM5A(NP_ROM);
  const buttons = [...document.querySelectorAll('[data-key]')];
  const inputs = new Map();
  const releases = new Map();
  const dialog = $('instructions');
  const keyMap = {KeyQ:'upLeft', KeyA:'downLeft', KeyP:'upRight', KeyL:'downRight',
                  KeyO:'upRight', Digit1:'gameA', Digit2:'gameB', KeyT:'time', KeyB:'alarm'};
  let paused = false;
  let hidden = document.hidden;
  let mode = 'time';
  let muted = false;
  let context, filter, volume, nextAudioTime = 0;
  let lastFrame = 0, fraction = 0;
  const audioNodes = new Set();

  // Classic scripts and embedded ROM/SVG keep file:// working without fetch or a server.
  $('lcd').innerHTML = NP_ARTWORK;
  const segments = [...$('lcd').querySelectorAll('[data-segment]')].map(element => ({
    element, index: Number(element.dataset.segment), on: false,
  }));

  function render() {
    for (const segment of segments) {
      const on = !!cpu.segments[segment.index];
      if (on !== segment.on) {
        segment.element.classList.toggle('on', on);
        segment.on = on;
      }
    }
  }

  function stopAudio() {
    for (const node of audioNodes) { try { node.stop(); } catch {} }
    audioNodes.clear();
    nextAudioTime = 0;
  }
  function unlockAudio() {
    if (muted) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context) {
        context = new Audio({latencyHint:'interactive'});
        filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 180;
        const lowpass = context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 6500;
        volume = context.createGain();
        volume.gain.value = 0.5;
        filter.connect(lowpass).connect(volume).connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Browsers without audio support still run the original game. */ }
  }
  function playSamples(samples) {
    if (!samples || !context || context.state !== 'running') return;
    const buffer = context.createBuffer(1, samples.length, SM5A.FREQUENCY);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(filter);
    const now = context.currentTime;
    if (nextAudioTime < now || nextAudioTime > now + 0.12) nextAudioTime = now + 0.025;
    source.start(nextAudioTime);
    nextAudioTime += samples.length / SM5A.FREQUENCY;
    audioNodes.add(source);
    source.onended = () => { audioNodes.delete(source); source.disconnect(); };
  }

  function updateKeys() {
    cpu.keys = [...inputs.values()].reduce((mask, input) => mask | SM5A.BUTTONS[input.name], 0);
    buttons.forEach(button => button.classList.toggle('pressed', !!(cpu.keys & SM5A.BUTTONS[button.dataset.key])));
  }
  function release(token, immediate = false) {
    const input = inputs.get(token);
    if (!input) return;
    clearTimeout(releases.get(token));
    const remaining = immediate ? 0 : Math.max(0, 65 - (performance.now() - input.since));
    if (remaining) {
      releases.set(token, setTimeout(() => release(token, true), remaining));
    } else {
      inputs.delete(token);
      releases.delete(token);
      updateKeys();
    }
  }
  function clearInputs() {
    for (const timer of releases.values()) clearTimeout(timer);
    releases.clear();
    inputs.clear();
    updateKeys();
  }
  function status() {
    $('pause').setAttribute('aria-pressed', String(paused));
    $('pause').querySelector('span').textContent = t(paused ? 'resume' : 'pause');
    $('sound').querySelector('span').textContent = t(muted ? 'muted' : 'sound');
    $('status').textContent = t(paused ? 'paused' : mode);
  }
  function press(token, name) {
    if (dialog.open) return;
    unlockAudio();
    clearTimeout(releases.get(token));
    releases.delete(token);
    if (inputs.has(token)) return;
    if (paused && (name === 'gameA' || name === 'gameB' || name === 'time')) togglePause(false);
    if (paused) return;
    inputs.set(token, {name, since: performance.now()});
    updateKeys();
    if (['gameA','gameB','time','alarm'].includes(name)) { mode = name; status(); }
  }
  function togglePause(value = !paused) {
    paused = value;
    clearInputs();
    stopAudio();
    lastFrame = 0;
    if (!paused) unlockAudio();
    status();
  }

  for (const button of buttons) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press(`pointer${event.pointerId}`, button.dataset.key);
    });
    button.addEventListener('pointerup', event => release(`pointer${event.pointerId}`));
    button.addEventListener('pointercancel', event => release(`pointer${event.pointerId}`, true));
    button.addEventListener('lostpointercapture', event => release(`pointer${event.pointerId}`));
    // Keyboard activation and assistive technologies send a click without a pointer event.
    button.addEventListener('click', event => {
      if (event.detail !== 0) return;
      const token = `activation${button.dataset.key}`;
      press(token, button.dataset.key);
      release(token);
    });
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  document.addEventListener('keydown', event => {
    if (dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    const name = keyMap[event.code];
    if (name) {
      event.preventDefault();
      if (!event.repeat) press(event.code, name);
      return;
    }
    // Preserve Space/Enter activation when a native button has keyboard focus.
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
    if (['Space','KeyM','KeyF'].includes(event.code)) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'Space') togglePause();
      if (event.code === 'KeyM') $('sound').click();
      if (event.code === 'KeyF') $('fullscreen').click();
    }
  });
  document.addEventListener('keyup', event => { if (keyMap[event.code]) release(event.code); });
  window.addEventListener('blur', clearInputs);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    clearInputs();
    stopAudio();
    lastFrame = 0;
  });
  $('sound').addEventListener('click', () => {
    muted = !muted;
    $('sound').setAttribute('aria-pressed', String(!muted));
    $('sound').querySelector('span').textContent = t(muted ? 'muted' : 'sound');
    if (muted) stopAudio(); else unlockAudio();
    try { localStorage.setItem('im02-muted', String(muted)); } catch {}
  });
  $('pause').addEventListener('click', () => togglePause());
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.body.requestFullscreen();
    } catch { $('status').textContent = t('fullscreenError'); }
  });
  $('help').addEventListener('click', () => { clearInputs(); stopAudio(); dialog.showModal(); lastFrame = 0; });
  dialog.addEventListener('close', () => { lastFrame = 0; });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  function boot() {
    clearInputs();
    stopAudio();
    cpu.reset();
    cpu.run(8192);
    cpu.keys = SM5A.BUTTONS.time;
    cpu.run(4096);
    cpu.keys = 0;
    cpu.run(4096);
    paused = false;
    mode = 'time';
    lastFrame = 0;
    fraction = 0;
    render();
    status();
  }
  $('set-time').addEventListener('click', () => {
    clearInputs();
    stopAudio();
    cpu.reset();
    paused = false;
    mode = 'setTime';
    lastFrame = 0;
    status();
  });
  try { if (localStorage.getItem('im02-muted') === 'true') $('sound').click(); } catch {}
  document.addEventListener('languagechange', status);
  boot();

  function frame(timestamp) {
    try {
      if (!paused && !hidden && !dialog.open) {
        if (lastFrame) {
          // Ignore long browser suspensions; never fast-forward through unseen gameplay.
          const elapsed = Math.min(timestamp - lastFrame, 100);
          const amount = elapsed * SM5A.FREQUENCY / 1000 + fraction;
          const clocks = Math.floor(amount);
          fraction = amount - clocks;
          const samples = !muted && context?.state === 'running' ? new Float32Array(clocks) : null;
          cpu.run(clocks, samples);
          playSamples(samples);
          render();
        }
        lastFrame = timestamp;
      } else lastFrame = 0;
      requestAnimationFrame(frame);
    } catch (error) {
      stopAudio();
      $('status').textContent = t('error');
      console.error(error);
    }
  }
  requestAnimationFrame(frame);
})();
