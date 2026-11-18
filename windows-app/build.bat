@echo off
chcp 65001 >nul
rem Chibok Town launcher build: double-click this file to make the exe
cd /d "%~dp0"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /codepage:65001 /win32icon:icon.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll "/out:치복 타운.exe" Launcher.cs
