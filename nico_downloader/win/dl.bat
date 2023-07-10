@echo off
echo =======================================
echo =　　　　
echo =　　dl.bat v2.0.0.1用
echo =　　　　
echo =======================================
set myvar=%1
FOR /F "TOKENS=1,2,*" %%I IN ('REG QUERY "HKEY_CLASSES_ROOT\nicodown" /v "Folder"') DO IF "%%I"=="Folder" SET SAVEDIR=%%K
FOR /F "TOKENS=1,2,*" %%I IN ('REG QUERY "HKEY_CLASSES_ROOT\nicodown" /v "ffmpeg"') DO IF "%%I"=="ffmpeg" SET FFMPEGPATH=%%K
set myvar=%myvar:nicodown:=%
set myvar=%myvar:"=%
echo "%myvar%" | find "https" > nul
IF %errorlevel%==0 (
	ECHO nico downloaderの拡張機能をv2.0.0.1以降にアップデートすることを推奨します。
	timeout /nobreak 5
	GOTO SYORI
) else (
	for /f %%i in ('powershell -command "[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('%myvar%'))"') do set myvar=%%i
	goto SYORI
)

:SYORI
set myvar=%myvar:(((= %
set myvar=%myvar:?=%
set myvar=%myvar:m3u8ht=m3u8?ht%
cd /d %SAVEDIR% 
call %FFMPEGPATH% -readrate 4 -progress - -protocol_whitelist file,http,https,tcp,tls,crypto -i %myvar%

:END

