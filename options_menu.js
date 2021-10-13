//非保存フラグ
let save_flag = true;

//ロード時
window.onload = function() {
    newload();
    Options_onload();
    SoftVersionWrite();

    //10ミリ秒ごとの処理
    const intervalId = setInterval(() => {
        if (save_flag == true) {
            Options_view_select("video_downloading");
            Options_view_input("video_pattern");
        }
        save_flag = false;
    }, 10);
}

function Options_view_select(name) {
    let name_func = name;
    chrome.storage.local.get(name_func, function(value) {
        //chrome.storage.localから読み出し

        document.getElementById(name_func).value = setOption(name_func);
        localStorage.setItem(name_func, setOption(name_func));

        //表示書き換え
        let nowtext = "現在の設定：" + document.getElementById(name_func).options[setOption(name_func)].innerText;
        let rewrite = name_func + "_now_setting";
        document.getElementById(rewrite).innerText = nowtext;
    })
}

function Options_view_input(name) {
    name_func = name;
    chrome.storage.local.get(name_func, function(value) {
        //chrome.storage.localから読み出し
        document.getElementById(name_func).value = setOption(name_func);
        localStorage.setItem(name_func, setOption(name_func));

        //表示書き換え
        let nowtext = "現在の設定：" + setOption(name_func);
        document.getElementById(name_func + "_now_setting").innerText = nowtext;
    })
}

function Options_Save() {
    //オプション設定保存時

    //オプションの値を書き込み
    Option_setWriting("video_downloading", document.getElementById("video_downloading").value);
    Option_setWriting("video_pattern", document.getElementById("video_pattern").value);

    //保存日時
    let now = new Date();
    document.getElementById("saved").innerText = "保存日時：" + now.toLocaleString();

    //非保存フラグ
    save_flag = true;

}

function Default_click() {
    //デフォルト設定を入力
    document.getElementById("form").value = document.getElementById("form").reset();
}

function SoftVersion() {
    let manifest = chrome.runtime.getManifest();
    return manifest['version'];
}

function SoftVersionWrite() {
    let ver = SoftVersion();
    document.getElementById("version").innerText = `バージョン：` + ver;
}

//保存ボタンクリック時
document.getElementById("save_button").onclick = Options_Save;
document.getElementById("default_val").onclick = Default_click;