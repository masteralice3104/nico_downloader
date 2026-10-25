// 公式 @ffmpeg/core 0.12.10（単一スレッド版）。配布条件とソースは同梱LICENSEを参照。
let last_save_sm = "";

// 現行Coreのexec APIを使用する。resetは終了値をリセットし、仮想ファイルは保持する。
const ffmpeg = (Core, args) => {
  try {
    Core.setTimeout(-1);
    Core.exec(...args);
    return Core.ret;
  } finally {
    Core.reset();
  }
};

/**
 * 変換引数を組み立てる。実行とログ表示で同じ配列を使う。
 * 日本語のUTF-8化は公式Coreのexec APIで行う。
 */
// 未取得の初期値0と実際の0件を区別し、取得できた非負整数だけを保存する。
function GetCountMetadata(video) {
  const fields = [["view_count", "view"], ["comment_count", "comment"], ["mylist_count", "mylist"], ["like_count", "like"]];
  const counts = typeof video.GetVideo === "function" ? video.GetVideo().count ?? {} : null;
  return fields.flatMap(([name, key]) => {
    const value = counts ? counts[key] : video[name];
    if (typeof value !== "number" && typeof value !== "string") return [];
    if (typeof value === "string" && !/^\d+$/.test(value.trim())) return [];
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? [[name, String(number)]] : [];
  });
}

const makeFFmpegArgs = (m3u8name, Nicovideo, mode, outputFileName) => {
  const metadata = [
    ["title", Nicovideo.video_title ?? ""],
    ["show", Nicovideo.video_title ?? ""],
    ["creation_time", Nicovideo.video_registeredAt ?? ""],
    ["date", Nicovideo.video_registeredAt ?? ""],
    ["artist", Nicovideo.video_owner ?? ""],
    ["description", Nicovideo.video_description ?? ""],
    ["comment", Nicovideo.video_description ?? ""],
    ["keywords", (Nicovideo.video_tags ?? []).join(", ")],
    ["genre", Nicovideo.video_genre ?? ""],
    ["publisher", "nicovideo.jp"],
    ["episode_id", Nicovideo.video_sm],
    ["album", Nicovideo.video_series ?? ""],
    ["album_artist", Nicovideo.video_owner ?? ""],
    ...GetCountMetadata(Nicovideo),
  ];
  return [
    "-allowed_extensions", "ALL", "-i", m3u8name,
    ...metadata.flatMap(([key, value]) => ["-metadata", `${key}=${value}`]),
    ...(mode === "aac" ? ["-vn", "-c:a", "copy", "-write_id3v2", "1"] : ["-c", "copy"]),
    outputFileName,
  ];
};

/**
 * 変換を実行し、終了コード0の場合だけ呼び出し元へ戻る。
 * @returns {Promise<void>}
 */
const runFFmpeg_m3u8 = async (Core, m3u8name, NicoDownloader, Nicovideo, mode = "mp4") => {
  NicoDownloader.SetVideFormatByExtension(mode);
  NicoDownloader.FSOutputFileNameSet(Nicovideo);
  const outputFileName = NicoDownloader.FSOutputFileNameGet();
  const args = makeFFmpegArgs(m3u8name, Nicovideo, mode, outputFileName);

  console.log("=== FFmpeg変換開始 ===");
  console.log(`入力ファイル: ${m3u8name}`);
  console.log(`出力ファイル: ${outputFileName}`);
  console.log(`変換モード: ${mode}`);
  console.log(`FFmpegコマンド: ffmpeg ${args.join(" ")}`);

  const outputBuffer = mode === "mp4" ? CreateMP4OutputBuffer(Core, outputFileName) : null;
  try {
    const status = ffmpeg(Core, args);
    if (status !== 0) throw new Error(`FFmpeg exited with status ${status}`);
    console.log("=== FFmpeg変換終了 ===");
  } finally {
    outputBuffer?.dispose();
  }
};

/**
 * ファイルタイプからMIMEタイプを返す
 * @param {String} filetype ファイルタイプ
 * @returns {String} MIMEタイプ
 * @see https://developer.mozilla.org/ja/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 * @see https://developer.mozilla.org/ja/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 * @see https://developer.mozilla.org/ja/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types
 */
function FiletypeToMimetype(filetype) {
  switch (filetype) {
    case "mp4":
      return "video/mp4";
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    case "webm":
      return "video/webm";
    case "aac":
      return "audio/aac";
    default:
      return "video/mp4";
  }
}

