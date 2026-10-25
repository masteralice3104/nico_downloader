(function () {
// 動画番号を含むページ側POST応答のcontentUrlを、番号と組にして保持する。
(() => {
    if (globalThis.chrome?.runtime?.id) return;
    const channel = 'nico-downloader-playlist-source-v1', records = new Map();
    let client = '', order = 0;
    const validURL = value => {
        try { const u = new URL(value); return u.origin === 'https://delivery.domand.nicovideo.jp' && !u.username && !u.password && /^\/hlsbid\/[^/]+\/playlists\/.+/.test(u.pathname); }
        catch { return false; }
    };
    const publish = entry => { if (client) window.postMessage({ channel, client, type: 'source', ...entry }, location.origin); };
    window.addEventListener('message', event => {
        const d = event.data;
        if (event.source !== window || event.origin !== location.origin || d?.channel !== channel || d.type !== 'subscribe' || typeof d.client !== 'string' || d.client.length > 100) return;
        client = d.client;
        for (const entry of records.values()) publish(entry);
    });
    const identify = (url, method) => {
        try {
            const u = new URL(url, location.href);
            return String(method).toUpperCase() === 'POST' && u.origin === 'https://nvapi.nicovideo.jp'
                ? u.pathname.match(/^\/v[0-9]+\/(?:watch|shorts)\/((?:sm|ss)[0-9]+)(?:\/|$)/)?.[1] : null;
        } catch { return null; }
    };
    async function receive(videoId, requestOrder, read, status) {
        if (status !== 200) return;
        try {
            const json = JSON.parse(await read());
            if (json?.meta?.status !== 200 || !validURL(json?.data?.contentUrl)) return;
            if ((records.get(videoId)?.order || 0) > requestOrder) return;
            const entry = { videoId, url: json.data.contentUrl, receivedAt: Date.now(), order: requestOrder };
            records.delete(videoId); records.set(videoId, entry);
            while (records.size > 8) records.delete(records.keys().next().value);
            publish(entry);
        } catch { /* ページ本来の処理に影響させない。 */ }
    }
    const fetch = window.fetch;
    window.fetch = function(input, init) {
        let videoId;
        try {
            const req = typeof Request !== 'undefined' && input instanceof Request;
            videoId = identify(req ? input.url : input, init?.method ?? (req ? input.method : 'GET'));
        } catch {}
        const requestOrder = videoId ? ++order : 0;
        const result = Reflect.apply(fetch, this, arguments);
        if (videoId) result.then(response => {
            if (response.status !== 200) return;
            const copy = response.clone(); return receive(videoId, requestOrder, () => copy.text(), response.status);
        }).catch(() => {});
        return result;
    };
    const requests = new WeakMap(), open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        const result = Reflect.apply(open, this, arguments); requests.set(this, { method, url }); return result;
    };
    XMLHttpRequest.prototype.send = function() {
        const request = requests.get(this), videoId = request && identify(request.url, request.method);
        if (videoId) {
            const requestOrder = ++order;
            const finish = () => {
                this.removeEventListener('loadend', finish);
                if (requests.get(this) !== request) return;
                receive(videoId, requestOrder, () => this.responseType === 'json' ? JSON.stringify(this.response) : this.responseText, this.status);
            };
            this.addEventListener('loadend', finish);
            try { return Reflect.apply(send, this, arguments); }
            catch (error) { this.removeEventListener('loadend', finish); throw error; }
        }
        return Reflect.apply(send, this, arguments);
    };
    window.postMessage({ channel, type: 'ready' }, location.origin);
})();

// ページが受信したlazy動画情報から、必要な投稿者名・シリーズ名だけを渡す。
(() => {
    if (globalThis.chrome?.runtime?.id) return;
    const channel = 'nico-downloader-watch-metadata-v1';
    let client = '', cached = null, href = location.href, generation = 0, order = 0;
    const route = () => location.pathname.match(/^\/watch\/(sm[0-9]+)\/?$/)?.[1] || '';
    const sync = () => {
        if (href !== location.href) { href = location.href; cached = null; generation++; }
    };
    const publish = () => {
        sync();
        if (client && cached && cached.href === location.href && cached.videoId === route()) {
            window.postMessage({ channel, client, type: 'metadata', ...cached }, location.origin);
        }
    };
    window.addEventListener('message', event => {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin || data?.channel !== channel ||
            data.type !== 'subscribe' || typeof data.client !== 'string' || data.client.length > 100) return;
        client = data.client;
        publish();
    });
    for (const name of ['popstate', 'hashchange']) window.addEventListener(name, sync);
    window.navigation?.addEventListener('currententrychange', sync);
    const context = (url, method) => {
        sync();
        try {
            const parsed = new URL(url, location.href);
            const videoId = parsed.pathname.match(/^\/v4\/watch\/lazy\/(sm[0-9]+)\/?$/)?.[1];
            return String(method).toUpperCase() === 'POST' && parsed.origin === 'https://nvapi.nicovideo.jp' &&
                videoId && videoId === route() ? { videoId, href, generation, order: ++order } : null;
        } catch { return null; }
    };
    const active = ctx => { sync(); return ctx && ctx.generation === generation && ctx.href === location.href && ctx.videoId === route(); };
    const textValue = value => typeof value === 'string' && value.length <= 10000 ? value : '';
    async function receive(ctx, read, status) {
        if (!active(ctx) || status !== 200) return;
        try {
            const json = JSON.parse(await read());
            if (!active(ctx) || json?.meta?.status !== 200 || !json.data ||
                (cached && cached.order > ctx.order)) return;
            // series.video.prev/nextは別動画なので転送しない。Cookie・本文・広告情報も転送しない。
            const owner = textValue(json.data.owner?.nickname);
            const series = textValue(json.data.series?.title);
            if (!owner && !series) return;
            cached = { videoId: ctx.videoId, href: ctx.href, order: ctx.order, owner, series };
            publish();
        } catch { /* ページ側の応答処理を妨げない。 */ }
    }
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        let ctx;
        try {
            const isRequest = typeof Request !== 'undefined' && input instanceof Request;
            ctx = context(isRequest ? input.url : input, init?.method ?? (isRequest ? input.method : 'GET'));
        } catch {}
        const result = Reflect.apply(originalFetch, this, arguments);
        if (ctx) result.then(response => {
            if (!active(ctx) || response.status !== 200) return;
            const copy = response.clone();
            return receive(ctx, () => copy.text(), response.status);
        }).catch(() => {});
        return result;
    };
    const requests = new WeakMap(), originalOpen = XMLHttpRequest.prototype.open, originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        const result = Reflect.apply(originalOpen, this, arguments);
        requests.set(this, { method, url });
        return result;
    };
    XMLHttpRequest.prototype.send = function() {
        const request = requests.get(this);
        const ctx = request && context(request.url, request.method);
        if (ctx) {
            const finish = () => {
                this.removeEventListener('loadend', finish);
                if (requests.get(this) !== request || !active(ctx)) return;
                receive(ctx, () => this.responseType === 'json' ? JSON.stringify(this.response) : this.responseText, this.status);
            };
            this.addEventListener('loadend', finish);
            try { return Reflect.apply(originalSend, this, arguments); }
            catch (error) { this.removeEventListener('loadend', finish); throw error; }
        }
        return Reflect.apply(originalSend, this, arguments);
    };
    window.postMessage({ channel, type: 'ready' }, location.origin);
})();

