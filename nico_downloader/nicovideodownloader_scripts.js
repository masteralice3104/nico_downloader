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

    // ショートはボタンを押した動画だけを開始する。保存リンクの処理は従来どおり。
    const shortId = ShortVideoId();
    if (shortId && shortsDownloadRequested !== shortId) return false;

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


let shortsDownloadRequested = null;
let shortVideoPattern = "ss[0-9]{1,}";

function ShortVideoId(address = location.href, pattern = shortVideoPattern) {
    try {
        const url = new URL(address);
        const id = url.origin === "https://www.nicovideo.jp" ? url.pathname.match(/^\/shorts\/(ss[0-9]+)\/?$/)?.[1] : null;
        return id && new RegExp("^(?:" + pattern + ")$").test(id) ? id : null;
    } catch (error) {
        return null;
    }
}

function IsShortVideoPage() {
    return !!ShortVideoId();
}

// ショートの仮想リストでは先頭のカードが再生中とは限らない。画面内のカードを選ぶ。
function ShortVideoControls() {
    const list = document.querySelector('[class~="grid-area_[playlist-entries]"]');
    if (!list) return null;
    const viewport = list.getBoundingClientRect();
    const controls = Array.from(list.querySelectorAll('[class~="z_forward"][class*="left_[calc("] > div > div:first-child'));
    let selected = null;
    let largest = 0;
    for (const control of controls) {
        const rect = control.getBoundingClientRect();
        const area = Math.max(0, Math.min(rect.bottom, viewport.bottom, innerHeight) - Math.max(rect.top, viewport.top, 0)) *
            Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
        if (area > largest) { selected = control; largest = area; }
    }
    return selected;
}

function DownloadButtonParent() {
    return IsShortVideoPage() ? ShortVideoControls() :
        document.getElementsByClassName(VideoData.Video_title_Element)[0];
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
        domandPlaylistCapture.syncRoute();
        const routeId = domandPlaylistCapture.videoAt(location.href);
        if (!routeId) {
            if (!NicovideoDownloader__NowDownloading) document.getElementById(VideoData.Video_DLlink.p)?.remove();
            return;
        }
        const videoId = IsShortVideoPage() ? routeId : settings ? location.href.match(settings.video_pattern)?.[0] : routeId;
        if (!videoId || NicovideoDownloader__NowDownloading ||
            NicovideoDownloader__LoadedVideoSMID === videoId) return;
        const parent = DownloadButtonParent();
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
            !domandPlaylistCapture.available() && !document.querySelector(VideoData.PlayerSettingQuery)) return;
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
    window.addEventListener("nico-downloader-playlist-ready", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("hashchange", schedule);
    window.navigation?.addEventListener("currententrychange", schedule);
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
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
    const defaults = {
        video_pattern: "sm[0-9]+", shorts_video_pattern: "ss[0-9]{1,}",
        video_hlssave: "0", language_setting: "ja", downFile_setting: "mp4",
    };
    let settingsRequest = 0;
    const loadSettings = () => {
        const request = ++settingsRequest;
        chrome.storage.local.get(defaults, (value) => {
            if (request !== settingsRequest) return;
            if (chrome.runtime.lastError) {
                console.warn("初期ボタンの設定取得に失敗しました:", chrome.runtime.lastError.message);
                return;
            }
            const pattern = !value.video_pattern || value.video_pattern === "0"
                ? defaults.video_pattern : String(value.video_pattern);
            const shortPattern = !value.shorts_video_pattern || value.shorts_video_pattern === "0"
                ? defaults.shorts_video_pattern : String(value.shorts_video_pattern);
            try {
                new RegExp(pattern);
                new RegExp("^(?:" + shortPattern + ")$");
            } catch (error) {
                console.warn("動画IDパターンが不正です:", error);
                return;
            }
            shortVideoPattern = shortPattern;
            settings = {
                video_pattern: pattern,
                video_hlssave: String(value.video_hlssave ?? "0"),
                language_setting: value.language_setting === "en" ? "en" : "ja",
                downFile_setting: String(value.downFile_setting || "mp4"),
            };
            domandPlaylistCapture.syncRoute();
            schedule();
        });
    };
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && Object.keys(defaults).some((name) => name in changes)) loadSettings();
    });
    loadSettings();
}


