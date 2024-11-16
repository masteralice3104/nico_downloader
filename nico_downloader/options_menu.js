//非保存フラグ
let save_flag = true;

//ロード時
window.onload = function () {
    newload();
    Options_onload();
    SoftVersionWrite();

    //10ミリ秒ごとの処理を設定
    const intervalId = setInterval(() => {
        if (save_flag == true) {
            Options_view_select("video_downloading");
            Options_view_input("video_pattern");
            Options_view_select("video_autosave");
            Options_view_select("video_hlssave");
            Options_view_select("debug");
            Options_view_select("language_setting");
            Options_view_select("downFile_setting");
        }
        save_flag = false;
    }, 10);
}

function Options_view_select(name) {
    let name_func = name;
    
    chrome.storage.local.get(name_func, function (result) {
        // chrome.storage.local から name_func に対応する値を取得
        const storedValue = result[name_func];

        // `optionValue` に取得した値かデフォルト値を設定
        const optionValue = storedValue !== undefined ? storedValue : "0";

        const selectElement = document.getElementById(name_func);
        if (selectElement) {
            // `optionValue`が存在するか確認して`value`を設定
            selectElement.value = optionValue;
            localStorage.setItem(name_func, optionValue);

            // 表示書き換え
            const optionsArray = Array.from(selectElement.options); // optionsを配列として取得
            const selectedOption = optionsArray.find(option => option.value === optionValue);

            if (selectedOption) {
                const nowtext = "現在の設定：" + selectedOption.innerText;
                const rewrite = name_func + "_now_setting";

                const displayElement = document.getElementById(rewrite);
                if (displayElement) {
                    displayElement.innerText = nowtext;
                } else {
                    console.error(`Display element with id '${rewrite}' not found.`);
                }
            } else {
                console.error(`Option with value '${optionValue}' not found in select element.`);
            }
        } else {
            console.error(`Select element with id '${name_func}' not found.`);
        }
    });
}


function Options_view_input(name) {
    name_func = name;
    chrome.storage.local.get(name_func, function (value) {
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
    Option_setWritingByID("video_downloading");
    Option_setWritingByID("video_pattern");
    Option_setWritingByID("debug");
    Option_setWritingByID("video_autosave");
    Option_setWritingByID("video_hlssave"); //
    Option_setWritingByID("language_setting");
    Option_setWritingByID("downFile_setting");


    //保存日時
    let now = new Date();
    document.getElementById("saved").innerText = "保存日時：" + now.toLocaleString();

    //非保存フラグ
    save_flag = true;

}

function Option_setWritingByID(ID) {
    Option_setWriting(ID, document.getElementById(ID).value);
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

function SystemMessageOpenButton() {
    document.getElementById('system_message_open').style = 'display: block';
}

//システムメッセージを開きダウンロードする方法
document.getElementById("system_message_open_button").onclick = SystemMessageOpenButton;

//保存ボタンクリック時
document.getElementById("save_button").onclick = Options_Save;
document.getElementById("default_val").onclick = Default_click;