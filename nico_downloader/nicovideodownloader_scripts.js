
//残したい変数
let video_link_smid = "-1"; //-1はロードしてない
let downloading = 0;        //0はDLしてない、1はダウンロード最中

const VideoData = {
    Video_title: 'VideoTitle',
    Video_title_Element: 'HeaderContainer-topAreaLeft',
    Video_DLlink: {
        p: 'DLlink',
        a: 'DLlink_a'
    }

}

//ダウンロード関数

async function VideoDown() {

    //動画タイトルの定義
    const video_title = document.getElementsByClassName(VideoData.Video_title)[0].innerText;

    //動画sm番号の定義
    const match_sm = match_sm_Get();
    const video_sm = video_sm_Get(match_sm);

    //デフォルト動画ファイル名の定義
    const video_name = VideoNameMake(video_sm, video_title);

    //すでに作ったリンクがあるかどうか判別し、あれば削除
    VideoTitleElement_Check(video_sm);


    //ダウンロードリンクの表示
    if (video_link_smid === "-1") {

        //リンクをとりあえず作成
        VideoTitleElement_FirstMake();

        DebugPrint("DL start");

        //videoが読み込めてなかったら出る
        if (document.querySelector("#MainVideoPlayer > video").getAttribute('src') == null) {
            return;
        }

        //一時的に変える
        VideoTitleElement_ERRORcheck(video_name);


        //システムメッセージを読み込めてなかったら出る
        if (document.getElementsByClassName('SystemMessageContainer-info').length == 0) {
            return false;
        }


        ////////////////////////////////////////////////////////////////
        // ここから実行部分
        ////////////////////////////////////////////////////////////////




        const masterURL = SystemMessageContainer_masterURLGet();
        if (masterURL == null) return false;

        DebugPrint("masterURL:" + masterURL);
        if (downloading) return false;


        //const domand_m3u8 = (await GetMovieApi(video_sm)).data.contentUrl;
        //console.log(domand_m3u8);


        //dmc.nicoの処理はこちら！
        if (masterURL.indexOf('dmc.nico/hlsvod/ht2_nicovideo/')) {

            MovieDownload_dmcnico(masterURL, video_sm, video_name);

        }
        //delivery.domand.nicovideo.jpの処理はこちら！
        if (masterURL.indexOf('delivery.domand.nicovideo.jp')) {
            DebugPrint("delivery.domand.nicovideo.jp");
            MovieDownload_domand(masterURL, video_sm, video_name);
        }


    }
    return true;
};

let interval1st = false;
let intervalId;
try {

    clearInterval(intervalId)
    intervalId = setInterval(() => {

        if (interval1st) {
            try {
                VideoDown();
            } catch (e) {
                console.log(e);
            }
        } else {
            interval1st = true;
        }

    }, 2000);
} catch (error) {
    console.log(e);
}


//ページ表示時発火処理
window.onload = function () {
    Option_setLoading("video_downloading");
}


function documentWriteText(URItext) {
    document.getElementById(VideoData.Video_DLlink.a).innerText = URItext;
}
function documentWriteOnclick(onclick) {
    document.getElementById(VideoData.Video_DLlink.a).onclick = onclick;
}
async function DLstartOnclick(TSURLs, video_sm, video_name, fps) {
    documentWriteText("処理中……");
    await DownEncoder(TSURLs, video_sm, video_name, fps);

}

function VideoNameMake(video_sm, video_title, kakuchoushi = ".mp4") {
    let video_name = "";
    const video_name_value = setOption("video_downloading");

    //video_name
    if (video_name_value !== "1" &&
        video_name_value !== "2" &&
        video_name_value !== "3") {

        video_name = video_name + video_sm;
    } else if (video_name_value === "1") {
        video_name = video_name + video_title;
    } else if (video_name_value === "2") {
        video_name = video_name + video_sm;
        video_name = video_name + "_";
        video_name = video_name + video_title;
    } else if (video_name_value === "3") {
        video_name = video_name + video_title;
        video_name = video_name + "_";
        video_name = video_name + video_sm;
    }
    video_name = video_name + kakuchoushi;
    return video_name;
}


