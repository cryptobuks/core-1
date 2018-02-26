// This file is a part of the protochan project.
// https://github.com/sidmani/protochan
// https://www.sidmani.com/?postid=3

// Copyright (c) 2018 Sid Mani
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

var Header = require('../../js/header/header.js');
var ErrorType = require('../../js/error.js')

var t = require('tap');

t.test('Header constructor tests', function(t) {
  let h;
  t.throws(function() { new Header(new Uint8Array(56))}, ErrorType.Data.length(), 'Header rejects data length < 80');
  t.doesNotThrow(function() { h = new Header(new Uint8Array(80))}, 'Header accepts valid data');

  t.strictSame(h.hash, new Uint8Array([
    196, 253, 231, 106, 141, 104, 66, 44,
    95, 186, 253, 226, 80, 244, 146, 16,
    159, 178, 154, 198, 103, 83, 41, 46,
    17, 83, 170, 17, 173, 174, 26, 58
  ]))
  t.equal(h.difficulty, 0);
  t.end();
});

t.test('Header getter methods', function(t) {
  let validBuffer = new ArrayBuffer(80);
  let view = new DataView(validBuffer);
  // prevHash
  let prev_hash_result = new Uint8Array([
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
  ]);

  // dataHash
  let data_hash_result = new Uint8Array([
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
    0xea, 0x38, 0xad, 0x19,
  ]);

  // protocol version
  view.setUint16(0, 12345);
  // block type
  view.setUint8(2, 0x07);
  // timestamp
  view.setUint32(3, 0xffffffff);
  // nonce
  view.setUint32(7, 777711889);
  // prevHash
  for (let i = 0; i < 32; i++) {
    view.setUint8(11+i, prev_hash_result[i]);
  }
  // dataHash
  for (let i = 0; i < 32; i++) {
    view.setUint8(43+i, data_hash_result[i]);
  }
  // board ID
  view.setUint32(75, 0x4e5be7e9);
  // reserved
  view.setUint8(79, 0x7c);
  let arr = new Uint8Array(validBuffer);
  let h = new Header(arr);

  t.equal(h.protocolVersion(), 12345, 'Header returns correct protocol version');
  t.equal(h.blockType(), 0x07, 'Header returns correct block type');
  t.equal(h.timestamp(), 0xffffffff, 'Header returns correct timestamp');
  t.equal(h.nonce(), 777711889, 'Header returns correct nonce');
  t.strictSame(h.prevHash(), prev_hash_result, 'Header returns correct previous hash');
  t.strictSame(h.dataHash(), data_hash_result, 'Header returns correct data hash');
  t.equal(h.board(), 0x4e5be7e9, 'Header returns correct board ID');
  t.equal(h.reserved(), 0x7c, 'Header returns correct reserved data');

  let serialized = h.serialize();
  t.strictSame(serialized, arr, 'Header serializes data');
  let deserialized = Header.deserialize(serialized);
  t.strictSame(h, deserialized, 'Header deserializes data')
  t.end();
});