// 標準MP4タグを維持し、Windowsの「タグ」欄用Xtraと独自の情報を補う。
// moovが末尾の既存出力を対象にし、映像データを移動・全体コピーしない。
function MakeMP4MetadataParts(file, video) {
  try {
    const paged = typeof file.readRange === "function";
    const length = paged ? file.size : file.byteLength;
    const bytes = (start, end) => paged ? file.readRange(start, end - start) : file.subarray(start, end);
    const slices = (start = 0, end = length) => paged ? file.parts(start, end) : [file.subarray(start, end)];
    const view = paged ? {
      getUint32: position => new DataView(bytes(position, position + 4).buffer).getUint32(0),
      getBigUint64: position => new DataView(bytes(position, position + 8).buffer).getBigUint64(0),
      setUint32(position, value) {
        const data = new Uint8Array(4); new DataView(data.buffer).setUint32(0, value); file.writeRange(position, data);
      },
    } : new DataView(file.buffer, file.byteOffset, file.byteLength);
    const atoms = (start, end) => {
      const result = [];
      for (let pos = start; pos < end;) {
        if (pos + 8 > end) throw new Error("不正なMP4ヘッダー");
        let size = view.getUint32(pos), header = 8;
        if (size === 1) {
          if (pos + 16 > end) throw new Error("不正なMP4拡張ヘッダー");
          size = Number(view.getBigUint64(pos + 8)); header = 16;
        } else if (size === 0) size = end - pos;
        if (!Number.isSafeInteger(size) || size < header || pos + size > end) throw new Error("不正なMP4サイズ");
        result.push({ pos, end: pos + size, size, header, type: String.fromCharCode(...bytes(pos + 4, pos + 8)) });
        pos += size;
      }
      return result;
    };
    const top = atoms(0, length);
    const moov = top.find(atom => atom.type === "moov");
    if (!moov || moov.end !== length) throw new Error("末尾moov以外は互換情報を追記しません");
    const udta = atoms(moov.pos + moov.header, moov.end).find(atom => atom.type === "udta");
    if (!udta) throw new Error("udtaがありません");
    const children = atoms(udta.pos + udta.header, udta.end);
    const meta = children.find(atom => atom.type === "meta");
    if (!meta) throw new Error("metaがありません");
    const ilst = atoms(meta.pos + meta.header + 4, meta.end).find(atom => atom.type === "ilst");
    if (!ilst || [moov, udta, meta, ilst].some(atom => atom.header !== 8)) throw new Error("非対応のメタタグ構造");
    const join = parts => {
      const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
      let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
      return bytes;
    };
    const number = (value, size = 4) => {
      const bytes = new Uint8Array(size), data = new DataView(bytes.buffer);
      if (size === 4) data.setUint32(0, value); else data.setUint16(0, value);
      return bytes;
    };
    const text = value => new TextEncoder().encode(value);
    const box = (type, payload) => join([number(payload.length + 8), text(type), payload]);
    const customTags = join([["publisher", "nicovideo.jp"], ...GetCountMetadata(video)].map(([name, value]) => box("----", join([
      box("mean", join([number(0), text("com.apple.iTunes")])),
      box("name", join([number(0), text(name)])),
      box("data", join([number(1), number(0), text(value)])),
    ]))));
    const tags = [...new Set((video.video_tags ?? []).filter(tag => typeof tag === "string" && tag.trim()))];
    let xtra = new Uint8Array();
    if (tags.length && !children.some(atom => atom.type === "Xtra")) {
      const values = tags.map(tag => {
        const bytes = new Uint8Array((tag.length + 1) * 2), data = new DataView(bytes.buffer);
        for (let i = 0; i < tag.length; i++) data.setUint16(i * 2, tag.charCodeAt(i), true);
        return join([number(bytes.length + 6), number(8, 2), bytes]);
      });
      const name = text("WM/Category"), payload = join([number(values.length), ...values]);
      xtra = box("Xtra", join([number(8 + name.length + payload.length), number(name.length), name, payload]));
    }
    const updates = [[moov, customTags.length + xtra.length], [udta, customTags.length + xtra.length], [meta, customTags.length], [ilst, customTags.length]];
    if (updates.some(([atom, extra]) => atom.size + extra > 0xffffffff)) throw new Error("メタタグサイズの上限を超えています");
    const parts = [...slices(0, ilst.end), customTags, ...slices(ilst.end, udta.end), xtra, ...slices(udta.end)];
    for (const [atom, extra] of updates) view.setUint32(atom.pos, atom.size + extra);
    return parts;
  } catch (error) {
    console.warn("[nico downloader] Windows互換タグの追加を見送りました:", error.message);
    return typeof file.parts === "function" ? file.parts() : [file];
  }
}

