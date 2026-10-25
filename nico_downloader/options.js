/*
LocalStorageで保存される値について

キー                 デフォルト値               内容
"newloading"            undefined           一度でも設定したことがあるか？
"video_downloading"     0                   デフォルト保存名設定
"video_pattern"         sm[0-9]{1,}         通常動画のURL判別パターン
"shorts_video_pattern"  ss[0-9]{1,}         ショートのURL判別パターン
"video_autosave"        0                   1だと自動で保存処理が走ります
"video_hlssave"         0                   0だと初期設定、1だと低速、2だと高速モード
"debug"                 0                   1だとデバッグ出力あり
"language_setting"      ja                  言語設定
"downFile_setting"      mp4                 保存ファイル形式(採用)
 */


const NicoSettingsDefaults = {
    newloading: "0", video_downloading: "0", video_filename_mode: "default",
    video_filename_part_1: "uploader", video_filename_part_2: "title", video_filename_part_3: "id",
    video_pattern: "sm[0-9]{1,}", shorts_video_pattern: "ss[0-9]{1,}", video_autosave: "0",
    video_hlssave: "0", debug: "0", language_setting: "ja", downFile_setting: "mp4",
    save_comments_json: "0",
};
const NicoSettingsCache = { ...NicoSettingsDefaults };
let NicoSettingsResolve, NicoSettingsReject;
const NicoSettingsReady = new Promise((resolve, reject) => { NicoSettingsResolve = resolve; NicoSettingsReject = reject; });
// 初期化を待たないページでも、読み込み失敗を未処理の拒否にしない。
NicoSettingsReady.catch(() => {});
let NicoSettingsInitialized = false;
const NicoSettingsRevisions = Object.create(null);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [name, change] of Object.entries(changes)) {
        NicoSettingsRevisions[name] = (NicoSettingsRevisions[name] || 0) + 1;
        NicoSettingsApply({ [name]: Object.prototype.hasOwnProperty.call(change, "newValue") ? change.newValue : NicoSettingsDefaults[name] });
    }
});
function NicoSettingsRefresh() {
    return new Promise((resolve, reject) => {
        const revisions = { ...NicoSettingsRevisions };
        chrome.storage.local.get(null, (stored) => {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            for (const name of Object.keys(NicoSettingsCache)) {
                if ((NicoSettingsRevisions[name] || 0) === (revisions[name] || 0)) {
                    if (Object.prototype.hasOwnProperty.call(stored || {}, name)) NicoSettingsApply({ [name]: stored[name] });
                    else NicoSettingsApply({ [name]: NicoSettingsDefaults[name] });
                }
            }
            for (const [name, value] of Object.entries(stored || {})) {
                if ((NicoSettingsRevisions[name] || 0) === (revisions[name] || 0)) NicoSettingsApply({ [name]: value });
            }
            if (!NicoSettingsInitialized) {
                NicoSettingsInitialized = true;
                NicoSettingsResolve();
            }
            resolve(NicoSettingsSnapshot());
        });
    });
}
NicoSettingsRefresh().catch((error) => {
    if (!NicoSettingsInitialized) { NicoSettingsInitialized = true; NicoSettingsReject(error); }
});
function NicoSettingsSnapshot() { return { ...NicoSettingsCache }; }
function NicoSettingsApply(values) {
    for (const [name, value] of Object.entries(values || {})) {
        NicoSettingsCache[name] = value === undefined ? (NicoSettingsDefaults[name] ?? 0) : String(value);
    }
    return NicoSettingsSnapshot();
}
globalThis.NicoSettings = {
    ready: () => NicoSettingsReady,
    refresh: NicoSettingsRefresh,
    snapshot: NicoSettingsSnapshot,
    get: (name) => NicoSettingsCache[name] ?? 0,
    update: NicoSettingsUpdate,
};
function NicoSettingsUpdate(values) {
    for (const name of Object.keys(values || {})) NicoSettingsRevisions[name] = (NicoSettingsRevisions[name] || 0) + 1;
    return NicoSettingsApply(values);
}

