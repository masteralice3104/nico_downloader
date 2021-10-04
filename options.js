/*
LocalStorageで保存される値について

キー                 デフォルト値               内容
"newloading"               undefined           一度でも設定したことがあるか？
"video_downloading"     0                   デフォルト保存名設定
"video_pattern"         sm[0-9]{1,}         反応するURL設定名
 */


function Option_setWriting(name, value) {
    //ローカルストレージに書き込みを行います
    localStorage.setItem(name, value);
    chrome.storage.local.set({
        [name]: value
    }, function() {
        //chrome.storage.localに保存
    })
    return true;
}

function Option_setLoading(name) {
    //ローカルストレージより読み込みを行います
    //return localStorage.getItem(name);//これだとだめ

    try {
        chrome.storage.local.get(name, function(value) {
                //chrome.storage.localから読み出し
                localStorage.setItem(name, value[name]);
            })
            //return return_val;
        return localStorage.getItem(name);

    } catch (error) {
        return 0;
    }

}

//オプション値読み込み用関数
function setOption(name) {
    try {
        if (typeof Option_setLoading(name) === "undefined") {
            return 0;
        } else {

            return Option_setLoading(name);
        }

    } catch (error) {
        return 0;
    }
}

function newload() {
    let newloading = 0;

    if (isNullOrUndefined(Option_setLoading("newloading"))) {
        Option_setWriting("newloading", "1");
        Option_setWriting("video_downloading", "0");
        Option_setWriting("video_pattern", "sm[0-9]{1,}");
    }
    newloading = Option_setLoading("newloading")
}

function Options_onload() {
    //オプション設定ページ表示時

    //オプションの値を読み込み
    try {
        LoadOption("video_downloading");
        LoadOption("video_pattern");
    } catch (error) {
        Default_click();
        Options_Save();
    }

}

function LoadOption(name) {
    console.log(setOption(name))
    if (typeof setOption(name) === "undefined") {

    } else {
        document.getElementById(name).value = setOption(name);
    }
}

function isNullOrUndefined(o) {
    return (o === undefined || o === null);
}