// MP4出力ノードだけを固定長ブロックで保持する。拡張時に既存の出力をコピーしない。
function CreateMP4OutputBuffer(core, filename) {
  const fs = core.FS;
  const originalOpen = fs.open;
  const blockSize = 4 * 1024 * 1024;
  const nodes = new Set();
  let disposed = false;
  fs.open = function (...args) {
    const stream = Reflect.apply(originalOpen, this, args);
    const node = stream.node;
    if (stream.path !== "/" + filename || !stream.isWrite || node.ndlMP4Output || node.usedBytes) return stream;
    const blocks = new Map();
    const originalSetattr = node.node_ops.setattr;
    let zeroBlock;
    let allocations = 0;
    const valid = (position, length = 0) => {
      if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < 0 || length < 0 || !Number.isSafeInteger(position + length)) throw new fs.ErrnoError(28);
    };
    const blockAt = (index) => {
      if (!blocks.has(index)) { blocks.set(index, new Uint8Array(blockSize)); allocations++; }
      return blocks.get(index);
    };
    const store = {
      get size() { return node.usedBytes; },
      read(buffer, offset, length, position) {
        valid(position, length);
        const count = Math.max(0, Math.min(length, node.usedBytes - position));
        for (let copied = 0; copied < count;) {
          const pos = position + copied, index = Math.floor(pos / blockSize), within = pos % blockSize;
          const size = Math.min(count - copied, blockSize - within);
          const block = blocks.get(index);
          if (block) buffer.set(block.subarray(within, within + size), offset + copied);
          else buffer.fill(0, offset + copied, offset + copied + size);
          copied += size;
        }
        return count;
      },
      write(buffer, offset, length, position) {
        valid(position, length);
        if (!length) return 0;
        for (let copied = 0; copied < length;) {
          const pos = position + copied, within = pos % blockSize;
          const size = Math.min(length - copied, blockSize - within);
          const part = buffer.subarray ? buffer.subarray(offset + copied, offset + copied + size) : buffer.slice(offset + copied, offset + copied + size);
          blockAt(Math.floor(pos / blockSize)).set(part, within);
          copied += size;
        }
        node.usedBytes = Math.max(node.usedBytes, position + length);
        node.timestamp = Date.now();
        return length;
      },
      truncate(size) {
        valid(size);
        if (size < node.usedBytes) {
          const firstUnused = Math.ceil(size / blockSize);
          for (const index of blocks.keys()) if (index >= firstUnused) blocks.delete(index);
          if (size % blockSize) blocks.get(Math.floor(size / blockSize))?.fill(0, size % blockSize);
        }
        node.usedBytes = size;
      },
      readRange(start, length) {
        valid(start, length);
        if (start + length > node.usedBytes) throw new Error("MP4出力の読み取り範囲が不正です");
        const bytes = new Uint8Array(length);
        store.read(bytes, 0, length, start);
        return bytes;
      },
      writeRange(start, bytes) {
        if (start + bytes.length > node.usedBytes) throw new Error("MP4出力の書き込み範囲が不正です");
        store.write(bytes, 0, bytes.length, start);
      },
      parts(start = 0, end = node.usedBytes) {
        valid(start, end - start);
        if (end > node.usedBytes) throw new Error("MP4出力の保存範囲が不正です");
        const parts = [];
        for (let pos = start; pos < end;) {
          const within = pos % blockSize, length = Math.min(end - pos, blockSize - within);
          let block = blocks.get(Math.floor(pos / blockSize));
          if (!block) { zeroBlock ??= new Uint8Array(blockSize); block = zeroBlock; }
          parts.push(block.subarray(within, within + length));
          pos += length;
        }
        return parts;
      },
      stats() { return { size: node.usedBytes, blocks: blocks.size, blockSize, allocatedBytes: blocks.size * blockSize, allocations, growthCopyBytes: 0 }; },
      clear() { blocks.clear(); zeroBlock = undefined; node.usedBytes = 0; },
    };
    node.ndlMP4Output = store;
    node.node_ops = {
      ...node.node_ops,
      setattr(target, attrs) {
        const rest = { ...attrs };
        if (attrs.size !== undefined) { store.truncate(attrs.size); delete rest.size; }
        return originalSetattr(target, rest);
      },
    };
    node.stream_ops = {
      ...node.stream_ops,
      read: (stream, buffer, offset, length, position) => store.read(buffer, offset, length, position),
      write: (stream, buffer, offset, length, position) => store.write(buffer, offset, length, position),
      allocate(stream, offset, length) {
        valid(offset, length);
        if (!length) return;
        for (let index = Math.floor(offset / blockSize); index <= Math.floor((offset + length - 1) / blockSize); index++) blockAt(index);
        node.usedBytes = Math.max(node.usedBytes, offset + length);
      },
      mmap() { throw new fs.ErrnoError(43); },
      msync: (stream, buffer, offset, length) => { store.write(buffer, 0, length, offset); return 0; },
    };
    stream.stream_ops = node.stream_ops;
    nodes.add(node);
    return stream;
  };
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      fs.open = originalOpen;
      for (const node of nodes) console.info("[nico downloader] MP4出力バッファ:", node.ndlMP4Output.stats());
      nodes.clear();
    },
  };
}

