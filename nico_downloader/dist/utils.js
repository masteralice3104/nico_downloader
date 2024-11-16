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
        : ["-c", "copy"]), // MP4モードでオーディオ・ビデオをコピー
      outputFileName,
    ]);
    DebugPrint(`ffmpeg called with args: ${ffmpegArgs.join(" ")}`);
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
  const core = await createFFmpegCore({
    printErr: (e) => DebugPrint(`FFMPEG:${e}`),
    print: (e) => {
      DebugPrint(`FFMPEG: ${e}`);
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
            core.FS.unlink(NicoDownloader.FSOutputFileNameGet());

            //blob
            const blob = new Blob([file.buffer], {
              //MIMEタイプを設定
              type: FiletypeToMimetype(NicoDownloader.CheckVideoFormat()),
            });

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
  for (let i = 0; i < NicoDownloader.TSURLs.length; i++) {
    const promise = new Promise((resolve, reject) => {
      DownloadUint8Array(NicoDownloader.TSURLs[i], NicoDownloader).then(
        (byte) => {
          let filenumber = i + 1;

          let filename = NicoDownloader.TSFilenames[i];
          core.FS.writeFile(filename, byte);
          DebugPrint("FSwrite:" + filename);

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
      );
    });

    promises.push(promise);

    if (i % 2 == 1) {
      await Promise.all(promises);
    }
  }

  //Transcodeする

  await Promise.all(promises).then(() => {
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
  //TSの取得
  let res = await fetch_retry(
    url,
    NicoDownloader,
    { credentials: "include" },
    100
  );

  let blob = res.blob();
  DebugPrint("BLOBgetEnd:" + url);
  return blob;
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
  let blob = await Downloadblob(url, NicoDownloader);
  let byte = null;
  await blob.arrayBuffer().then((data) => {
    byte = new Uint8Array(data);
  });
  return byte;
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
  const mode = await Option_setLoading("downFile_setting"); // モードを取得
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
