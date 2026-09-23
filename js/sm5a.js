/* SPDX-License-Identifier: BSD-3-Clause
 * Sharp SM5A / КБ1013ВК1-2 interpreter, adapted from MAME's SM510 family core.
 * Copyright (c) hap. JavaScript port: 2026. See LICENSE and docs/SOURCES.md.
 * No game rules live here: the unmodified 1,856-byte mask ROM runs the game.
 */
(function (root) {
  'use strict';
  const DIGITS = [14,0,12,8,2,10,14,2,14,10,0,0,2,10,2,2,
                  11,9,7,15,13,14,14,11,15,15,4,0,13,14,4,0];
  const BUTTONS = Object.freeze({downRight: 1, upRight: 2, downLeft: 4, upLeft: 8,
                                time: 16, gameB: 32, gameA: 64, alarm: 128});
  class SM5A {
    static FREQUENCY = 32768;
    static BUTTONS = BUTTONS;

    constructor(rom) {
      if (rom.length !== 0x740) throw new Error('Expected a 1,856-byte SM5A ROM');
      this.rom = Uint8Array.from(rom);
      this.ram = new Uint8Array(128);
      this.o = new Uint8Array(9);
      this.ox = new Uint8Array(9);
      this.decay = new Uint8Array(72);
      this.segments = new Uint8Array(72);
      this.keys = 0;
      this.ba = 1;
      this.beta = 1;
      this.ticks = 0;
      this.div = 0;
      this.acc = this.bl = this.bm = this.carry = this.mx = 0;
      this.reset();
    }

    // ACL resets the processor, not the RAM: just like the recessed button.
    reset() {
      this.pc = 0x3c0;
      this.stack = this.pc;
      this.op = this.previousOp = this.param = 0;
      this.skip = this.halt = this.subroutine = false;
      this.bp = 1;
      this.r = 15;
      this.cb = 0;
      this.div &= 0x3f;
      this.gamma = 1;
      this.wait = 0;
    }

    readROM(address) {
      // The last physical 64-byte ROM page is mirrored four times.
      return this.rom[address >= 0x700 ? address & 0x73f : address];
    }
    address() {
      let address = ((this.bm << 4) | this.bl) & 0x7f;
      if ((address & 15) > 12) address &= 0x7c;
      if (address >= 0x50) address &= 0x4f;
      return address;
    }
    readRAM() { return this.ram[this.address()] & 15; }
    writeRAM(value) { this.ram[this.address()] = value & 15; }
    nextPC() {
      const feed = ((this.pc >> 1 ^ this.pc) & 1) ? 0 : 0x20;
      this.pc = feed | (this.pc >> 1 & 0x1f) | (this.pc & ~0x3f);
    }
    branch(upper, middle, lower) {
      this.pc = ((upper << 10) | (middle << 6 & 0x3c0) | (lower & 63)) & 0x7ff;
    }
    shift() { this.ox.copyWithin(0, 1); }
    digit() {
      const select = this.bp >> 3 & 1;
      return DIGITS[select << 4 | this.acc] | (~select & this.mx);
    }
    incrementB() {
      this.bl = (this.bl + 1) & 15;
      this.skip = this.bl === 8;
    }
    decrementB() {
      this.bl = (this.bl - 1) & 15;
      this.skip = this.bl === 15;
    }
    exchange() {
      const value = this.readRAM();
      this.writeRAM(this.acc);
      this.acc = value;
      this.bm ^= this.op & 3;
    }
    readKeys() {
      const output = ~this.r & 15;
      return ((output & 4) ? this.keys & 15 : 0) |
             ((output & 8) ? this.keys >> 4 & 15 : 0);
    }

    instruction() {
      if (this.halt) {
        if (!(this.keys || this.gamma)) return 2;
        this.halt = false;
        this.cb = 0;
        this.pc = 0;
        return 2; // wake-up cycle
      }
      this.previousOp = this.op;
      this.op = this.readROM(this.pc);
      this.nextPC();
      let clocks = 2;
      if (this.op === 0x5e || this.op === 0x5f) {
        this.param = this.readROM(this.pc);
        this.nextPC();
        clocks = 4;
      }
      if (this.skip) {
        this.skip = false;
        this.op = 0; // skipped LAX must not inhibit the following LAX
      } else this.execute();
      return clocks;
    }

    execute() {
      const op = this.op;
      switch (op & 0xf0) {
        case 0x20:
          if ((this.previousOp & ~15) !== 0x20) this.acc = op & 15;
          return;
        case 0x30: {
          const sum = this.acc + (op & 15);
          this.skip = (op & 15) !== 10 && !!(sum & 16);
          this.acc = sum & 15;
          return;
        }
        case 0x40:
          this.bm = op & 3;
          this.bl = (op >> 2 & 3) | ((op & 12) ? 8 : 0);
          return;
        case 0x70:
          this.stack = (this.stack & ~0x3c0) | (op << 6 & 0x3c0);
          return;
        case 0x80: case 0x90: case 0xa0: case 0xb0:
          this.pc = (this.pc & ~63) | (op & 63);
          if (!this.subroutine) this.branch(this.cb, this.stack >> 6 & 15, this.pc & 63);
          return;
        case 0xc0: case 0xd0: case 0xe0: case 0xf0:
          if (!this.subroutine) {
            this.subroutine = true;
            const upper = this.stack >> 6 & 15;
            this.stack = this.pc;
            this.branch(1, 0, op & 63);
            if ((this.previousOp & 0xf0) === 0x70) this.branch(this.cb, upper, this.pc & 63);
          } else this.pc = (this.pc & ~255) | (op << 2 & 0xc0) | (op & 15);
          return;
      }
      switch (op & 0xfc) {
        case 0x04: this.writeRAM(this.readRAM() & ~(1 << (op & 3))); return;
        case 0x0c: this.writeRAM(this.readRAM() | (1 << (op & 3))); return;
        case 0x10: this.exchange(); return;
        case 0x14: this.exchange(); this.incrementB(); return;
        case 0x18: this.acc = this.readRAM(); this.bm ^= op & 3; return;
        case 0x1c: this.exchange(); this.decrementB(); return;
        case 0x54: this.skip = !!(this.readRAM() & (1 << (op & 3))); return;
      }
      switch (op) {
        case 0x00: break;
        case 0x01: this.r = this.acc; break;
        case 0x02: this.bm |= 4; break;
        case 0x03: this.bp = this.acc; break;
        case 0x08: this.acc = (this.acc + this.readRAM()) & 15; break;
        case 0x09: {
          const sum = this.acc + this.readRAM() + this.carry;
          this.carry = sum >> 4 & 1;
          this.skip = !!this.carry;
          this.acc = sum & 15;
          break;
        }
        case 0x0a: this.acc ^= 15; break;
        case 0x0b: [this.acc, this.bl] = [this.bl, this.acc]; break;
        case 0x50: this.skip = !!this.ba; break;
        case 0x51: this.skip = !!this.beta; break;
        case 0x52: this.skip = !this.carry; break;
        case 0x53: this.skip = this.acc === this.readRAM(); break;
        case 0x58: this.skip = !this.gamma; this.gamma = 0; break;
        case 0x59: this.o[7] = this.ox[7]; this.o[8] = this.ox[8]; break;
        case 0x5a: this.skip = !this.acc; break;
        case 0x5b: this.skip = this.acc === this.bl; break;
        case 0x5c: this.o.set(this.ox); break;
        case 0x5d: this.shift(); this.ox[8] = this.digit(); break;
        case 0x5e:
          this.op = op << 8 | this.param;
          if (this.param === 0) this.halt = true;
          else if (this.param === 4) this.acc = this.div >> 11 & 15;
          else throw new Error(`Unknown SM5A extended opcode ${this.param.toString(16)}`);
          break;
        case 0x5f: this.bl = this.param & 15; this.bm = this.param >> 4 & 7; break;
        case 0x60: this.bp ^= 8; break;
        case 0x61: this.ox[7] = this.ox[8]; this.ox[8] = this.digit(); break;
        case 0x62: this.shift(); this.ox[8] = this.acc & 7; break;
        case 0x63: this.shift(); this.ox[8] = this.acc | 8; break;
        case 0x64: this.incrementB(); break;
        case 0x65: this.div &= 63; break;
        case 0x66: this.carry = 0; break;
        case 0x67: this.carry = 1; break;
        case 0x68: this.mx = this.acc = 0; break;
        case 0x69: this.mx = 1; break;
        case 0x6a: this.acc = this.readKeys(); break;
        case 0x6b: this.bm &= ~4; break;
        case 0x6c: this.decrementB(); break;
        case 0x6d: this.cb ^= 1; break;
        case 0x6e: case 0x6f:
          this.pc = this.stack & 0x7ff;
          this.subroutine = false;
          if (op === 0x6f) this.skip = true;
          break;
        default: throw new Error(`Unknown SM5A opcode ${op.toString(16)}`);
      }
    }

    updateLCD() {
      // MAME's SM5A deflicker: 1,024 Hz, 8 ticks to turn on, 17 to turn off.
      for (let group = 0; group < 9; group++) {
        for (let bit = 0; bit < 4; bit++) {
          for (let common = 0; common < 2; common++) {
            const i = group * 8 + bit * 2 + common;
            const active = (this.bp & 1) && ((common ? this.ox[group] : this.o[group]) >> bit & 1);
            this.decay[i] = active ? Math.min(25, this.decay[i] + 1) : Math.max(0, this.decay[i] - 1);
            this.segments[i] = this.decay[i] >= 8 ? 1 : 0;
          }
        }
      }
    }

    // One oscillator tick per output sample: the original R1 waveform, not a tone approximation.
    run(clocks, audio) {
      for (let i = 0; i < clocks; i++) {
        if (this.wait === 0) this.wait = this.instruction();
        this.wait--;
        this.div = (this.div + 1) & 0x7fff;
        if (!this.div) this.gamma = 1;
        this.ticks++;
        if ((this.ticks & 31) === 0) this.updateLCD();
        if (audio) audio[i] = (~this.r & 1) ? 0.22 : -0.22;
      }
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SM5A;
  else root.SM5A = SM5A;
})(globalThis);
