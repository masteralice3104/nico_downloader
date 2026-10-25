//ダウンロード関数
let failedDownloadId = null;

// 同じURLでは取得を共有する。失敗時は明示的な保存操作で1回だけ再試行する。
let videoMetadataState = { url: location.href, videoId: null, promise: null, retryRequested: false, retried: false };
function ResetVideoMetadataForURL() {
    if (videoMetadataState.url !== location.href) {
        videoMetadataState = { url: location.href, videoId: null, promise: null, retryRequested: false, retried: false };
    }
}
// 保存操作だけが再試行を許可する。定期確認や右クリック設定では許可しない。
function RequestVideoMetadataRetry() {
    ResetVideoMetadataForURL();
    videoMetadataState.retryRequested = true;
}
async function LoadVideoMetadataOnce(video) {
    ResetVideoMetadataForURL();
    if (videoMetadataState.videoId !== video.video_sm) {
        videoMetadataState = { url: location.href, videoId: video.video_sm, promise: null,
            retryRequested: videoMetadataState.retryRequested, retried: false };
    }
    const state = videoMetadataState;
    if (!state.promise) {
        state.promise = (async () => {
            try {
                // URL変更後は、クラスが保持する前の成功結果より新規取得を優先する。
                await video.SetAllFromVideoSm(video.video_sm, true);
                return { ...video };
            } catch (error) {
                console.warn(state.retried
                    ? "[nico downloader] 動画情報の再取得失敗（再試行は終了。ページ情報で続行します）:"
                    : "[nico downloader] 動画情報の取得失敗（保存操作時に一度だけ再試行します）:", error);
                return null;
            }
        })();
    }
    const pending = state.promise;
    const metadata = await pending;
    // 古いページの応答を、新しいページのボタンやファイル名に使わない。
    if (state !== videoMetadataState || state.url !== location.href) return false;
    // 別の待機処理が再試行を始めた場合も、同じ再試行の完了を待つ。
    if (pending !== state.promise) return LoadVideoMetadataOnce(video);
    if (!metadata && state.retryRequested && !state.retried) {
        state.retried = true;
        state.promise = null;
        console.info("[nico downloader] 保存操作による動画情報の再取得（1回限り）:", video.video_sm);
        return LoadVideoMetadataOnce(video);
    }
    if (metadata) Object.assign(video, metadata);
    return true;
}
window.addEventListener("popstate", ResetVideoMetadataForURL);
window.addEventListener("hashchange", ResetVideoMetadataForURL);
window.navigation?.addEventListener("currententrychange", ResetVideoMetadataForURL);


let videoDownRunning = false;
async function VideoDown() {
    if (videoDownRunning) return false;
    videoDownRunning = true;
    try { return await VideoDownOnce(); }
    finally { videoDownRunning = false; }
}

