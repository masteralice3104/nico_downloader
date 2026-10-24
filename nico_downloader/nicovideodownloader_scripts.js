//ダウンロード関数

async function VideoDown() {
    // 必要なクラスの初期化
    const NicoDownloader = new NicoDownloaderClass(); //NicoDownloaderクラスの初期化
    const Nicovideo = new NicovideoClass(); //NicovideoClassクラスの初期化

    //そもそもマッチするか確認
    if (Nicovideo.CheckNicovideoWatchURL() == false) return false;

    // Downloadingがtrueの場合は終了
    if (NicoDownloader.VideoDownloadingCheck()) return false;

    // ダウンロードリンクをクリック
    NicoDownloader.DownloadLinkClick();

    // 現在のページの動画IDを取得
    Nicovideo.video_sm = Nicovideo.VideoSmGet(NicoDownloader.MatchingSMIDArray);
    if (Nicovideo.video_sm == "") {
        DebugPrint("video_sm is empty; the current URL did not match video_pattern");
        return false;
    }

    // 動画情報APIが失敗しても、ページ上のタイトルを使ってボタンを表示できるようにする
    try {
        await Nicovideo.SetAllFromVideoSm(Nicovideo.video_sm);
    } catch (error) {
        DebugPrint("Video metadata could not be loaded: " + error);
    }
    if (Nicovideo.video_title == "") {
        Nicovideo.video_title = Nicovideo.GetPageTitle() || Nicovideo.video_sm;
        DebugPrint("Using fallback video title: " + Nicovideo.video_title);
    }

    // デフォルト動画ファイル名の定義
    const downFile_setting = await downFile_get();
    DebugPrint("downFile_setting:" + downFile_setting); // 取得した値を表示

    const video_name = NicoDownloader.VideoDownloadNameMake(
        Nicovideo.video_sm,
        Nicovideo.video_title,
        downFile_setting
    );
    Nicovideo.video_name = video_name;

    // 情報取得中にページが切り替わった場合、古い動画のボタンを描画しない。
    if (!Nicovideo.CheckNicovideoWatchURL() ||
        Nicovideo.VideoSmGet(NicoDownloader.MatchingSMIDArray) !== Nicovideo.video_sm) return false;

    // すでに作ったリンクがあるかどうか判別し、あれば削除
    NicoDownloader.VideoTitleElementCheck(Nicovideo.video_sm);

    DebugPrint("video_name:" + Nicovideo.video_name);

    // 非同期でdownFile_settingを取得する関数
    function downFile_get() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get("downFile_setting", function (value) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(value.downFile_setting);
                }
            });
        });
    }

    //ダウンロードリンクの表示
    if (!NicoDownloader.VideoLoadedCheck(Nicovideo.video_sm)) {
        //ここがtrueになるとすでに読み込み済み

        new Promise((resolve, reject) => {
            //ボタンをとりあえず作成
            if (!NicoDownloader.ButtonFirstMake(Nicovideo.video_sm)) {
                reject("保存ボタンの表示先は読み込み待ちです");
                return;
            }

            NicoDownloader.ButtonTextWrite("処理開始"); //ボタンの文字を変更

            // 保存ボタンを作成
            DebugPrint("video_name_savebutton:" + Nicovideo.video_name);
            NicoDownloader.SaveButtonMake(Nicovideo.video_name);

            //ダウンロード前のチェック処理
            if (NicoDownloader.CheckBeforeDownload() == false)
                reject("CheckBeforeDownload ERROR");

            if (NicoDownloader.VideoDownloadingCheck()) reject("Now Downloading"); //ダウンロード中は終了

            // resolve
            resolve();
        })
            .then(() => {
                ////////////////////////////////////////////////////////////////
                // ここから実行部分
                ////////////////////////////////////////////////////////////////

                // systemMessageContainerからmasterURLを取得
                const masterURL = NicoDownloader.MasterURLGet();
                if (masterURL == false) return false; // masterURLが取得できなかった場合は終了

                DebugPrint("masterURL:" + masterURL);

                if (NicoDownloader.VideoDownloadingCheck()) return false; //ダウンロード中は終了

                //delivery.domand.nicovideo.jpの処理はこちら！
                if (masterURL.indexOf("delivery.domand.nicovideo.jp") != -1) {
                    // ダウンロード処理
                    MovieDownload_domand(Nicovideo, NicoDownloader).then(() => {
                        NicoDownloader.VideoDownloadingReset(); // ダウンロード中をリセット
                    });

                    NicoDownloader.VideoLoadedSMIDSet(Nicovideo.video_sm); // ダウンロードしたsm番号を記録
                }
            })
            .catch((value) => {
                DebugPrint("NDLDL");
                DebugPrint(value);
                return false;
            });
    }
    return true;
}
let interval1st = false;
let intervalId;
try {
    clearInterval(intervalId);

    // 2秒ごとにVideoDownを実行
    intervalId = setInterval(() => {
        if (interval1st) {
            // 2回目以降は実行
            try {
                VideoDown().catch((e) => console.error(e));
            } catch (e) {
                console.log(e);
            }
        } else {
            // 1回目は実行しない
            interval1st = true;
        }
    }, 2000);
} catch (error) {
    console.log(e);
}