// 読込記録からURL候補を収集し、親プレイリストと確認できたものだけを使う。
class DomandPlaylistCapture {
    constructor() {
        this.route = this.videoAt(location.href);
        this.since = 0;
        this.generation = 0;
        this.seen = new Set();
        this.queue = [];
        this.controllers = new Set();
        this.active = 0;
        this.idleWaiters = [];
        this.closed = false;
        this.candidate = null;
        this.requested = null;
        this.logged = new Set();
        try {
            const navigation = performance.getEntriesByType("navigation")[0];
            // 拡張の起動前にSPA遷移済みなら、古いページのバッファーを採用しない。
            if (navigation && this.videoAt(navigation.name) !== this.route) this.since = this.now();
            this.accept(performance.getEntriesByType("resource"));
            if (typeof PerformanceObserver === "function") {
                this.observer = new PerformanceObserver((list) => this.accept(list.getEntries()));
                this.observer.observe({ type: "resource", buffered: true });
            } else {
                this.report("監視開始", "PerformanceObserverが利用できません。既存の記録とシステムメッセージを使います。");
            }
        } catch (error) {
            this.report("監視開始", "リソースURL監視を開始できませんでした。", error);
        }
        window.addEventListener("popstate", () => this.syncRoute());
        window.addEventListener("hashchange", () => this.syncRoute());
        window.navigation?.addEventListener("currententrychange", () => this.syncRoute());
        window.addEventListener("pagehide", () => {
            this.closed = true;
            this.observer?.disconnect();
            this.reset();
        });
        window.addEventListener("pageshow", (event) => {
            if (!event.persisted) return;
            this.closed = false;
            this.reset();
            try {
                this.observer?.observe({ type: "resource", buffered: false });
            } catch (error) {
                this.report("監視再開", "リソースURL監視を再開できませんでした。", error);
            }
        });
    }

    report(stage, reason, details = "") {
        const key = `${stage}:${reason}`;
        if (this.logged.has(key)) return;
        this.logged.add(key);
        console.log(`[nico downloader] m3u8取得 [${stage}] ${reason}`, details);
    }

    now() {
        return typeof performance !== "undefined" ? performance.now() : Date.now();
    }

    videoAt(address) {
        try {
            const url = new URL(address);
            return url.origin === "https://www.nicovideo.jp" ?
                url.pathname.match(/^\/watch\/([^/]+)\/?$/)?.[1] ||
                ShortVideoId(address) || null : null;
        } catch (error) {
            return null;
        }
    }

    matches(address) {
        try {
            const url = new URL(address);
            return url.origin === "https://delivery.domand.nicovideo.jp" && !url.username && !url.password &&
                /^\/hlsbid\/[^/]+\/playlists\/.+$/.test(url.pathname);
        } catch (error) {
            return false;
        }
    }

    reset() {
        this.route = this.videoAt(location.href);
        this.since = this.now();
        this.generation++;
        shortsDownloadRequested = null;
        this.seen.clear();
        this.logged.clear();
        this.queue = [];
        this.candidate = null;
        this.requested = null;
        for (const controller of this.controllers) controller.abort();
        for (const resolve of this.idleWaiters.splice(0)) resolve();
    }

    syncRoute() {
        if (this.videoAt(location.href) !== this.route) this.reset();
        return this.route;
    }

    accept(entries) {
        const route = this.syncRoute();
        if (this.closed || !route) return;
        for (const entry of entries) {
            if (entry.entryType !== "resource" || !Number.isFinite(entry.startTime) ||
                entry.startTime < this.since || !this.matches(entry.name) || this.seen.has(entry.name)) continue;
            if (this.seen.size >= 64) this.seen.delete(this.seen.values().next().value);
            this.seen.add(entry.name); // 確認用fetch自身の記録による再取得を防ぐ。
            this.report("URL検出", "対象URLを検出しました。", entry.name);
            this.queue.push({ url: entry.name, startTime: entry.startTime, route, generation: this.generation });
            if (this.queue.length > 8) this.queue.shift();
        }
        this.pump();
    }

    pump() {
        while (!this.closed && this.active < 2 && this.queue.length) {
            const entry = this.queue.shift();
            this.active++;
            this.verify(entry).finally(() => {
                this.active--;
                this.pump();
                if (!this.active && !this.queue.length) {
                    for (const resolve of this.idleWaiters.splice(0)) resolve();
                }
            });
        }
    }

