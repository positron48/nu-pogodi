const SM5A = require('../js/sm5a');
const ROM = require('../js/rom');
// Pin identities are taken from the archived LCD SVG, not from the interpreter.
const tracks = [
  {name:'upLeft', key:8, path:[25,24,26,27,29]},
  {name:'downLeft', key:4, path:[28,30,31,17,16]},
  {name:'upRight', key:2, path:[57,71,70,68,69]},
  {name:'downRight', key:1, path:[66,67,64,65,7]},
];
function pulse(cpu, key) {
  cpu.keys = typeof key === 'string' ? SM5A.BUTTONS[key] : key;
  cpu.run(4096);
  cpu.keys = 0;
  cpu.run(4096);
}
function game(mode = 'gameA') {
  const cpu = new SM5A(ROM);
  cpu.run(8192);
  pulse(cpu, mode);
  return cpu;
}
// Read-only observation of the ROM's score digits; 0xb is a leading blank.
function score(cpu) { return [5,6,7].reduce((n, i) => n * 10 + (cpu.ram[i] < 10 ? cpu.ram[i] : 0), 0); }
function pilot(cpu) {
  let frame = 0;
  const arrival = new Map();
  const used = new Set();
  return {
    used,
    tick(override) {
      frame++;
      const urgent = [];
      for (const track of tracks) {
        for (const pin of track.path) {
          if (cpu.segments[pin]) {
            used.add(track.name);
            if (!arrival.has(pin)) arrival.set(pin, frame);
          } else arrival.delete(pin);
        }
        for (let stage = 4; stage >= 0; stage--) {
          const pin = track.path[stage];
          if (cpu.segments[pin]) { urgent.push({track, stage, arrival:arrival.get(pin)}); break; }
        }
      }
      urgent.sort((a,b) => b.stage-a.stage || a.arrival-b.arrival);
      const selected = urgent[0]?.track.key || cpu.keys;
      cpu.keys = override ? override(selected, urgent) : selected;
      cpu.run(512);
    },
    until(predicate, maxSeconds = 2000) {
      for (let n = 0; n < maxSeconds * 64; n++) {
        if (predicate()) return;
        this.tick();
      }
      throw new Error('ROM simulation timed out');
    },
  };
}
module.exports = {SM5A, ROM, tracks, pulse, game, score, pilot};