// ページ側では通信の複製だけを担当し、保存と設定の判断は拡張側で行う。
(() => {
    if (globalThis.chrome?.runtime?.id) return;
    const channel = "nico-downloader-comments-v1";
    let enabled = false;
    let client = "";
    let revision = 0;
    let requestOrder = 0;
    const route = () => location.pathname.match(/^\/(?:watch|shorts)\/([^/?#]+)\/?$/)?.[1] || "";
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
    const context = () => enabled && route() ? { videoId: route(), revision, client, requestOrder: ++requestOrder } : null;
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
            post({ type: "response", videoId: ctx.videoId, requestOrder: ctx.requestOrder, text });
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
                post({ type: "request", videoId: ctx.videoId, requestOrder: ctx.requestOrder });
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
            post({ type: "request", videoId: ctx.videoId, requestOrder: ctx.requestOrder });
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
const metadataWarnings = new Set();
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
        this.page_counts = {}; // 同じ動画IDのページ情報から補完した件数
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
    async SetAllFromVideoSm(video_sm, refresh = false) {
        this.video_sm = video_sm;
        // ショートは表示中のカードからタイトルを取得し、既存の保存名設定に渡す。
        if (/^ss[0-9]+$/.test(video_sm)) {
            this.video_title = this.GetPageTitle() || video_sm;
            return;
        }

        if (!refresh && video_sm == Nicovideo______Ndl______DataLoadedSMID) {
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

    // ページが取得済みの情報だけを使う。旧responseType=jsonの追加GETは行わない。
    async DownloadJson(video_sm = this.video_sm) {
        if (video_sm == '') return false;
        for (const element of document.querySelectorAll('meta[name="server-response"], #js-initial-watch-data[data-api-data]')) {
            try {
                const json = JSON.parse(element.getAttribute("content") ?? element.getAttribute("data-api-data"));
                const data = this.GetWatchData(json);
                if (Number(json?.meta?.status) >= 400) continue;
                if ((data.video?.id ?? data.client?.watchId) === video_sm) return json;
            } catch { /* 同じ動画IDと確認できる埋め込み情報だけを使う。 */ }
        }
        const lazy = globalThis.NicoWatchMetadata?.get(video_sm);
        if (lazy) return { meta: { status: 200 }, data: { video: { id: video_sm },
            owner: { nickname: lazy.owner }, series: { title: lazy.series } } };
        throw new Error("ページの動画情報はまだ受信・読み込みされていません。");
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
        const response = json?.data?.response ?? json?.data ?? {};
        const v4 = response.$watchV4?.data ?? {};
        // watchV4の部分データで、外側にある動画情報を捨てない。
        const merge = (base, preferred) => {
            const result = { ...base };
            for (const [key, value] of Object.entries(preferred ?? {})) {
                if (value != null && value !== "" && (!Array.isArray(value) || value.length)) result[key] = value;
            }
            return result;
        };
        const result = merge(response, v4);
        for (const key of ["video", "owner", "channel", "genre", "series", "tag", "tags", "metadata"]) {
            result[key] = merge(response[key], v4[key]);
        }
        return result;
    }

    GetVideo(json = this.json) {
        const video = this.GetWatchData(json).video ?? {};
        const response = json?.data?.response ?? json?.data ?? {};
        const count = { ...this.page_counts };
        for (const [key, value] of Object.entries(response.video?.count ?? {})) {
            if (value != null && value !== "") count[key] = value;
        }
        for (const [key, value] of Object.entries(video.count ?? {})) {
            if (value != null && value !== "") count[key] = value;
        }
        return { ...video, count };
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
        const data = this.GetWatchData(json);
        return [data.owner?.nickname, data.channel?.name, data.metadata?.jsonLd?.owner?.name]
            .find(value => typeof value === "string" && value.trim()) ?? ""; // 投稿ユーザー名
    }
    //jsonより説明文を取得
    JsonToDescription(json = this.json) {
        return this.GetVideo(json).description ?? ""; // 説明文
    }

    //jsonよりタグを取得
    JsonToTags(json = this.json) {
        const data = this.GetWatchData(json);
        const items = data.tags?.items?.length ? data.tags.items : data.tag?.items ?? [];
        return items.map(tag => tag.name).filter(value => typeof value === "string" && value.trim());
    }

    //jsonよりジャンルを取得
    JsonToGenre(json = this.json) {
        return this.GetWatchData(json).genre?.label ?? ""; // ジャンル
    }

    //jsonよりシリーズを取得
    JsonToSeries(json = this.json) {
        return this.GetWatchData(json).series?.title ?? ""; // シリーズ
    }

    // 追加通信はせず、同じ動画IDの埋め込み情報から欠けた項目だけ補う。
    CompletePageMetadata() {
        if (/^ss[0-9]+$/.test(this.video_sm)) return;
        const getters = { video_title: "JsonToTitle", video_owner: "JsonToUser", video_registeredAt: "JsonToRegisteredAt",
            video_description: "JsonToDescription", video_tags: "JsonToTags", video_genre: "JsonToGenre", video_series: "JsonToSeries" };
        const empty = value => value == null || value === "" || (Array.isArray(value) && !value.length);
        const apply = values => {
            for (const [key, value] of Object.entries(values)) {
                const safe = key === "video_tags" ? (Array.isArray(value) ? value.filter(tag => typeof tag === "string" && tag.trim()) : []) : typeof value === "string" && value.trim() ? value : "";
                if (empty(this[key]) && !empty(safe)) this[key] = safe;
            }
        };
        const lazy = globalThis.NicoWatchMetadata?.get(this.video_sm);
        if (lazy) apply({ video_owner: lazy.owner, video_series: lazy.series });
        for (const element of document.querySelectorAll('meta[name="server-response"], #js-initial-watch-data[data-api-data]')) {
            try {
                const json = JSON.parse(element.getAttribute("content") ?? element.getAttribute("data-api-data"));
                const data = this.GetWatchData(json);
                if ((data.video?.id ?? data.client?.watchId) !== this.video_sm) continue;
                for (const key of ["view", "comment", "mylist", "like"]) {
                    const value = this.GetVideo(json).count[key];
                    if (this.GetVideo().count[key] == null && value != null && value !== "") this.page_counts[key] = value;
                }
                apply(Object.fromEntries(Object.entries(getters).map(([key, getter]) => [key, this[getter](json)])));
            } catch { /* 未解析のページデータは実行せず無視する。 */ }
        }
        const ldSources = [...document.querySelectorAll('script[type="application/ld+json"]')].map(element => element.textContent);
        const embeddedLD = this.GetWatchData().metadata?.jsonLd;
        if (embeddedLD) ldSources.push(embeddedLD);
        for (const source of ldSources) {
            try {
                const json = typeof source === "string" ? JSON.parse(source) : source;
                const objects = Array.isArray(json) ? json : json["@graph"] ?? [json];
                for (const value of objects) {
                    if (![value?.["@type"]].flat().includes("VideoObject")) continue;
                    const urls = [value.url, value["@id"], value.mainEntityOfPage?.["@id"], value.mainEntityOfPage];
                    const matches = value.identifier === this.video_sm || urls.some(address => {
                        if (typeof address !== "string") return false;
                        try { const url = new URL(address, location.origin); return url.origin === location.origin && url.pathname === "/watch/" + this.video_sm; }
                        catch { return false; }
                    });
                    if (!matches) continue;
                    const author = Array.isArray(value.author) ? value.author[0] : value.author;
                    const tags = Array.isArray(value.keywords) ? value.keywords : typeof value.keywords === "string" ? value.keywords.split(",").map(tag => tag.trim()).filter(Boolean) : [];
                    apply({ video_title: value.name, video_owner: author?.name, video_description: value.description,
                        video_registeredAt: value.uploadDate ?? value.datePublished, video_tags: tags });
                }
            } catch { /* 形式や動画IDを確認できない情報は使用しない。 */ }
        }
        const missing = Object.keys(getters).filter(key => empty(this[key]));
        const warning = this.video_sm + ":" + missing.join(",");
        if (missing.length && !metadataWarnings.has(warning)) {
            if (metadataWarnings.size >= 8) metadataWarnings.delete(metadataWarnings.values().next().value);
            metadataWarnings.add(warning);
            const response = this.json?.data?.response;
            console.warn("[nico downloader] メタデータ未取得:", { videoId: this.video_sm, missing,
                rootKeys: Object.keys(this.json ?? {}), responseKeys: Object.keys(response ?? {}),
                watchV4Keys: Object.keys(response?.$watchV4?.data ?? {}),
                watchV4MetadataKeys: Object.keys(response?.$watchV4?.data?.metadata ?? {}),
                videoKeys: Object.keys(this.GetVideo()) });
        }
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
