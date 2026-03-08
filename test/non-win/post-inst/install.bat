@echo off
mkdir C:\Converter
copy %~dp0\convert-server.js C:\Converter\
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope LocalMachine -Force"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
PATH=%PATH%;C:\ProgramData\chocolatey\bin
choco install -y officeproplus2013
choco install -y nodejs --version="24.11.0"
choco install -y git
netsh advfirewall firewall add rule name="Allow NodeJS Server" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe" enable=yes
REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /V ConvertServer /T REG_SZ /F /D "%ProgramFiles%\nodejs\node.exe C:\Converter\convert-server.js"
shutdown /r /t 1
