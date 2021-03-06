//残したい変数
let video_link_smid = "-1"; //-1はロードしてない


//ダウンロード関数
function videoDL(vname, vurl) {
    DebugPrint("videoDL() start")
    //落とす
    chrome.runtime.sendMessage({ request_type: "nicodownloader_down" , name: vname, url: vurl })
};

function VideoDown() {

    //動画取得先の定義
    let video_URL = String(document.querySelector("#MainVideoPlayer > video").getAttribute('src'));

    //動画タイトルの定義
    let video_title = document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > h1").innerText;

    //動画sm番号の定義
    let video_sm = ""
    let match_sm = "0"
    try {
        DebugPrint("match_sm初期値 : " +match_sm) 
        match_sm = setOption("video_pattern");
        DebugPrint("match_sm読込 : " +match_sm) 
        if(match_sm == "0"){
            match_sm = "sm[0-9]{1,}";    
        }
        DebugPrint("match_smｴﾗｰ処理 : " +match_sm) 
    } catch (error) {
        match_sm = "sm[0-9]{1,}";
        DebugPrint("ndl:er "+error)
    }
    if (location.href.match(match_sm)) {
        video_sm = location.href.match(match_sm).toString();
        DebugPrint("location.href.match match_sm true")
        DebugPrint("match_sm : " +match_sm)
    } else {
        DebugPrint("location.href.match match_sm false")
        DebugPrint("match_sm : " +match_sm)
        DebugPrint("setOption(\"video_pattern\") : "+setOption("video_pattern"))
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
    if (video_link_smid === "-1") {
        console.log("URL取得 : " + document.querySelector("#MainVideoPlayer > video").getAttribute('src'));
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

            if (document.querySelector("#MainVideoPlayer > video").getAttribute('src').match(/ht2/) != null) {
                //httpの場合



                //読み込み形跡を残す
                video_link_smid = video_sm;
                DebugPrint("smid上書き");
                //コンテンツの取得
                try {
                    DebugPrint("DL start");


                    
                    fetch(video_URL, { method: 'GET' })
                        .then(response => {

                            let responseCache = response.clone();

                            //参考：https://blog.jxck.io/entries/2016-07-21/fetch-progress-cancel.html
                            //ダウンロードファイルの全体サイズ取得
                            let total = responseCache.headers.get('content-length');

                            // body の reader を取得する
                            let reader = responseCache.body.getReader();
                            let chunk = 0;
                            let read_result = 0;
                            try {
                                
                                reader.read()
                                    .then(function processResult(result) {
                                        // done が true なら最後の chunk
                                        if (result.done) {
                                            DebugPrint("DL end");
                                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").download = video_name;
                                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = video_name + " をダウンロード";

                                            if(setOption("video_autosave") == "1"){
                                                document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML += "[自動保存モード]"
                                            }

                                            read_result=1;
                                            return;
                                        }

                                        // chunk の長さの蓄積を total で割れば進捗が分かる
                                        chunk += result.value.length;

                                        let downtext = `処理中：${Math.round(chunk/total * 100)} %`
                                        if(setOption("video_autosave") == "1"){
                                            downtext += "[自動保存モード]"
                                        }
                                        document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = downtext;

                                        // 再帰する
                                        return reader.read().then(processResult);
                                    });
                            } catch (error) {
                                console.log(error)
                            }

                            //重要
                            if (read_result){
                                DebugPrint("read resultできました")
                            }else{
                                DebugPrint("read resultできませんでした")
                            }
                            return response.blob();
                            
                        })
                        .then(blob => {
                            DebugPrint("blob url a-href set");

                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").href = window.URL.createObjectURL(blob);

                            //名前を指定

                            if(setOption("video_autosave") == "1"){
                                //videoDL(video_name,window.URL.createObjectURL(blob));
                                DebugPrint("video_autosave run");
                                document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").click();
                            }
                            DebugPrint("link end");

                        });


                } catch (error) {
                    console.log(error);
                }

            } else {
                DebugPrint("hls error");
                //hlsになっている場合
                const add_error = "<p>ダウンロードするためには視聴方法をhttpに切替えてリロードしてください</p><p>■　切り替え方</p><p>①　動画の画面上で右クリックします</p><p>②　視聴方法の切替（hls > http）を選択します</p><p>③　すぐ下にある「リロード」ボタンをクリックします</p><p><button id=\"reload_button\" value=\"リロード\" onclick=\"location.reload();\" > リロード </button></p>";
                document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = add_error;
            }


        }

    }
    return true;
};


try {

    const intervalId = setInterval(() => {
        try {
            VideoDown();
        } catch (e) {
            console.log(e);
        }

    }, 2000);
} catch (error) {
    console.log(e);
}


function StartScript() {
    let innerHTML = ``;
    appendScriptHTML(innerHTML);
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
window.onload = function() {
    StartScript();
    Option_setLoading("video_downloading");
}