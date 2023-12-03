
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
    if (video_sm == '') {
        return false;
    }

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
            VideoTitleElement_Write('MainVideoPlayerが読み込めません');
            return false;
        }

        //一時的に変える
        VideoTitleElement_ERRORcheck(video_name);


        //システムメッセージを読み込めてなかったら出る
        if (document.getElementsByClassName('SystemMessageContainer-info').length == 0) {
            return false;
        }

        //初期設定してなかったら止める
        if( document.getElementById(VideoData.Video_DLlink.a).innerHTML.indexOf('◆◆◆◆nico downloaderの初期設定を行ってください◆◆◆◆')!=-1){
            return false;
        }


        ////////////////////////////////////////////////////////////////
        // ここから実行部分
        ////////////////////////////////////////////////////////////////



        //DebugPrint("masterURL:" + masterURL);
        const masterURL = SystemMessageContainer_masterURLGet();
        if (masterURL == null) return false;

        DebugPrint("masterURL:" + masterURL);
        if (downloading) return false;


        //const domand_m3u8 = (await GetMovieApi(video_sm)).data.contentUrl;
        //console.log(domand_m3u8);


        //dmc.nicoの処理はこちら！
        if (masterURL.indexOf('dmc.nico/hlsvod/ht2_nicovideo/') != -1) {
            VideoTitleElement_Write(video_name + "を保存")
            MovieDownload_dmcnico(masterURL, video_sm, video_name);
            video_link_smid = video_sm;
        }
        //delivery.domand.nicovideo.jpの処理はこちら！
        if (masterURL.indexOf('delivery.domand.nicovideo.jp') != -1) {
            VideoTitleElement_Write(video_name + "を保存")
            onclickDL(video_sm, video_name);
            video_link_smid = video_sm;
        }
    }
    return true;
};

