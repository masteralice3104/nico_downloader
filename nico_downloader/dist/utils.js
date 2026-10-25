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
  ];
  return [
    "-allowed_extensions", "ALL", "-i", m3u8name,
    ...metadata.flatMap(([key, value]) => ["-metadata", `${key}=${value}`]),
    ...(mode === "aac" ? ["-vn", "-c:a", "copy"] : ["-c", "copy"]),
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

  const status = ffmpeg(Core, args);
  if (status !== 0) throw new Error(`FFmpeg exited with status ${status}`);
  console.log("=== FFmpeg変換終了 ===");
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

function PrepareConvertedDownload(core, NicoDownloader, Nicovideo) {
  if (last_save_sm === Nicovideo.video_sm) return false;
  const file = core.FS.readFile(NicoDownloader.FSOutputFileNameGet());
  if (!file.byteLength) throw new Error("変換出力が空です。");
  const blob = new Blob([file.buffer], { type: FiletypeToMimetype(NicoDownloader.CheckVideoFormat()) });
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
    core.FS.unlink(NicoDownloader.FSOutputFileNameGet());
    NicoDownloader.ButtonTextWrite("まもなく保存完了");
    last_save_sm = Nicovideo.video_sm;
    return true;
  } catch (error) {
    link?.remove();
    if (objectURL) URL.revokeObjectURL(objectURL);
    throw error;
  }
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
  core.setLogger(({ message }) => {
    const output = String(message);
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
          core.FS.writeFile(filename, byte);
          DebugPrint("FSwrite:" + filename);

          // メモリ解放のためにbyteを明示的にnullに設定
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
  //間違ってURLを読みに行くのでm3u8を3つ書き換える
  //m3u8末尾の3個
  const m3u8s_num = m3u8s.length / 2;
  for (let i = 0; i < m3u8s_num; i++) {
    DebugPrint(
      m3u8s[m3u8s_num + i] + " -> " + new TextEncoder().encode(m3u8s[i])
    );
    core.FS.writeFile(
      m3u8s[m3u8s_num + i],
      new TextEncoder().encode(m3u8s[i])
    );
  }

  const m3u8name = m3u8s[m3u8s.length - 1];
  NicoDownloader.ButtonTextWrite("結合処理中");

  await Transcode(core, m3u8name, NicoDownloader, Nicovideo);
  NicoDownloader.ButtonTextWrite("変換終了");
  return PrepareConvertedDownload(core, NicoDownloader, Nicovideo);
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
    let res = await fetch_retry(
      url,
      NicoDownloader,
      { credentials: "include" },
      100
    );

    let blob = await res.blob();
    DebugPrint("BLOBgetEnd:" + url);
    
    // レスポンスオブジェクトを明示的にクリア
    res = null;
    
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
    let blob = await Downloadblob(url, NicoDownloader);
    let arrayBuffer = await blob.arrayBuffer();
    let byte = new Uint8Array(arrayBuffer);
    
    // メモリ解放
    blob = null;
    arrayBuffer = null;
    
    return byte;
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
  let mode = await Option_setLoading("downFile_setting") || "mp4"; // モードを取得
  if (mode == 0) mode = "mp4"; // モードが取得できなかった場合はデフォルトのmp4にする

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
 * @returns {Promise<Response>}
 */
////////////////////////////////////////////////////////////////////////
async function fetch_retry(url, NicoDownloader, options, n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("最大試行回数は1以上の整数で指定してください。");
  }
  for (let attempt = 1; attempt <= n; attempt++) {
    let failure;
    try {
      DebugPrint("fetchurl: " + url);
      const response = await fetch(url, options);
      if (response.status === 200) return response;
      failure = new Error(`HTTP ${response.status}: ${url}`);
      failure.status = response.status;
    } catch (error) {
      // 明示的な中断を通信失敗として再試行しない。
      if (error?.name === "AbortError" || options?.signal?.aborted) throw error;
      failure = error;
    }
    NicoDownloader.DownloadFaultNumAdd();
    if (attempt === n) {
      console.warn(`[nico downloader] 通信失敗: 最大試行回数（${n}回）に達しました。`, url, failure);
      throw failure;
    }
    console.warn(`[nico downloader] 通信失敗: 1秒後に再試行します（${attempt}/${n}回）。`, url, failure);
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
