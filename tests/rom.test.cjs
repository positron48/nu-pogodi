const {test} = require('node:test');
const assert = require('node:assert/strict');
const {SM5A, ROM, pulse, game, score, pilot} = require('./helpers.cjs');

test('original ROM moves the basket to all four positions', () => {
  const c=game();
  for(const [key, body, basket] of [['upLeft',10,11],['downLeft',10,8],['upRight',13,15],['downRight',13,14]]) {
    pulse(c,key); assert.equal(c.segments[body],1,key); assert.equal(c.segments[basket],1,key);
  }
});
test('game A uses three lanes before any miss, game B uses all four', () => {
  for(const [mode,count] of [['gameA',3],['gameB',4]]) {
    const c=game(mode), p=pilot(c); p.until(()=>score(c)>=60);
    assert.equal(c.ram[0x2b],0); assert.equal(p.used.size,count);
    if(mode==='gameA') assert.equal(p.used.has('downLeft'),false);
  }
});
test('unassisted play ends at three whole penalties', () => {
  const c=game(); c.run(32*32768);
  assert.equal(c.ram[0x2b],3);
  assert.deepEqual([33,35,49].map(i=>c.segments[i]),[1,1,1]);
  const last=score(c); c.run(15*32768); assert.equal(score(c),last);
});
test('ROM clears an actual earned penalty at both 200 and 500', () => {
  const c=game(), p=pilot(c);
  for(const milestone of [200,500]) {
    p.until(()=>score(c)>=milestone-5);
    for(let n=0;n<64*20 && !c.ram[0x2b];n++) p.tick(key=>key===8?1:8);
    assert.ok(c.ram[0x2b]>0,'a real miss must be recorded before the milestone');
    p.until(()=>score(c)>=milestone+1);
    assert.equal(c.ram[0x2b],0,`reset at ${milestone}`);
    assert.deepEqual([33,35,49].map(i=>c.segments[i]),[0,0,0]);
  }
});
test('ROM rolls over 999, preserves the record and continues faster', () => {
  for(const mode of ['gameA','gameB']) {
    const c=game(mode), p=pilot(c);
    p.until(()=>score(c)===100); const first100=c.ticks;
    p.until(()=>score(c)===999); const before=c.ticks;
    p.until(()=>score(c)<10); assert.ok(c.ticks>before);
    p.until(()=>score(c)===100); const second100=c.ticks-before;
    assert.ok(second100<first100,'the second lap remains faster');
    const record = mode === 'gameA' ? 0x20 : 0x30;
    assert.deepEqual(Array.from(c.ram.slice(record,record+3)),[9,9,9]);
    assert.equal(c.ram[0x2b],0);
  }
});
test('clock is set through physical buttons and counts 60 seconds', () => {
  const c=new SM5A(ROM); c.run(8192);
  pulse(c,'upLeft'); pulse(c,'upRight'); pulse(c,'time');
  assert.deepEqual(Array.from(c.ram.slice(0x24,0x28)),[0,1,0,1]);
  c.run(60*32768);
  assert.deepEqual(Array.from(c.ram.slice(0x24,0x28)),[0,1,0,2]);
});
test('alarm mode and on/off bell are handled by the ROM', () => {
  const c=new SM5A(ROM); c.run(8192); pulse(c,'time'); pulse(c,'alarm');
  assert.equal(c.segments[36],1); // bell, separate from the hare's hand (37)
  pulse(c,'alarm'); assert.equal(c.segments[36],0);
  pulse(c,'alarm'); assert.equal(c.segments[36],1);
  pulse(c,'time');
});
test('gameplay generates the original R1 audio waveform', () => {
  const c=game(); const audio=new Float32Array(32768); c.run(32768,audio);
  let edges=0; for(let i=1;i<audio.length;i++) if(audio[i]!==audio[i-1])edges++;
  assert.ok(edges>10,`expected sound transitions, received ${edges}`);
  assert.ok(edges<16000);
});

test('a miss while the hare is present produces a blinking half penalty', () => {
  const c=game(), p=pilot(c);
  const finalEggs=[{pin:29,key:8},{pin:16,key:4},{pin:69,key:2},{pin:7,key:1}];
  let wrong=0;
  for(let f=0;f<64*30&&!wrong;f++) {
    const egg=finalEggs.find(e=>c.segments[e.pin]);
    if(c.segments[39]&&egg) wrong=egg.key===8?1:8;
    else p.tick();
  }
  assert.ok(wrong, 'find a real egg with the hare visible');
  for(let f=0;f<64*7;f++)p.tick(()=>wrong);
  assert.equal(c.ram[0x2b],1);
  const states=new Set();
  for(let f=0;f<64*3;f++) {p.tick();states.add(c.segments[49]);}
  assert.deepEqual([...states].sort(),[0,1]);
  assert.equal(c.segments[35],0);
});