function Option_setWriting(name, value) {
    //ローカルストレージに書き込みを行います
    chrome.storage.local.set({
        [name]: value
    }, function () {
        if (chrome.runtime.lastError) {
            console.error("設定の保存に失敗しました:", name, chrome.runtime.lastError.message);
            return;
        }
        NicoSettingsUpdate({ [name]: value });
    });
    return true;
}

function Option_setLoading(name) {
    return NicoSettings.get(name);
}

//オプション値読み込み用関数
function setOption(name) {
    return Option_setLoading(name);
}

function newload() {
    let newloading = 0;


    //default値をここへ
    if (isNullOrUndefined(Option_setLoading("newloading"))) {
        defalt_dataWrite();
    }
    newloading = Option_setLoading("newloading")
}

function defalt_dataWrite() {
    Option_setWriting("newloading", "1");
    Option_setWriting("video_downloading", "0");
    Option_setWriting("video_filename_mode", "default");
    Option_setWriting("video_filename_part_1", "uploader");
    Option_setWriting("video_filename_part_2", "title");
    Option_setWriting("video_filename_part_3", "id");
    Option_setWriting("video_pattern", "sm[0-9]{1,}");
    Option_setWriting("shorts_video_pattern", "ss[0-9]{1,}");
    Option_setWriting("video_autosave", "0");
    Option_setWriting("debug", "0");
    Option_setWriting("video_hlssave", "0");
    Option_setWriting("language_setting", "ja");
    Option_setWriting("downFile_setting", "mp4"); //mp4として
    Options_Save();
}

function Options_onload() {
    //オプション設定ページ表示時

    //オプションの値を読み込み
    try {
        LoadOption("video_downloading");
        LoadOption("video_filename_mode");
        LoadOption("video_filename_part_1");
        LoadOption("video_filename_part_2");
        LoadOption("video_filename_part_3");
        LoadOption("video_pattern");
        LoadOption("shorts_video_pattern");
        LoadOption("video_autosave");
        LoadOption("video_hlssave");
        LoadOption("debug");
        LoadOption("language_setting");
        LoadOption("downFile_setting") || "mp4";
    } catch (error) {
        Default_click();
        Options_Save();
    }

}

function LoadOption(name) {
    console.log(setOption(name))
    if (typeof setOption(name) === "undefined") {

    } else {
        document.getElementById(name).value = setOption(name);
    }
}

function isNullOrUndefined(o) {
    return (o === undefined || o === null);
}


function DebugPrint(text) {
    if (setOption("debug") === "1") {
        if (typeof text === "object") {
            console.log(JSON.stringify(text));
        } else {
            console.log("debug:" + text);
        }
        
    }
}

function SanitizeVideoFilename(value, extension) {
    const safeExtension = extension === "aac" ? "aac" : "mp4";
    const maxUnits = 180 - safeExtension.length - 1;
    let name = "", units = 0;
    for (const character of String(value ?? "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().replace(/[. ]+$/, "")) {
        if (units + character.length > maxUnits) break;
        name += character;
        units += character.length;
    }
    name = name.replace(/[. ]+$/, "") || "video";
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9]|com[¹²³]|lpt[¹²³])(?:\.|$)/i.test(name)) name = "_" + name;
    return name + "." + safeExtension;
}