async function VideoDownOnce() {
    const pageURL = location.href;
    await globalThis.NicoSettings.ready();
    if (pageURL !== location.href) return false;
    ResetVideoMetadataForURL();
    // 必要なクラスの初期化
    const NicoDownloader = new NicoDownloaderClass(); //NicoDownloaderクラスの初期化
    const Nicovideo = new NicovideoClass(); //NicovideoClassクラスの初期化

    //そもそもマッチするか確認
    if (Nicovideo.CheckNicovideoWatchURL() == false) return false;

    // Downloadingがtrueの場合は終了
    if (NicoDownloader.VideoDownloadingCheck()) return false;

    // ダウンロードリンクをクリック
    const videoSavePending = document.getElementById(VideoData.Video_DLlink.a2) !== null;
    NicoDownloader.DownloadLinkClick();
    if (videoSavePending) globalThis.NicoCommentJSON?.save();

    // ショートはボタンを押した動画だけを開始する。保存リンクの処理は従来どおり。
    const shortId = ShortVideoId();
    if (shortId && shortsDownloadRequested !== shortId) return false;

    // 現在のページの動画IDを取得
    Nicovideo.video_sm = Nicovideo.VideoSmGet(NicoDownloader.MatchingSMIDArray);
    if (Nicovideo.video_sm == "") {
        DebugPrint("video_sm is empty; the current URL did not match video_pattern");
        return false;
    }

    if (failedDownloadId === Nicovideo.video_sm) return false;

    // 保存済みなら動画情報APIを呼ばない。保存リンクの処理は上で先に行う。
    if (NicoDownloader.VideoLoadedCheck(Nicovideo.video_sm)) return true;

    // 定期確認で再要求せず、保存操作時の失敗再試行は1回まで。
    if (!await LoadVideoMetadataOnce(Nicovideo)) return false;
    Nicovideo.CompletePageMetadata?.();
    if (Nicovideo.video_title == "") {
        Nicovideo.video_title = Nicovideo.GetPageTitle() || Nicovideo.video_sm;
        DebugPrint("Using fallback video title: " + Nicovideo.video_title);
    }

    // デフォルト動画ファイル名の定義
    const filenameSettings = globalThis.NicoSettings.snapshot();
    const downFile_setting = filenameSettings.downFile_setting;
    DebugPrint("downFile_setting:" + downFile_setting); // 取得した値を表示

    const video_name = NicoDownloader.VideoDownloadNameMake(
        Nicovideo.video_sm,
        Nicovideo.video_title,
        downFile_setting,
        filenameSettings,
        Nicovideo.video_owner
    );
    Nicovideo.video_name = video_name;

    // 情報取得中にページが切り替わった場合、古い動画のボタンを描画しない。
    if (pageURL !== location.href || failedDownloadId === Nicovideo.video_sm || !Nicovideo.CheckNicovideoWatchURL() ||
        Nicovideo.VideoSmGet(NicoDownloader.MatchingSMIDArray) !== Nicovideo.video_sm) return false;

    // すでに作ったリンクがあるかどうか判別し、あれば削除
    NicoDownloader.VideoTitleElementCheck(Nicovideo.video_sm);

    DebugPrint("video_name:" + Nicovideo.video_name);

    if (NicoDownloader.VideoLoadedCheck(Nicovideo.video_sm)) return true;
    if (!NicoDownloader.ButtonFirstMake(Nicovideo.video_sm)) return false;
    NicoDownloader.SaveButtonMake(Nicovideo.video_name);
    if (!NicoDownloader.CheckBeforeDownload() || NicoDownloader.VideoDownloadingCheck()) return false;
    const masterURL = NicoDownloader.MasterURLGet();
    if (!masterURL || !masterURL.includes("delivery.domand.nicovideo.jp")) return false;
    try {
        const completed = await MovieDownload_domand(Nicovideo, NicoDownloader);
        if (completed) {
            globalThis.NicoCommentJSON?.prepare(Nicovideo);
            NicoDownloader.VideoLoadedSMIDSet(Nicovideo.video_sm);
        }
        return completed;
    } catch (error) {
        console.error("ダウンロード処理に失敗しました:", error);
        return false;
    }
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
    console.log(error);
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

// 開始時の設定を固定し、変換直前までに受信した同じページの情報を採用する。
function FinalizeDownloadMetadata(video, downloader, settings, pageURL) {
    if (location.href === pageURL) {
        const latest = new NicovideoClass();
        latest.video_sm = video.video_sm;
        latest.CompletePageMetadata?.();
        if (!latest.video_title) latest.video_title = latest.GetPageTitle();
        for (const key of ["video_title", "video_owner", "video_registeredAt", "video_description", "video_tags", "video_genre", "video_series"]) {
            const value = latest[key];
            if (Array.isArray(value) ? value.length : typeof value === "string" && value.trim()) {
                video[key] = Array.isArray(value) ? [...value] : value;
            }
        }
        video.page_counts = { ...video.page_counts, ...latest.page_counts };
    }
    // ページ移動後は元動画の情報・形式だけを使い、新しいページを参照しない。
    video.video_name = downloader.VideoDownloadNameMake(video.video_sm, video.video_title || video.video_sm,
        settings.downFile_setting, settings, video.video_owner);
}

async function MovieDownload_domand(Nicovideo, NicoDownloader) {
    if (NicoDownloader.VideoDownloadingCheck()) return false;
    const pageURL = location.href;
    if (domandPlaylistCapture.videoAt(pageURL) !== Nicovideo.video_sm) return false;
    const masterURL = NicoDownloader.MasterURLGet();
    const settings = Object.freeze(globalThis.NicoSettings.snapshot());
    NicoDownloader.TargetVideoId = Nicovideo.video_sm;
    NicoDownloader.TargetURL = pageURL;
    // 基本保存名の選択も、開始時点の値から固定する。
    NicoDownloader.VideoDownloadNameArray = ["${NicoDownloaderClasssmID}", "${NicoDownloaderClasstitle}",
        "${NicoDownloaderClasssmID}_${NicoDownloaderClasstitle}", "${NicoDownloaderClasstitle}_${NicoDownloaderClasssmID}"][Number(settings.video_downloading)] || "${NicoDownloaderClasssmID}";
    NicoDownloader.FinalizeMetadata = () => FinalizeDownloadMetadata(Nicovideo, NicoDownloader, settings, pageURL);
    NicoDownloader.VideoDownloadingSet();
    try {
        NicoDownloader.FinalizeMetadata();
        NicoDownloader.ButtonTextWrite("処理中");
        // 保存開始時のファイル名で形式を固定し、取得対象と変換形式を揃える。
        NicoDownloader.SetVideoFormat(Nicovideo.video_name);
        const audioOnly = NicoDownloader.CheckVideoFormat() === "aac";
        //Firstm3u8URLを取得
        const Firstm3u8URL = masterURL;

        //Firstm3u8URLの取得に失敗した場合は終了
        if (Firstm3u8URL == false) throw new Error("親m3u8のURLを取得できませんでした。");

        //Firstm3u8URLの取得に成功した場合
        await NicoDownloader.URLToM3u8Set("First", Firstm3u8URL); //Firstm3u8URLをセット

        // 保存形式に必要な音声・映像のURLを取得
        if (NicoDownloader.M3u8ToAudioAndVideoUrlSet() == false) throw new Error(audioOnly ? "音声のURLを取得できませんでした。" : "映像・音声のURLを取得できませんでした。");

        // AACでは映像プレイリストも映像断片も取得しない。
        await NicoDownloader.URLToM3u8Set("Audio", NicoDownloader.M3u8.AudioM3u8URL);
        let m3u8s;
        if (audioOnly) {
            // 最後のファイル名をCoreへの入力にする既存の配列形式を維持する。
            m3u8s = [
                NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.AudioBody),
                NicoDownloader.M3u8Class.MakeTSFilename(NicoDownloader.M3u8.AudioM3u8URL),
            ];
        } else {
            await NicoDownloader.URLToM3u8Set("Video", NicoDownloader.M3u8.VideoM3u8URL);
            m3u8s = [
                NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.AudioBody),
                NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.VideoBody),
                NicoDownloader.M3u8Class.ReplaceURLToM3u8s(NicoDownloader.M3u8.FirstBody),
                NicoDownloader.M3u8Class.MakeTSFilename(NicoDownloader.M3u8.AudioM3u8URL),
                NicoDownloader.M3u8Class.MakeTSFilename(NicoDownloader.M3u8.VideoM3u8URL),
                NicoDownloader.M3u8Class.MakeTSFilename(Firstm3u8URL),
            ];
        }

        // TSファイルのURLを取得
        NicoDownloader.TSURLs =
            NicoDownloader.M3u8Class.MakeURLListToTSURLs(NicoDownloader);

        // TSファイル名を取得
        NicoDownloader.TSFilenames =
            NicoDownloader.M3u8Class.MakeTSFileNameListtoArray(NicoDownloader);

        return await DownEncoder(NicoDownloader, m3u8s, Nicovideo);
    } catch (error) {
        failedDownloadId = Nicovideo.video_sm;
        if (shortsDownloadRequested === Nicovideo.video_sm) shortsDownloadRequested = null;
        if (domandPlaylistCapture.requested?.route === Nicovideo.video_sm) domandPlaylistCapture.requested = null;
        const wrapper = document.getElementById(VideoData.Video_DLlink.p);
        if (wrapper?.dataset.ndlVideoId === Nicovideo.video_sm) NicoDownloader.ButtonTextWrite("ダウンロードに失敗しました");
        throw error;
    } finally {
        NicoDownloader.VideoDownloadingReset();
    }
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
        downloader.SaveButtonMake((wrapper.dataset.ndlInitialName || initialName).replace(/\.(mp4|aac)$/i, "." + settings.downFile_setting));
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
        globalThis.NicoSettings.ready().then(() => {
            const value = globalThis.NicoSettings.snapshot();
            if (request !== settingsRequest) return;
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
        }).catch(error => console.warn("初期ボタンの設定取得に失敗しました:", error));
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
        this.sourceToken = null;
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
        window.addEventListener("nico-downloader-playlist-source-ready", () => {
            this.syncRoute(); this.syncSource(); this.pump();
        });
        window.addEventListener("popstate", () => { this.syncRoute(); this.syncSource(); this.pump(); });
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
        this.sourceToken = null;
        for (const controller of this.controllers) controller.abort();
        for (const resolve of this.idleWaiters.splice(0)) resolve();
    }

    syncRoute() {
        if (this.videoAt(location.href) !== this.route) this.reset();
        return this.route;
    }

    syncSource() {
        if (this.closed || !this.route) return;
        const source = globalThis.NicoPlaylistSources?.get(this.route);
        if (!source || !this.matches(source.url)) return;
        const token = this.route + ":" + source.url + ":" + source.receivedAt + ":" + source.order;
        if (this.sourceToken === token) return;
        this.sourceToken = token;
        // APIの要求URLに動画番号があるため、先読みでも対象動画を確実に区別できる。
        this.seen.add(source.url);
        this.queue.unshift({ url: source.url, route: this.route, generation: this.generation,
            startTime: this.now(), explicit: true, receivedAt: source.receivedAt, sourceOrder: source.order });
        this.report("ページPOST", "動画番号に対応する親URL候補を確認します。", { videoId: this.route, url: source.url });
    }

    accept(entries) {
        const route = this.syncRoute();
        if (this.closed || !route) return;
        this.syncSource();
        for (const entry of entries) {
            if (entry.entryType !== "resource" || !Number.isFinite(entry.startTime) ||
                entry.startTime < this.since || !this.matches(entry.name) || this.seen.has(entry.name)) continue;
            if (this.seen.size >= 64) this.seen.delete(this.seen.values().next().value);
            this.seen.add(entry.name); // 確認用fetch自身の記録による再取得を防ぐ。
            this.report("URL検出", "対象URLを検出しました。", entry.name);
            if (new URL(entry.name).pathname.includes("/playlists/media/")) {
                this.report("子URL検出", "子プレイリストを検出しました。親確認の待ち行列には追加しません。", entry.name);
                continue;
            }
            this.queue.push({ url: entry.name, startTime: entry.startTime, route, generation: this.generation });
            // 古い親候補を子URLの大量到着で押し出さない。保持済みURLの上限はseenで管理する。
            if (this.queue.length > 64) {
                const removed = this.queue.pop();
                this.report("確認待ち上限", "最新候補を保留しました。先に受信した親候補の確認を優先します。", removed.url);
            }
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
            const prefer = entry.explicit
                ? !this.candidate?.explicit || (entry.sourceOrder || 0) >= (this.candidate.sourceOrder || 0)
                : !this.candidate?.explicit && (this.route?.startsWith("ss")
                    ? !this.candidate || entry.startTime < this.candidate.startTime
                    : !this.candidate || entry.startTime >= this.candidate.startTime);
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
        this.syncSource();
        this.pump();
        // 署名付きURLは古い候補を使わず、従来の取得方法へ戻す。
        const expires = this.candidate && new URL(this.candidate.url).searchParams.get("Expires");
        const validSignature = !expires || !/^\d+$/.test(expires) || Number(expires) * 1000 > Date.now() + 5000;
        return !this.closed && this.candidate && validSignature && this.now() - this.candidate.checkedAt < 60000
            ? this.candidate : null;
    }

    async claim(event) {
        const route = this.syncRoute();
        this.syncSource();
        this.pump();
        // 失敗後の定期確認による自動再実行を止め、明示的なクリックで再開する。
        if (failedDownloadId === route) failedDownloadId = null;
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
                shortsDownloadRequested = null;
                this.requested = null;
                this.report("再読込案内", "親m3u8を取得できないためReloadするボタンを表示します。");
                new NicoDownloaderClass().ReloadButtonMake(route);
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
            if (IsShortVideoPage()) {
                event.preventDefault();
                event.stopImmediatePropagation();
                shortsDownloadRequested = null;
                this.requested = null;
                this.report("再読込案内", "親m3u8を取得できないためReloadするボタンを表示します。");
                new NicoDownloaderClass().ReloadButtonMake(route);
                return;
            }
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

// 保存ボタン専用の右クリック設定。contextMenus権限は使わない。
(() => {
    let menu = null, generation = 0, saving = false;
    const close = () => {
        if (saving) return;
        generation++;
        menu?.remove();
        menu = null;
    };
    const busy = () => {
        const button = document.getElementById(VideoData.Video_DLlink.a)?.querySelector('button');
        return NicovideoDownloader__NowDownloading || !!button?.dataset.ndlStartPending;
    };
    document.addEventListener('contextmenu', (event) => {
        const wrapper = document.getElementById(VideoData.Video_DLlink.p);
        if (!wrapper?.contains(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        if (saving) return;
        close();
        const revision = generation, route = location.href;
        menu = document.createElement('div');
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', '保存のクイック設定');
        menu.style.cssText = 'position:fixed;z-index:2147483647;box-sizing:border-box;width:280px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:16px;border:1px solid #666;border-radius:12px;background:#252525;color:#fff;font:14px/1.6 sans-serif;box-shadow:0 6px 24px #0008';
        const position = () => {
            const rect = menu.getBoundingClientRect();
            menu.style.left = Math.max(8, Math.min(event.clientX, innerWidth - rect.width - 8)) + 'px';
            menu.style.top = Math.max(8, Math.min(event.clientY, innerHeight - rect.height - 8)) + 'px';
        };
        const heading = document.createElement('strong');
        heading.textContent = '保存のクイック設定';
        menu.append(heading);
        const status = document.createElement('p');
        status.style.cssText = 'margin:10px 0 0;color:#ccc;font-size:12px';
        status.setAttribute('role', 'status');
        status.textContent = '設定を読み込み中…';
        menu.append(status);
        document.documentElement.append(menu);
        position();
        const panel = menu;
        chrome.storage.local.get({ downFile_setting: 'mp4', save_comments_json: '0' }, (values) => {
            if (revision !== generation || menu !== panel) return;
            if (chrome.runtime.lastError) {
                status.textContent = '設定を読み込めませんでした。右クリックで開き直してください。';
                return;
            }
            const fields = document.createElement('fieldset');
            fields.style.cssText = 'border:0;padding:8px 0 0;margin:0';
            fields.disabled = !!busy();
            const controls = [];
            for (const [label, key, value, type] of [
                ['MP4（動画）', 'downFile_setting', 'mp4', 'radio'],
                ['AAC（音声のみ）', 'downFile_setting', 'aac', 'radio'],
                ['コメントJSONも保存', 'save_comments_json', '1', 'checkbox'],
            ]) {
                const row = document.createElement('label');
                row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:7px 0;cursor:pointer';
                const input = document.createElement('input');
                input.type = type;
                input.name = 'ndl-quick-' + key;
                input.value = value;
                input.checked = values[key] === value;
                controls.push({ input, key, value });
                row.append(input, document.createTextNode(label));
                fields.append(row);
                input.addEventListener('change', () => {
                    if (saving || busy() || location.href !== route) {
                        for (const control of controls) control.input.checked = values[control.key] === control.value;
                        status.textContent = '処理中・ページ移動後は変更できません。開き直してください。';
                        return;
                    }
                    const next = type === 'checkbox' ? input.checked ? '1' : '0' : value;
                    saving = true;
                    fields.disabled = true;
                    chrome.storage.local.set({ [key]: next }, () => {
                        saving = false;
                        if (chrome.runtime.lastError) {
                            for (const control of controls) control.input.checked = values[control.key] === control.value;
                            status.textContent = '保存に失敗しました。もう一度お試しください。';
                        } else {
                            values[key] = next;
                            globalThis.NicoSettings.update({ [key]: next });
                            status.textContent = key === 'save_comments_json' && next === '1'
                                ? '保存しました。コメント未受信の場合はページを再読み込みしてください。'
                                : '設定を保存しました。次の保存に反映されます。';
                            const button = wrapper.querySelector('button');
                            if (key === 'downFile_setting' && wrapper.isConnected && location.href === route &&
                                !busy() && button?.dataset.ndlStatus !== 'completed') {
                                const name = wrapper.dataset.ndlInitialName;
                                if (name) new NicoDownloaderClass().SaveButtonMake(name.replace(/\.(mp4|aac)$/i, '.' + next));
                            }
                        }
                        fields.disabled = !!busy() || location.href !== route;
                    });
                });
            }
            panel.insertBefore(fields, status);
            status.textContent = fields.disabled ? '保存処理中は変更できません。' : '変更は自動保存されます。コメント未受信なら、有効後に再読み込みしてください。';
            position();
            controls[0].input.focus({ preventScroll: true });
        });
    }, true);
    document.addEventListener('pointerdown', (event) => {
        if (menu && !menu.contains(event.target)) close();
    }, true);
    document.addEventListener('keydown', (event) => {
        if (menu && event.key === 'Escape') { event.preventDefault(); close(); }
    }, true);
    window.addEventListener('pagehide', close);
    window.addEventListener('popstate', close);
    window.navigation?.addEventListener('currententrychange', close);
})();
