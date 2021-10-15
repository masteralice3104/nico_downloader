let start_res = 0;
let end_res = 0;



//ページ表示時発火処理
window.onload = function() {
    Start_Dic();
}

function Start_Dic() {
    const thisURL = location.href;




    //スレのみページ
    if (thisURL.match("https://dic.nicovideo.jp/b/a/.")) {

        refresh_resNo();


        //html要素作成
        let button_threadnext = document.createElement('button');
        button_threadnext.id = `next_30`;
        button_threadnext.innerHTML = `次の30件を読込`;
        document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(button_threadnext);

        let button_threadnextall = document.createElement('button');
        button_threadnextall.id = `next_all`;
        button_threadnextall.innerHTML = `最新のレスまで取得`;
        document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(button_threadnextall);



        document.getElementById("next_30").onclick = next_30load;
    }
}

function refresh_resNo() {
    if (document.getElementsByClassName("st-bbs_resNo")) {
        //ページ最初と最後のレス番号取得
        start_res = Number(document.getElementsByClassName("st-bbs_resNo")[0].innerHTML);
        end_res = Number(document.getElementsByClassName("st-bbs_resNo")[document.getElementsByClassName("st-bbs_resNo").length - 1].innerHTML)
        DebugPrint(start_res + "～" + end_res);
    }
}

function next_30load() {

    let kijiURL = kiji_URL_get();
    let DL_URL = kijiURL + "/" + Number(end_res + 1) + "-"
    DebugPrint(DL_URL);

    if (end_res % 30 == 0) {
        //https://www.codit.work/notes/ld2h3c2k1coufqauzydl/ を参考にした
        const result = fetch(DL_URL, {
            method: "GET"
        }).then(function(response) {
            return response.text();
        }).then(function(data) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, "text/html");

            //中身取得
            let res_head = doc.getElementsByClassName("st-bbs_reshead");
            let res_body = doc.getElementsByClassName("st-bbs_resbody");
            let res_num = doc.getElementsByClassName("st-bbs_resbody").length;

            //htmlに追加
            for (let i = 0; i < res_num; i++) {
                let add_element = createElementFromHTML(res_head[i].outerHTML);
                document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(add_element)

                add_element = createElementFromHTML(res_body[i].outerHTML);
                document.getElementsByClassName("st-bbs_reshead")[document.getElementsByClassName("st-bbs_reshead").length - 1].after(add_element)
            }

            //番号更新
            refresh_resNo();
        });
    }




}



//https://qiita.com/seijikohara/items/911f886d8eb79862870b
//ぶちこんだHTMLをelementにして返す
function createElementFromHTML(html) {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = html;
    return tempEl.firstElementChild;
}

//元記事URL取得
function kiji_URL_get() {
    let href = document.getElementsByClassName("st-pg_navi")[0].href;
    href = href.replace("https://dic.nicovideo.jp/a/", "https://dic.nicovideo.jp/b/a/")
    return href;
} //コンテンツの取得
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
            try {
                let chunk_read_time = Date.now();
                let chunk_read_before = 0;
                let downspeed = 0;
                reader.read()
                    .then(function processResult(result) {
                        // done が true なら最後の chunk
                        if (result.done) {
                            DebugPrint("DL end");
                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").download = video_name;
                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = video_name + " をダウンロード";

                            return;
                        }

                        // chunk の長さの蓄積を total で割れば進捗が分かる

                        chunk += result.value.length;
                        /* 
                                                                let downfilesize = `${(chunk/1024/1024).toFixed(1)} MB`
                                                                if (Date.now() - chunk_read_time > 1000) {
                                                                    downspeed = ((chunk - chunk_read_before) / 1024 / 1024) / ((Date.now() - chunk_read_time) / 1000) * 8;
                                                                    downspeed = downspeed.toFixed(1);
                                                                    chunk_read_before = chunk;
                                                                    chunk_read_time = Date.now();
                                                                }
                        */

                        let downtext = `処理中：${Math.round(chunk/total * 100)} %`
                        document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = downtext;

                        // 再帰する
                        return reader.read().then(processResult);
                    });
            } catch (error) {
                console.log(error)
            }

            //重要
            //return response.blob()
            return response.blob();
        })
        .then(blob => {
            DebugPrint("blob url a-href set");
            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").href = window.URL.createObjectURL(blob);

            //名前を指定

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