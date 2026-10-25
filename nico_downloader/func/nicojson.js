(function () {
// ページ側では通信の複製だけを担当し、保存と設定の判断は拡張側で行う。
(() => {
    if (globalThis.chrome?.runtime?.id) return;
    const channel = "nico-downloader-comments-v1";
    let enabled = false;
    let client = "";
    let revision = 0;
    const route = () => location.pathname.match(/^\/watch\/([^/?#]+)\/?$/)?.[1] || "";
    const post = (data) => window.postMessage({ channel, client, ...data }, location.origin);
    window.addEventListener("message", (event) => {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin || data?.channel !== channel || data.type !== "configure") return;
        if (typeof data.client !== "string") return;
        enabled = data.enabled === true;
        client = data.client;
        revision++;
    });
    const matches = (url, method) => {
        try {
            const parsed = new URL(url, location.href);
            return method.toUpperCase() === "POST" && parsed.origin === "https://public.nvcomment.nicovideo.jp" &&
                parsed.pathname === "/v1/threads" && parsed.searchParams.get("pc") === "1";
        } catch { return false; }
    };
    const context = () => enabled && route() ? { videoId: route(), revision, client } : null;
    const active = (ctx) => ctx && enabled && ctx.revision === revision && ctx.videoId === route();
    async function receive(ctx, readResponse, status) {
        if (!active(ctx)) return;
        try {
            if (status < 200 || status >= 300) throw new Error("HTTP " + status);
            const text = await readResponse();
            if (!active(ctx)) return;
            const json = JSON.parse(text);
            if (!Array.isArray(json?.data?.threads) || (json.meta?.status != null && json.meta.status !== 200)) throw new Error("コメントJSONの形式が不正です");
            // レスポンスと取得時の動画番号だけを渡す。リクエスト本文は読まない。
            post({ type: "response", videoId: ctx.videoId, text });
        } catch (error) {
            if (active(ctx)) post({ type: "error", videoId: ctx.videoId, message: String(error.message) });
        }
    }
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        const ctx = context();
        let capture = false;
        try {
            const isRequest = typeof Request !== "undefined" && input instanceof Request;
            capture = ctx && matches(isRequest ? input.url : input, String(init?.method ?? (isRequest ? input.method : "GET")));
        } catch { capture = false; }
        const result = Reflect.apply(originalFetch, this, arguments);
        try {
            if (capture) {
                result.then((response) => {
                    if (!active(ctx)) return;
                    const copy = response.clone();
                    return receive(ctx, () => copy.text(), response.status);
                }).catch(() => {
                    if (active(ctx)) post({ type: "error", videoId: ctx.videoId, message: "fetch通信に失敗しました" });
                });
            }
        } catch { /* ページのfetchの戻り値・例外を変更しない。 */ }
        return result;
    };
    const requests = new WeakMap();
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        const result = Reflect.apply(originalOpen, this, arguments);
        requests.set(this, { method: String(method), url });
        return result;
    };
    XMLHttpRequest.prototype.send = function (body) {
        const request = requests.get(this);
        const ctx = context();
        if (ctx && request && matches(request.url, request.method)) {
            const finish = () => {
                this.removeEventListener("loadend", finish);
                if (requests.get(this) !== request || !active(ctx)) return;
                try {
                    const text = this.responseType === "json" ? JSON.stringify(this.response) : this.responseText;
                    receive(ctx, () => text, this.status);
                } catch { post({ type: "error", videoId: ctx.videoId, message: "XHRレスポンスを読み取れませんでした" }); }
            };
            this.addEventListener("loadend", finish);
            try { return Reflect.apply(originalSend, this, arguments); }
            catch (error) { this.removeEventListener("loadend", finish); throw error; }
        }
        return Reflect.apply(originalSend, this, arguments);
    };
    post({ type: "ready" });
})();

if (!globalThis.chrome?.runtime?.id) return;
// Description: ニコニコ動画のjsonを取得し中身のデータを抽出する関数をまとめたクラスです。
//使い方
/*
const nicovideo = new Nicovideo();
nicovideo.SetAllFromVideoSm('sm9').then(() => {
    console.log(nicovideo.view_count);
    console.log(nicovideo.comment_count);
    console.log(nicovideo.mylist_count);
    console.log(nicovideo.like_count);
    console.log(nicovideo.title);
});
*/


// 残さねばならない変数
let Nicovideo______Ndl______DataLoadedSMID = '-1'; // データを取得した動画のsmid
let Nicovideo______Ndl______DataLoadedJSON = {}; // JSONデータ   

class NicovideoClass {
    constructor() {
        //動かさない変数
        this.NicoVideoWatchURL = 'https://www.nicovideo.jp/watch/'; // 動画のURL

        this.video_sm = ''; // 動画id
        this.json = {}; // json
        this.view_count = 0; // 再生数
        this.comment_count = 0; // コメント数
        this.mylist_count = 0; // マイリスト数
        this.like_count = 0; // いいね数
        this.video_title = ''; // タイトル
        this.video_owner = ''; // 投稿ユーザー
        this.video_registeredAt = ''; // 登録日時
        this.video_description = ''; // 説明文
        this.video_tags = []; // タグ
        this.video_genre = ''; // ジャンル
        this.video_series = ''; // シリーズ

        //後で自ら設定しないといけない変数
        this.video_name = "";// 動画の保存名
    }

    //URLがマッチするか確認
    CheckNicovideoWatchURL() {
        if (location.pathname.startsWith("/shorts/")) return IsShortVideoPage();
        if (location.href.match(/^https:\/\/www\.nicovideo\.jp\/(?:watch\/[^/?#]+|shorts\/ss[0-9]+)(?:[/?#]|$)/)) {
            DebugPrint("location.href.match true");
            return true;
        }
        DebugPrint("location.href.match false");
        return false;
    }


    //jsonをダウンロード後jsonをセットし、その後各変数をセット
    async SetAllFromVideoSm(video_sm) {
        this.video_sm = video_sm;
        // ショートは表示中のカードからタイトルを取得し、既存の保存名設定に渡す。
        if (/^ss[0-9]+$/.test(video_sm)) {
            this.video_title = this.GetPageTitle() || video_sm;
            return;
        }

        if (video_sm == Nicovideo______Ndl______DataLoadedSMID) {
            return new Promise((resolve, reject) => {
                DebugPrint("NicovideoClass: SetAllFromVideoSm: JSONLoaded");
                this.SetJson(Nicovideo______Ndl______DataLoadedJSON);
                this.SetAll();
                this.SetLoadedSMID();
                resolve();
            })
        }
        return this.DownloadJson(video_sm)
            .then(json => {
                if (json == false) return false;// jsonが取得できなかったら終了

                // jsonを取得できたら各変数をセット
                DebugPrint("NicovideoClass: SetAllFromVideoSm: DownloadJSON");
                DebugPrint(json);
                this.SetJson(json);
                this.SetAll();
                this.SetLoadedSMID();
            });
    }

    //jsonをダウンロード
    async DownloadJson(video_sm = this.video_sm) {
        if (video_sm == '') return false;
        const url = this.NicoVideoWatchURL + video_sm + '?responseType=json';
        return fetch(url).then(response => response.json());
    }
    //jsonをセット
    SetJson(json) {
        this.json = json;
        Nicovideo______Ndl______DataLoadedJSON = json;
    }

    //読み込み済みをセット
    SetLoadedSMID(video_sm = this.video_sm) {
        Nicovideo______Ndl______DataLoadedSMID = video_sm;
    }
    //constructorの各変数をセット
    SetAll(json = this.json) {
        this.view_count = this.JsonToViewCount(json);
        this.comment_count = this.JsonToCommentCount(json);
        this.mylist_count = this.JsonToMylistCount(json);
        this.like_count = this.JsonToLikeCount(json);
        this.video_title = this.JsonToTitle(json);
        this.video_owner = this.JsonToUser(json);
        this.video_registeredAt = this.JsonToRegisteredAt(json);
        this.video_description = this.JsonToDescription(json);
        this.video_tags = this.JsonToTags(json);
        this.video_genre = this.JsonToGenre(json);
        this.video_series = this.JsonToSeries(json);
    }


    //URLから動画idを取得
    VideoSmGet(match_sm) {
        if (location.pathname.startsWith("/shorts/")) return ShortVideoId() || "";
        let video_sm = '';
        if (location.href.match(match_sm)) {
            video_sm = location.href.match(match_sm).toString();
            DebugPrint("location.href.match match_sm true")
            DebugPrint("match_sm : " + match_sm)
        } else {
            DebugPrint("location.href.match match_sm false")
            DebugPrint("match_sm : " + match_sm)
            DebugPrint("setOption(\"video_pattern\") : " + setOption("video_pattern"))
        }
        return video_sm;
    }

    //旧レスポンス形式とwatchV4形式の両方から動画情報を取得
    GetWatchData(json = this.json) {
        const response = json?.data?.response;
        return response?.$watchV4?.data ?? response ?? {};
    }

    GetVideo(json = this.json) {
        return this.GetWatchData(json).video ?? {};
    }

    GetShortVideoTitle() {
        // nth-childは固定しない。ボタンと同じ表示中カードの中だけを探す。
        const controls = ShortVideoControls();
        const card = controls?.closest('[class~="z_forward"][class*="left_[calc("]')?.parentElement;
        return card?.querySelector('[class~="bottom_0"][class~="left_0"][class~="right_0"] .Pressable.fs_l.fw_bold.lc_1.m_0')?.textContent?.trim() || "";
    }

    // JSONから動画タイトルを取得できない場合にページ上の表示から補う
    GetPageTitle() {
        // ショートでは先読みカードや前の動画のmeta情報を参照しない。
        const candidates = IsShortVideoPage() ? [this.GetShortVideoTitle(), document.title] : [
            document.querySelector("h1")?.textContent,
            document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
            document.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
            document.title,
        ];

        for (const candidate of candidates) {
            const title = String(candidate ?? "")
                .trim()
                .replace(/\s*[-|｜]\s*(?:ニコニコ動画|niconico).*$/i, "")
                .trim();
            if (title && !/^(?:ニコニコ(?:動画)?|niconico)$/i.test(title)) {
                return title;
            }
        }
        return "";
    }

    //jsonより再生数を取得
    JsonToViewCount(json = this.json) {
        return this.GetVideo(json).count?.view ?? 0;// 再生数
    }
    //jsonよりコメント数を取得
    JsonToCommentCount(json = this.json) {
        return this.GetVideo(json).count?.comment ?? 0;// コメント数
    }
    //jsonよりマイリスト数を取得
    JsonToMylistCount(json = this.json) {
        return this.GetVideo(json).count?.mylist ?? 0;// マイリスト数
    }
    //jsonよりいいね数を取得
    JsonToLikeCount(json = this.json) {
        return this.GetVideo(json).count?.like ?? 0; // いいね数
    }
    //jsonよりタイトルを取得
    JsonToTitle(json = this.json) {
        return this.GetVideo(json).title ?? ""; // タイトル
    }
    //jsonよりidを取得
    JsonToId(json = this.json) {
        return this.GetVideo(json).id ?? ""; // id
    }
    //jsonより登録日時を取得
    JsonToRegisteredAt(json = this.json) {
        return this.GetVideo(json).registeredAt ?? ""; // 登録日時
    }
    //jsonより投稿ユーザー名を取得
    JsonToUser(json = this.json) {
        const response = json?.data?.response;
        return response?.owner?.nickname ?? this.GetWatchData(json).metadata?.jsonLd?.owner?.name ?? ""; // 投稿ユーザー名
    }
    //jsonより説明文を取得
    JsonToDescription(json = this.json) {
        return this.GetVideo(json).description ?? ""; // 説明文
    }

    //jsonよりタグを取得
    JsonToTags(json = this.json) {
        const response = json?.data?.response;
        const items = this.GetWatchData(json).tags?.items ?? response?.tag?.items ?? [];
        return items.map(tag => tag.name);
    }

    //jsonよりジャンルを取得
    JsonToGenre(json = this.json) {
        return this.GetWatchData(json).genre?.label ?? ""; // ジャンル
    }

    //jsonよりシリーズを取得
    JsonToSeries(json = this.json) {
        return json?.data?.response?.series?.title ?? ""; // シリーズ
    }

    //変数の中身が適正なデータかチェックする関数
    //video_smが空文字ならfalseを返す
    Checkvideo_sm() {
        if (this.video_sm == '') return false;
        true;
    }
    Checkvideo_title() {
        if (this.video_title == '') return false;
        true;
    }



}

globalThis.NicovideoClass = NicovideoClass;
})();
