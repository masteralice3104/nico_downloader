

//残したい変数
let video_link_smid = "-1"; //-1はロードしてない
let downloading = 0;        //0はDLしてない、1はダウンロード最中



//ダウンロード関数

function VideoDown() {


    //動画タイトルの定義
    let video_title = document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > h1").innerText;

    //動画sm番号の定義
    let video_sm = ""
    let match_sm = "0"
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
    if (location.href.match(match_sm)) {
        video_sm = location.href.match(match_sm).toString();
        DebugPrint("location.href.match match_sm true")
        DebugPrint("match_sm : " + match_sm)
    } else {
        DebugPrint("location.href.match match_sm false")
        DebugPrint("match_sm : " + match_sm)
        DebugPrint("setOption(\"video_pattern\") : " + setOption("video_pattern"))
        return;
    }

    //デフォルト動画ファイル名の定義
    //let video_name = video_sm + ".mp4";
    let video_name = "";
    let video_name_value = setOption("video_downloading");

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
    video_name = video_name + ".mp4";

    if (video_link_smid !== video_sm && video_link_smid !== "-1") {
        DebugPrint("video_link_smidリセット")
        DebugPrint("video_link_smid : " + video_link_smid)
        DebugPrint("video_sm : " + video_sm)
        //video_link_smidが現在のものと同じじゃないならすでに読み込んだ形跡があるので一回消す
        video_link_smid = "-1";
        document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p").remove();

    }
    //ダウンロードリンクの表示
    if (video_link_smid === "-1") {

        DebugPrint("DL link make");
        //まずリンクの作成
        let p_link = document.createElement("p");
        p_link.id = "DLlink";
        let a_link = document.createElement("a");
        a_link.innerText = "処理中";

        if (!document.getElementById(p_link.id)) {
            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft").appendChild(p_link);
            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p").appendChild(a_link);
        }


        DebugPrint("DL start");
        if (document.querySelector("#MainVideoPlayer > video").getAttribute('src') != null) {
            //httpの場合
            if (document.querySelector("#MainVideoPlayer > video").getAttribute('src').match(/ht2/) != null) {
                //ここは廃止
            } else {
                //hlsになっている場合
                DebugPrint("hls mode");
                const hlssavemode = setOption("video_hlssave");

                let add_error = "<p>" + video_name + "</p><p>をダウンロードするためにはシステムメッセージを開いてください";
                if (hlssavemode == "0") {
                    const optionURL = chrome.runtime.getURL('options.html');
                    add_error = "<p>◆◆◆◆nico downloaderの初期設定を行ってください◆◆◆◆</p><p><a href=\"" + optionURL + "\">設定画面を開く</a></p>";
                } else if (hlssavemode == "1") {
                    add_error += "</p>"
                } else if (hlssavemode == "2") {
                    add_error += "[高速モード]</p>";
                }


                document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = add_error;

                if (document.getElementsByClassName('SystemMessageContainer-info').length == 0) {
                    return false;
                }

                ////////////////////////////////////////////////////////////////
                // ここから実行部分
                ////////////////////////////////////////////////////////////////
                /*
                
                */

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

                DebugPrint("masterURL:" + masterURL);
                if (downloading) return false;
                //ダウンロード中フラグ建てる
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

                                for (let i = 0; i < playlistMessage.length; i++) {
                                    let element = playlistMessage[i];
                                    if (element.match(/#/)) {
                                        //#が入ってる行は飛ばす
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
                                        documentWriteOnclick(DLstartOnclick(TSURLs, video_sm, video_name));

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
function appendScriptURL(URL) {

    let script_li = document.createElement("script");
    script_li.src = URL;
    document.body.appendChild(script_li);
}

function appendScriptHTML(innerHTML) {
    let script_li = document.createElement("script");
    script_li.innerHTML = innerHTML;
    document.body.appendChild(script_li);
}

//ページ表示時発火処理
window.onload = function () {
    Option_setLoading("video_downloading");


}


function documentWriteText(URItext) {
    document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerText = URItext;
}
function documentWriteOnclick(onclick) {
    document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").onclick = onclick;
}
async function DLstartOnclick(TSURLs, video_sm, video_name) {
    documentWriteText("処理中……");
    await DownEncoder(TSURLs, video_sm, video_name);

}