    async verify(entry) {
        const controller = new AbortController();
        this.controllers.add(controller);
        let timedOut = false;
        let stage = "URL取得";
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 5000);
        const reject = (reason, details = entry.url) => this.report(stage, reason, details);
        try {
            const response = await fetch(entry.url, { credentials: "include", signal: controller.signal });
            if (!response.ok) return reject(`HTTPエラー: ${response.status}`, entry.url);
            if (response.url && !this.matches(response.url)) return reject("転送先が対象URLの範囲外です。", response.url);
            stage = "本文読込";
            const size = Number(response.headers?.get("content-length"));
            if (size > 512 * 1024) return reject("本文サイズが上限512 KiBを超えています。");
            const text = await response.text();
            if (text.length > 512 * 1024) return reject("本文の長さが上限524288文字を超えています。");
            stage = "親プレイリスト判定";
            const audio = text.split(/\r?\n/).some((line) => line.startsWith("#EXT-X-MEDIA:") &&
                /(?:^|,)TYPE=AUDIO(?:,|$)/.test(line.slice(13)) && /(?:^|,)URI="[^"]+"/.test(line.slice(13)));
            if (!/^\uFEFF?#EXTM3U\r?\n/.test(text)) return reject("HLSのヘッダーがありません。");
            if (/^#EXTINF:/m.test(text)) return reject("子プレイリストのため親URLとして採用しません。");
            if (!/^#EXT-X-STREAM-INF:/m.test(text)) return reject("映像ストリーム情報がありません。");
            if (!audio) return reject("音声ストリームのURIがありません。");
            if (this.closed || this.syncRoute() !== entry.route || this.generation !== entry.generation) {
                return reject("ページ遷移または終了により取得結果を破棄しました。");
            }
            // ショートは後続動画を先読みするため、現在のページで最初に要求された親URLを保持する。
            // 検証の完了順ではなくリクエスト開始時刻で選び、通常動画の選択方法は変えない。
            const prefer = this.route?.startsWith("ss")
                ? !this.candidate || entry.startTime < this.candidate.startTime
                : !this.candidate || entry.startTime >= this.candidate.startTime;
            if (prefer) {
                this.candidate = { ...entry, checkedAt: this.now() };
                console.log("[nico downloader] 親m3u8取得成功:", entry.url);
                window.dispatchEvent(new Event("nico-downloader-playlist-ready"));
            } else if (this.route?.startsWith("ss")) {
                this.report("ショート先読み", "後から要求された親URLは採用しません。", entry.url);
            }
        } catch (error) {
            if (timedOut) reject("5秒以内に完了せずタイムアウトしました。");
            else if (controller.signal.aborted) reject("ページ遷移または終了により中断しました。");
            else reject("通信または応答の読み取りに失敗しました。", { url: entry.url, error });
        } finally {
            clearTimeout(timer);
            this.controllers.delete(controller);
        }
    }

    available() {
        this.syncRoute();
        // 署名付きURLは古い候補を使わず、従来の取得方法へ戻す。
        return !this.closed && this.candidate && this.now() - this.candidate.checkedAt < 60000
            ? this.candidate : null;
    }

    async claim(event) {
        const route = this.syncRoute();
        if (IsShortVideoPage() && (NicovideoDownloader__NowDownloading || NicovideoDownloader__LoadedVideoSMID === route)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        if (IsShortVideoPage() && (this.active || this.queue.length)) {
            // 次の動画の検証だけが先に終わっていても、先行リクエストの確認を待つ。
            const generation = this.generation;
            const button = event.currentTarget;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.report("ショート選択", "取得中の親URLの確認を待ちます。");
            await new Promise((resolve) => this.idleWaiters.push(resolve));
            if (this.closed || this.syncRoute() !== route || this.generation !== generation) return;
            const candidate = this.available();
            if (candidate) {
                shortsDownloadRequested = route;
                this.requested = candidate;
                console.log("[nico downloader] ショート保存対象:", route, candidate.url);
            } else if (button?.isConnected) {
                button.click(); // 確認が全て失敗した場合も、従来のメニュー取得へ自動で進む。
            }
            return;
        }
        const candidate = this.available();
        if (IsShortVideoPage()) shortsDownloadRequested = route;
        if (!candidate) {
            const reason = this.candidate ? "取得済みURLの有効期間（60秒）を過ぎています。" :
                this.active || this.queue.length ? "検出したURLを確認中です。" :
                this.seen.size ? "検出したURLから利用できる親m3u8を確認できませんでした。上の取得・判定ログを確認してください。" :
                "対象URLがリソース記録に見つかりません。";
            this.report("保存ボタン押下", reason);
            this.report("従来経路", "システムメッセージからのURL取得に切り替えます。");
            return; // 既存のonclickをそのまま実行し、システムメッセージを開く。
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        this.requested = candidate; // 保存ボタンを押すまでダウンロード開始条件にしない。
        if (IsShortVideoPage()) console.log("[nico downloader] ショート保存対象:", route, candidate.url);
    }

    requestedURL() {
        const route = this.syncRoute();
        return !this.closed && this.requested?.route === route ? this.requested.url : false;
    }
}

const domandPlaylistCapture = new DomandPlaylistCapture();