// 通常動画のカスタム保存名と設定画面のプレビューで共用する。
function BuildVideoFilename(parts, video, extension) {
    const clean = (value) => String(value ?? "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().replace(/[. ]+$/, "");
    const values = { id: video.id, title: video.title, uploader: video.uploader };
    const name = parts.map((part) => Object.prototype.hasOwnProperty.call(values, part) ? clean(values[part]) : "")
        .filter(Boolean).join("_") || clean(video.id);
    return SanitizeVideoFilename(name, extension);
}

// 通常動画・ショートのコメント保存。無効な間はレスポンスを保持しない。
(() => {
    if (location.origin !== "https://www.nicovideo.jp" || !globalThis.chrome?.runtime?.id) return;
    const channel = "nico-downloader-comments-v1";
    const client = crypto.randomUUID();
    let enabled = false;
    let settingsRevision = 0;
    const cache = new Map();
    const firstShortRequests = new Map();
    let pending = null;
    const configure = () => window.postMessage({ channel, type: "configure", client, enabled }, location.origin);
    const apply = (value) => {
        enabled = value === "1";
        cache.clear();
        firstShortRequests.clear();
        pending = null;
        configure();
    };
    window.addEventListener("message", (event) => {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin || data?.channel !== channel) return;
        if (data.type === "ready") { configure(); return; }
        if (!enabled || data.client !== client || data.videoId !== location.pathname.match(/^\/(?:watch|shorts)\/([^/?#]+)\/?$/)?.[1]) return;
        if (data.type === "request" && /^ss[0-9]+$/.test(data.videoId)) {
            if (!Number.isSafeInteger(data.requestOrder) || data.requestOrder < 1) return;
            if (!firstShortRequests.has(data.videoId)) firstShortRequests.set(data.videoId, data.requestOrder);
            while (firstShortRequests.size > 4) firstShortRequests.delete(firstShortRequests.keys().next().value);
            return;
        }
        if (data.type === "error") {
            console.warn("[nico downloader] コメントJSON取得失敗:", String(data.message));
            return;
        }
        if (data.type !== "response" || typeof data.text !== "string") return;
        try {
            const json = JSON.parse(data.text);
            if (!Array.isArray(json?.data?.threads) || (json.meta?.status != null && json.meta.status !== 200)) {
                console.warn("[nico downloader] コメントJSON受信検証失敗: レスポンス形式が不正です");
                return;
            }
            if (!Number.isSafeInteger(data.requestOrder) || data.requestOrder < 1) return;
            const previous = cache.get(data.videoId);
            const short = /^ss[0-9]+$/.test(data.videoId);
            if (short && firstShortRequests.get(data.videoId) !== data.requestOrder) {
                console.info("[nico downloader] コメントJSON先読み除外:", data.videoId);
                return;
            }
            // ショートは次の動画を先読みするため、最初に要求されたJSONを選ぶ。
            // 応答の完了順が逆転しても、先読みの応答へ置き換えない。
            if (previous && (short ? data.requestOrder >= previous.requestOrder : data.requestOrder < previous.requestOrder)) {
                if (short) console.info("[nico downloader] コメントJSON先読み除外:", data.videoId);
                return;
            }
            cache.delete(data.videoId);
            cache.set(data.videoId, { text: data.text, requestOrder: data.requestOrder });
            // SPAで別の動画へ移動しても、際限なくコメントを保持しない。
            while (cache.size > 4) cache.delete(cache.keys().next().value);
            console.info("[nico downloader] コメントJSON取得成功:", data.videoId);
        } catch { console.warn("[nico downloader] コメントJSONの読み取りに失敗しました"); }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.save_comments_json) {
            settingsRevision++;
            apply(changes.save_comments_json.newValue);
        }
    });
    const initialRevision = settingsRevision;
    chrome.storage.local.get({ save_comments_json: "0" }, (value) => {
        if (!chrome.runtime.lastError && initialRevision === settingsRevision) apply(value.save_comments_json);
    });
    globalThis.NicoCommentJSON = {
        prepare(video) {
            pending = null;
            if (!enabled) return;
            pending = {
                videoId: video.video_sm,
                text: cache.get(video.video_sm)?.text,
                filename: video.video_name.replace(/\.(?:mp4|aac)$/i, "") + ".json",
            };
        },
        save() {
            const entry = pending;
            pending = null;
            if (!enabled || !entry) return;
            // 変換完了直後から従来の保存リンクをクリックするまでの受信も拾う。
            entry.text = cache.get(entry.videoId)?.text ?? entry.text;
            if (!entry.text) {
                console.warn("[nico downloader] コメントJSON保存を見送りました: この動画のコメントJSONをまだ受信していません", { videoId: entry.videoId });
                return;
            }
            let url;
            let link;
            try {
                url = URL.createObjectURL(new Blob([entry.text], { type: "application/json;charset=utf-8" }));
                link = document.createElement("a");
                link.hidden = true;
                link.href = url;
                link.download = entry.filename;
                document.body.appendChild(link);
                link.click();
                console.info("[nico downloader] コメントJSON保存要求:", entry.filename);
            } catch (error) {
                console.error("[nico downloader] コメントJSON保存失敗:", error);
            } finally {
                link?.remove();
                if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
            }
        },
    };
})();

// MAIN worldの受信監視とは必要項目だけを共有し、通常動画の現在URLだけ保持する。
(() => {
    if (location.origin !== 'https://www.nicovideo.jp' || !globalThis.chrome?.runtime?.id) return;
    const channel = 'nico-downloader-watch-metadata-v1', client = crypto.randomUUID();
    let cached = null;
    const subscribe = () => window.postMessage({ channel, client, type: 'subscribe' }, location.origin);
    const route = () => location.pathname.match(/^\/watch\/(sm[0-9]+)\/?$/)?.[1] || '';
    const validText = value => typeof value === 'string' && value.length <= 10000;
    window.addEventListener('message', event => {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin || data?.channel !== channel) return;
        if (data.type === 'ready') { subscribe(); return; }
        if (data.type !== 'metadata' || data.client !== client || data.href !== location.href ||
            !route() || data.videoId !== route() || !validText(data.owner) || !validText(data.series) ||
            !Number.isSafeInteger(data.order) || data.order < 1) return;
        if (cached?.href === data.href && cached.order > data.order) return;
        cached = { videoId: data.videoId, href: data.href, order: data.order, owner: data.owner, series: data.series };
        console.info('[nico downloader] ページの動画情報取得成功（lazy）:', data.videoId);
    });
    const reset = () => {
        if (cached && cached.href !== location.href) cached = null;
    };
    window.addEventListener('popstate', reset);
    window.addEventListener('hashchange', reset);
    window.navigation?.addEventListener('currententrychange', reset);
    globalThis.NicoWatchMetadata = {
        get(videoId) {
            reset();
            return cached?.href === location.href && cached.videoId === videoId && route() === videoId
                ? { owner: cached.owner, series: cached.series } : null;
        },
    };
    subscribe();
})();

// ページが取得した動画番号付きの親候補を、SPA移動をまたいで少数保持する。
(() => {
    if (location.origin !== 'https://www.nicovideo.jp' || !globalThis.chrome?.runtime?.id) return;
    const channel = 'nico-downloader-playlist-source-v1', client = crypto.randomUUID(), records = new Map();
    const subscribe = () => window.postMessage({ channel, client, type: 'subscribe' }, location.origin);
    window.addEventListener('message', event => {
        const d = event.data;
        if (event.source !== window || event.origin !== location.origin || d?.channel !== channel) return;
        if (d.type === 'ready') { subscribe(); return; }
        if (d.type !== 'source' || d.client !== client || !/^(?:sm|ss)[0-9]+$/.test(d.videoId) || typeof d.url !== 'string' || !Number.isFinite(d.receivedAt) || !Number.isSafeInteger(d.order) || d.order < 1) return;
        try {
            const url = new URL(d.url);
            if (url.origin !== 'https://delivery.domand.nicovideo.jp' || url.username || url.password || !/^\/hlsbid\/[^/]+\/playlists\/.+/.test(url.pathname)) return;
            const prior = records.get(d.videoId);
            if (prior?.order >= d.order) return;
            records.delete(d.videoId); records.set(d.videoId, { url: d.url, receivedAt: d.receivedAt, order: d.order });
            while (records.size > 8) records.delete(records.keys().next().value);
            console.info('[nico downloader] ページPOSTから親m3u8候補を取得:', d.videoId, d.url);
            window.dispatchEvent(new Event('nico-downloader-playlist-source-ready'));
        } catch {}
    });
    globalThis.NicoPlaylistSources = {
        get(videoId) {
            const entry = records.get(videoId);
            if (!entry || Date.now() - entry.receivedAt > 5 * 60 * 1000) return null;
            const expires = new URL(entry.url).searchParams.get('Expires');
            if (expires && /^\d+$/.test(expires) && Number(expires) * 1000 <= Date.now() + 5000) return null;
            return { ...entry };
        },
    };
    subscribe();
})();