function PrepareConvertedDownload(core, NicoDownloader, Nicovideo) {
  if (last_save_sm === Nicovideo.video_sm) return false;
  const outputName = NicoDownloader.FSOutputFileNameGet();
  const size = core.FS.stat(outputName).size;
  if (!size) throw new Error("変換出力が空です。");
  // このCoreのMEMFSを参照し、readFileによる出力全体のコピーを省く。
  // Blobは構築時に内容を取り込むため、直後に仮想ファイルを削除できる。
  const node = core.FS.lookupPath(outputName).node;
  const file = node.ndlMP4Output ?? node.contents.subarray(0, size);
  const format = NicoDownloader.CheckVideoFormat();
  const parts = format === "mp4" ? MakeMP4MetadataParts(file, Nicovideo) : [file];
  const blob = new Blob(parts, { type: FiletypeToMimetype(format) });
  core.FS.unlink(outputName);
  node.ndlMP4Output?.clear();
  let link;
  let objectURL;
  try {
    const a = document.createElement("a");
    a.id = VideoData.Video_DLlink.a2;
    document.body.appendChild(a);
    link = document.getElementById(VideoData.Video_DLlink.a2);
    objectURL = URL.createObjectURL(blob);
    link.href = objectURL;
    link.download = Nicovideo.video_name;
    link.style.display = "none";
    document.body.click();
    NicoDownloader.ButtonTextWrite("まもなく保存完了");
    last_save_sm = Nicovideo.video_sm;
    return true;
  } catch (error) {
    link?.remove();
    if (objectURL) URL.revokeObjectURL(objectURL);
    throw error;
  }
}

// 入力・途中出力は成功時も失敗時も残さない。後始末の失敗で元のエラーを隠さない。
function RemoveFFmpegFiles(core, filenames) {
  for (const filename of filenames) {
    if (typeof filename !== "string" || !filename) continue;
    try {
      if (core.FS.analyzePath(filename).exists) {
        const node = core.FS.lookupPath(filename).node;
        core.FS.unlink(filename);
        node.ndlMP4Output?.clear();
      }
    } catch (error) {
      console.warn("仮想ファイルの解放に失敗しました:", filename, error);
    }
  }
}

