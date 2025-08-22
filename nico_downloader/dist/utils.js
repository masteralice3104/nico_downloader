//https://github.com/ffmpegwasm/ffmpeg.wasm-core/blob/1f3461d4162ea41dd714c5cae7fff08fda362ad8/wasm/examples/browser/js/utils.js
//をもとに改造したもの
//LGPL

let last_save_sm = "";

const parseArgs = (Core, args) => {
  const argsPtr = Core._malloc(args.length * Uint32Array.BYTES_PER_ELEMENT);
  args.forEach((s, idx) => {
    const buf = Core._malloc(s.length + 1);
    Core.writeAsciiToMemory(s, buf);
    Core.setValue(argsPtr + Uint32Array.BYTES_PER_ELEMENT * idx, buf, "i32");
  });
  return [args.length, argsPtr];
};

// ffmpegの実行
const ffmpeg = (Core, args) => {
  Core.ccall(
    "main",
    "number",
    ["number", "number"],
    parseArgs(Core, ["ffmpeg", "-nostdin", ...args])
  ); //https://github.com/naari3/nico-downloader-ffmpeg/blob/main/src/background.ts
};

////////////////////////////////////////////////////////////////
/**
 * m3u8を変換する
 * @param {Core} Core
 * @param {String} m3u8name
 * @param {NicoDownloaderClass} NicoDownloader
 * @param {NicovideoClass} Nicovideo
 * @param {String} mode
 */
