//残したい変数
let video_link_smid = "-1"; //-1はロードしてない


//ダウンロード関数

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
            //httpの場合
            if (document.querySelector("#MainVideoPlayer > video").getAttribute('src').match(/ht2/) != null) {
                //読み込み形跡を残す
                video_link_smid = video_sm;
                DebugPrint("smid上書き");
                //コンテンツの取得
                try {
                    DebugPrint("http DL start");


                    
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
                                            
                                            //注意書き追加
                                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML +="<br>今後HTTP方式は廃止されます。HLSモードでも保存ができるようオプションより設定を行ってください。"
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
                //hlsになっている場合
                DebugPrint("hls mode");
                const hlssavemode = setOption("video_hlssave");
                
                let add_error = "<p>ダウンロードするためにはシステムメッセージを開いてください</p>";
                if(hlssavemode=="0"){
                    add_error = "<p>◆◆◆◆nico downloaderの初期設定を行ってください◆◆◆◆</p><p><a href=\"chrome-extension://lljfnmdhmlcbccmnoefchidjmdbpojlm/options.html\">設定画面を開く</a></p>";
                }else if(hlssavemode=="1"){
                    add_error += "<p>動画画面上を右クリック→システムメッセージを開く で開けます</p>"
                }
                
                document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerHTML = add_error;

                if(document.getElementsByClassName('SystemMessageContainer-info').length == 0){
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
                
                for (let i = 0; i <document.getElementsByClassName('SystemMessageContainer-info').length; i++){
                    DebugPrint("masterURL"+i)
                    const message =document.getElementsByClassName('SystemMessageContainer-info')[i].innerText;
                    if(message.match(/(動画の読み込みを開始しました。).*/)){
                        DebugPrint("URL発見");
                        rawMessage = String(message)
                        tempURL = String(rawMessage.replace('動画の読み込みを開始しました。（','').replace('）',''));
                        DebugPrint("masterURL:"+tempURL);
                    }

                    
                };
                if(tempURL==null)return false;
                if(tempURL=='')return false;
                const masterURL = tempURL;
                if(masterURL==null)return false;

                DebugPrint("masterURL:"+masterURL);


                const xhr_master = new XMLHttpRequest();//XMLHttpRequest
                let masterRawMessage,playlistURL

                xhr_master.open('GET', masterURL);      //GETを作る
                xhr_master.send();                      //リクエストを投げる
                xhr_master.onreadystatechange=function(){
                    if(xhr_master.readyState===4&&xhr_master.status===200){
                        //取得完了したらここに飛ぶ
                        masterRawMessage = this.responseText;
                                                
                        //文字列を行ごとに分解する
                        let masterURLGyou = masterRawMessage.split(/\r\n|\n/);
                        //3行目は常に高画質っぽいのでそれだけ抽出
                        playlistURL = String(masterURL.match(/(https.).*(master.m3u8?.)/g)).replace('master.m3u8?','') + masterURLGyou[2];
                        DebugPrint("playlistURL: " + playlistURL);
                        
                        const xhr_playlist = new XMLHttpRequest();
                        xhr_playlist.open('GET',playlistURL);
                        xhr_playlist.send();
                        xhr_playlist.onreadystatechange =function(){
                            //取得完了したらここに飛ぶ
                            let playlistRawMessage = this.responseText;
                            


                            //https://stabucky.com/wp/archives/10419
                            playlistRawMessage=playlistRawMessage.trim();
                            playlistRawMessage=playlistRawMessage.replace(/(\r?\n)+/g,"\n");

                            const playlistMessage = playlistRawMessage.split(/\r\n|\n/);
                            DebugPrint(playlistMessage);


                            // playlistのアイテムを全部読み込む
                            /*
                            //読み込んだTSファイルの置き場所配列
                            let TSURLs = [];
                                
                            
                            playlistMessage.forEach(function(element){
                                if(element.match(/#/)){
                                    //#が入ってる行は飛ばす
                                }else{
                                    //TSURLの取得
                                        const TSURL = String(playlistURL.match(/(https.).*(playlist.m3u8?.)/g)).replace('playlist.m3u8?','')+element;
                                        TSURLs.push(TSURL);
                                }
                            })
                            
                            DebugPrint("TSURLs.length:"+TSURLs.length);
                            

                            let command = "";

                            for (let i=0; i<TSURLs.length; i++) {
                                if(i==0){
                                    command = command +" -i "+ TSURLs[i];
                                }else{
                                    command = command +" -i "+ TSURLs[i];
                                }
                            }
                            
                            */
                            const apptext = video_name + " をダウンロード(にこだうんろーだーを起動)";
                            //const URItext = "nicodown:"+command;
                            //const URItext = "ffmpeg -protocol_whitelist file,http,https,tcp,tls,crypto "+command+" -filter_complex \"concat=n="+ TSURLs.length +":v=1:a=1\"  output.mp4"
                            //const URItext = "-protocol_whitelist file,http,https,tcp,tls,crypto -i "+ playlistURL +" -c copy "+ video_name;
                            let URItext = video_name+"をダウンロード(ffmpegを開きます)";
                            if(hlssavemode=="1"){
                                URItext =URItext+ "\nここをクリック後「Windowsコマンドプロセッサを開く」を押してダウンロードできます";
                            }

                            const URItext2 = playlistURL +"(((-c(((copy"+"((("+ video_name;

                            //document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerText = apptext;
                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").innerText = URItext;
                            document.querySelector("#js-app > div > div.WatchAppContainer-main > div.HeaderContainer > div.HeaderContainer-topArea > div.HeaderContainer-topAreaLeft > p > a").href = "nicodown:"+URItext2;

                                        
                            //読み込み形跡を残す
                            video_link_smid = video_sm;
                            DebugPrint("smid上書き");

                            
                            if(setOption("video_autosave") == "1"){
                                //videoDL(video_name,window.URL.createObjectURL(blob));
                                DebugPrint("video_autosave run");
                                setTimeout(function(){document.querySelector("#DLlink > a").click();}, 1000); 
                                
                            }
                        }
                    

                }
                }
                

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


async function Downloadblob(url){

        //TSの取得
        await fetch(url, { method: 'GET' })
        .then( response => {
        return response.blob();
        })
        .then( blob => {
            return blob;
        })
        await new Promise(resolve => { setTimeout(resolve, 1000); });
}