// 現行の順次コピー変換だけを対象にする。解析・シーク・再利用が必要な入力は保持する。
function CreateMP4SegmentReclaimer(core, m3u8s, downloader) {
  const idle = { observe() {}, dispose() {}, needsReplay: () => false };
  if (downloader.CheckVideoFormat() !== "mp4") return idle;
  const fs = core.FS;
  const methods = ["open", "read", "llseek", "close"];
  if (methods.some((name) => typeof fs[name] !== "function")) return idle;
  const count = m3u8s.length / 2;
  const reserved = new Set(m3u8s.slice(count));
  const references = new Map();
  const lists = [];
  let unsafe = false;
  const local = (name) => typeof name === "string" && /^[\w.-]+$/.test(name) && name !== "." && name !== "..";
  for (const text of m3u8s.slice(0, count)) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const media = [];
    let segment = false;
    for (const line of lines) {
      for (const match of line.matchAll(/(?:^|[:,])URI="([^"]+)"/g)) reserved.add(match[1]);
      if (line.startsWith("#EXTINF:")) segment = true;
      else if (!line.startsWith("#")) {
        references.set(line, (references.get(line) || 0) + 1);
        if (segment) media.push(line);
        segment = false;
      }
    }
    // バイト範囲・不連続・ライブでは同じファイルを読み直す可能性がある。
    const safe = lines.includes("#EXT-X-ENDLIST") && !lines.some((line) => /^#EXT-X-(?:BYTERANGE|DISCONTINUITY|I-FRAMES-ONLY|PART|SKIP)/.test(line));
    if (media.length && !safe) unsafe = true;
    if (safe) lists.push(media);
  }
  if (unsafe) return idle;
  const downloaded = new Set(downloader.TSFilenames);
  const entries = new Map();
  lists.forEach((names, group) => names.forEach((name, index) => {
    if (local(name) && downloaded.has(name) && !reserved.has(name) && references.get(name) === 1) {
      entries.set("/" + name, { name, group, index, pinned: false, open: 0, complete: false });
    }
  }));
  if (!entries.size) return idle;
  const original = Object.fromEntries(methods.map((name) => [name, fs[name]]));
  const streams = new WeakMap();
  const frontier = new Map();
  const pending = new Map();
  let copying = false;
  let stopped = false;
  const releasedPaths = new Set();
  let unsafeRead = false;
  let disposed = false;
  let released = 0;
  let releasedBytes = 0;
  const stop = () => { stopped = true; };
  const stateFor = (stream) => streams.get(stream);
  const canonical = (value) => {
    if (typeof value !== "string") return "";
    const parts = [];
    for (const part of value.split("/")) {
      if (part === "..") parts.pop();
      else if (part && part !== ".") parts.push(part);
    }
    return "/" + parts.join("/");
  };
  fs.open = function (...args) {
    const path = canonical(args[0]);
    // 予想外の再参照はFFmpegが警告だけで読み飛ばす場合があるため、
    // 終了コード0でもその出力を保存せず、保持方式へ戻して再実行する。
    if (releasedPaths.has(path)) { unsafeRead = true; stop(); }
    let stream;
    try { stream = Reflect.apply(original.open, this, args); }
    catch (error) { if (copying) stop(); throw error; }
    const entry = entries.get(stream.path);
    if (!entry || !stream.isRead) return stream;
    if (!copying || entry.seen) entry.pinned = true;
    if (copying && entry.seen) stop();
    pending.get(entry.group)?.delete(entry);
    entry.seen = true;
    entry.open++;
    const state = { entry, size: stream.node.usedBytes, end: 0, sequential: true };
    streams.set(stream, state);
    if (copying && !stopped) {
      const previous = frontier.get(entry.group) ?? -1;
      if (entry.index < previous) stop();
      frontier.set(entry.group, Math.max(previous, entry.index));
      // 直前の1断片も残し、少なくとも次の次へ進んでから解放する。
      for (const item of pending.get(entry.group) || []) {
        if (stopped || item.index >= entry.index - 1 || item.pinned || item.open || !item.complete) continue;
        try {
          fs.unlink(item.name);
          entries.delete("/" + item.name);
          releasedPaths.add("/" + item.name);
          pending.get(entry.group).delete(item);
          released++;
          releasedBytes += item.size;
        } catch { item.pinned = true; }
      }
    }
    return stream;
  };
  fs.read = function (stream, buffer, offset, length, position) {
    const state = stateFor(stream);
    const start = position ?? stream.position;
    try {
      const result = Reflect.apply(original.read, this, arguments);
      if (state && result > 0) {
        if (start !== state.end) { state.sequential = false; state.entry.pinned = true; if (copying) stop(); }
        state.end = start + result;
      }
      return result;
    } catch (error) {
      if (state) { state.entry.pinned = true; stop(); }
      throw error;
    }
  };
  fs.llseek = function (stream) {
    const before = stream.position;
    const state = stateFor(stream);
    try {
      const result = Reflect.apply(original.llseek, this, arguments);
      if (state && result !== before) {
        state.entry.pinned = true;
        if (copying) stop();
      }
      return result;
    } catch (error) {
      if (state) { state.entry.pinned = true; stop(); }
      throw error;
    }
  };
  fs.close = function (stream) {
    const state = stateFor(stream);
    try {
      const result = Reflect.apply(original.close, this, arguments);
      if (state) {
        const entry = state.entry;
        entry.open--;
        entry.size = state.size;
        entry.complete = state.sequential && state.size > 0 && state.end >= state.size;
        if (!entry.complete) entry.pinned = true;
        if (!entry.pinned && !entry.open && entry.complete) {
          if (!pending.has(entry.group)) pending.set(entry.group, new Set());
          pending.get(entry.group).add(entry);
        }
        streams.delete(stream);
      }
      return result;
    } catch (error) {
      if (state) { state.entry.pinned = true; stop(); }
      throw error;
    }
  };
  return {
    observe(message) {
      // 入力の形式解析と出力の準備が済むまで、開いた断片をすべて保持する。
      if (/^Output #0, mp4,/.test(message)) copying = true;
    },
    needsReplay: () => unsafeRead,
    releasedFiles: () => [...releasedPaths].map((name) => name.slice(1)),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const name of methods) fs[name] = original[name];
      console.info("[nico downloader] MP4断片メモリ解放:", { files: released, bytes: releasedBytes, stopped });
      entries.clear();
      pending.clear();
    },
  };
}

//ここから追記
/**
 * ダウンロードし変換する関数
 * @param {NicoDownloaderClass} NicoDownloader
 * @param {Array} m3u8s
 * @param {NicovideoClass} Nicovideo
 * @returns
 */