function match_sm_Get() {
    let match_sm = '0';
    try {
        DebugPrint("match_sm初期値 : " + match_sm)
        match_sm = setOption("video_pattern");
        DebugPrint("match_sm読込 : " + match_sm)
        if (match_sm == "0") {
            match_sm = "sm[0-9]{1,}";
        }
        DebugPrint("match_smｴﾗｰ処理 : " + match_sm)
    } catch (error) {
        match_sm = "sm[0-9]{1,}";
        DebugPrint("ndl:er " + error)
    }
    return match_sm;
}
function video_sm_Get(match_sm) {
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

function VideoTitleElement_Check(video_sm) {
    //この関数はすでに作ったリンクがあるかどうかを判別する
    if (video_link_smid !== video_sm && video_link_smid !== "-1") {
        DebugPrint("video_link_smidリセット")
        DebugPrint("video_link_smid : " + video_link_smid)
        DebugPrint("video_sm : " + video_sm)
        //video_link_smidが現在のものと同じじゃないならすでに読み込んだ形跡があるので一回消す
        video_link_smid = "-1";
        document.getElementById(VideoData.Video_DLlink.p).remove();

    }
}

//リンクの作成をする
function VideoTitleElement_FirstMake() {
    DebugPrint("DL link make");

    let p_link = document.createElement("p");
    p_link.id = VideoData.Video_DLlink_p;
    let a_link = document.createElement("a");
    a_link.innerText = "処理中";
    a_link.id = VideoData.Video_DLlink.a;

    if (!document.getElementById(p_link.id)) {
        document.getElementsByClassName(VideoData.Video_title_Element)[0].appendChild(p_link);
        document.getElementsByClassName(VideoData.Video_title_Element)[0].querySelector("p").appendChild(a_link);
    }

}

function VideoTitleElement_ERROR(video_name, hlssavemode = '1') {
    let add_error = "<p>" + video_name + "</p><p>をダウンロードするためにはシステムメッセージを開いてください";
    if (hlssavemode == "0") {
        const optionURL = chrome.runtime.getURL('options.html');
        add_error = "<p>◆◆◆◆nico downloaderの初期設定を行ってください◆◆◆◆</p><p><a href=\"" + optionURL + "\">設定画面を開く</a></p>";
    } else if (hlssavemode == "1") {
        add_error += "</p>"
    } else if (hlssavemode == "2") {
        add_error += "[高速モード]</p>";
    }
    return add_error;

}
function VideoTitleElement_ERRORcheck(video_name) {
    //hlsになっている場合
    DebugPrint("hls mode");
    const hlssavemode = setOption("video_hlssave");

    //エラー文を用意する
    const add_error = VideoTitleElement_ERROR(video_name, hlssavemode);
    document.getElementById(VideoData.Video_DLlink.a).innerHTML = add_error;

}

function SystemMessageContainer_masterURLGet() {
    //メッセージより読み込み
    let rawMessage;
    let tempURL = '';
    for (let i = 0; i < document.getElementsByClassName('SystemMessageContainer-info').length; i++) {
        DebugPrint("masterURL" + i)
        const message = document.getElementsByClassName('SystemMessageContainer-info')[i].innerText;
        if (message.match(/(動画の読み込みを開始しました。).*/)) {
            DebugPrint("URL発見");
            rawMessage = String(message)
            tempURL = String(rawMessage.replace('動画の読み込みを開始しました。（', '').replace('）', ''));
            DebugPrint("masterURL:" + tempURL);
        }
    };
    if (tempURL == null) return false;
    if (tempURL == '') return false;
    const masterURL = tempURL;
    if (masterURL == null) return false;

    return masterURL;
}
function MovieDownload_dmcnico(masterURL, video_sm, video_name) {

    //ダウンロード中フラグ立てる
    downloading = true;

    const xhr_master = new XMLHttpRequest();//XMLHttpRequest
    let masterRawMessage, playlistURL

    xhr_master.open('GET', masterURL);      //GETを作る
    xhr_master.send();                      //リクエストを投げる
    xhr_master.onreadystatechange = function () {
        if (xhr_master.readyState === 4 && xhr_master.status === 200) {

            if (video_link_smid == video_sm) {
                return false;
            }
            //ここで一回止める
            //読み込み形跡を残す
            video_link_smid = video_sm;
            DebugPrint("smid上書き");

            //取得完了したらここに飛ぶ
            masterRawMessage = this.responseText;

            //文字列を行ごとに分解する
            let masterURLGyou = masterRawMessage.split(/\r\n|\n/);
            //3行目は常に高画質っぽいのでそれだけ抽出
            playlistURL = String(masterURL.match(/(https.).*(master.m3u8?.)/g)).replace('master.m3u8?', '') + masterURLGyou[2];
            DebugPrint("playlistURL: " + playlistURL);


            //playlistURLにはダウンロードすべきm3u8のURLが入ってるのでそれをダウンロード
            const xhr_playlist = new XMLHttpRequest();
            xhr_playlist.open('GET', playlistURL);
            xhr_playlist.send();
            xhr_playlist.onreadystatechange = function () {
                if (xhr_master.readyState === 4 && xhr_master.status === 200) {
                    //取得完了したらここに飛ぶ
                    let playlistRawMessage = this.responseText;



                    //https://stabucky.com/wp/archives/10419
                    playlistRawMessage = playlistRawMessage.trim();
                    playlistRawMessage = playlistRawMessage.replace(/(\r?\n)+/g, "\n");

                    const playlistMessage = playlistRawMessage.split(/\r\n|\n/);
                    DebugPrint(playlistMessage);


                    //神 of GOD
                    //https://github.com/naari3/nico-downloader-ffmpeg/blob/main/src/background.ts
                    //ご協力感謝します

                    // playlistのアイテムを全部読み込む

                    //読み込んだTSファイルの置き場所配列
                    let TSURLs = [];
                    let fps = 60;

                    for (let i = 0; i < playlistMessage.length; i++) {
                        let element = playlistMessage[i];
                        if (element.match(/#/)) {
                            //#が入ってる行は飛ばす

                            if (element.match(/FRAME-RATE=([\d.]+)/)) {
                                fps = element.match(/FRAME-RATE=([\d.]+)/);
                            }

                        } else if (element == "") {
                            //空行は飛ばす
                        } else {
                            //TSURLの取得
                            const TSURL = String(playlistURL.match(/(https.).*(playlist.m3u8?.)/g)).replace('playlist.m3u8?', '') + element;
                            TSURLs.push(TSURL);
                        }

                        if (element.match(/ENDLIST/)) {
                            //ENDLISTが入ってる行まで読み込めばOK
                            DebugPrint("TSURLs.length:" + TSURLs.length);
                            if (TSURLs.length == 0) {
                                return;
                            }

                            documentWriteText(video_name + "をダウンロード");
                            documentWriteOnclick(DLstartOnclick(TSURLs, video_sm, video_name, String(fps)));

                        }
                    }

                    //フラグ戻す
                    downloading = false;

                    //読み込み形跡を残す
                    video_link_smid = video_sm;
                    DebugPrint("smid上書き");

                }
            }


        }
    }
}

function MovieDownload_domand(masterURL, video_sm, video_name) {

}

async function GetMovieApi(video_sm) {
    //https://nvapi.nicovideo.jp/v1/watch/smXXXXXX/access-rights/hls?actionTrackId=

    const TrackID = genActionTrackID();
    const URL = "https://nvapi.nicovideo.jp/v1/watch/" + video_sm + "/access-rights/hls?actionTrackId=" + TrackID;
    const threadKEY = await GetWatchthreadKey(video_sm, TrackID);



    const res = await (await fetch(URL, {
        "headers": {
            "accept": "*/*",
            "accept-language": "ja-JP,ja;q=0.9",
            "content-type": "application/json",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-access-right-key": threadKEY,
            "x-frontend-id": "3",
            "x-request-with": "nicovideo"
        },
        "referrer": "https://www.nicovideo.jp/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"outputs\":[[\"video-h264-720p\",\"audio-aac-192kbps\"]]}",
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    })).json();




    console.log(res)
    return res;
}
function genActionTrackID() {
    //ニコニコにあったやつwatch.XXXXXXXXXXX.min.js
    for (var e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJLKMNOPQRSTUVWXYZ0123456789".split(""), t = "", n = 0; n < 10; n++)
        t += e[Math.floor(Math.random() * e.length)];
    return t + "_" + Date.now()
}
async function GetWatchthreadKey(smid, trackID) {
    const URL = 'https://www.nicovideo.jp/api/watch/v3/' + smid + '?_clientOsType=android&_frontendId=3&_frontendVersion=0.1.0&actionTrackId=' + trackID + '&kips=harmful&isContinueWatching=true&i18nLanguage=ja-jp';
    // dataExist  data.media.domand.accessRightKey

    const dataJSON = await (await fetch(URL, {
        "headers": {
            "accept": "*/*",
            "accept-language": "ja-JP,ja;q=0.9",
            "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site"
        },
        "referrer": "https://www.nicovideo.jp/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    })).json();

    const key = dataJSON.data.media.domand.accessRightKey;
    DebugPrint('threadKey : ' + key);
    return key;
}