async function onclickDL(video_sm, video_name) {


    if (downloading) return false;
    downloading = true;
    let domand_m3u8;
    try {
        //domand_m3u8 = (await GetMovieApi(video_sm)).data.contentUrl;
        //DebugPrint(domand_m3u8);
        throw new Error('domand api error')

    } catch (e) {

        try {
            if (SystemMessageContainer_masterURLGet() != false) {
                domand_m3u8 = SystemMessageContainer_masterURLGet();
            } else {
                throw new Error('システムメッセージからの取得失敗');
            }
        } catch (e) {
            VideoTitleElement_Write('保存失敗:1st m3u8 get error')
            return false;
        }
    }

    const return_domand = MovieDownload_domand(domand_m3u8, video_sm, video_name);
    if (return_domand == -1) {
        VideoTitleElement_Write('保存失敗:コンソールを参照してください')
        return false;
    }
    downloading = false;


    return true;
}





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
//async function DLstartOnclick(TSURLs, video_sm, video_name, fps) {
//    documentWriteText("処理中……");
//    await DownEncoder(TSURLs, video_sm, video_name, fps);
//
//}
function DLstartOnclick(TSURLs, TSFilenames, m3u8s, video_sm, video_name) {
    documentWriteText("処理中……");
    DownEncoder(TSURLs, TSFilenames, m3u8s, video_sm, video_name);

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
    VideoTitleElement_Write(add_error);

}
function VideoTitleElement_Write(txt) {

    document.getElementById(VideoData.Video_DLlink.a).innerHTML = txt;

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
async function MovieDownload_domand(Firstm3u8URL, video_sm, video_name,) {
    //ダウンロード中をセット
    downloading = true;
    const Firstm3u8_body = await TextDownload_withCookie(Firstm3u8URL);
    DebugPrint(Firstm3u8_body);

    const Firstm3u8_body_json = m3u8_Parse(Firstm3u8_body);

    console.log(Firstm3u8_body_json)
    const audio_m3u8_URL = Firstm3u8_body_json["EXT-X-MEDIA"][0]['URI'];
    const video_m3u8_URL = Firstm3u8_body_json["EXT-X-STREAM-INF"][0]['URI'];

    const audio_m3u8_body = await TextDownload_withCookie(audio_m3u8_URL);
    const video_m3u8_body = await TextDownload_withCookie(video_m3u8_URL);
    const audio_m3u8_body_json = m3u8_Parse(audio_m3u8_body);
    const video_m3u8_body_json = m3u8_Parse(video_m3u8_body);

    DebugPrint('audio:' + audio_m3u8_URL);
    DebugPrint('video:' + video_m3u8_URL);

    let replace_audio = replaceURL(audio_m3u8_body)
    let replace_video = replaceURL(video_m3u8_body)
    let replace_Firstm3u8 = replaceURL(Firstm3u8_body)

    let m3u8s = [replace_audio, replace_video, replace_Firstm3u8,
        makeFilename(audio_m3u8_URL), makeFilename(video_m3u8_URL), makeFilename(Firstm3u8URL)];
    let TSURLs = makeTSURLs(video_m3u8_body_json, audio_m3u8_body_json);


    let TSFilenames = makeTSFilenames(TSURLs);


    documentWriteText(video_name + "をダウンロード");
    documentWriteOnclick(DLstartOnclick(TSURLs, TSFilenames, m3u8s, video_sm, video_name));
}
async function GetMovieApi(video_sm) {
    //https://nvapi.nicovideo.jp/v1/watch/smXXXXXX/access-rights/hls?actionTrackId=

    const TrackID = genActionTrackID();
    const URL = "https://nvapi.nicovideo.jp/v1/watch/" + video_sm + "/access-rights/hls?actionTrackId=" + TrackID;
    const ret = await GetWatchthreadKey_and_Moviedata(video_sm, TrackID);
    const threadKEY = ret[0];
    const video = ret[1].replace('archive', 'video').replaceAll('_', '-');
    const audio = ret[2].replace('archive', 'audio').replaceAll('_', '-');
    DebugPrint('video : ' + video);
    DebugPrint('audio : ' + audio);
    const res = await (await fetch(URL, {
        "headers": {
            "accept": "*/*",
            "accept-language": "ja-JP,ja;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-access-right-key": threadKEY,
            "x-frontend-id": "3",
            "x-request-with": "nicovideo"
        },
        "referrer": "https://www.nicovideo.jp/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"outputs\":[[\"" + video + "\",\"" + audio + "\"]]}",
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
async function GetWatchthreadKey_and_Moviedata(smid, trackID) {
    const URL = 'https://www.nicovideo.jp/api/watch/v3/' + smid + '?_clientOsType=android&_frontendId=3&_frontendVersion=0.1.0&actionTrackId=' + trackID + '&kips=harmful&isContinueWatching=true&i18nLanguage=ja-jp';
    // dataExist  data.media.domand.accessRightKey




    const dataJSON = await (await fetch(URL, {
        "headers": {
            "accept": "*/*",
            "accept-language": "ja-JP,ja;q=0.9",
            "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Windows\"",
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

    let video, audio
    for (let i = 0; i < dataJSON.data.media.delivery.movie.videos.length; i++) {
        //if (dataJSON.data.media.delivery.movie.videos[i].isAvailable == true) {
        video = dataJSON.data.media.delivery.movie.videos[i].id;
        break;
        // }
    }
    for (let i = 0; i < dataJSON.data.media.delivery.movie.audios.length; i++) {
        //if (dataJSON.data.media.delivery.movie.audios[i].isAvailable == true) {
        audio = dataJSON.data.media.delivery.movie.audios[i].id;
        break;
        //}
    }

    //dataJSON.data.media.delivery.movie.audios[0].id;
    DebugPrint('threadKey : ' + key);

    const ret = [key, video, audio];
    return ret;
}


function m3u8_Parse(dataText) {
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

function makeFilename(URL) {

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
function makeTSURLs(audio_m3u8_body_json, video_m3u8_body_json) {
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
function makeTSURLs_dmcnicovideo(video_m3u8_body_json) {
    let TSURLs = [];
    for (let i = 0; i < video_m3u8_body_json['EXTINF'].length; i++) {
        TSURLs.push(video_m3u8_body_json['EXTINF'][i]['URI']);
    }
    return TSURLs;
}
/*
function makeTSURLs_dmcnicovideo(video_m3u8_body_json) {
    let TSURLs = [];
    for (let i = 0; i < video_m3u8_body_json['EXTINF'].length; i++) {
        TSURLs.push(video_m3u8_body_json['EXTINF'][i]['URI']);
    }
    return TSURLs;
}
 */
function makeTSFilenames(TSURLs) {


    let TSFilenames = [];
    //TSURLsのファイル名をすべて出す
    for (let i = 0; i < TSURLs.length; i++) {
        const fname = makeFilename(TSURLs[i]);
        TSFilenames.push(fname);
    }
    return TSFilenames;
}


async function MovieDownload_dmcnico(masterURL, video_sm, video_name) {

    //ダウンロード中フラグ立てる
    downloading = true;

    const Firstm3u8_body = await TextDownload_withCookie(masterURL);
    DebugPrint(Firstm3u8_body);
    const Firstm3u8_body_json = m3u8_Parse(Firstm3u8_body);


    const video_m3u8_URL = masterm3u8_addURL(Firstm3u8_body_json["EXT-X-STREAM-INF"][0]['URI'], masterURL);
    const video_m3u8_body = await TextDownload_withCookie(video_m3u8_URL);
    const video_m3u8_body_json = m3u8_Parse(video_m3u8_body);


    let TSURLs = makeTSURLs_dmcnicovideo(video_m3u8_body_json);
    for (let i = 0; i < TSURLs.length; i++) {
        TSURLs[i] = playlistm3u8_addURL(TSURLs[i], video_m3u8_URL);
    }


    let TSFilenames = makeTSFilenames(TSURLs)

    let replace_video = video_m3u8_body.replace(/[?][\w=\-&_.~]+/g, '').replace('1/ts/', '');
    let replace_Firstm3u8 = Firstm3u8_body.replace(/[?][\w=\-&_.~]+/g, '').replace('1/ts/', '');;
    let m3u8s = [replace_video, replace_Firstm3u8,
        makeFilename(video_m3u8_URL).replace('1/ts/', ''), makeFilename(masterURL)];



    DebugPrint(String(TSURLs))
    documentWriteText(video_name + "をダウンロード");
    documentWriteOnclick(DLstartOnclick(TSURLs, TSFilenames, m3u8s, video_sm, video_name));



}
function replaceURL(url) {
    let temp = url.replace(/https:\/\/[\w\.\/-]+[\/]{1}/g, '');
    temp = temp.replace(/[?][\w=\-&_~]+/g, '');

    return temp;
}
function masterm3u8_addURL(url, urldir) {

    return String(urldir.match(/(https.).*(master.m3u8?.)/g)).replace('master.m3u8?', '') + url;
}
function playlistm3u8_addURL(url, urldir) {

    return String(urldir.match(/(https.).*(playlist.m3u8?.)/g)).replace('playlist.m3u8?', '') + url;
}