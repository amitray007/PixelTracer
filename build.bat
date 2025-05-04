@echo off
setlocal EnableDelayedExpansion

echo PixelTracer - Building production package
echo ===========================================

:: Set version from manifest.json
echo Extracting version from manifest.json...

:: Try using PowerShell to extract version (more reliable than jq)
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content manifest.json -Raw | ConvertFrom-Json).version"') do (
    set VERSION=%%a
)

:: If PowerShell method failed, try a simpler approach with findstr
if "%VERSION%"=="" (
    echo PowerShell extraction failed, trying alternate method...
    for /f "tokens=2 delims=:, " %%a in ('findstr "\"version\"" manifest.json') do (
        set VERSION=%%a
        set VERSION=!VERSION:"=!
    )
)

:: Last resort - use date as version
if "%VERSION%"=="" (
    echo Warning: Could not extract version from manifest.json.
    echo Using date-based version instead.
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set VERSION=%%c.%%a.%%b
)

echo Building version: %VERSION%

:: Create build directory if it doesn't exist
if not exist "dist" mkdir dist

:: Clean any existing files in dist folder
del /q /f dist\*.*

:: Create a clean temp directory for build files
if exist "temp" rmdir /s /q temp
mkdir temp

:: Copy only the necessary files
echo Copying files...
xcopy /y /q manifest.json temp\
xcopy /y /q background.js temp\
xcopy /y /q content.js temp\
xcopy /y /q popup.html temp\
xcopy /y /q popup.js temp\
xcopy /y /q popup.css temp\
xcopy /y /q liveview.css temp\
xcopy /y /q /i images temp\images\

:: Remove any development-only or unnecessary files
if exist "temp\images\screenshot*.png" del /q temp\images\screenshot*.png
if exist "temp\images\promo*.png" del /q temp\images\promo*.png

:: Create the zip file
echo Creating zip file...
cd temp
powershell Compress-Archive -Path * -DestinationPath "..\dist\pixeltracer-%VERSION%.zip" -Force
cd ..

:: Clean up
rmdir /s /q temp

echo.
echo Successfully created dist\pixeltracer-%VERSION%.zip
echo.
echo You can now upload this file to the Chrome Web Store.

endlocal 