async function DownEncoder(NicoDownloader, m3u8s, Nicovideo) {
  NicoDownloader.SetVideoFormat(Nicovideo.video_name); //フォーマットをセット
  if (NicoDownloader.CheckVideoFormat() == false) throw new Error("保存形式を判定できませんでした。");

  // 開始・終了・失敗時の状態は呼び出し元のMovieDownload_domandが管理する。
  NicoDownloader.DownloadFaultNumReset(); //ダウンロードエラー数をリセット

  NicoDownloader.DownloadPercentageReset(); //パーセンテージをリセット

  //https://github.com/naari3/nico-downloader-ffmpeg/blob/main/src/background.ts  //偉大なる@_naari_氏による協力に感謝いたします

  console.log("=== FFmpeg初期化開始 ===");

  const coreURL = chrome.runtime.getURL("dist/ffmpeg-core2.js");
  const wasmURL = chrome.runtime.getURL("dist/ffmpeg-core.wasm");
  const core = await createFFmpegCore({
    // 既存ファイル名のまま、拡張機能内のWASMだけを読み込む。
    mainScriptUrlOrBlob: coreURL + "#" + btoa(JSON.stringify({ wasmURL, workerURL: "" })),
  });
  const inputFiles = new Set([
    ...NicoDownloader.TSFilenames,
    ...m3u8s.slice(m3u8s.length / 2),
  ]);
  const segmentReclaimer = CreateMP4SegmentReclaimer(core, m3u8s, NicoDownloader);
  try {
    core.setLogger(({ message }) => {
      const output = String(message);
      segmentReclaimer.observe(output);
      DebugPrint(`FFMPEG: ${output}`);
      parseFFmpegProgress(output, NicoDownloader);
    });

    //URLsを片っ端から処理
    //落としてファイルシステムにいれていく
    let promises = [];
    const BATCH_SIZE = 10; // 同時ダウンロード数を10に設定

    for (let i = 0; i < NicoDownloader.TSURLs.length; i++) {
      const promise = new Promise((resolve, reject) => {
        DownloadUint8Array(NicoDownloader.TSURLs[i], NicoDownloader).then(
          (byte) => {
            let filenumber = i + 1;

            let filename = NicoDownloader.TSFilenames[i];
            core.FS.writeFile(filename, byte, { canOwn: true });
            DebugPrint("FSwrite:" + filename);

            // バッファはMEMFSが保持するため、取得側の参照はここで手放す
            byte = null;

            //ダウンロードパーセンテージを計算
            const downpercentage =
              (100 * filenumber) / NicoDownloader.TSURLs.length;
            if (downpercentage > NicoDownloader.DownloadPercentageGet()) {
              NicoDownloader.DownloadPercentageSet(downpercentage);
            }

            //ダウンロード中のテキストを書き換え
            let text_dl =
              NicoDownloader.LangText("ダウンロード中") +
              "…… (" +
              NicoDownloader.DownloadPercentageGet().toFixed(1) +
              "%)";

            //ダウンロードエラー数がある場合はエラー発生の●を表示
            if (NicoDownloader.DownloadFaultNumCheck() != 0) {
              text_dl += "●";
            }

            //ボタンのテキストを書き換え
            NicoDownloader.ButtonTextWrite(text_dl);

            DebugPrint("180: " + core.FS.stat(filename));

            //最後のファイルの場合はresolve
            resolve(filename);
          }
        ).catch(error => {
          console.error(`ダウンロードエラー: ${NicoDownloader.TSURLs[i]}`, error);
          reject(error);
        });
      });

      promises.push(promise);

      // BATCH_SIZE個毎、または最後の要素でバッチ処理を実行
      if (promises.length >= BATCH_SIZE || i === NicoDownloader.TSURLs.length - 1) {
        try {
          // 失敗した1件だけで先へ戻らず、同じバッチの書き込み完了も待つ。
          const results = await Promise.allSettled(promises);
          const failed = results.find((result) => result.status === "rejected");
          if (failed) throw failed.reason;
          promises = []; // バッチが完了したらpromises配列をクリア

          // ガベージコレクションを強制実行
          if (window.gc) {
            window.gc();
          }

          // 少し待機してメモリを安定させる
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error("バッチダウンロードエラー:", error);
          throw error;
        }
      }
    }

    //Transcodeする
    // 全てのダウンロードが完了後に変換処理を開始
    // URLを読みに行かないよう、保存形式に必要なm3u8を書き込む。
    // 配列の前半が本文、後半がファイル名。AACでは音声の1組だけ。
    const m3u8s_num = m3u8s.length / 2;
    for (let i = 0; i < m3u8s_num; i++) {
      DebugPrint(
        m3u8s[m3u8s_num + i] + " -> " + new TextEncoder().encode(m3u8s[i])
      );
      core.FS.writeFile(
        m3u8s[m3u8s_num + i],
        new TextEncoder().encode(m3u8s[i]),
        { canOwn: true }
      );
    }

    const m3u8name = m3u8s[m3u8s.length - 1];
    NicoDownloader.ButtonTextWrite("結合処理中");

    let conversionError;
    try { await Transcode(core, m3u8name, NicoDownloader, Nicovideo); }
    catch (error) { conversionError = error; }
    if (segmentReclaimer.needsReplay()) {
      const restore = segmentReclaimer.releasedFiles();
      segmentReclaimer.dispose(); // 次の変換では断片を途中解放しない。
      RemoveFFmpegFiles(core, [NicoDownloader.FSOutputFileNameGet()]);
      console.warn("[nico downloader] MP4断片再読み取り: 解放した断片を戻し、早期解放なしで1回だけ再変換します。", restore.length);
      NicoDownloader.ButtonTextWrite("処理中");
      for (let start = 0; start < restore.length; start += BATCH_SIZE) {
        const results = await Promise.allSettled(restore.slice(start, start + BATCH_SIZE).map(async (filename) => {
          const index = NicoDownloader.TSFilenames.indexOf(filename);
          if (index < 0) throw new Error("再取得する断片のURLがありません: " + filename);
          const bytes = await DownloadUint8Array(NicoDownloader.TSURLs[index], NicoDownloader);
          core.FS.writeFile(filename, bytes, { canOwn: true });
        }));
        const failed = results.find((result) => result.status === "rejected");
        if (failed) throw failed.reason;
      }
      await Transcode(core, m3u8name, NicoDownloader, Nicovideo);
    } else if (conversionError) {
      throw conversionError;
    }
    NicoDownloader.ButtonTextWrite("変換終了");
    // 出力をBlobへ取り込む前に、変換済みの入力全体を解放する。
    RemoveFFmpegFiles(core, inputFiles);
    return PrepareConvertedDownload(core, NicoDownloader, Nicovideo);
  } finally {
    // FSの監視を先に戻し、後始末や次の操作へ持ち越さない。
    segmentReclaimer.dispose();
    // バッチの全件完了を待ってから到達するので、解放後に書き込みは走らない。
    RemoveFFmpegFiles(core, [...inputFiles, NicoDownloader.FSOutputFileNameGet()]);
    core.setLogger(() => {});
  }
}

