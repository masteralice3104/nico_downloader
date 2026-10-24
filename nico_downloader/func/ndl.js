//めっちゃ重要なデータ
/* 
    VideoData
    VideoData.Video_title : 動画のタイトルのクラス名
    VideoData.Video_title_Element : タイトルの場所のクエリで、ボタンを追加する場所
    VideoData.Video_DLlink : ボタンの内部構造のクエリ
    VideoData.SystemMessageContainer : SystemMessageのクエリ
    VideoData.PlayerSettingQuery : 設定ボタンのクエリ
    VideoData.PlayerSettingClass : 設定ボタンのクラス名
    VideoData.SystemMessageClass : SystemMessageのクラス名
    //VideoData.SystemMessageQuery : SystemMessageのクエリ
    VideoData.SystemMessageButtonText : システムメッセージを表示するボタンの表示名
    VideoData.DLButton : ダウンロードボタンのCSSとかHTML
    VideoData.DLButton.a : ダウンロードボタンのHTMLの前半
    VideoData.DLButton.b : ダウンロードボタンのHTMLの中身
    VideoData.DLButton.c : ダウンロードボタンのHTMLの後半

*/

const VideoData = {
    // 動画のタイトルのクラス名
    Video_title: 'fs_xl fw_bold',

    // タイトルの場所のクエリで、ボタンを追加する場所
    //Video_title_Element: 'd_flex justify_space-between items_flex-start gap_x3 w_100%',
    //Video_title_Element: 'd_flex jc_space-between ai_flex-start gap_x3 w_100%',//2024-09-06
    Video_title_Element: 'd_flex jc_space-between ai_flex-start gap_var(--watch-video-information-gap) w_100%',//2025-02-22

    //Video_title_Element: 'd_flex w_[268px] gap_base items_center',

    //ボタンの内部構造のクエリ
    Video_DLlink: {
        p: 'Dlink',
        div_class: 'd_flex justify_flex-start',
        a: 'DLlink_a',
        li: 'DLlink_li',
        a2: 'downloadlink'
    },

    // SystemMessageのクエリ
    SystemMessageContainer: 'c_monotone.L80',//2024-09-06

    // 設定ボタンのクエリ
    PlayerSettingQuery: "[aria-label=\'設定\']",

    // 設定ボタンのクラス名
    PlayerSettingClass: 'h_[calc(100vh_-_{sizes.commonHeader.inViewHeight}_-_{sizes.webHeader.height}_-_{spacing.x12})] max-h_[480px] rounded_m bg_layer.surfaceHighEm d_flex flex_column overflow_hidden shadow_base',//2024-09-06

    // SystemMessageのクエリ
    //SystemMessageQuery:'[class*="cursor_pointer d_inline-flex ai_center jc_center gap_x0_5 px_x2 bdr_full fs_s fw_bold button-color_base"]:last-child',//2025-08-20
    //SystemMessageQuery:'[class^="cursor_pointer d_inline-flex ai_center jc_center gap_x0_5 px_x2 bdr_full fs_s fw_bold button-color_base white-space_nowrap us_none hover:cursor_pointer disabled:pointer-events_none [&_>_svg]:w_auto [&_>_svg]:h_x3 h_x3 [&_svg]:d_none"]:last-child',//2025-07-01
    //SystemMessageQuery: '[class^="cursor_pointer d_inline-flex ai_center jc_center gap_x0_5 px_x2 bdr_full fs_s fw_bold button-color_base white-space_nowrap us_none hover:cursor_pointer disabled:pointer-events_none [&_>_svg]:w_auto [&_>_svg]:h_x3 h_x3 [&_svg]:d_none"]',//2024-09-06
    //
    //上記クエリは廃止になりました

    // システムメッセージを表示するボタンの表示名
    SystemMessageButtonText: 'システムメッセージを表示',

    // ダウンロードボタンのCSSとかHTML
    DLButton: {
        a: "<button style='display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:200px;height:56px;color: var(--colors-action-text-on-tertiary-azure);background-color: var(--colors-action-base);border-radius: var(--radii-m)'",
        b: '"\'><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="w_font h_font" aria-hidden="true" focusable="false" style="display:block;flex-shrink:0;width:24px;height:24px;fill:currentColor"><path d="M11 2a1 1 0 0 0-1 1v8H6.5a.75.75 0 0 0-.53 1.28l5.32 5.32a1 1 0 0 0 1.42 0l5.32-5.32A.75.75 0 0 0 17.5 11H14V3a1 1 0 0 0-1-1h-2ZM3 16a1 1 0 0 0-1 1v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H4v-3a1 1 0 0 0-1-1Z"/></svg><b>',
        c: '</b>'
    },



}

/**
 * @param {String} NicovideoDownloader__LoadedVideoSMID
 * @param {Boolean} NicovideoDownloader__NowDownloading
 */

//引き継ぎされる変数
let NicovideoDownloader__LoadedVideoSMID = "-1"; // 読み込んだ動画のsmID
let NicovideoDownloader__NowDownloading = false; // ダウンロード中かどうか true:ダウンロード中 false:ダウンロードしていない



class NicoDownloaderClass {

