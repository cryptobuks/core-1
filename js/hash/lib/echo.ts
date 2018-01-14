/////////////////////////////////////
///////////////  Echo ///////////////

//// Written by Quantum Explorer ////
////////// Dash Foundation //////////
/// Released under the MIT License //
/////////////////////////////////////

/// <reference path="helper.ts" />
/// <reference path="op.ts" />
/// <reference path="aes.ts" />

namespace Hash {
  export namespace Echo {
    var ECHO_BlockSize = 128;

    function subWords(W, pK) {
      for (var n = 0; n < 16; n++) {
        var X = W[n];
        var Y = new Array(4);
        AES.AES_ROUND_LE(X, pK, Y);
        AES.AES_ROUND_NOKEY_LE(Y, X);
        if ((pK[0] = Op.t32(pK[0] + 1)) === 0) {
          if ((pK[1] = Op.t32(pK[1] + 1)) === 0)
            if ((pK[2] = Op.t32(pK[2] + 1)) === 0)
              pK[3] = Op.t32(pK[3] + 1);
        }
      }
    }

    function shiftRow1(W, a, b, c, d) {
      var tmp;
      tmp = W[a][0];
      W[a][0] = W[b][0];
      W[b][0] = W[c][0];
      W[c][0] = W[d][0];
      W[d][0] = tmp;
      tmp = W[a][1];
      W[a][1] = W[b][1];
      W[b][1] = W[c][1];
      W[c][1] = W[d][1];
      W[d][1] = tmp;
      tmp = W[a][2];
      W[a][2] = W[b][2];
      W[b][2] = W[c][2];
      W[c][2] = W[d][2];
      W[d][2] = tmp;
      tmp = W[a][3];
      W[a][3] = W[b][3];
      W[b][3] = W[c][3];
      W[c][3] = W[d][3];
      W[d][3] = tmp;
    }

    function shiftRow2(W, a, b, c, d) {
      var tmp;
      tmp = W[a][0];
      W[a][0] = W[c][0];
      W[c][0] = tmp;
      tmp = W[b][0];
      W[b][0] = W[d][0];
      W[d][0] = tmp;
      tmp = W[a][1];
      W[a][1] = W[c][1];
      W[c][1] = tmp;
      tmp = W[b][1];
      W[b][1] = W[d][1];
      W[d][1] = tmp;
      tmp = W[a][2];
      W[a][2] = W[c][2];
      W[c][2] = tmp;
      tmp = W[b][2];
      W[b][2] = W[d][2];
      W[d][2] = tmp;
      tmp = W[a][3];
      W[a][3] = W[c][3];
      W[c][3] = tmp;
      tmp = W[b][3];
      W[b][3] = W[d][3];
      W[d][3] = tmp;
    }

    function shiftRow3(W, a, b, c, d) {
      shiftRow1(W, d, c, b, a);
    }

    function shiftRows(W) {
      shiftRow1(W, 1, 5, 9, 13);
      shiftRow2(W, 2, 6, 10, 14);
      shiftRow3(W, 3, 7, 11, 15);
    }

    function mixColumn(W, ia, ib, ic, id) {
      for (var n = 0; n < 4; n++) {
        var a = W[ia][n];
        var b = W[ib][n];
        var c = W[ic][n];
        var d = W[id][n];
        var ab = a ^ b;
        var bc = b ^ c;
        var cd = c ^ d;
        var abx = ((ab & (0x80808080)) >>> 7) * 27 ^
          ((ab & (0x7F7F7F7F)) << 1);
        var bcx = ((bc & (0x80808080)) >>> 7) * 27 ^
          ((bc & (0x7F7F7F7F)) << 1);
        var cdx = ((cd & (0x80808080)) >>> 7) * 27 ^
          ((cd & (0x7F7F7F7F)) << 1);
        W[ia][n] = abx ^ bc ^ d;
        W[ib][n] = bcx ^ a ^ cd;
        W[ic][n] = cdx ^ ab ^ d;
        W[id][n] = abx ^ bcx ^ cdx ^ ab ^ c;
      }
    }

    function finalize(ctx, W) {
      var int32Buf = Op.swap32Array(Helper.bytes2Int32Buffer(ctx.buffer));
      for (var u = 0; u < 8; u++) {
        for (var v = 0; v < 4; v++) {
          ctx.state[u][v] ^= int32Buf[u * 4 + v] ^ W[u][v] ^ W[u + 8][v];
        }
      }
    }

    function inputBlock(ctx, W) {
      Op.buffer2Insert(W, 0, 0, ctx.state, 8, 4);
      var int32Buf = Op.swap32Array(Helper.bytes2Int32Buffer(ctx.buffer));
      for (var u = 0; u < 8; u++) {
        W[u + 8][0] = (int32Buf[4 * u]);
        W[u + 8][1] = (int32Buf[4 * u + 1]);
        W[u + 8][2] = (int32Buf[4 * u + 2]);
        W[u + 8][3] = (int32Buf[4 * u + 3]);
      }
    }

    function mixColumns(W) {
      mixColumn(W, 0, 1, 2, 3);
      mixColumn(W, 4, 5, 6, 7);
      mixColumn(W, 8, 9, 10, 11);
      mixColumn(W, 12, 13, 14, 15);
    }