//ページ表示時発火処理
window.onload = function () {
    Option_setLoading("video_downloading"); // デフォルト保存名の読み込み
};

function documentWriteText(URItext) {
    document.getElementById(VideoData.Video_DLlink.a).innerHTML =
        VideoData.DLButton.a +
        VideoData.DLButton.b +
        URItext +
        VideoData.DLButton.c;
}

/**
 *
 * @param {NicovideoClass} Nicovideo
 * @param {NicoDownloaderClass} NicoDownloader
 */

async function MovieDownload_domand(Nicovideo, NicoDownloader) {
    //Firstm3u8URLを取得
    const Firstm3u8URL = NicoDownloader.MasterURLGet();

    //Firstm3u8URLの取得に失敗した場合は終了
    if (Firstm3u8URL == false) return false;

    //Firstm3u8URLの取得に成功した場合
    await NicoDownloader.URLToM3u8Set("First", Firstm3u8URL); //Firstm3u8URLをセット

    //Firstm3u8URLからaudio_m3u8_URLとvideo_m3u8_URLを取得
    if (NicoDownloader.M3u8ToAudioAndVideoUrlSet() == false) return false;

    //audio_m3u8_URLとvideo_m3u8_URLを取得できた場合
    //audio_m3u8_URLとvideo_m3u8_URLを元にaudio_m3u8_bodyとvideo_m3u8_bodyを取得
    await NicoDownloader.URLToM3u8Set("Audio", NicoDownloader.M3u8.AudioM3u8URL);
    await NicoDownloader.URLToM3u8Set("Video", NicoDownloader.M3u8.VideoM3u8URL);

    // m3u8sを取得
    const m3u8s = [
        NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.AudioBody),
        NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.VideoBody),
        NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.FirstBody),
        NicoDownloader.M3u8Class.MakeTSFilename(NicoDownloader.M3u8.AudioM3u8URL),
        NicoDownloader.M3u8Class.MakeTSFilename(NicoDownloader.M3u8.VideoM3u8URL),
        NicoDownloader.M3u8Class.MakeTSFilename(Firstm3u8URL),
    ];

    // TSファイルのURLを取得
    NicoDownloader.TSURLs =
        NicoDownloader.M3u8Class.MakeURLListToTSURLs(NicoDownloader);

    // TSファイル名を取得
    NicoDownloader.TSFilenames =
        NicoDownloader.M3u8Class.MakeTSFileNameListtoArray(NicoDownloader);

    NicoDownloader.ButtonTextWrite("処理中"); //ボタンの文字を変更
    DownEncoder(NicoDownloader, m3u8s, Nicovideo);
}


let initialButtonObserverStarted = false;

