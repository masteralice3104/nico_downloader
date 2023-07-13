let start_res = 0;
let end_res = 0;



//ページ表示時発火処理
window.onload = function () {
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
        if (start_res != 0) {
            document.getElementsByClassName("st-bbs_reshead")[0].before(button_threadprev);
            document.getElementById("prev_30").onclick = prev_30load;
        }

        resnumhead_plus();

        pinres();


    }
    if (thisURL.match("https://dic.nicovideo.jp/a/.")) {
        pinres();
    }

}

function pinres() {

    let button_threadpin1 = document.createElement('button');
    button_threadpin1.id = `threadpin_move_button1`;
    button_threadpin1.innerText = `最後に記録したレスに移動`;

    let button_threadpin2 = document.createElement('button');
    button_threadpin2.id = `threadpin_move_button2`;
    button_threadpin2.innerText = `最後に記録したレスに移動`;

    if (setOption(kiji_URL_get())) {
        document.getElementsByClassName("st-bbs_reshead")[0].before(button_threadpin1);
        document.getElementById("threadpin_move_button1").onclick = threadpin_move;
        document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(button_threadpin2);
        document.getElementById("threadpin_move_button2").onclick = threadpin_move2;
        DebugPrint("threadpin_move set")
    } else {

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
        }).then(function (response) {
            return response.text();
        }).then(function (data) {
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

            if (start_res != 1) { } else {
                document.getElementById("prev_30").remove();

                let last_element = document.createElement('p');
                last_element.innerText = "最初のレスまで読み込みました";
                document.getElementsByClassName("st-bbs_reshead")[0].before(last_element);
            }
            document.getElementById("prev_30").removeAttribute("disabled");
            resnumhead_plus();
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
        }).then(function (response) {
            return response.text();
        }).then(function (data) {
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



            if (end_res % 30 == 0) {
                document.getElementById("next_30").removeAttribute("disabled");
            } else {
                document.getElementById("next_30").remove();

                let last_element = document.createElement('p');
                last_element.innerText = "最新のレスまで読み込みました";
                document.getElementsByClassName("st-bbs_resbody")[document.getElementsByClassName("st-bbs_resbody").length - 1].after(last_element);

            }
            resnumhead_plus();
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
}


function resnumhead_plus() {
    DebugPrint("resnumhead_plus");
    for (let i = 0; i < document.getElementsByClassName("resnumhead").length; i++) {

        if (setOption(kiji_URL_get())) {
            if (setOption(kiji_URL_get()) === document.getElementsByClassName("resnumhead")[i].getAttribute("name")) {
                document.getElementsByClassName("resnumhead")[i].innerText = "■";
            } else {
                document.getElementsByClassName("resnumhead")[i].innerText = "□";
            }
        } else {
            document.getElementsByClassName("resnumhead")[i].innerText = "□";
        }
        document.getElementsByClassName("resnumhead")[i].href = "javascript:void(0);"
        document.getElementsByClassName("resnumhead")[i].onclick = pin_dome;
        document.getElementsByClassName("resnumhead")[i].id = document.getElementsByClassName("resnumhead")[i].getAttribute("name");

    }
}

function pin_dome(e) {
    let res_no = e.currentTarget.getAttribute("name");
    let kiji_URL = kiji_URL_get();
    DebugPrint("pin_dome : " + kiji_URL + " : " + res_no);



    //変更
    if (e.currentTarget.innerText === "■") {
        //ローカルストレージを0で上書き
        Option_setWriting(kiji_URL, "0");
        //e.currentTarget.innerText = "□";
    } else {
        //ローカルストレージに書き込み
        Option_setWriting(kiji_URL, res_no);
        //e.currentTarget.innerText = "■";
    }
    resnumhead_plus();

}

function threadpin_move2() {
    threadpin_move()
}

function threadpin_move() {

    DebugPrint("threadpin_move")
    let kiji_URL = kiji_URL_get();
    let id = Number(setOption(kiji_URL));
    if (id === 0) {
        let defaultURL = kiji_URL + "/1-";
        location.href = defaultURL;
    }

    if (start_res <= id && end_res >= id) {
        location.hash = "";
        location.hash = id.toString();
        return;
    }


    let page = Math.floor(id / 30) * 30 + 1;
    let pageURL = kiji_URL + "/" + page;

    if (start_res > id | start_res === 0) {
        setTimeout(threadpin_move, 200);
        location.href = pageURL + "#" + id.toString();



        // document.getElementById("prev_30").click();


    }
    if (end_res < id | end_res === 0) {
        //  document.getElementById("next_30").click();
        setTimeout(threadpin_move, 200);
        location.href = pageURL + "#" + id.toString();


    }

}