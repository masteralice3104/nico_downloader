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
    VideoData.SystemMessageQuery : SystemMessageのクエリ
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
    PlayerSettingQuery: '[aria-label="設定"]',

    // 設定ボタンのクラス名
    PlayerSettingClass: 'h_[calc(100vh_-_{sizes.commonHeader.inViewHeight}_-_{sizes.webHeader.height}_-_{spacing.x12})] max-h_[480px] rounded_m bg_layer.surfaceHighEm d_flex flex_column overflow_hidden shadow_base',//2024-09-06

    // SystemMessageのクエリ
    SystemMessageQuery: '[class^="cursor_pointer d_inline-flex ai_center jc_center gap_x0_5 px_x2 bdr_full fs_s fw_bold button-color_base white-space_nowrap us_none hover:cursor_pointer disabled:pointer-events_none [&_>_svg]:w_auto [&_>_svg]:h_x3 h_x3 [&_svg]:d_none"]',//2024-09-06

    // ダウンロードボタンのCSSとかHTML
    DLButton: {
        a: "<button style='width:200px;height:56px;color: var(--colors-action-text-on-tertiary-azure);background-color: var(--colors-action-base);border-radius: var(--radii-m)'",
        b: '"\'><b>',
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
     * @returns {String} 動画のダウンロード名(例：smID_title.mp4)
     */
    ////////////////////////////////////////////////////////////////////////
    VideoDownloadNameMake(video_smID, video_title, video_type = "mp4") {
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
            document.getElementById(VideoData.Video_DLlink.p).remove();//消す
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
    ButtonFirstMake() {

        let p_link = document.createElement("p");
        p_link.id = VideoData.Video_DLlink.p;
        p_link.className = VideoData.Video_DLlink.div_class;
        let a_link = document.createElement("a");
        a_link.innerText = "処理中";
        a_link.id = VideoData.Video_DLlink.a;

        //すでにあるなら追加しない
        if (!document.getElementById(p_link.id)) {
            document.getElementsByClassName(VideoData.Video_title_Element)[0].appendChild(p_link);
            document.getElementsByClassName(VideoData.Video_title_Element)[0].querySelector("p").appendChild(a_link);
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
        // 多言語対応
        document.getElementById(VideoData.Video_DLlink.a).innerHTML = VideoData.DLButton.a + VideoData.DLButton.b + this.LangText(text) + VideoData.DLButton.c;
        return;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * ボタンのinnerHTMLを書き換える
     * @param {String} innerHTML ボタンに書き込むHTML
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
    ButtonInnerHTMLWrite(innerHTML) {
        document.getElementById(VideoData.Video_DLlink.a).innerHTML = innerHTML;
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * 言語設定をセットする
     * @param {String} lang 言語
     * @returns {Boolean}
    */
    ////////////////////////////////////////////////////////////////////////
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
        if (this.CheckSystemMessageContainer() == false) return false;


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
     * SystemMessageAutoOpenの関数
     * 実際には使わないが、この関数を参考にSystemMessageAutoOpenToText()を作る
     * @returns なし
    */
    ////////////////////////////////////////////////////////////////////////    
    ____SystemMessageAutoOpen() {

        new Promise((resolve) => {
            //プレーヤー設定を自動的に押す
            document.querySelector(VideoData.PlayerSettingQuery).click();
            resolve();
        }).then(function () {
            //システムメッセージを開く
            document.querySelector(VideoData.SystemMessageQuery).click();
        })
    }

    ////////////////////////////////////////////////////////////////////////
    /**
     * SystemMessageAutoOpenのテキスト版を作成
     * @returns {String} SystemMessageAutoOpenのテキスト版
    */
    ////////////////////////////////////////////////////////////////////////
    SystemMessgeAutoOpenToText() {
        let text = ""
        text += "new Promise(function(resolve) {document.querySelector(&#39;" + VideoData.PlayerSettingQuery + "&#39;).click();resolve();})";
        text += ".then(function() {document.querySelector(&#39;" + VideoData.SystemMessageQuery + "&#39;).click();});";
        return text;
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

        return VideoData.DLButton.a + " onclick=\'" + this.SystemMessgeAutoOpenToText() + "\' " + VideoData.DLButton.b + video_name + this.LangText("を保存") + VideoData.DLButton.c + "</p>";
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
     * SystemMessageContainerからmasterURLを取得
     * @returns {String} masterURL
     */
    ////////////////////////////////////////////////////////////////////////
    MasterURLGet() {
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
        if (tempURL == '') return false;
        const masterURL = tempURL;
        if (masterURL == null) return false;

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
