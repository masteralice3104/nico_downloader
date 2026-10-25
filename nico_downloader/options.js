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


function Option_setWriting(name, value) {
    //ローカルストレージに書き込みを行います
    localStorage.setItem(name, value);
    chrome.storage.local.set({
        [name]: value
    }, function () {
        //chrome.storage.localに保存
    })
    return true;
}

function Option_setLoading(name) {
    //ローカルストレージより読み込みを行います
    //return localStorage.getItem(name);//これだとだめ

    try {
        chrome.storage.local.get(name, function (value) {
            //chrome.storage.localから読み出し
            localStorage.setItem(name, value[name]);
        })
        //return return_val;

        if (localStorage.getItem(name) === "undefined") {
            return 0;
        }
        return localStorage.getItem(name);

    } catch (error) {
        return 0;
    }

}

//オプション値読み込み用関数
function setOption(name) {
    try {
        if (Option_setLoading(name) === "undefined") {
            return 0;
        } else {

            return Option_setLoading(name);
        }

    } catch (error) {
        DebugPrint("SetOption:" + error)
        return 0;
    }
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

// 通常動画のカスタム保存名と設定画面のプレビューで共用する。
function BuildVideoFilename(parts, video, extension) {
    const clean = (value) => String(value ?? "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().replace(/[. ]+$/, "");
    const values = { id: video.id, title: video.title, uploader: video.uploader };
    const name = parts.map((part) => Object.prototype.hasOwnProperty.call(values, part) ? clean(values[part]) : "")
        .filter(Boolean).join("_") || clean(video.id);
    const safeName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? "_" + name : name;
    return safeName + "." + extension;
}

// 通常動画のコメント保存。無効な間はレスポンスを保持しない。
(() => {
    if (location.origin !== "https://www.nicovideo.jp" || !globalThis.chrome?.runtime?.id) return;
    const channel = "nico-downloader-comments-v1";
    const client = crypto.randomUUID();
    let enabled = false;
    let settingsRevision = 0;
    const cache = new Map();
    let pending = null;
    const configure = () => window.postMessage({ channel, type: "configure", client, enabled }, location.origin);
    const apply = (value) => {
        enabled = value === "1";
        cache.clear();
        pending = null;
        configure();
    };
    window.addEventListener("message", (event) => {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin || data?.channel !== channel) return;
        if (data.type === "ready") { configure(); return; }
        if (!enabled || data.client !== client || data.videoId !== location.pathname.match(/^\/watch\/([^/?#]+)\/?$/)?.[1]) return;
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
            // 通常動画だけを対象に、取得時の動画番号で最新のJSONを保持する。
            cache.delete(data.videoId);
            cache.set(data.videoId, data.text);
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
            if (!enabled || /^ss[0-9]+$/.test(video.video_sm)) return;
            pending = {
                videoId: video.video_sm,
                text: cache.get(video.video_sm),
                filename: video.video_name.replace(/\.(?:mp4|aac)$/i, "") + ".json",
            };
        },
        save() {
            const entry = pending;
            pending = null;
            if (!enabled || !entry) return;
            // 変換完了直後から従来の保存リンクをクリックするまでの受信も拾う。
            entry.text ??= cache.get(entry.videoId);
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
