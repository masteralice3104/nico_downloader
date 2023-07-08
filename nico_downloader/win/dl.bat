set myvar=%1
set myvar=%myvar:nicodown:=%
FOR /F "TOKENS=1,2,*" %%I IN ('REG QUERY "HKEY_CLASSES_ROOT\nicodown" /v "Folder"') DO IF "%%I"=="Folder" SET SAVEDIR=%%K
FOR /F "TOKENS=1,2,*" %%I IN ('REG QUERY "HKEY_CLASSES_ROOT\nicodown" /v "ffmpeg"') DO IF "%%I"=="ffmpeg" SET FFMPEGPATH=%%K
set myvar=%myvar:(((= %
set myvar=%myvar:"=%"
cd /d %SAVEDIR% 
call %FFMPEGPATH% -protocol_whitelist file,http,https,tcp,tls,crypto -i %myvar%
pause