////////////////////////////////////////////////////////////////////////
/**
 * URLからダウンロードし、Blobを返す
 * @param {String} url ダウンロードするURL
 * @param {NicoDownloaderClass} NicoDownloader
 * @returns {Object} Blob
 */
////////////////////////////////////////////////////////////////////////
async function Downloadblob(url, NicoDownloader) {
  try {
    //TSの取得
    const blob = await fetch_retry(url, NicoDownloader, { credentials: "include" }, 100,
      (response) => response.blob());
    DebugPrint("BLOBgetEnd:" + url);
    return blob;
  } catch (error) {
    console.error(`Blob取得エラー: ${url}`, error);
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////
/**
 * URLからダウンロードし、Uint8Arrayを返す
 * @param {String} url ダウンロードするURL
 * @param {NicoDownloaderClass} NicoDownloader
 * @returns {Object} Uint8Array
 */
////////////////////////////////////////////////////////////////////////
async function DownloadUint8Array(url, NicoDownloader) {
  try {
    // Response -> Blob -> ArrayBufferの中間Blobを作らず、取得したバッファを渡す。
    const buffer = await fetch_retry(url, NicoDownloader, { credentials: "include" }, 100,
      (response) => response.arrayBuffer());
    return new Uint8Array(buffer);
  } catch (error) {
    console.error(`Uint8Array取得エラー: ${url}`, error);
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////
/**
 * 指定された形式で変換する（成功後の出力読み出しは呼び出し元が行う）
 * @param {Core} Core
 * @param {String} m3u8name
 * @param {NicoDownloaderClass} NicoDownloader
 * @param {NicovideoClass} Nicovideo
 * @returns {Promise<void>}
 */
////////////////////////////////////////////////////////////////////////
async function Transcode(Core, m3u8name, NicoDownloader, Nicovideo) {
  NicoDownloader.ButtonTextWrite("変換中");
  // 処理中に設定が変わっても、取得済みの入力と保存名に対応する形式を使う。
  const mode = NicoDownloader.CheckVideoFormat();

  console.log(`Current mode: ${mode}`); // モードを確認するログ
  return runFFmpeg_m3u8(Core, m3u8name, NicoDownloader, Nicovideo, mode);
}

////////////////////////////////////////////////////////////////////////
/**
 * Option_setLoading関数は、指定された名前のローカルストレージの値を読み込み、localStorageに設定します。
 * 
 * @param {string} name - 読み込むローカルストレージの名前
 * @returns {string|number} - 指定された名前のローカルストレージの値。読み込みに失敗した場合は0を返します。
 */
////////////////////////////////////////////////////////////////////////
function Option_setLoading(name) {

  try {
    chrome.storage.local.get(name, function (value) {
      //chrome.storage.localから読み出し
      localStorage.setItem(name, value[name]);
    })
    //return return_val;
    return localStorage.getItem(name);

  } catch (error) {
    return 0;
  }

}

////////////////////////////////////////////////////////////////////////
/**
 * 通信失敗時に、指定回数を上限として再試行する。
 * @param {String} url ダウンロードするURL
 * @param {NicoDownloaderClass} NicoDownloader
 * @param {Object} options fetchのオプション
 * @param {Number} n 最大試行回数（初回を含む）
 * @param {Function} readResponse 任意の本文読み取り処理。受信完了まで同じ試行内で待つ。
 * @returns {Promise<*>}
 */
////////////////////////////////////////////////////////////////////////
async function fetch_retry(url, NicoDownloader, options, n, readResponse) {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("最大試行回数は1以上の整数で指定してください。");
  }
  for (let attempt = 1; attempt <= n; attempt++) {
    let failure;
    let receivingBody = false;
    try {
      DebugPrint("fetchurl: " + url);
      const response = await fetch(url, options);
      if (response.status === 200) {
        if (!readResponse) return response;
        receivingBody = true;
        return await readResponse(response);
      }
      // エラー応答の本文は使わない。接続と受信バッファを保持し続けない。
      try { await response.body?.cancel(); } catch {}
      failure = new Error(`HTTP ${response.status}: ${url}`);
      failure.status = response.status;
    } catch (error) {
      // 明示的な中断を通信失敗として再試行しない。
      if (error?.name === "AbortError" || options?.signal?.aborted) throw error;
      // 本文受信の通信エラーだけを再試行し、メモリ不足などは繰り返さない。
      if (receivingBody && error?.name !== "TypeError") throw error;
      failure = error;
    }
    NicoDownloader.DownloadFaultNumAdd();
    const stage = receivingBody ? "本文受信失敗" : "通信失敗";
    if (attempt === n) {
      console.warn(`[nico downloader] ${stage}: 最大試行回数（${n}回）に達しました。`, url, failure);
      throw failure;
    }
    console.warn(`[nico downloader] ${stage}: 1秒後に再試行します（${attempt}/${n}回）。`, url, failure);
    await sleep(1000);
  }
}

////////////////////////////////////////////////////////////////////////
/**
 * 描画や他の通信を止めずに待機する。
 * @param {Number} waitMsec 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
////////////////////////////////////////////////////////////////////////
function sleep(waitMsec) {
  return new Promise((resolve) => setTimeout(resolve, waitMsec));
}

////////////////////////////////////////////////////////////////////////
/**
 * FFmpegの出力から進捗情報を解析してコンソールに表示
 * @param {String} output FFmpegの出力文字列
 * @param {NicoDownloaderClass} NicoDownloader
 */
////////////////////////////////////////////////////////////////////////
function parseFFmpegProgress(output, NicoDownloader) {
  output = String(output);
  // メモリ不足エラーを検出
  if (output.includes("Array buffer allocation failed") || 
      output.includes("RangeError") || 
      output.includes("out of memory")) {
    console.error("メモリ不足エラーが検出されました:", output);
    NicoDownloader.ButtonTextWrite("メモリ不足エラー");
    return;
  }

  // フレーム数の進捗を検出
  const frameMatch = output.match(/frame=\s*(\d+)/);
  if (frameMatch) {
    const currentFrame = parseInt(frameMatch[1]);
    // 進捗ログの頻度を制限（100フレームごと）
    if (currentFrame % 100 === 0) {
      console.log(`変換進捗: フレーム ${currentFrame} 処理中`);
    }
  }

  // 時間の進捗を検出 (time=00:01:23.45 形式)
  const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
  if (timeMatch) {
    const currentTime = timeMatch[1];
    console.log(`変換進捗: 時刻 ${currentTime} まで処理完了`);
  }

  // 速度情報を検出
  const speedMatch = output.match(/speed=\s*([\d.]+)x/);
  if (speedMatch) {
    const speed = parseFloat(speedMatch[1]);
    console.log(`変換速度: ${speed}x (リアルタイムの${speed}倍速)`);
  }

  // ビットレート情報を検出
  const bitrateMatch = output.match(/bitrate=\s*([\d.]+)kbits\/s/);
  if (bitrateMatch) {
    const bitrate = parseFloat(bitrateMatch[1]);
    console.log(`現在のビットレート: ${bitrate} kbits/s`);
  }

  // ファイルサイズ情報を検出
  const sizeMatch = output.match(/size=\s*(\d+)kB/);
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1]);
    console.log(`出力ファイルサイズ: ${size} kB`);
  }

  // 進捗パーセンテージを推定してボタンに表示
  if (frameMatch || timeMatch) {
    NicoDownloader.ButtonTextWrite(`変換中 (${timeMatch ? timeMatch[1] : 'フレーム ' + frameMatch[1]})`);
  }
}