////////////////////////////////////////////////////////////////
const runFFmpeg_m3u8 = async (
  Core,
  m3u8name,
  NicoDownloader,
  Nicovideo,
  mode = "mp4"//デフォルトはmp4
) => {
  let resolve = null;

  //終了を待つためのPromise
  const waitEnd = new Promise((r) => {
    resolve = r;
  });

  //終了時にresolve
  try {
    //日本語が入っているとタグが変になるのでエンコード
    //unescapeは非推奨だが見なかったことにする
    const title_str = unescape(encodeURIComponent(Nicovideo.video_title));
    const timestamp_str = unescape(
      encodeURIComponent(Nicovideo.video_registeredAt)
    );
    const username_str = unescape(encodeURIComponent(Nicovideo.video_owner));
    const description_str = unescape(
      encodeURIComponent(Nicovideo.video_description)
    );

    // ジャンルとシリーズは日本語が入っているとエラーになるのでエンコード
    //unescapeは非推奨だが見なかったことにする
    const genre_str = unescape(encodeURIComponent(Nicovideo.video_genre));
    const series_str = unescape(encodeURIComponent(Nicovideo.video_series));

    //拡張子を設定
    NicoDownloader.SetVideFormatByExtension(mode);

    // 出力ファイル名を設定
    NicoDownloader.FSOutputFileNameSet(Nicovideo);
    const outputFileName = NicoDownloader.FSOutputFileNameGet();

    DebugPrint(`OutputFileName: ${outputFileName}`);

    console.log("=== FFmpeg変換開始 ===");
    console.log(`入力ファイル: ${m3u8name}`);
    console.log(`出力ファイル: ${outputFileName}`);
    console.log(`変換モード: ${mode}`);

    //ffmpeg実行
    ffmpeg(Core, [
      "-allowed_extensions",
      "ALL",
      "-i",
      m3u8name,
      "-metadata",
      `title=${title_str}`, // タイトル
      "-metadata",
      `show=${title_str}`, // タイトル
      "-metadata",
      `creation_time=${timestamp_str}`, // 登録日時
      "-metadata",
      `date=${timestamp_str}`, // 登録日時
      "-metadata",
      `artist=${username_str}`, // 投稿ユーザ
      "-metadata",
      `description=${description_str}`, // 説明
      "-metadata",
      `comment=${description_str}`, // 説明
      "-metadata",
      `genre=${genre_str}`, // ジャンル
      "-metadata",
      `publisher=nicovideo.jp`, // パブリッシャ
      "-metadata",
      `episode_id=${Nicovideo.video_sm}`, // 動画ID
      "-metadata",
      `album=${series_str}`, // シリーズ
      "-metadata",
      `album_artist=${username_str}`, // 投稿ユーザ
      ...(mode === "aac"
        ? ["-vn", "-c:a", "copy"] // aacモードで最初のオーディオストリームを選択
        : mode === "mp3"
        ? ["-vn", "-c:a", "libmp3lame", "-b:a", "192k"]  // MP3モードでオーディオをエンコード
        : ["-c", "copy"]), // MP4モードでオーディオ・ビデオをコピー
      outputFileName,
    ]);

    // FFmpegコマンドの引数をログ出力
    const ffmpegArgs = [
      "-allowed_extensions", "ALL", "-i", m3u8name,
      "-metadata", `title=${title_str}`,
      "-metadata", `show=${title_str}`,
      "-metadata", `creation_time=${timestamp_str}`,
      "-metadata", `date=${timestamp_str}`,
      "-metadata", `artist=${username_str}`,
      "-metadata", `description=${description_str}`,
      "-metadata", `comment=${description_str}`,
      "-metadata", `genre=${genre_str}`,
      "-metadata", `publisher=nicovideo.jp`,
      "-metadata", `episode_id=${Nicovideo.video_sm}`,
      "-metadata", `album=${series_str}`,
      "-metadata", `album_artist=${username_str}`,
      ...(mode === "aac" ? ["-vn", "-c:a", "copy"] : ["-c", "copy"]),
      outputFileName
    ];
    console.log(`FFmpegコマンド: ffmpeg ${ffmpegArgs.join(" ")}`);
    console.log("=== 変換処理開始 ===");
  } catch (err) {
    //エラーが出たら
    DebugPrint("runFFmpeg:" + err);
  }

  //終了を待つ
  await waitEnd;

  //終了後
  DebugPrint("waitEnd");
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
  if (NicoDownloader.CheckVideoFormat() == false) return false; //フォーマットをチェック

  //ダウンロード前のチェック処理
  if (NicoDownloader.VideoDownloadingCheck()) {
    //ダウンロード中は終了
    return false;
  } else {
    NicoDownloader.VideoDownloadingSet(); //ダウンロード中フラグを立てる
  }

  NicoDownloader.DownloadFaultNumReset(); //ダウンロードエラー数をリセット

  NicoDownloader.DownloadPercentageReset(); //パーセンテージをリセット

  //https://github.com/naari3/nico-downloader-ffmpeg/blob/main/src/background.ts  //偉大なる@_naari_氏による協力に感謝いたします
  let file = null;
  
  console.log("=== FFmpeg初期化開始 ===");
  
  const core = await createFFmpegCore({
    printErr: (e) => {
      DebugPrint(`FFMPEG:${e}`);
      // FFmpegの進捗情報を解析
      parseFFmpegProgress(e, NicoDownloader);
    },
    print: (e) => {
      DebugPrint(`FFMPEG: ${e}`);
      // FFmpegの進捗情報を解析
      parseFFmpegProgress(e, NicoDownloader);
      if (e.startsWith("FFMPEG_END")) {
        // FFMPEG_ENDで終了
        //終了時の処理
        NicoDownloader.ButtonTextWrite("変換終了");
        DebugPrint("FFMPEG_END 変換終了");
        if (last_save_sm !== Nicovideo.video_sm) {
          try {
            last_save_sm = Nicovideo.video_sm;
            //NicoDownloader.FSOutputFileNameSet(Nicovideo);

            file = core.FS.readFile(NicoDownloader.FSOutputFileNameGet());
            console.log({ file });

            //ファイルの保存処理
            DebugPrint("ファイルの保存処理");
            //blob
            const blob = new Blob([file.buffer], {
              //MIMEタイプを設定
              type: FiletypeToMimetype(NicoDownloader.CheckVideoFormat()),
            });
            DebugPrint("Blob作成完了");

            //ディスクへの保存処理
            const a = document.createElement("a");
            const fileName = Nicovideo.video_name;

            a.id = VideoData.Video_DLlink.a2;
            document.body.appendChild(a);

            const link = document.getElementById(VideoData.Video_DLlink.a2);
            link.href = URL.createObjectURL(blob);
            link.download = fileName;

            link.style.display = "none";

            document.body.click();

            core.FS.unlink(NicoDownloader.FSOutputFileNameGet());
            NicoDownloader.ButtonTextWrite("まもなく保存完了");
          } catch (e) {
            console.error("Error:FaildedToBlob\n", e);
          }
        } else {
          DebugPrint("Error:既に保存済み");
        }
      }
    },
  });
  console.debug({ core });

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
        await Promise.all(promises);
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

  Transcode(core, m3u8name, NicoDownloader, Nicovideo).then(() => {
    NicoDownloader.VideoDownloadingReset(); // ダウンロード中をリセット
  });

  return true;
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
 * 変換処理してファイルを返す
 * @param {Core} Core
 * @param {String} m3u8name
 * @param {NicoDownloaderClass} NicoDownloader
 * @param {NicovideoClass} Nicovideo
 * @returns {Object} file
 */
////////////////////////////////////////////////////////////////////////
async function Transcode(Core, m3u8name, NicoDownloader, Nicovideo) {
  NicoDownloader.ButtonTextWrite("変換中");
  let mode = await Option_setLoading("downFile_setting") || "mp4"; // モードを取得
  if (mode == 0) mode = "mp4"; // モードが取得できなかった場合はデフォルトのmp4にする

  console.log(`Current mode: ${mode}`); // モードを確認するログ
  const file = await runFFmpeg_m3u8(
    Core,
    m3u8name,
    NicoDownloader,
    Nicovideo,
    mode
  );
  return file;
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
 * リトライ処理を含めたfetch　https://qiita.com/ksakiyama134/items/8cfb0cf96d8f7c7be5b3
 * @param {String} url ダウンロードするURL
 * @param {NicoDownloaderClass} NicoDownloader
 * @param {Object} options fetchのオプション
 * @param {Number} n リトライ回数
 * @returns {Object} fetch
 */
////////////////////////////////////////////////////////////////////////
async function fetch_retry(url, NicoDownloader, options, n) {
  try {
    DebugPrint("fetchurl: " + url);
    let fetched = await fetch(url, options);
    if (fetched.status === 200) {
      return fetched;
    } else {
      DebugPrint("retry:" + url);
      NicoDownloader.DownloadFaultNumberAdd();
      sleep(1000);
      return await fetch_retry(url, NicoDownloader, options, n - 1);
    }
  } catch (err) {
    NicoDownloader.DownloadFaultNumberAdd();
    sleep(1000);
    DebugPrint("retry:" + url);
    if (n === 1) throw err;
    return await fetch_retry(url, NicoDownloader, options, n - 1);
  }
}

////////////////////////////////////////////////////////////////////////
/**
 * スリープ関数　https://www.sejuku.net/blog/24629
 * @param {Number} waitMsec スリープ時間
 */
////////////////////////////////////////////////////////////////////////
function sleep(waitMsec) {
  var startMsec = new Date();

  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  while (new Date() - startMsec < waitMsec);
}

////////////////////////////////////////////////////////////////////////
/**
 * FFmpegの出力から進捗情報を解析してコンソールに表示
 * @param {String} output FFmpegの出力文字列
 * @param {NicoDownloaderClass} NicoDownloader
 */
////////////////////////////////////////////////////////////////////////
function parseFFmpegProgress(output, NicoDownloader) {
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
