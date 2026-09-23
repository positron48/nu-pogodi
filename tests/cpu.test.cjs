const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {SM5A, ROM} = require('./helpers.cjs');

test('the bundled ROM is the original MAME IM-02/MC-25 dump', () => {
  assert.equal(ROM.length, 1856);
  assert.equal(crypto.createHash('sha1').update(ROM).digest('hex'), '7e94fc255f32db725d5aa9e196088e490c1a1443');
  assert.deepEqual(Buffer.from(ROM), fs.readFileSync('assets/im-02.bin'));
});
test('all 72 LCD pins exist exactly once in the supplied artwork', () => {
  const text = fs.readFileSync('js/artwork.js', 'utf8');
  const svg = JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;$/, ''));
  const pins = [...svg.matchAll(/data-segment="(\d+)"/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
  assert.deepEqual(pins, Array.from({length:72}, (_,i)=>i));
});
test('LFSR program counter visits all 63 instructions without crossing its page', () => {
  const c = new SM5A(ROM); c.pc = 0x400;
  const seen = new Set();
  for (let i=0;i<63;i++) { seen.add(c.pc); assert.equal(c.pc & ~63, 0x400); c.nextPC(); }
  assert.equal(seen.size, 63); assert.equal(c.pc, 0x400);
});
test('physical 65-nibble RAM and final ROM page mirror correctly', () => {
  const c = new SM5A(ROM);
  c.bm=7; c.bl=15; c.writeRAM(31);
  c.bm=4; c.bl=12; assert.equal(c.readRAM(), 15);
  for (const page of [0x740,0x780,0x7c0]) assert.equal(c.readROM(page+17), ROM[0x711]);
});
test('a skipped two-byte LBL consumes its operand without executing it', () => {
  const c = new SM5A(ROM); c.rom.fill(0); c.pc=0; c.rom[0]=0x5f; c.rom[0x20]=0x4c; c.skip=true;
  assert.equal(c.instruction(), 4); assert.equal(c.pc, 0x30);
  assert.equal(c.bl, 0); assert.equal(c.bm, 0); assert.equal(c.op, 0);
});
test('consecutive LAX and decimal ADX follow SM5A skip semantics', () => {
  const c = new SM5A(ROM); c.acc=3; c.op=0x2f; c.previousOp=0x22; c.execute(); assert.equal(c.acc,3);
  c.previousOp=0; c.execute(); assert.equal(c.acc,15);
  c.op=0x3a; c.execute(); assert.equal(c.acc,9); assert.equal(c.skip,false);
  c.op=0x3f; c.execute(); assert.equal(c.acc,8); assert.equal(c.skip,true);
});
test('divider runs while halted and gamma wakes the CPU', () => {
  const c = new SM5A(ROM); c.halt=true; c.gamma=0; c.div=0x7ffe;
  c.run(2); assert.equal(c.gamma,1); assert.equal(c.halt,true);
  c.run(2); assert.equal(c.halt,false); assert.equal(c.pc,0);
});
test('LCD persistence suppresses brief shift-register activity', () => {
  const c = new SM5A(ROM); c.o[0]=1;
  for(let i=0;i<7;i++)c.updateLCD(); assert.equal(c.segments[0],0);
  c.updateLCD(); assert.equal(c.segments[0],1);
  for(let i=0;i<17;i++)c.updateLCD(); c.o[0]=0;
  for(let i=0;i<17;i++)c.updateLCD(); assert.equal(c.segments[0],1);
  c.updateLCD(); assert.equal(c.segments[0],0);
});
test('rendering and audio chunk sizes do not change processor state', () => {
  const a=new SM5A(ROM), b=new SM5A(ROM);
  a.run(20000); for(let n=0;n<100;n++)b.run(200);
  for(const key of ['pc','acc','div','op','ticks','wait']) assert.equal(a[key], b[key], key);
  assert.deepEqual(a.ram,b.ram); assert.deepEqual(a.segments,b.segments);
});
