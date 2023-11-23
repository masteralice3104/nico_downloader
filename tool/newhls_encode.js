//ffmpegだとこんな感じ
//ffmpeg -allowed_extensions ALL -protocol_whitelist file,http,https,tcp,tls,crypto -i video-h264-720p.m3u8  -c copy "output.ts"
//ローカルで変換するためにvideo-h264-XXXp.m3u8のファイルの中身を書き換える
//https://asset.domand.nicovideo.jp/XXXXXXXXXXXXXXXXXX/video/1/video-h264-720p/を削除
//https://delivery.domand.nicovideo.jp/hls/XXXXXXXXXXXXXXXXX/keys/を削除
//あとは全部ローカルに保存して結合すると映像のみができあがる