(function (global) {
  'use strict';

  const PREFIX = 'HY1';
  const DEFAULT_CHUNK_SIZE = 620;

  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  function base64ToUtf8(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function fnv1a(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function sessionId() {
    if (global.crypto && global.crypto.getRandomValues) {
      const a = new Uint32Array(2);
      global.crypto.getRandomValues(a);
      return (a[0].toString(36) + a[1].toString(36)).slice(0, 10);
    }
    return Math.random().toString(36).slice(2, 12);
  }

  function packagePayload(file) {
    const envelope = JSON.stringify({
      v: 1,
      name: file.name,
      mime: file.mime,
      text: file.text,
    });
    const encoded = utf8ToBase64(envelope);
    return { encoded, hash: fnv1a(encoded) };
  }

  function makeFrames(file, chunkSize = DEFAULT_CHUNK_SIZE) {
    const size = Math.max(180, Math.min(900, Number(chunkSize) || DEFAULT_CHUNK_SIZE));
    const { encoded, hash } = packagePayload(file);
    const sid = sessionId();
    const total = Math.ceil(encoded.length / size);
    const frames = [];
    for (let i = 0; i < total; i++) {
      const chunk = encoded.slice(i * size, (i + 1) * size);
      frames.push(`${PREFIX}~${sid}~${i}~${total}~${hash}~${chunk}`);
    }
    return { session: sid, total, hash, frames, encodedLength: encoded.length };
  }

  function parseFrame(text) {
    if (typeof text !== 'string' || !text.startsWith(PREFIX + '~')) return null;
    const parts = text.split('~');
    if (parts.length !== 6) return null;
    const [, session, indexRaw, totalRaw, hash, chunk] = parts;
    const index = Number(indexRaw);
    const total = Number(totalRaw);
    if (!session || !/^[0-9a-f]{8}$/i.test(hash)) return null;
    if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 999 || index < 0 || index >= total) return null;
    if (!/^[A-Za-z0-9+/=]*$/.test(chunk)) return null;
    return { session, index, total, hash: hash.toLowerCase(), chunk };
  }

  class Collector {
    constructor() { this.reset(); }
    reset() {
      this.session = null;
      this.total = 0;
      this.hash = null;
      this.chunks = new Map();
    }
    add(frameText) {
      const frame = parseFrame(frameText);
      if (!frame) return { accepted: false, reason: 'not-huashan-frame' };
      if (this.session !== frame.session || this.total !== frame.total || this.hash !== frame.hash) {
        this.session = frame.session;
        this.total = frame.total;
        this.hash = frame.hash;
        this.chunks = new Map();
      }
      const before = this.chunks.size;
      this.chunks.set(frame.index, frame.chunk);
      const received = this.chunks.size;
      const complete = received === this.total;
      let result = null;
      let error = null;
      if (complete) {
        try {
          let encoded = '';
          for (let i = 0; i < this.total; i++) {
            const c = this.chunks.get(i);
            if (typeof c !== 'string') throw new Error('missing-chunk');
            encoded += c;
          }
          if (fnv1a(encoded) !== this.hash) throw new Error('hash-mismatch');
          const obj = JSON.parse(base64ToUtf8(encoded));
          if (!obj || obj.v !== 1 || typeof obj.name !== 'string' || typeof obj.mime !== 'string' || typeof obj.text !== 'string') {
            throw new Error('bad-payload');
          }
          result = obj;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
      }
      return { accepted: true, duplicate: before === received, received, total: this.total, complete, result, error };
    }
  }

  global.HYQR = { PREFIX, DEFAULT_CHUNK_SIZE, utf8ToBase64, base64ToUtf8, fnv1a, makeFrames, parseFrame, Collector };
})(typeof window !== 'undefined' ? window : globalThis);
