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

const Util = require('../util/util.js');
const Genesis = require('../block/thread/genesis.js');
const GenesisPost = require('../block/genesisPost.js');
const HashMap = require('../hash/hashMap.js');
const Difficulty = require('../hash/difficulty.js');
const Head = require('./head.js');
const Config = require('../board/config.js');
const ErrorType = require('../error.js');

module.exports = class Chain {
  constructor(config) {
    if (!(config instanceof Config)) throw ErrorType.Parameter.type();

    this.config = config;
    this.headMap = new HashMap();
    this.blockMap = new HashMap();

    // set the thread pointer to an array of zeroes
    // the first block must point to a zero prevHash,
    // meaning it must be a genesis block
    this.threadPointer = undefined;

    // the height of the current thread block
    this.threadHeight = 0;
  }

  // Thread insertion methods
  // Push a thread onto the chain
  pushThread(originalPost, thread) {
    this.pushThread_validateParameters(originalPost, thread);

    let removedHead;
    if (this.threadPointer) {
      // not the first thread
      // run all checks
      const removedThread = this.pushThread_runAllChecks(thread);
      removedHead = this.getHead(removedThread);
    } else {
      // the first thread
      // run limited set of checks
      this.pushThread_runGenesisChecks(thread);
    }

    // once we've asserted the thread is superficially OK:
    // create a new head
    const newHead = new Head(
      this.config,
      this.blockMap,
      thread.hash,
      this.threadHeight + 1,
    );

    // push the post onto the head
    newHead.pushPost(originalPost);

    // stage the thread on all heads (including new one)
    try {
      // if a thread was removed, delete it from the map
      // XXX: removing it just deletes it completely
      if (removedHead) {
        this.headMap.unset(removedHead.thread);
      }
      this.headMap.forEach(head => head.stageThread(thread));
      newHead.stageThread(thread);
    } catch (error) {
      // the stage failed on some head
      // rollback all changes
      this.headMap.forEach(head => head.discardStage());

      // delete the post from the blockmap
      // newHead.pushPost inserted it
      this.blockMap.unset(originalPost);

      // TODO: are there any other changes that need to be rolled back?
      // re-insert removedHead
      if (removedHead) {
        this.headMap.set(removedHead.thread, removedHead);
      }

      // propagate the error
      throw error;
    }

    // once the stage succeeds, thread validation is complete.
    // Only insert new head into headmap after stage succeed
    this.headMap.setRaw(thread.hash, newHead);

    // seal the removed head
    if (removedHead) {
      removedHead.seal();
    }

    // insert the thread into the block map
    this.blockMap.set(thread);

    // commit on all heads (including new one)
    this.headMap.forEach(head => head.commitThread());

    // set this.timestamp?
    // set height on thread block?
    // increment height
    this.threadHeight += 1;

    // set pointer
    this.threadPointer = thread.hash;
  }

  pushThread_validateParameters(originalPost, thread) {
    // assert post is instanceof GenesisPost
    if (!(originalPost instanceof GenesisPost)) throw ErrorType.Parameter.invalid();

    // check thread genesis row points to post
    if (!Util.arrayEquality(thread.getPost(0), originalPost.hash)) {
      throw ErrorType.Chain.hashMismatch();
    }

    // check that thread timestamp > post timestamp
    // since the hash chain implies the order of creation
    if (originalPost.timestamp() >= thread.timestamp()) {
      throw ErrorType.Parameter.invalid();
    }

    // check that the number of thread records contained is:
    // min(height + 1, maxThreads)
    // for example, genesis block has min(0 + 1, MAX_THREAD_COUNT)
    // = 1 (since MAX_THREAD_COUNT >= 1)
    const expectedThreadCount = Math.min(this.threadHeight + 1, this.config.MAX_THREAD_COUNT);
    if (thread.numThreads !== expectedThreadCount) throw ErrorType.Parameter.invalid();
  }

  pushThread_runGenesisChecks(thread) {
    // this is the first block
    // make sure it is a valid genesis block
    if (!(thread instanceof Genesis)) throw ErrorType.Parameter.invalid();

    // sanity check
    // the block can't be older than this code
    // 0x5A7E6FC0 = Friday, Feb. 9, 2018 8:06:24 PM PST
    if (thread.timestamp() < 0x5A7E6FC0) throw Error.Parameter.invalid();

    // thread is OK.
  }

  pushThread_runAllChecks(thread) {
    // this is not the first block
    // check that the thread prevHash points to it
    if (!Util.arrayEquality(thread.header.prevHash(), this.threadPointer)) {
      // the hashes are not equal.
      // TODO: implementation here
      // option 1: points to a known thread (a fork)
      // pushing to all heads should automatically create a fork
      // need a way to fork the thread pointer
      // option 2: invalid based on known blocks. throw error.

      // remove this
      throw ErrorType.Parameter.invalid();
    }


    // have to successfully stage on every head
    // and be ordered according to the ranking algorithm
    // if height >= maxThreads, the removed thread record
    // must have a lower score than every included thread record
    const removedThread = this.checkThreadContinuity(thread);

    // get time diff between new thread and previous one
    const deltaT = thread.timestamp() - prevThread.timestamp();

    // count all unconfirmed posts on all heads
    const numPosts = this.headMap.enumerate().reduce((sum, head) => sum + head.unconfirmedPosts, 0);

    this.checkThreadDifficulty(thread, deltaT, numPosts);
    return removedThread;
  }

  checkThreadContinuity(thread) {
    // the previous thread = pointee of threadPointer
    const prevThread = this.getBlock(thread.header.prevHash());

    // old - new = removed
    const removedThreads = prevThread.subtractThreadRecords(thread);

    if (this.threadHeight < this.config.MAX_THREAD_COUNT) {
      // case 1: threadHeight < maxThreads
      // the thread must contain every record in the previous block
      if (removedThreads.length !== 0) throw ErrorType.Chain.missingThread();
    } else {
      // case 2: threadHeight >= maxThreads
      // exactly one thread must be removed
      if (removedThreads.length !== 1) throw ErrorType.Chain.missingThread();
    }

    // new - old = added
    const addedThreads = thread.subtractThreadRecords(prevThread);

    // exactly zero new hashes are added, since genesis is zeroes
    if (addedThreads.length !== 0) throw ErrorType.Chain.unknownThread();

    // check that threads are ordered by descending score
    const lowestScore = this.checkThreadRecordOrdering();
    // check that the removed thread score <= lowestScore
    if (removedThreads.length === 1) {
      const removedHead = this.getHead(removedThreads[0]);
      if (removedHead.score(this.threadHeight + 1) > lowestScore) {
        throw ErrorType.Chain.threadOrder();
      }
      return removedHead;
    }
  }

  checkThreadRecordOrdering(thread) {
    let prevScore = Head.genesisScore();
    for (let i = 1; i < thread.numThreads; i += 1) {
      const threadHash = thread.getThread(i);
      const score = this
        .getHead(threadHash)
        .score(this.threadHeight + 1);

      if (prevScore > score) throw ErrorType.Chain.threadOrder();
      prevScore = score;
    }
    return prevScore;
  }

  checkThreadDifficulty(thread, deltaT, numPosts) {
    // the timestamp must be strictly increasing
    if (deltaT <= 0) throw ErrorType.Parameter.invalid();

    // calculate the minimum difficulty required
    const reqDiff = Difficulty.requiredThreadDifficulty(
      deltaT,
      numPosts,
      this.config,
    );

    // check that the hash meets the requirement
    if (Difficulty.countLeadingZeroes(thread.hash) < reqDiff) {
      throw ErrorType.Difficulty.insufficient();
    }
  }

  pushPost(post) {
    // the board (the callee) is responsible for checking board ID

    // retrieve block pointed to by prevHash
    const prevBlock = this.blockMap.get(post.header.prevHash());

    // this function doesn't need to handle a genesis case
    // there is no way a post can be inserted without
    // a previous post already existing

    // retrieve the associated head
    // don't need to check non-nil
    // all posts in the map guaranteed to have associated head
    const head = this.getHead(prevBlock.thread);

    // head could be instanceof Head or of Fork
    // abstraction takes care of that for us here
    try {
      // tell the head to append the post
      // the head handles difficulty and hash mismatch checks
      head.pushPost(post);
    } catch (error) {
      // the post was invalid or didn't point to the top post
      // if it's invalid, propagate the error
      // otherwise, construct a fork
      throw error;
    }
  }

  // Convenience methods
  getBlock(hash) {
    return this.blockMap.get(hash);
  }

  getHead(threadHash) {
    return this.headMap.get(threadHash);
  }
};
