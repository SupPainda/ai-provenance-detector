@echo off
REM Wrapper to run extract-metadata.js with local ExifTool support.
setlocal
set "SCRIPT_DIR=%~dp0"
set "PATH=%SCRIPT_DIR%;%PATH%"
node "%SCRIPT_DIR%extract-metadata.js" %*
endlocal
