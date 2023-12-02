//https://github.com/ffmpegwasm/ffmpeg.wasm-core/blob/1f3461d4162ea41dd714c5cae7fff08fda362ad8/wasm/examples/browser/js/utils.js
//をもとに改造したもの
//LGPL

let last_load_sm = "";
let last_save_sm = "";
let last_save_sm_URI = "";
let faults = 0;
let load_percentage = 0;

const parseArgs = (Core, args) => {
  const argsPtr = Core._malloc(args.length * Uint32Array.BYTES_PER_ELEMENT);
  args.forEach((s, idx) => {
    const buf = Core._malloc(s.length + 1);
    Core.writeAsciiToMemory(s, buf);
    Core.setValue(argsPtr + (Uint32Array.BYTES_PER_ELEMENT * idx), buf, 'i32');
  });
  return [args.length, argsPtr];
};

const ffmpeg = (Core, args) => {
  Core.ccall(
    "main",
    'number',
    ['number', 'number'],
    parseArgs(Core, ['ffmpeg', '-nostdin', ...args]),
  );//https://github.com/naari3/nico-downloader-ffmpeg/blob/main/src/background.ts
};

//const runFFmpeg = async (ifilename, data, args, ofilename, extraFiles = []) => {
const runFFmpeg = async (Core, video_sm, ofilename) => {
  let resolve = null;
  const waitEnd = new Promise((r) => {
    resolve = r;
  });
  try {
    ffmpeg(Core, ['-f', 'concat', '-i', video_sm + ".txt", "-c", "copy", ofilename]);
    //ffmpeg(Core, ['-f', 'concat', '-r', fps, '-i', video_sm + ".txt", '-r', fps, ofilename]);//可変FPSなのでfps入れるとおかしくなる


    //m3u8入れるとこれ？
    //ffmpeg(Core, ['-i', video_sm + ".m3u8", "-c", "copy", ofilename]);

    //ここをcopyでやらないと変換速度がx0.1とかになる
  } catch (err) {
    DebugPrint(err);
  };
  await waitEnd;
  DebugPrint("waitEnd");

};

const runFFmpeg_m3u8 = async (Core, m3u8name, ofilename) => {
  let resolve = null;
  const waitEnd = new Promise((r) => {
    resolve = r;
  });
  try {

    //m3u8入れるとこれ？
    ffmpeg(Core, ['-allowed_extensions', 'ALL', '-i', m3u8name, "-c", "copy", ofilename]);

    //ここをcopyでやらないと変換速度がx0.1とかになる
  } catch (err) {
    DebugPrint(err);
  };
  await waitEnd;
  DebugPrint("waitEnd");

};

const b64ToUint8Array = (str) => (Uint8Array.from(atob(str), c => c.charCodeAt(0)));


