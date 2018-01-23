// This file is a part of the protochan project.
// https://github.com/sidmani/protochan
// https://www.sidmani.com/?postid=3

// Copyright (c) 2016 Quantum Explorer
// Modifications (c) 2018 Sid Mani
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

var blake = require('./lib/blake');
var keccak = require('./lib/keccak');
var skein = require('./lib/skein');
var luffa = require('./lib/luffa');
var simd = require('./lib/simd');
var shavite = require('./lib/shavite');
var cubehash = require('./lib/cubehash');
var jh = require('./lib/jh');
var echo = require('./lib/echo');
var groestl = require('./lib/groestl');
var bmw = require('./lib/bmw');
var h = require('./lib/helper');

module.exports.blake = blake;
module.exports.bmw = bmw;
module.exports.cubehash = cubehash;
module.exports.echo = echo
module.exports.groestl = groestl;
module.exports.jh = jh;
module.exports.keccak = keccak;
module.exports.luffa = luffa;
module.exports.shavite = shavite;
module.exports.simd = simd;
module.exports.skein = skein;

module.exports.digest = function(input) {
  var a = blake(input);
  a = bmw(a);
  a = groestl(a);
  a = skein(a);
  a = jh(a);
  a = keccak(a);
  a = luffa(a);
  a = cubehash(a);
  a = shavite(a);
  a = simd(a);
  a = echo(a);
  a = a.slice(0,32);
  return new Uint8Array(a);
}
