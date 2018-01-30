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

var Util = require('../util.js');
var Post = require('../block/post.js');
var Thread = require('../block/thread.js');
var Genesis = require('../block/genesis.js');
var GenesisPost = require('../block/genesisPost.js');
var HashMap = require('../hash/hashMap.js');
var Difficulty = require('../hash/difficulty.js');
var Head = require('./head.js');

module.exports = class Chain {
  constructor(originalPost, genesisBlock) {
    // validate parameters
    Util.assert(genesisBlock instanceof Genesis);
    Util.assert(originalPost instanceof GenesisPost);
    // create the genesis thread
    let newHead = this.createHead(originalPost, genesisBlock);

    // the underlying data storage
    this.commonMap = new HashMap();

    // the hashmap that contains all of the thread heads
    this.headMap = new HashMap();

    // points to top of chain of thread blocks
    this.threadHead = newHead.thread;

    // put that head into the hashmap
    this.headMap.setRaw(newHead.thread, newHead);
  }

  createHead(originalPost, thread) {
    let threadHash = thread.hash();
    let head = new Head(
      originalPost,
      threadHash,
      this.commonMap,
      0
    );

    head.pushThread(thread, threadHash);
    return head;
  }

  addThread(originalPost, thread) {
    // parameter validation
    Util.assert(originalPost instanceof Post);
    Util.assert(thread instanceof Thread);

    // check that thread prevHash points to previous thread block
    Util.assertArrayEquality(
      thread.header.prevHash(),
      this.threadHead);

    let newHead = this.createHead(originalPost, thread);

  }
}

class Fork {
  constructor(heads, threadHash) {
    this.heads = heads;
    this.thread = threadHash;
  }
}