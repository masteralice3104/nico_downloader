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
        if (end_res % 30 == 0) {
            document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(button_threadnext);
            document.getElementById("next_30").onclick = next_30load;
        }

        let button_threadprev = document.createElement('button');
        button_threadprev.id = `prev_30`;
        button_threadprev.innerHTML = `前の30件を読込`;
        if (end_res % 30 == 0) {
            document.getElementsByClassName("st-bbs_reshead")[0].before(button_threadprev);
            document.getElementById("prev_30").onclick = prev_30load;
        }



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


function prev_30load() {

    document.getElementById("prev_30").setAttribute("disabled", true);


    let kijiURL = kiji_URL_get();
    let DL_URL = kijiURL + "/" + Number(start_res - 30) + "-"
    DebugPrint(DL_URL);

    if (start_res != 1) {
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
            //ここがちょっと違う
            for (let i = res_num - 1; i >= 0; i--) {
                let add_element = createElementFromHTML(res_head[i].outerHTML);
                document.getElementsByClassName("st-bbs_reshead")[0].before(add_element)

                add_element = createElementFromHTML(res_body[i].outerHTML);
                document.getElementsByClassName("st-bbs_reshead")[0].after(add_element)
            }

            //番号更新
            refresh_resNo();

            if (start_res != 1) {} else {
                document.getElementById("prev_30").remove();

                let last_element = document.createElement('p');
                last_element.innerText = "最初のレスまで読み込みました";
                document.getElementsByClassName("st-bbs_reshead")[0].before(last_element);
            }
            document.getElementById("prev_30").removeAttribute("disabled");
        });

    }
}

function next_30load() {

    document.getElementById("next_30").setAttribute("disabled", true);

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

            if (end_res % 30 == 0) {} else {
                document.getElementById("next_30").remove();

                let last_element = document.createElement('p');
                last_element.innerText = "最新のレスまで読み込みました";
                document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(last_element);

            }
            document.getElementById("next_30").removeAttribute("disabled");
        });

    }
}

//https://qiita.com/seijikohara/items/911f886d8eb79862870b
//ぶちこんだHTMLをelementにして返す
function createElementFromHTML(html) {
    DebugPrint("createElementFromHTML");
    const tempEl = document.createElement('div');
    tempEl.innerHTML = html;
    return tempEl.firstElementChild;
}

//元記事URL取得
function kiji_URL_get() {
    DebugPrint("kiji_URL_get")
    let href = document.getElementsByClassName("st-pg_navi")[0].href;
    href = href.replace("https://dic.nicovideo.jp/a/", "https://dic.nicovideo.jp/b/a/")
    return href;
}