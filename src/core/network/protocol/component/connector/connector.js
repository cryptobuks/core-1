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

'use strict';

const HashMap = require('../../../../hash/hashMap.js');

// XXX: global
const MAX_INCOMING_CONNECTIONS = 100;
const MAX_OUTGOING_CONNECTIONS = 5;

module.exports = class Connector {
  static id() { return 'CONNECTOR'; }
  static inputs() { return ['INCOMING']; }

  static attach({
    INCOMING: incoming,
  }) {
    // receive connection
    return incoming
      // accumulate connections into hashmap
      .accumulate(new HashMap())
      // only add if we haven't hit connection limit
      .filter(({ acc }) => acc.size() < MAX_INCOMING_CONNECTIONS)
      .on(({ obj: connection, acc }) => {
        // checks duplicates
        acc.setStringified(
          connection,
          connection.address(),
        );

        connection.terminate.on(() => acc.unsetStringified(connection.address()));
      });
  }
};
