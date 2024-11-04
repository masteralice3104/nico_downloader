// Description: ニコニコ動画のjsonを取得し中身のデータを抽出する関数をまとめたクラスです。
//使い方
/*
const nicovideo = new Nicovideo();
nicovideo.SetAllFromVideoSm('sm9').then(() => {
    console.log(nicovideo.view_count);
    console.log(nicovideo.comment_count);
    console.log(nicovideo.mylist_count);
    console.log(nicovideo.like_count);
    console.log(nicovideo.title);
});
*/


// 残さねばならない変数
let Nicovideo______Ndl______DataLoadedSMID = '-1'; // データを取得した動画のsmid
let Nicovideo______Ndl______DataLoadedJSON = {}; // JSONデータ   

class NicovideoClass {
    constructor() {
        //動かさない変数
        this.NicoVideoWatchURL = 'https://www.nicovideo.jp/watch/'; // 動画のURL

        this.video_sm = ''; // 動画id
        this.json = {}; // json
        this.view_count = 0; // 再生数
        this.comment_count = 0; // コメント数
        this.mylist_count = 0; // マイリスト数
        this.like_count = 0; // いいね数
        this.video_title = ''; // タイトル
        this.video_owner = ''; // 投稿ユーザー
        this.video_registeredAt = ''; // 登録日時
        this.video_description = ''; // 説明文
        this.video_tags = []; // タグ
        this.video_genre = ''; // ジャンル
        this.video_series = ''; // シリーズ

        //後で自ら設定しないといけない変数
        this.video_name = "";// 動画の保存名
    }

    //URLがマッチするか確認
    CheckNicovideoWatchURL() {
        if (location.href.match(/https:\/\/www.nicovideo.jp\/watch\//)) {
            DebugPrint("location.href.match true");
            return true;
        }
        DebugPrint("location.href.match false");
        return false;
    }


    //jsonをダウンロード後jsonをセットし、その後各変数をセット
    async SetAllFromVideoSm(video_sm) {
        this.video_sm = video_sm;

        if (video_sm == Nicovideo______Ndl______DataLoadedSMID) {
            return new Promise((resolve, reject) => {
                DebugPrint("NicovideoClass: SetAllFromVideoSm: JSONLoaded");
                this.SetJson(Nicovideo______Ndl______DataLoadedJSON);
                this.SetAll();
                this.SetLoadedSMID();
                resolve();
            })
        }
        return this.DownloadJson(video_sm)
            .then(json => {
                if (json == false) return false;// jsonが取得できなかったら終了

                // jsonを取得できたら各変数をセット
                DebugPrint("NicovideoClass: SetAllFromVideoSm: DownloadJSON");
                DebugPrint(json);
                this.SetJson(json);
                this.SetAll();
                this.SetLoadedSMID();
            });
    }

    //jsonをダウンロード
    async DownloadJson(video_sm = this.video_sm) {
        if (video_sm == '') return false;
        const url = this.NicoVideoWatchURL + video_sm + '?responseType=json';
        return fetch(url).then(response => response.json());
    }
    //jsonをセット
    SetJson(json) {
        this.json = json;
        Nicovideo______Ndl______DataLoadedJSON = json;
    }

    //読み込み済みをセット
    SetLoadedSMID(video_sm = this.video_sm) {
        Nicovideo______Ndl______DataLoadedSMID = video_sm;
    }
    //constructorの各変数をセット
    SetAll(json = this.json) {
        this.view_count = this.JsonToViewCount(json);
        this.comment_count = this.JsonToCommentCount(json);
        this.mylist_count = this.JsonToMylistCount(json);
        this.like_count = this.JsonToLikeCount(json);
        this.video_title = this.JsonToTitle(json);
        this.video_owner = this.JsonToUser(json);
        this.video_registeredAt = this.JsonToRegisteredAt(json);
        this.video_description = this.JsonToDescription(json);
        this.video_tags = this.JsonToTags(json);
        this.video_genre = this.JsonToGenre(json);
        this.video_series = this.JsonToSeries(json);
    }


    //URLから動画idを取得
    VideoSmGet(match_sm) {
        let video_sm = '';
        if (location.href.match(match_sm)) {
            video_sm = location.href.match(match_sm).toString();
            DebugPrint("location.href.match match_sm true")
            DebugPrint("match_sm : " + match_sm)
        } else {
            DebugPrint("location.href.match match_sm false")
            DebugPrint("match_sm : " + match_sm)
            DebugPrint("setOption(\"video_pattern\") : " + setOption("video_pattern"))
        }
        return video_sm;
    }

    //jsonより再生数を取得
    JsonToViewCount(json = this.json) {
        if (json.data.response.video.count.view == null) return 0;
        return json.data.response.video.count.view;// 再生数
    }
    //jsonよりコメント数を取得
    JsonToCommentCount(json = this.json) {
        if (json.data.response.video.count.comment == null) return 0;
        return json.data.response.video.count.comment;// コメント数
    }
    //jsonよりマイリスト数を取得
    JsonToMylistCount(json = this.json) {
        if (json.data.response.video.count.mylist == null) return 0;
        return json.data.response.video.count.mylist;// マイリスト数
    }
    //jsonよりいいね数を取得
    JsonToLikeCount(json = this.json) {
        if (json.data.response.video.count.like == null) return 0;
        return json.data.response.video.count.like; // いいね数
    }
    //jsonよりタイトルを取得
    JsonToTitle(json = this.json) {
        if (json.data.response.video.title == null) return "";
        return json.data.response.video.title; // タイトル
    }
    //jsonよりidを取得
    JsonToId(json = this.json) {
        if (json.data.response.video.id == null) return "";
        return json.data.response.video.id; // id
    }
    //jsonより登録日時を取得
    JsonToRegisteredAt(json = this.json) {
        return json.data.response.video.registeredAt; // 登録日時
    }
    //jsonより投稿ユーザー名を取得
    JsonToUser(json = this.json) {
        if (json.data.response.owner == null) return "";
        return json.data.response.owner.nickname; // 投稿ユーザー名
    }
    //jsonより説明文を取得
    JsonToDescription(json = this.json) {
        if (json.data.response.video.description == null) return "";
        return json.data.response.video.description; // 説明文
    }

    //jsonよりタグを取得
    JsonToTags(json = this.json) {
        let tags = [];
        if (!json.data.response.tag.items[0]) return [];
        for (let i = 0; i < json.data.response.tag.items[i].length; i++) {
            tags.push(json.data.response.tag.items[i].name);
        }
        return tags;
    }

    //jsonよりジャンルを取得
    JsonToGenre(json = this.json) {
        if (json.data.response.genre == null) return "";
        return json.data.response.genre.label; // ジャンル
    }

    //jsonよりシリーズを取得
    JsonToSeries(json = this.json) {
        if (json.data.response.series == null) return "";
        return json.data.response.series.title; // シリーズ
    }

    //変数の中身が適正なデータかチェックする関数
    //video_smが空文字ならfalseを返す
    Checkvideo_sm() {
        if (this.video_sm == '') return false;
        true;
    }
    Checkvideo_title() {
        if (this.video_title == '') return false;
        true;
    }



}