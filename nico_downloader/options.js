/*
LocalStorageで保存される値について

キー                 デフォルト値               内容
"newloading"            undefined           一度でも設定したことがあるか？
"video_downloading"     0                   デフォルト保存名設定
"video_pattern"         sm[0-9]{1,}         反応するURL設定名
"video_autosave"        0                   1だと自動で保存処理が走ります
"video_hlssave"         0                   0だと初期設定、1だと低速、2だと高速モード
"debug"                 0                   1だとデバッグ出力あり
"language_setting"      ja                  言語設定
"downFile_setting"      mp4                 保存ファイル形式(採用)
 */

function Option_setWriting(name, value) {
    //ローカルストレージに書き込みを行います
    localStorage.setItem(name, value);
    chrome.storage.local.set({
        [name]: value
    }, function () {
        //chrome.storage.localに保存
    })
    return true;
}

function Option_setLoading(name) {
    return new Promise((resolve, reject) => {
        try {
            // chrome.storage.localから非同期で値を取得
            chrome.storage.local.get(name, function(value) {
                // エラーチェック
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                // localStorageに保存
                if (value && value.hasOwnProperty(name)) {
                    localStorage.setItem(name, value[name]);
                    resolve(value[name]); // 必要な値をresolve
                } else {
                    resolve(0); // 値がなければ0を返す
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

//オプション値読み込み用関数
async function setOption(name) {
    try {
        const value = await Option_setLoading(name);  // Option_setLoadingの結果を待機
        console.log(name + ":" + value);  // 読み出した値をコンソールに表示

        if (value === undefined) {
            console.log(0);  // undefined なら 0
        } else {
            console.log(value);  // 正常な値をそのまま返す
        }
        return value; // valueを返すように変更
    } catch (error) {
        console.error("SetOption:", error);  // エラーハンドリング
        return 0; // エラー発生時は0を返す
    }
}

async function newload() {
    let newloading = 0;

    //default値をここへ
    try {
        const value = await Option_setLoading("newloading");
        if (isNullOrUndefined(value)) {
            defalt_dataWrite();
        }
        newloading = value;
    } catch (error) {
        console.error("newload:", error);
    }
}

function defalt_dataWrite() {
    Option_setWriting("newloading", "1");
    Option_setWriting("video_downloading", "0");
    Option_setWriting("video_pattern", "sm[0-9]{1,}");
    Option_setWriting("video_autosave", "0");
    Option_setWriting("debug", "0");
    Option_setWriting("video_hlssave", "0");
    Option_setWriting("language_setting", "ja");
    Option_setWriting("downFile_setting", "mp4"); //mp4として
    Options_Save();
}

async function Options_onload() {
    //オプション設定ページ表示時

    //オプションの値を読み込み
    try {
        await LoadOption("video_downloading");
        await LoadOption("video_pattern");
        await LoadOption("video_autosave");
        await LoadOption("video_hlssave");
        await LoadOption("debug");
        await LoadOption("language_setting");
        await LoadOption("downFile_setting");
    } catch (error) {
        Default_click();
        Options_Save();
    }
}

async function LoadOption(name) {
    try {
        const value = await setOption(name);
        if (value !== undefined) {
            document.getElementById(name).value = value;
        }
    } catch (error) {
        console.error("LoadOption:", error);
    }
}

function isNullOrUndefined(o) {
    return (o === undefined || o === null);
}

async function DebugPrint(text) {
    await setOption("debug").then(value => {
        if (value === "1") {
            console.log("debug:" + text);
        }
    }).catch(error => {
        console.error("DebugPrint:", error);
    });
}