//ここから追記
async function DownEncoder(TSURLs, TSFilenames, m3u8s, video_sm, video_name, format = "mp4") {

  if (last_load_sm === video_sm) return;
  last_load_sm = video_sm;//2度読み込みを防ぐ
  faults = 0;//失敗数を記録
  load_percentage = 0;//読み込みパーセント




  //https://github.com/naari3/nico-downloader-ffmpeg/blob/main/src/background.ts  //偉大なる@_naari_氏による協力に感謝いたします
  let resolve = null;
  let file = null;
  const core = await createFFmpegCore({
    printErr: (e) => DebugPrint(`FFMPEG:${e}`),
    print: (e) => {
      DebugPrint(`FFMPEG: ${e}`);
      if (e.startsWith("FFMPEG_END")) {
        DebugPrint("FFMPEG_END 変換終了");
        if (last_save_sm !== video_sm) {

          const ofilename = video_sm + "." + format;
          file = core.FS.readFile(ofilename);
          console.log({ file });
          core.FS.unlink(ofilename);

          //blob
          const blob = new Blob([file.buffer], { type: 'video/mp4' });
          const blobsrc = URL.createObjectURL(blob);
          DebugPrint(blobsrc);

          //ダウンロード
          const a = document.createElement('a');
          a.href = blobsrc;
          a.download = video_name;

          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          documentWriteText("保存完了");

          last_save_sm = video_sm;
        } else {
          documentWriteText("保存完了");
        }

      }
    },
  });
  console.debug({ core });

  //URLsを片っ端から処理
  //落としてファイルシステムにいれていく
  let Fstext = "";
  let promises = [];
  for (let i = 0; i < TSURLs.length; i++) {

    const promise = new Promise((resolve, reject) => {


      DownloadUint8Array(TSURLs[i])
        .then(byte => {
          let filenumber = i + 1;

          let filename = TSFilenames[i];
          core.FS.writeFile(filename, byte);
          DebugPrint("FSwrite:" + filename);

          const downpercentage = 100 * filenumber / TSURLs.length;
          if (downpercentage > load_percentage) {
            load_percentage = downpercentage;
          }
          let text_dl = "ダウンロード中…… (" + load_percentage.toFixed(1) + "%)";
          if (faults != 0) {
            text_dl += "●";
          }

          documentWriteText(text_dl);

          DebugPrint(core.FS.stat(filename));
          resolve(filename);
        });



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
      DebugPrint(m3u8s[m3u8s_num + i] + ' -> ' + new TextEncoder().encode(m3u8s[i]))
      core.FS.writeFile(m3u8s[m3u8s_num + i], new TextEncoder().encode(m3u8s[i]));
    }

    const m3u8name = m3u8s[m3u8s.length - 1];



    //await Transcode(core, video_sm);
    Transcode(core, video_sm, m3u8name, 'mp4');
  }
  )

  return;

}
async function Downloadblob(url) {

  //if (!url.match(/ts/)) {
  //  return null;
  //}

  //TSの取得
  //let res = await fetch_retry(url, { method: 'GET' }, 100);
  let res = await fetch_retry(url, { credentials: 'include' }, 100);

  let blob = res.blob();
  DebugPrint("BLOBgetEnd:" + url);
  return blob;
};

async function DownloadUint8Array(url) {
  let blob = await Downloadblob(url);
  let byte = null;
  await blob.arrayBuffer().then(data => {
    byte = new Uint8Array(data);
  });
  return byte;
}

const Transcode = async function (Core, video_sm, m3u8name, format = "mp4") {
  const outputvideo_name = video_sm + "." + format;
  documentWriteText("変換中……");
  //const { file } = await runFFmpeg(Core, video_sm, outputvideo_name, fps);
  const { file } = await runFFmpeg_m3u8(Core, m3u8name, outputvideo_name);
  return file;
};

//https://qiita.com/ksakiyama134/items/8cfb0cf96d8f7c7be5b3
const fetch_retry = async (url, options, n) => {
  try {
    DebugPrint('fetchurl: ' + url);
    let fetched = await fetch(url, options);
    if (fetched.status === 200) {
      return fetched;
    } else {
      DebugPrint("retry:" + url);
      faults++;
      sleep(1000);
      return await fetch_retry(url, options, n - 1);
    }
  } catch (err) {
    faults++;
    sleep(1000);
    DebugPrint("retry:" + url);
    if (n === 1) throw err;
    return await fetch_retry(url, options, n - 1);
  }
};


//https://www.sejuku.net/blog/24629
function sleep(waitMsec) {
  var startMsec = new Date();

  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  while (new Date() - startMsec < waitMsec);
}


async function TextDownload_withCookie(URL) {
  return await fetch(URL, { credentials: 'include' })
    .then((response) => {
      if (response.status !== 200) {
        DebugPrint("Error downloading :" + URL);
        return -1;
      }
      return response.text();
    });
}
async function ArrayDownload_withCookie(URL) {
  return await fetch(URL, { credentials: 'include' })
    .then((response) => {
      if (response.status !== 200) {
        DebugPrint("Error downloading :" + URL);
        return -1;
      }
      return response.arrayBuffer();
    });
}