// 初期ボタンだけを描画する。動画取得・変換・保存は既存の定期処理が担当する。
function StartInitialButtonObserver() {
    if (initialButtonObserverStarted) return;
    if (!document.documentElement) {
        document.addEventListener("DOMContentLoaded", StartInitialButtonObserver, { once: true });
        return;
    }
    initialButtonObserverStarted = true;
    let settings;
    let frame = null;
    let observing = true;

    const refresh = () => {
        const routeId = location.href.match(/^https:\/\/www\.nicovideo\.jp\/watch\/([^/?#]+)/)?.[1];
        if (!routeId) return;
        const videoId = settings ? location.href.match(settings.video_pattern)?.[0] : routeId;
        if (!videoId || NicovideoDownloader__NowDownloading ||
            NicovideoDownloader__LoadedVideoSMID === videoId) return;
        const parent = document.getElementsByClassName(VideoData.Video_title_Element)[0];
        if (!parent) return;
        let wrapper = document.getElementById(VideoData.Video_DLlink.p);
        if (wrapper && (!parent.contains(wrapper) || wrapper.dataset.ndlVideoId !== videoId)) {
            wrapper.remove();
            wrapper = null;
        }
        if (!settings) {
            if (wrapper) return;
            // 設定取得前はコンストラクターによる設定参照も避け、表示だけ準備する。
            const preview = Object.create(NicoDownloaderClass.prototype);
            if (!preview.ButtonFirstMake(videoId)) return;
            wrapper = document.getElementById(VideoData.Video_DLlink.p);
            preview.ButtonInnerHTMLWrite(VideoData.DLButton.a + VideoData.DLButton.b +
                "読込中…" + VideoData.DLButton.c);
            const button = document.getElementById(VideoData.Video_DLlink.a).querySelector("button");
            if (button) button.disabled = true;
            wrapper.dataset.ndlInitialPending = "settings";
            return;
        }
        // 通常処理が描画したタイトル・進捗・完了表示には触れない。
        if (wrapper && !["1", "settings"].includes(wrapper.dataset.ndlInitialPending)) return;
        if (wrapper?.dataset.ndlInitialPending === "1" && settings.video_hlssave !== "0" &&
            !document.querySelector(VideoData.PlayerSettingQuery)) return;
        const downloader = new NicoDownloaderClass();
        downloader.Savemode = settings.video_hlssave;
        downloader.LangSetting = settings.language_setting;
        if (!wrapper) {
            if (!downloader.ButtonFirstMake(videoId)) return;
            wrapper = document.getElementById(VideoData.Video_DLlink.p);
        }
        // タイトル取得前も保存形式を反映し、通常処理の表示名はそのまま引き継ぐ。
        const initialName = `${videoId}.${settings.downFile_setting}`;
        downloader.SaveButtonMake(wrapper.dataset.ndlInitialName || initialName);
    };
    const schedule = () => {
        if (!observing || frame !== null) return;
        frame = requestAnimationFrame(() => {
            frame = null;
            refresh();
        });
    };
    const observer = new MutationObserver((records) => {
        if (records.every((record) => {
            const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            return element?.closest?.("#" + VideoData.Video_DLlink.p);
        })) return;
        schedule();
    });
    const observe = () => observer.observe(document.documentElement, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ["class", "aria-label"],
    });
    observe();
    schedule();
    window.addEventListener("popstate", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("pagehide", () => {
        observing = false;
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
    });
    window.addEventListener("pageshow", () => {
        observing = true;
        observe();
        schedule();
    });
    chrome.storage.local.get({
        video_pattern: "sm[0-9]+", video_hlssave: "0", language_setting: "ja",
        downFile_setting: "mp4",
    }, (value) => {
        if (chrome.runtime.lastError) {
            console.warn("初期ボタンの設定取得に失敗しました:", chrome.runtime.lastError.message);
            return;
        }
        const pattern = !value.video_pattern || value.video_pattern === "0"
            ? "sm[0-9]+" : String(value.video_pattern);
        try {
            new RegExp(pattern);
        } catch (error) {
            console.warn("初期ボタンの動画IDパターンが不正です:", error);
            return;
        }
        settings = {
            video_pattern: pattern,
            video_hlssave: String(value.video_hlssave ?? "0"),
            language_setting: value.language_setting === "en" ? "en" : "ja",
            downFile_setting: String(value.downFile_setting || "mp4"),
        };
        schedule();
    });
}