    function ROUND(W,K) {
      subWords(W,K);
      shiftRows(W);
      mixColumns(W);
    }

    function compress(ctx) {
      var W = new Array(16);
      for (var i = 0; i < 16; i++) {
        W[i] = new Array(4);
      }
      var K = new Array(4);
      Op.bufferInsert(K,0,ctx.C,4);
      inputBlock(ctx, W);
      for (var u = 0; u < 10; u++) {
        ROUND(W,K);
      }
      finalize(ctx,W);
    }

    function incrCounter(ctx, val) {
      ctx.C[0] = Op.t32(ctx.C[0] + Op.t32(val));
      if (ctx.C[0] < Op.t32(val)) {
        if ((ctx.C[1] = Op.t32(ctx.C[1] + 1)) === 0) {
          if ((ctx.C[2] = Op.t32(ctx.C[2] + 1)) === 0) {
            ctx.C[3] = Op.t32(ctx.C[3] + 1);
          }
        }
      }
    }

    function echoInit(ctx) {
      ctx.state = new Array(8);
      for (var i = 0; i < 8; i++) {
        ctx.state[i] = new Array(4);
      }
      ctx.state[0][0] = 512;
      ctx.state[0][1] = ctx.state[0][2] = ctx.state[0][3] = 0;
      ctx.state[1][0] = 512;
      ctx.state[1][1] = ctx.state[1][2] = ctx.state[1][3] = 0;
      ctx.state[2][0] = 512;
      ctx.state[2][1] = ctx.state[2][2] = ctx.state[2][3] = 0;
      ctx.state[3][0] = 512;
      ctx.state[3][1] = ctx.state[3][2] = ctx.state[3][3] = 0;
      ctx.state[4][0] = 512;
      ctx.state[4][1] = ctx.state[4][2] = ctx.state[4][3] = 0;
      ctx.state[5][0] = 512;
      ctx.state[5][1] = ctx.state[5][2] = ctx.state[5][3] = 0;
      ctx.state[6][0] = 512;
      ctx.state[6][1] = ctx.state[6][2] = ctx.state[6][3] = 0;
      ctx.state[7][0] = 512;
      ctx.state[7][1] = ctx.state[7][2] = ctx.state[7][3] = 0;
      ctx.ptr = 0;
      ctx.C = new Array(4);
      Op.bufferSet(ctx.C,0,0,4);
      ctx.buffer = new Array(ECHO_BlockSize);
    }

    function echo(ctx, data) {
      var buf, ptr;
      buf = ctx.buffer;
      ptr = ctx.ptr;
      var len = data.length;
      if (len < ctx.buffer.length - ptr) {
        Op.bufferInsert(buf, ptr, data, data.length);
        ptr += data.length;
        ctx.ptr = ptr;
        return;
      }
      while (len > 0) {
        var clen = ctx.buffer.length - ptr;
        if (clen > len) clen = len;
        Op.bufferInsert(buf, ptr, data, clen);
        ptr += clen;
        data = data.slice(clen);
        len -= clen;
        if (ptr === ctx.buffer.length) {
          var int32Buf = Helper.bytes2Int32Buffer(buf);
          incrCounter(ctx, 1024);
          compress(ctx);
          ptr = 0;
        }
      }
      ctx.ptr = ptr;
    }

    function echoClose(ctx) {
      var out = new Array(16);
      var buf = ctx.buffer;
      var len = ctx.buffer.length;
      var ptr = ctx.ptr;
      var elen = (ptr << 3);
      incrCounter(ctx, elen);
      var cBytes = Helper.int32Buffer2Bytes(Op.swap32Array(ctx.C));
      /*
       * If elen is zero, then this block actually contains no message
       * bit, only the first padding bit.
       */
      if (elen === 0) {
        ctx.C[0] = ctx.C[1] = ctx.C[2] = ctx.C[3] = 0;
      }
      buf[ptr++] = 0x80;

      Op.bufferSet(buf,ptr, 0, len - ptr);
      if (ptr > (len - 18)) {
        compress(ctx);
        Op.bufferSet(ctx.C,0,0,4);
        Op.bufferSet(buf, 0, 0,len);
      }
      buf[len - 17] = 2;
      Op.bufferInsert(buf,len - 16, cBytes, 16);
      compress(ctx);
      for (var u = 0; u < 4; u++) {
        for (var v = 0; v < 4; v++) {
          out[u*4 + v] = Op.swap32(ctx.state[u][v]);
        }
      }
      return out;
    }

    export function digest(input, format, output) {
      var msg;
      if (format === 1) {
        msg = input;
      }
      else if (format === 2) {
        msg = Helper.int32Buffer2Bytes(input);
      }
      else {
        msg = Helper.string2bytes(input);
      }
      var ctx = {};
      echoInit(ctx);
      echo(ctx, msg);
      var r = echoClose(ctx);
      var out;
      if (output === 2) {
        out = r;
      }
      else if (output === 1) {
        out = Helper.int32Buffer2Bytes(r)
      }
      else {
        out = Helper.int32ArrayToHexString(r)
      }
      return out;
    }
  }
}
