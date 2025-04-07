class NicovideoM3u8 {
    ////////////////////////////////////////////////////////////////
    /**
     * URLリストからTSURLsを作成する
     * @param {NicoDownloaderClass} NicoDownloader 
     * @returns {Array} TSURLs
     */
    ////////////////////////////////////////////////////////////////
    MakeURLListToTSURLs(NicoDownloader) {
        return this._MakeURLList(NicoDownloader.M3u8.AudioBody_json, NicoDownloader.M3u8.VideoBody_json);
    }

    ////////////////////////////////////////////////////////////////
    /**
     * M3u8からURLリストを作成する
     * @param {Object} audio_m3u8_body_json JSON Object形式のm3u8データ
     * @param {Object} video_m3u8_body_json JSON Object形式のm3u8データ
     * @returns {Array} TSURLs
     */
    ////////////////////////////////////////////////////////////////
    _MakeURLList(audio_m3u8_body_json, video_m3u8_body_json) {
        let TSURLs = [];
        //URIキーをすべてTSURLsにいれる
        TSURLs.push(audio_m3u8_body_json['EXT-X-MAP'][0]['URI']);
        TSURLs.push(audio_m3u8_body_json['EXT-X-KEY'][0]['URI']);
        for (let i = 0; i < audio_m3u8_body_json['EXTINF'].length; i++) {
            TSURLs.push(audio_m3u8_body_json['EXTINF'][i]['URI']);
        }
        TSURLs.push(video_m3u8_body_json['EXT-X-MAP'][0]['URI']);
        TSURLs.push(video_m3u8_body_json['EXT-X-KEY'][0]['URI']);
        for (let i = 0; i < video_m3u8_body_json['EXTINF'].length; i++) {
            TSURLs.push(video_m3u8_body_json['EXTINF'][i]['URI']);
        }
        return TSURLs;
    }


    /**
     * 
     * @param {NicoDownloaderClass} NicoDownloader 
     * @returns {Array} TSFilenames
     */
    MakeTSFileNameListtoArray(NicoDownloader) {
        return this._makeTSFilenames(NicoDownloader.TSURLs);
    }

    _makeTSFilenames(TSURLs) {

        let TSFilenames = [];
        //TSURLsのファイル名をすべて出す
        for (let i = 0; i < TSURLs.length; i++) {
            const fname = this.MakeTSFilename(TSURLs[i]);
            TSFilenames.push(fname);
        }
        return TSFilenames;
    }


    /**
     * 
     * @param {String} url 
     * @returns {String}
     */
    ReplaceURLToM3u8s(url) {
        let temp = url.replace(/https:\/\/[\w\.\/-]+[\/]{1}/g, '');
        temp = temp.replace(/[?][\w=\-&_~]+/g, '');

        return temp;
    }


    /**
     * 
     * @param {String} URL 
     * @returns {String}
     */
    MakeTSFilename(URL) {

        let ret = '';
        DebugPrint('URL:' + URL);
        if (URL.startsWith('https')) {
            ret = URL.match(/\/[\w-.]+\?/).toString().replace('/', '').replace('?', '');
        } else {
            ret = URL.match(/[\w-.]+\?/).toString().replace('/', '').replace('?', '');
        }
        DebugPrint('makeFilename: ' + ret + ' ' + URL);
        return ret;
    }
}