    //多言語対応
    Lang = {
        "ja": {
            "処理開始": "処理開始",
            "MainVideoPlayerが読み込めません": "MainVideoPlayerが読み込めません",
            "要初期設定": "nico downloaderの初期設定を行ってください",
            "設定画面を開く": "設定画面を開く",
            "を保存": "を保存",
            "処理中": "処理中",
            "変換中": "変換中",
            "変換終了": "変換終了",
            "保存完了": "保存完了",
            "まもなく保存完了": "まもなく保存完了",
            "をダウンロード": "をダウンロード",
            "ダウンロード中": "ダウンロード中",
        },
        "en": {
            "処理開始": "Processing start",
            "MainVideoPlayerが読み込めません": "MainVideoPlayer can't be loaded",
            "要初期設定": "Please set up nico downloader",
            "設定画面を開く": "Open setting page",
            "を保存": " Save",
            "変換中": "Converting",
            "処理中": "Processing",
            "保存完了": " Saved",
            "変換終了": "Conversion finished",
            "まもなく保存完了": "Saved soon",
            "をダウンロード": " Download",
            "ダウンロード中": " Downloading",
        }
    }

    /**
     * コンストラクタ
     */
    constructor() {
        this.MatchingSMIDArray = ""; // smIDの正規表現
        this.MatchingSMIDArraFirstSetting();
        this.VideoDownloadNameArray = ""; // 動画の保存名の設定
        this.VideoDownloadNameArraySetting();
        this.Savemode == "0"; // 保存モード
        this.SavemodeSetting(); // 保存モードの設定
        this.LoadedVideoSMID = "-1"; // 読み込んだ動画のsmID
        this.VideoLoadedSet();  // 読み込んだ動画のsmIDをセット

        this.downloading = false; // ダウンロード中かどうか
        this.VideoDownloadingFirstSetting(); // ダウンロード中かどうかの初期状態を設定

        this.M3u8Class = new NicovideoM3u8;

        //後で自ら設定しないといけない変数
        this.optionURL = '';// オプションページのURL
        this.LangSetting = setOption("language_setting") || "ja"; // 言語

        this.M3u8 = {}; // m3u8の最初の内容
        this.TSURLs = []; // TSのURLリスト
        this.TSFilenames = []; // TSのファイル名リスト
        this.VideoFormat = "";//動画の拡張子
        this.FSOutputFileName = "";//ファイルシステムに出力するファイル名
        //↑NicovideoClass.video_nameとは全く違います！↑

        //ダウンロード中用変数
        this.DownloadFaultNum = 0;
        this.DownloadPercentage = 0;


    }



