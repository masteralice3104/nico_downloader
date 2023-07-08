
@echo off

echo ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
echo 　　　　　
echo 　nico downloader セットアップ　v2.0.0
echo 　　　　　
echo ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝


whoami /priv | find "SeDebugPrivilege" > nul
if %errorlevel% neq 0 (
    @powershell start-process "%~0" -verb runas
    echo 管理者権限で実行し直します
    exit
)


@REM ファイルが有る場所にカレントディレクトリを移動
cd /d %~dp0

@REM binフォルダ作成
mkdir bin
echo binフォルダを作成しました

@REM ffmpegダウンロード
echo ffmpegをダウンロードします……
call powershell -command "Start-BitsTransfer -Source https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip %CD%\temp.zip"


@REM ZIP解凍
echo ffmpegを解凍します……
call powershell -command "Expand-Archive -Force temp.zip ffmpeg"


@REM ffmpeg.exeの移動
echo ffmpegをコピーします……
copy ffmpeg\ffmpeg-6.0-essentials_build\bin\ffmpeg.exe bin\ffmpeg.exe

@REM 後処理
echo 後処理します……
rd /s /q ffmpeg
rd /s /q %CD%\temp.zip

@REM dl.batを持ってくる
call powershell -command "Start-BitsTransfer -Source https://raw.githubusercontent.com/masteralice3104/nico_downloader/main/nico_downloader/win/dl.bat %CD%\bin\dl.bat"


@REM レジストリ登録
reg add "HKEY_CLASSES_ROOT\nicodown" /v "URL Protocol" /t REG_SZ /d "nicodown:" /f 
reg add "HKEY_CLASSES_ROOT\nicodown" /v "ffmpeg" /t REG_SZ /d %~dp0\bin\ffmpeg.exe /f 
reg add "HKEY_CLASSES_ROOT\nicodown" /v "Folder" /t REG_SZ /d %~dp0 /f 
reg add "HKEY_CLASSES_ROOT\nicodown\shell\open\command" /ve /t REG_SZ /d "%~dp0\bin\dl.bat \"%%1\"" /f

echo レジストリ書込処理を終了しました

echo これでnico downloaderを使用可能になりました
pause