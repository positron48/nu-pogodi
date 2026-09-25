(function () {
  'use strict';
  // Russian copy lives in the HTML; only trusted, bundled translations use innerHTML.
  const translations = [
    ['title', 'Nu, pogodi! — Elektronika IM-02'],
    ['meta[name="description"]', 'Play the original Elektronika IM-02 in your browser: original ROM, LCD screen, games A and B, clock and alarm.', 'content'],
    ['.masthead>div>span:last-child', 'POCKET ELECTRONIC GAME'],
    ['.model', 'IM-02 <span aria-hidden="true">/</span> 1984'],
    ['h1', 'Nu, pogodi! — Elektronika IM-02'],
    ['.game', 'Elektronika IM-02 game console', 'aria-label'],
    ['#lcd', 'Game LCD screen', 'aria-label'],
    ['.case', 'Nu, pogodi! game case with original Russian labels and buttons', 'alt'],
    ['.keyboard-guide', 'Keyboard controls', 'aria-label'],
    ['.keyboard-guide>span:nth-child(1)', '<kbd>Q</kbd><kbd>A</kbd> left'],
    ['.keyboard-guide>span:nth-child(3)', '<kbd>P</kbd><kbd>L</kbd> right'],
    ['.keyboard-guide>span:nth-child(5)', '<kbd>1</kbd><kbd>2</kbd> start game'],
    ['.touch-guide', 'Tap the red buttons on the case.<br>Turn your phone sideways for a larger view.'],
    ['.toolbar', 'Web version settings', 'aria-label'],
    ['#sound', 'Sound · M', 'title'],
    ['#pause', 'Pause · Space', 'title'],
    ['#fullscreen', 'Fullscreen · F', 'title'],
    ['#fullscreen span', 'Fullscreen'],
    ['#help', 'How to play <span aria-hidden="true">↗</span>'],
    ['.close', 'Close instructions', 'aria-label'],
    ['.eyebrow', 'ELEKTRONIKA IM-02'],
    ['#help-title', 'Nu, pogodi!'],
    ['#instructions>p:nth-of-type(1)', 'Catch eggs from four ramps in the basket. Each egg you catch earns one point.'],
    ['dt:nth-of-type(1)', 'Game A'],
    ['dd:nth-of-type(1)', 'Eggs roll down three ramps. The inactive ramp changes after misses.'],
    ['dt:nth-of-type(2)', 'Game B'],
    ['dd:nth-of-type(2)', 'All four ramps are active.'],
    ['dt:nth-of-type(3)', 'Misses'],
    ['dd:nth-of-type(3)', 'A broken egg adds one penalty. If the Hare is in the window, it adds half a penalty: the chick blinks. Three penalties end the game.'],
    ['dt:nth-of-type(4)', '200 &amp; 500'],
    ['dd:nth-of-type(4)', 'Penalties are cleared. After 999, the score rolls over to 000 and the game continues.'],
    ['#instructions>h3:nth-of-type(1)', 'Controls'],
    ['#instructions>p:nth-of-type(2)', '<kbd>Q</kbd> / <kbd>A</kbd> — top left / bottom left.<br><kbd>P</kbd> / <kbd>L</kbd> — top right / bottom right.<br><kbd>1</kbd> / <kbd>2</kbd> — game A / B. <kbd>T</kbd> — clock.<br><kbd>B</kbd> — alarm. <kbd>Space</kbd> — pause.<br>Use a mouse or touch to press the buttons on the case.'],
    ['#instructions>h3:nth-of-type(2)', 'Clock and alarm'],
    ['#clock-help', 'Press the small button below the clock icon. Set the hours with the left red buttons and the minutes with the right ones. Then press “ВРЕМЯ” (Time). ДП and ПП mean AM and PM.'],
    ['#instructions>p:nth-of-type(4)', 'To set the alarm, press the small button below the bell and adjust the time with the same red buttons. Press the bell button again to toggle the alarm. “ВРЕМЯ” (Time) finishes setup and silences the alarm.'],
    ['.fine-print', 'The web version pauses when you leave the tab. Pause, sound and fullscreen controls are below the case.'],
    ['details summary', 'About this version and sources'],
    ['details p:nth-of-type(1)', 'The browser runs the original IM-02 ROM on a KB1013VK1-2 / SM5A emulator. The ROM controls the segments, rules, speed, clock and sound effects.'],
    ['details p:nth-of-type(2)', 'The core is based on <a href="https://github.com/mamedev/mame/tree/master/src/devices/cpu/sm510" target="_blank" rel="noreferrer">MAME (hap, with contributions by Igor)</a>. Artwork: Lee Robson (hydef); background scan: Henrik Algestam. <a href="docs/SOURCES.md" target="_blank">Sources and accuracy notes (Russian)</a>.'],
  ];
  const controls = {
    upLeft: ['Top left', 'Q'], downLeft: ['Bottom left', 'A'],
    upRight: ['Top right', 'P'], downRight: ['Bottom right', 'L'],
    gameA: ['Game A', '1'], gameB: ['Game B', '2'], time: ['Time', 'T'], alarm: ['Alarm', 'B'],
  };
  for (const [key, [label, shortcut]] of Object.entries(controls)) {
    const selector = `[data-key="${key}"]`;
    translations.push([selector, `${label} · ${shortcut}`, 'title'], [selector, `${label} · ${shortcut}`, 'aria-label']);
    if (!key.includes('Left') && !key.includes('Right')) translations.push([`${selector} span`, label]);
  }
  translations.push(['#set-time', 'Set time', 'title'], ['#set-time', 'Set time', 'aria-label'], ['#set-time span', 'Set time']);
  const entries = translations.map(([selector, en, attribute]) => {
    const element = document.querySelector(selector);
    return {element, en, attribute, ru: attribute ? element.getAttribute(attribute) : element.innerHTML};
  });
  const messages = {
    ru: {pause:'Пауза', resume:'Продолжить', sound:'Звук', muted:'Без звука', paused:'Пауза · нажмите Пробел или «Продолжить»', time:'Нажмите «Игра А» или «Игра Б»', setTime:'Настройка времени · слева — часы, справа — минуты; затем «Время»', alarm:'Будильник · слева — часы, справа — минуты; затем «Время»', gameA:'Игра А · ловите яйца красными кнопками', gameB:'Игра Б · ловите яйца красными кнопками', fullscreenError:'Полноэкранный режим недоступен в этом браузере', error:'Ошибка эмулятора. Перезагрузите страницу.'},
    en: {pause:'Pause', resume:'Resume', sound:'Sound', muted:'Muted', paused:'Paused · press Space or “Resume”', time:'Press Game A (ИГРА А) or Game B (ИГРА Б)', setTime:'Set time · left: hours, right: minutes; then press Time (ВРЕМЯ)', alarm:'Alarm · left: hours, right: minutes; then press Time (ВРЕМЯ)', gameA:'Game A · catch eggs with the red buttons', gameB:'Game B · catch eggs with the red buttons', fullscreenError:'Fullscreen is unavailable in this browser', error:'Emulator error. Reload the page.'},
  };
  let language;
  function fromURL() {
    const requested = new URL(location.href).searchParams.get('lang');
    if (requested === 'en' || requested === 'ru') return requested;
    try { if (localStorage.getItem('im02-language') === 'en') return 'en'; } catch {}
    return 'ru';
  }
  function apply(next) {
    language = next;
    document.documentElement.lang = language;
    for (const entry of entries) {
      if (entry.attribute) entry.element.setAttribute(entry.attribute, entry[language]);
      else entry.element.innerHTML = entry[language];
    }
    document.querySelectorAll('.languages a').forEach(link => {
      const url = new URL(location.href);
      url.searchParams.set('lang', link.lang);
      link.href = url.href;
      if (link.lang === language) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    document.dispatchEvent(new Event('languagechange'));
  }
  window.NP_I18N = {t: key => messages[language][key]};
  document.querySelectorAll('.languages a').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    try { history.pushState(null, '', link.href); } catch { /* file:// may restrict history. */ }
    try { localStorage.setItem('im02-language', link.lang); } catch {}
    apply(link.lang);
  }));
  window.addEventListener('popstate', () => apply(fromURL()));
  apply(fromURL());
})();