    ////////////////////////////////////////////////////////////////////////
    /**
     * 設定ファイルを読み込む
     * @returns {Boolean} 読み込みに成功したかどうか true:成功 false:失敗
     */
    ////////////////////////////////////////////////////////////////////////
    MatchingSMIDArraFirstSetting() {
        try {

            this.MatchingSMIDArray = setOption("video_pattern");
            if (this.MatchingSMIDArray == "0") {
                this.MatchingSMIDArray = "sm[0-9]{1,}";
            }
        } catch (error) {
            this.MatchingSMIDArray = "sm[0-9]{1,}";
            DebugPrint("NicoDownloaderClass:ERROR:" + error)
            return false;
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画の保存名の設定を行いVideoDownloadNameArrayにセットする
     * @returns {Boolean} 
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadNameArraySetting() {
        const Setting = setOption("video_downloading");
        /*
            Setting
            0:smID
            1:title
            2:smID_title
            3:title_smID
        */
        switch (Setting) {
            case "0":
                this.VideoDownloadNameArray = "${NicoDownloaderClasssmID}";
                break;
            case "1":
                this.VideoDownloadNameArray = "${NicoDownloaderClasstitle}";
                break;
            case "2":
                this.VideoDownloadNameArray = "${NicoDownloaderClasssmID}_${NicoDownloaderClasstitle}";
                break;
            case "3":
                this.VideoDownloadNameArray = "${NicoDownloaderClasstitle}_${NicoDownloaderClasssmID}";
                break;
            default:
                this.VideoDownloadNameArray = "${NicoDownloaderClasssmID}";
                break;
        }
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画のダウンロード名を作成する関数 
     * @param {String} video_smID SMID
     * @param {String} video_title タイトル
     * @param {String} video_type 拡張子 (デフォルト: mp4)
     * @param {Object|null} filenameSettings 通常動画専用の保存名設定
     * @param {String} video_owner 投稿者名
     * @returns {String} 動画のダウンロード名(例：smID_title.mp4)
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadNameMake(video_smID, video_title, video_type = "mp4", filenameSettings = null, video_owner = "") {
        // 通常動画の追加設定。ショートは従来の基本設定を必ず使う。
        if (!/^ss[0-9]+$/.test(video_smID) && filenameSettings) {
            const mode = filenameSettings.video_filename_mode;
            if (mode === "custom" || mode === "uploader_title_id") {
                const parts = mode === "custom" ? [1, 2, 3].map((i) => filenameSettings["video_filename_part_" + i]) : ["uploader", "title", "id"];
                return BuildVideoFilename(parts, { id: video_smID, title: video_title, uploader: video_owner }, video_type);
            }
        }
        let ret = this.VideoDownloadNameArray;
        ret = ret.replace("${NicoDownloaderClasssmID}", video_smID);
        ret = ret.replace("${NicoDownloaderClasstitle}", video_title);

        //拡張子をつける
        ret = ret + "." + video_type;
        return ret;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * この関数はすでに作ったリンクがあるかどうかを判別する
     * @param {String} video_sm SMID
     * @returns なし
     */
    ////////////////////////////////////////////////////////////////////////
    VideoTitleElementCheck(video_sm) {
        if (this.LoadedVideoSMID !== video_sm && this.LoadedVideoSMID !== "-1") {
            DebugPrint("this.LoadedVideoSMIDリセット")
            DebugPrint("this.LoadedVideoSMID : " + this.LoadedVideoSMID)
            DebugPrint("video_sm : " + video_sm)
            //this.LoadedVideoSMIDが現在のものと同じじゃないならすでに読み込んだ形跡があるので一回消す
            this.LoadedVideoSMID = "-1";// リセット
            const wrapper = document.getElementById(VideoData.Video_DLlink.p);
            if (wrapper && wrapper.dataset.ndlVideoId !== video_sm) wrapper.remove();
        }
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 読み込み済みの動画をセットする
     * @returns {Boolean}
     */
    ////////////////////////////////////////////////////////////////////////
    VideoLoadedSet() {
        this.LoadedVideoSMID = NicovideoDownloader__LoadedVideoSMID;
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画をダウンロード中かどうかをセットする
     * @returns {Boolean}
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadingSet() {
        NicovideoDownloader__NowDownloading = true;
        this.downloading = true;
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画をダウンロード中かどうかの初期状態を設定する
     * @returns {Boolean}
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadingFirstSetting() {
        this.downloading = NicovideoDownloader__NowDownloading;
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画をダウンロード中かどうかをリセットする
     * @returns {Boolean}
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadingReset() {
        NicovideoDownloader__NowDownloading = false;
        this.downloading = false;
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画をダウンロード中かどうかをチェックする
     * @returns {Boolean} ダウンロード中かどうか 
     * true:ダウンロード中
     * false:ダウンロードしていない
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadingCheck() {
        return this.downloading;
        //true:ダウンロード中
        //false:ダウンロードしていない
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * この関数はすでに動画を読み込んだかどうかを判別する
     * @param {String} video_sm SMID
     * @returns {Boolean} 読み込み済みかどうか
     * true:読み込み済み
     * false:読み込み済みでない
     */
    ////////////////////////////////////////////////////////////////////////
    VideoLoadedCheck(video_sm) {
        if (this.LoadedVideoSMID === video_sm) {
            return true;//すでに読み込んでいる
        }
        return false;//読み込んでいない
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 読み込んだ動画のsmIDをセットする
     * @param {String} video_sm SMID
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    VideoLoadedSMIDSet(video_sm) {
        this.LoadedVideoSMID = video_sm;
        NicovideoDownloader__LoadedVideoSMID = this.LoadedVideoSMID;
        return true;
    }



    ////////////////////////////////////////////////////////////////////////
    /**
     * 動画の直下にボタンを作成する
     * @returns {Boolean} 
     * true:成功
     * false:失敗
    */
    ////////////////////////////////////////////////////////////////////////
    ButtonFirstMake(video_sm) {
        const parent = DownloadButtonParent();
        if (!parent) return false;
        let wrapper = document.getElementById(VideoData.Video_DLlink.p);
        if (wrapper && !parent.contains(wrapper)) {
            wrapper.remove();
            wrapper = null;
        }
        if (!wrapper) {
            wrapper = document.createElement("p");
            wrapper.id = VideoData.Video_DLlink.p;
            wrapper.className = VideoData.Video_DLlink.div_class;
            parent.appendChild(wrapper);
        }
        if (IsShortVideoPage()) {
            wrapper.style.cssText = "display:flex;align-items:center;justify-content:center;align-self:center;width:100%;margin:0;padding:0;line-height:0";
        }
        if (video_sm) wrapper.dataset.ndlVideoId = video_sm;
        if (!document.getElementById(VideoData.Video_DLlink.a)) {
            const content = document.createElement("a");
            content.id = VideoData.Video_DLlink.a;
            if (IsShortVideoPage()) content.style.cssText = "display:flex;align-items:center;justify-content:center;margin:0;padding:0";
            content.innerText = "処理中";
            wrapper.appendChild(content);
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * ボタンに文字を書き込む
     * @param {String} text ボタンに書き込む文字 LangTextで処理される
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    ButtonTextWrite(text) {
        const button = document.getElementById(VideoData.Video_DLlink.a)?.querySelector("button");
        const label = this.LangText(text);
        const busy = /処理中|処理開始|確認中|ダウンロード中|変換中|変換終了|まもなく保存完了|Processing|Downloading|Converting|Conversion finished|Saved soon/.test(label);
        if (button && IsShortVideoPage()) {
            this.ShortButtonStatus(button, label, busy);
            return;
        }
        const caption = button?.querySelector("b");
        const icon = button?.querySelector("svg");
        if (caption && icon) {
            caption.textContent = label;
            button.setAttribute("aria-busy", String(busy));
            button.disabled = busy;
            if (!button.dataset.ndlIdleSvg) button.dataset.ndlIdleSvg = icon.outerHTML;
            const status = busy ? "busy" : "idle";
            // 文字の進捗更新ではSVGを入れ替えず、回転を継続する。
            if (button.dataset.ndlStatus !== status) {
                button.dataset.ndlStatus = status;
                icon.outerHTML = busy ? this.ButtonStatusIcon("busy").replace('style="', 'style="display:block;flex-shrink:0;width:24px;height:24px;') : button.dataset.ndlIdleSvg;
            }
            return;
        }
        this.ButtonInnerHTMLWrite(VideoData.DLButton.a + VideoData.DLButton.b + label + VideoData.DLButton.c);
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * ボタンのinnerHTMLを書き換える
     * @param {String} innerHTML ボタンに書き込むHTML
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    ButtonInnerHTMLWrite(innerHTML) {
        const content = document.getElementById(VideoData.Video_DLlink.a);
        content.innerHTML = innerHTML;
        if (IsShortVideoPage()) {
            const button = content.querySelector("button");
            if (button) {
                const label = button.textContent.trim();
                button.className = "Pressable cursor_pointer d_inline-flex ai_center jc_center p_x0_5 bdr_full fs_base fill_action.textOnBase hover:bg-c_action.baseHover disabled:fill_action.textOnBase_disabled disabled:pointer-events_none [&:disabled:hover]:bg-c_transparent [&_svg]:w_x3 [&_svg]:h_x3 w_x5 min-w_x5 h_x5 bg-c_action.base";
                button.removeAttribute("style");
                button.type = "button";
                button.tabIndex = 0;
                button.setAttribute("aria-label", "ダウンロード");
                button.title = label;
                button.querySelector("b")?.remove();
                const svg = button.querySelector("svg");
                if (svg) svg.removeAttribute("style");
                button.style.cssText = "display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle;margin:0";
                button.dataset.ndlIdleIcon = button.innerHTML;
                this.ShortButtonStatus(button, label, false);
            }
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 言語設定をセットする
     * @param {String} lang 言語
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    ShortButtonStatus(button, label, busy) {
        const completed = label.trim() === this.LangText("保存完了").trim();
        const status = completed ? "completed" : busy ? "busy" : "idle";
        const displayLabel = completed ? "保存終了" : label;
        button.title = displayLabel;
        button.setAttribute("aria-label", completed || busy ? displayLabel : "ダウンロード：" + label);
        button.setAttribute("aria-busy", String(busy && !completed));
        button.disabled = busy || completed;
        if (completed) {
            button.style.setProperty("color", "#999");
            button.style.setProperty("fill", "currentColor");
            button.style.setProperty("background-color", "#333");
        }
        // 進捗の数値だけが変わってもSVGを作り直さず、回転を継続する。
        if (button.dataset.ndlStatus === status) return;
        button.dataset.ndlStatus = status;
        if (completed || busy) {
            button.innerHTML = this.ButtonStatusIcon(status);
        } else if (button.dataset.ndlIdleIcon) {
            button.innerHTML = button.dataset.ndlIdleIcon;
        }
    }

    ButtonStatusIcon(status) {
        if (status === "completed") return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>';
        if (status === "busy") return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill:none;stroke:currentColor;stroke-width:2.5"><circle cx="12" cy="12" r="8" opacity=".25"/><path d="M12 4a8 8 0 0 1 8 8"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>';
        return "";
    }

    LangSetting(lang) {
        this.LangSetting = lang;
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 多言語対応のための関数
     * @param {String} text 入力したいテキスト
     * @returns {String} 多言語対応のテキスト(設定により自動変換)
     * @returns {String} または入力したテキスト(変換先ない場合)
    */
    ////////////////////////////////////////////////////////////////////////
    LangText(text) {
        return this.Lang[this.LangSetting][text] || text;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * MainVideoPlayerが読み込めるかどうかを判別する
     * @returns {Boolean}　MainVideoPlayerが読み込めるかどうか
     * true:読み込める
     * false:読み込めない
    */
    ////////////////////////////////////////////////////////////////////////
    CheckMainVideoPlayer() {
        if (IsShortVideoPage()) return !!ShortVideoControls();
        if (document.querySelector("video").getAttribute('src') == null) {
            return false;
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * SystemMessageが読み込めるかどうかを判別する
     * @returns {Boolean}　SystemMessageが読み込めるかどうか
     * true:読み込める
     * false:読み込めない
    */
    ////////////////////////////////////////////////////////////////////////
    CheckSystemMessageContainer() {
        if (document.getElementsByClassName(VideoData.SystemMessageContainer).length == 0) {
            return false;
        }

        return true;
    }


    ////////////////////////////////////////////////////////////////////////
    /**
     * ダウンロード前チェックを一括で行う
     * @returns {Boolean} ダウンロード前チェックが成功したかどうか
     * true:成功
     * false:失敗
    */
    ////////////////////////////////////////////////////////////////////////
    CheckBeforeDownload() {
        //MainVideoPlayerが読み込めるかどうかを判別する
        if (!this.CheckMainVideoPlayer()) {
            this.ButtonTextWrite('MainVideoPlayerが読み込めません');//ボタンの文字を変更
            return false;
        }
        //SystemMessageが読み込めるかどうかを判別する
        if (!this.ObservedMasterURLGet() && this.CheckSystemMessageContainer() == false) return false;


        //DLlinkを強制的に読み込む
        if (document.getElementById(VideoData.Video_DLlink.li)) {
            //ここには何も書かない
        }

        // 初期設定していなかったら止める
        if (this.NicoDownloaderFirstSettingCheck() == false) return false;
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * Savemodeをオプション設定より読み込み
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    SavemodeSetting() {
        this.Savemode = setOption("video_hlssave");
        return;
    }


    ////////////////////////////////////////////////////////////////////////
    /**
     * SystemMessageAutoOpenのテキスト版を作成
     * @returns {String} SystemMessageAutoOpenのテキスト版
    */
    ////////////////////////////////////////////////////////////////////////
    SystemMessageAutoOpenToText() {
        const open = async function (settingQuery, messageText) {
            const key = "__nicoDownloaderOpeningSystemMessage";
            if (window[key]) return;
            window[key] = true;
            const pageURL = location.href;
            const isReady = (element) => {
                if (!element || !element.isConnected || element.disabled ||
                    element.getAttribute("aria-disabled") === "true" || !element.getClientRects().length) return false;
                const style = getComputedStyle(element);
                return style.visibility !== "hidden" && style.display !== "none" &&
                    style.pointerEvents !== "none" && style.opacity !== "0";
            };
            const waitForButton = (find, label) => new Promise((resolve, reject) => {
                let frame = null;
                let previous = null;
                let previousRect = "";
                const finish = (error, element) => {
                    clearTimeout(timer);
                    if (frame !== null) cancelAnimationFrame(frame);
                    if (error) reject(error);
                    else resolve(element);
                };
                const timer = setTimeout(() => finish(new Error(label + "の表示待ちがタイムアウトしました")), 5000);
                const check = () => {
                    try {
                        if (location.href !== pageURL) {
                            finish(new Error("ページが切り替わったため操作を中止しました"));
                            return;
                        }
                        const element = find();
                        if (isReady(element)) {
                            const rect = element.getBoundingClientRect();
                            const position = [rect.x, rect.y, rect.width, rect.height].join(",");
                            // 同じボタンの位置・大きさが次の描画でも安定してから操作する。
                            if (element === previous && position === previousRect) {
                                finish(null, element);
                                return;
                            }
                            previous = element;
                            previousRect = position;
                        } else {
                            previous = null;
                        }
                        frame = requestAnimationFrame(check);
                    } catch (error) {
                        finish(error);
                    }
                };
                check();
            });
            const findMessage = () => Array.from(document.querySelectorAll('button,[role="button"]'))
                .find((element) => (element.textContent || "").trim() === messageText && isReady(element));
            try {
                // 既に設定メニューが開いている場合、再クリックして閉じない。
                if (!findMessage()) {
                    const settings = await waitForButton(() => document.querySelector(settingQuery), "設定ボタン");
                    settings.click();
                }
                const messages = await waitForButton(findMessage, "システムメッセージボタン");
                messages.click();
            } catch (error) {
                console.warn("システムメッセージの表示に失敗しました:", error);
            } finally {
                delete window[key];
            }
        };
        const js = "(" + open.toString() + ")(" + JSON.stringify(VideoData.PlayerSettingQuery) +
            "," + JSON.stringify(VideoData.SystemMessageButtonText) + ");";

        // onclick=" ... " にそのまま入れるための完全なエスケープ
        return js
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 保存ボタンの中身を作成
     * @param {String} video_name 動画の名前
     * @returns {String} HTML - 保存ボタンの中身
     * @returns {String} HTML - 保存ボタンの中身(要初期設定)
    */
    ////////////////////////////////////////////////////////////////////////
    SaveButtonInnerHTMLMake(video_name) {
        if (this.Savemode == "0") {
            // optionページのURLを取得
            this.optionURL = chrome.runtime.getURL('options.html');

            // 初期設定を促す
            return VideoData.DLButton.a + " onclick=\'location.href=&quot;" + this.optionURL + "&quot;\' " + VideoData.DLButton.b + this.LangText("要初期設定") + "<a href=\"" + this.optionURL + "\"><br>" + this.LangText("設定画面を開く") + "</a>" + VideoData.DLButton.c;
        }

        return VideoData.DLButton.a + " onclick=\'" + this.SystemMessageAutoOpenToText() + "\' " + VideoData.DLButton.b + video_name + this.LangText("を保存") + VideoData.DLButton.c + "</p>";
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 実際の保存ボタンを作成
     * SaveButtonInnerHTMLMakeを使ってボタンの中身を作成し、ボタンに書き込む
     * @param {String} video_name 動画の名前
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    SaveButtonMake(video_name) {
        const innerHTML = this.SaveButtonInnerHTMLMake(video_name);
        this.ButtonInnerHTMLWrite(innerHTML);
        const wrapper = document.getElementById(VideoData.Video_DLlink.p);
        const capture = typeof domandPlaylistCapture !== "undefined" ? domandPlaylistCapture : null;
        const ready = this.Savemode == "0" || IsShortVideoPage() || !!capture?.available() || !!document.querySelector(VideoData.PlayerSettingQuery);
        const button = document.getElementById(VideoData.Video_DLlink.a).querySelector("button");
        if (button) {
            button.disabled = !ready;
            if (this.Savemode != "0" && capture) {
                button.addEventListener("click", (event) => {
                    capture.claim(event).catch((error) => console.error("m3u8選択に失敗しました:", error));
                }, { capture: true });
            }
        }
        if (wrapper) {
            wrapper.dataset.ndlInitialPending = ready ? "0" : "1";
            wrapper.dataset.ndlInitialName = video_name;
        }
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * nico downloaderの初期設定していなかったら止める
     * @returns {Boolean} 初期設定しているかどうか
     * true:初期設定している
     * false:初期設定していない
    */
    ////////////////////////////////////////////////////////////////////////
    NicoDownloaderFirstSettingCheck() {
        if (document.getElementById(VideoData.Video_DLlink.a).innerHTML.indexOf(this.LangText("要初期設定")) != -1) {
            return false;
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * video_nameから末尾にある拡張子のみ抽出し、formatに代入する
     * @param {String} video_name 動画の名前
     * @returns {String} format 動画の拡張子
    */
    ////////////////////////////////////////////////////////////////////////
    FormatSetting(video_name) {
        return video_name.match(/\.[a-zA-Z0-9]+$/).toString().replace('.', '');

    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 観測済みの親URLを優先し、取得できなければSystemMessageContainerから取得
     * @returns {String} masterURL
     */
    ////////////////////////////////////////////////////////////////////////
    ObservedMasterURLGet() {
        return typeof domandPlaylistCapture !== "undefined" ? domandPlaylistCapture.requestedURL() : false;
    }

    MasterURLGet() {
        const observed = this.ObservedMasterURLGet();
        if (observed) return observed;
        //メッセージより読み込み
        let rawMessage;
        let tempURL = '';
        for (let i = 0; i < document.getElementsByClassName(VideoData.SystemMessageContainer).length; i++) {
            DebugPrint("masterURL" + i)
            const message = document.getElementsByClassName(VideoData.SystemMessageContainer)[i].innerText;
            if (message.match(/(動画の初期化処理が完了しました).*/)) {
                DebugPrint("URL発見");
                rawMessage = String(message)
                tempURL = String(rawMessage.replace('動画の初期化処理が完了しました (', '').replace(')', ''));
                DebugPrint("masterURL:" + tempURL);
            }
        };

        //URLが取得できなかったらfalseを返す
        if (tempURL == null) return false;
        if (tempURL == '') {
            if (typeof domandPlaylistCapture !== "undefined") {
                const reason = document.getElementsByClassName(VideoData.SystemMessageContainer).length ?
                    "初期化完了メッセージ内にURLが見つかりません。" : "システムメッセージ欄がまだ表示されていません。";
                domandPlaylistCapture.report("システムメッセージ", reason);
            }
            return false;
        }
        const masterURL = tempURL;
        if (masterURL == null) return false;

        if (typeof domandPlaylistCapture !== "undefined") {
            domandPlaylistCapture.report("システムメッセージ", "親m3u8のURLを取得しました。", masterURL);
        }
        return masterURL;
    }


    ////////////////////////////////////////////////////////////////////////
    /**
     * ダウンロードリンクをクリックする
     * クリック後リンクを削除し、ボタンの文字を変更する
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    DownloadLinkClick() {
        if (document.getElementById(VideoData.Video_DLlink.a2) != null) {
            //ダウンロードのタグがあればクリック
            const link = document.getElementById(VideoData.Video_DLlink.a2);
            link.click();
            link.remove();
            this.ButtonTextWrite(this.LangText("保存完了")); //ボタンの文字を変更
        }
    }


    ////////////////////////////////////////////////////////////////////////
    /**
     * クッキーを保持したままテキストデータをダウンロードする
     * @param {String} URL 
     * @returns {String} テキストデータ
     */
    ////////////////////////////////////////////////////////////////////////
    async DownloadTextWithCookie(URL) {
        return await fetch(URL, { credentials: 'include' })
            .then((response) => {
                if (response.status !== 200) {
                    DebugPrint("Error downloading :" + URL);
                    return -1;
                }
                return response.text();
            });
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * m3u8をセットする
     * @param {String} Key
     * @param {String} m3u8
     * @returns
    */
    ////////////////////////////////////////////////////////////////////////
    SetM3u8(Key, m3u8) {
        this.M3u8[Key] = m3u8;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * m3u8をパースする関数
     * @param {String} dataText m3u8のテキストデータ
     * @returns {Object} m3u8のJSONデータ
     * @returns {null} m3u8じゃなかった場合
     * @returns {null} パースに失敗した場合
     */
    ////////////////////////////////////////////////////////////////////////
    Parsem3u8(dataText) {
        //""の間に,が来るとそこで止まるが仕方ないということにしておきます
        //どうせそれでてくるやつ使わないので


        DebugPrint(dataText);
        //行毎に分ける
        const Datas = dataText.split(/\n/);

        //json
        let jsondata = {};

        //m3u8じゃなかったらパースができないので出る
        if (Datas[0] != '#EXTM3U') {
            return null;//ERROR
        }

        for (let i = 1; i < Datas.length; i++) {
            if (Datas[i].startsWith('#EXT-X-ENDLIST')) {
                //正常終了
                break;
            }
            if (Datas[i] == '' && i == Datas.length - 1) {
                //正常終了
                break;
            }
            if (Datas[i].indexOf(':') == -1) {
                continue;
            }
            if (Datas[i].startsWith('https') || Datas[i].indexOf('1/ts/') != -1 || Datas[i].indexOf('.ts?ht2_nicovideo') != -1) {
                //URL行はいったん無視する
            } else {
                let tempData = Datas[i];
                const Datakey_match = Datas[i].match(/#[A-Z-]+:/);

                const Datakey = Datakey_match[0].replace('#', '').replace(':', '');
                tempData = tempData.replace(Datakey_match, '')

                if (!jsondata[Datakey]) {
                    //空配列作成
                    jsondata[Datakey] = [];
                }



                if (tempData.indexOf(',') == -1 && tempData.indexOf('=') == -1) {
                    jsondata[Datakey].push(tempData);
                } else {
                    if (tempData.slice(0, 10).match(/[0-9].[0-9]{1,},/)) {
                        let temp = { sec: tempData.match(/[0-9].[0-9]{1,},/) };
                        jsondata[Datakey].push(temp);

                    } else {
                        let tempjson = {};
                        DebugPrint(tempData);
                        let temp = tempData.match(/[\w]+=[\"]?[\w:/.\-\?\=~& ]+[\"]?/g);

                        for (let e = 0; e < temp.length; e++) {
                            const key_match = temp[e].match(/[\w-]+=/);
                            const key = key_match.toString().replace('=', '');
                            let value = temp[e].replace(key_match, '').replaceAll('"', '').replaceAll('\\', '');
                            tempjson[key] = value;
                        }

                        jsondata[Datakey].push(tempjson);

                    }
                }
                if (Datas[i + 1].startsWith('https') || Datas[i + 1].indexOf('1/ts/') != -1 || Datas[i + 1].indexOf('.ts?ht2_nicovideo') != -1) {
                    DebugPrint(Datas[i + 1]);
                    const latest = jsondata[Datakey].length - 1;
                    jsondata[Datakey][latest]['URI'] = Datas[i + 1];
                }

            }
        }

        return jsondata;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * URLをM3u8にセットする
     * @param {String} Key 
     * @param {String} URL 
     */
    ////////////////////////////////////////////////////////////////////////
    async URLToM3u8Set(Key, URL) {

        //Firstm3u8URLの取得に成功した場合
        this.SetM3u8(Key + "URL", URL);//Firstm3u8URLをセット
        this.SetM3u8(Key + "Body", await this.DownloadTextWithCookie(this.M3u8[Key + "URL"]));//Firstm3u8のBodyをセット
        this.SetM3u8(Key + "Body_json", this.Parsem3u8(this.M3u8[Key + "Body"]));//Firstm3u8のBodyをJSON形式に変換してセット
    }


    ////////////////////////////////////////////////////////////////////////
    /**
     * m3u8からAudioM3u8URLとVideoM3u8URLをセットする
     * @returns {Boolean}
     * true:成功
     * false:失敗
    */
    ////////////////////////////////////////////////////////////////////////
    M3u8ToAudioAndVideoUrlSet() {

        const audio_m3u8_URL = this.M3u8.FirstBody_json["EXT-X-MEDIA"][0]['URI'];
        const video_m3u8_URL = this.M3u8.FirstBody_json["EXT-X-STREAM-INF"][0]['URI'];

        if (audio_m3u8_URL == null || video_m3u8_URL == null) return false;

        this.SetM3u8("AudioM3u8URL", audio_m3u8_URL);
        this.SetM3u8("VideoM3u8URL", video_m3u8_URL);

        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * video_nameから末尾にある拡張子のみ抽出
     * @param {String} video_name 
     * @returns {String} format
     */
    ////////////////////////////////////////////////////////////////////////
    GetFormatToString(video_name) {
        return video_name.match(/\.[a-zA-Z0-9]+$/).toString().replace('.', '');
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * video_nameから末尾にある拡張子のみ抽出し、VideoFormatにセットする
     * @param {String} video_name
     * @returns {Boolean}
     * true:成功
     * false:失敗
        */
    ////////////////////////////////////////////////////////////////////////
    SetVideoFormat(video_name) {
        this.VideoFormat = this.GetFormatToString(video_name);
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * VideoFormatに拡張子を直接セットする
     * @param {String} extension 拡張子.mp4など
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    SetVideFormatByExtension(extension) {
        this.VideoFormat = extension;
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * VideoFormatをチェックする
     * @returns {String} VideoFormat VideoFormatがある場合
     * @returns {Boolean} false VideoFormatがない場合
    */
    ////////////////////////////////////////////////////////////////////////
    CheckVideoFormat() {
        if (this.VideoFormat == null) return false;
        if (this.VideoFormat == '') return false;
        return this.VideoFormat;
    }

    ////////////////////////////////////////////////////////////////
    /**
     * ダウンロード失敗数を1追加
     * @returns {Boolean}
     * true:成功
    */
    ////////////////////////////////////////////////////////////////
    DownloadFaultNumAdd() {
        this.DownloadFaultNum++;
        return true;
    }
    ////////////////////////////////////////////////////////////////
    /**
     * ダウンロード失敗数をリセット
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////
    DownloadFaultNumReset() {
        this.DownloadFaultNum = 0;
        return true;
    }
    ////////////////////////////////////////////////////////////////
    /**
     * ダウンロード失敗数を取得
     * @returns {Number} ダウンロード失敗数
    */
    ////////////////////////////////////////////////////////////////
    DownloadFaultNumCheck() {
        return this.DownloadFaultNum;
    }

    ////////////////////////////////////////////////////////////////
    /**
     * ダウンロード進捗をセット
     * @param {Number} percentage 進捗
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////
    DownloadPercentageSet(percentage) {
        this.DownloadPercentage = percentage;
        return true;
    }
    ////////////////////////////////////////////////////////////////
    /**
     * ダウンロード進捗をリセット
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////
    DownloadPercentageReset() {
        this.DownloadPercentage = 0;
        return true;
    }
    ////////////////////////////////////////////////////////////////
    /**
     * ダウンロード進捗を取得
     * @returns {Number} ダウンロード進捗
    */
    ////////////////////////////////////////////////////////////////
    DownloadPercentageGet() {
        return this.DownloadPercentage;
    }


    ////////////////////////////////////////////////////////////////
    /**
     * ファイルシステムに出力するファイル名をセット
     * @param {NicovideoClass} Nicovideo
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////
    FSOutputFileNameSet(Nicovideo) {
        this.FSOutputFileName = Nicovideo.video_sm + "." + this.CheckVideoFormat() || "mp4";
    }

    ////////////////////////////////////////////////////////////////
    /**
     * ファイルシステムに出力するファイル名をリセット
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////
    FSOutputFileNameReset() {
        this.FSOutputFileName = "";
    }

    ////////////////////////////////////////////////////////////////
    /**
     * ファイルシステムに出力するファイル名を取得
     * @returns {String} ファイルシステムに出力するファイル名
    */
    ////////////////////////////////////////////////////////////////
    FSOutputFileNameGet() {
        return this.FSOutputFileName;
    }
}



class NicovideoM3u8 {
    ////////////////////////////////////////////////////////////////
    /**
     * URLリストからTSURLsを作成する
     * @param {NicoDownloaderClass} NicoDownloader 
     * @returns {Array} TSURLs
     */
    ////////////////////////////////////////////////////////////////
    MakeURLListToTSURLs(NicoDownloader) {
        return this._MakeURLList(NicoDownloader.M3u8.AudioBody_json, NicoDownloader.M3u8.VideoBody_json);
    }

    ////////////////////////////////////////////////////////////////
    /**
     * M3u8からURLリストを作成する
     * @param {Object} audio_m3u8_body_json JSON Object形式のm3u8データ
     * @param {Object} video_m3u8_body_json JSON Object形式のm3u8データ
     * @returns {Array} TSURLs
     */
    ////////////////////////////////////////////////////////////////
    _MakeURLList(audio_m3u8_body_json, video_m3u8_body_json) {
        let TSURLs = [];
        //URIキーをすべてTSURLsにいれる
        TSURLs.push(audio_m3u8_body_json['EXT-X-MAP'][0]['URI']);
        TSURLs.push(audio_m3u8_body_json['EXT-X-KEY'][0]['URI']);
        for (let i = 0; i < audio_m3u8_body_json['EXTINF'].length; i++) {
            TSURLs.push(audio_m3u8_body_json['EXTINF'][i]['URI']);
        }
        TSURLs.push(video_m3u8_body_json['EXT-X-MAP'][0]['URI']);
        TSURLs.push(video_m3u8_body_json['EXT-X-KEY'][0]['URI']);
        for (let i = 0; i < video_m3u8_body_json['EXTINF'].length; i++) {
            TSURLs.push(video_m3u8_body_json['EXTINF'][i]['URI']);
        }
        return TSURLs;
    }


    /**
     * 
     * @param {NicoDownloaderClass} NicoDownloader 
     * @returns {Array} TSFilenames
     */
    MakeTSFileNameListtoArray(NicoDownloader) {
        return this._makeTSFilenames(NicoDownloader.TSURLs);
    }

    _makeTSFilenames(TSURLs) {

        let TSFilenames = [];
        //TSURLsのファイル名をすべて出す
        for (let i = 0; i < TSURLs.length; i++) {
            const fname = this.MakeTSFilename(TSURLs[i]);
            TSFilenames.push(fname);
        }
        return TSFilenames;
    }


    /**
     * 
     * @param {String} url 
     * @returns {String}
     */
    ReplaceURLToM3u8s(url) {
        let temp = url.replace(/https:\/\/[\w\.\/-]+[\/]{1}/g, '');
        temp = temp.replace(/[?][\w=\-&_~]+/g, '');

        return temp;
    }


    /**
     * 
     * @param {String} URL 
     * @returns {String}
     */
    MakeTSFilename(URL) {

        let ret = '';
        DebugPrint('URL:' + URL);
        if (URL.startsWith('https')) {
            ret = URL.match(/\/[\w-.]+\?/).toString().replace('/', '').replace('?', '');
        } else {
            ret = URL.match(/[\w-.]+\?/).toString().replace('/', '').replace('?', '');
        }
        DebugPrint('makeFilename: ' + ret + ' ' + URL);
        return ret;
    }
}
// manifestで最後に読み込まれるため、必要なクラスがそろった後に監視を開始する。
if (typeof StartInitialButtonObserver === "function") StartInitialButtonObserver();
