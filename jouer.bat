@echo off
REM ============================================================
REM jouer.bat - double-clique ici pour jouer a Reef Defender !
REM
REM Windows bloque les scripts PowerShell lances directement
REM (politique d'execution). Ce fichier .bat n'est pas concerne :
REM il lance serve.ps1 avec l'option "Bypass", ouvre le navigateur,
REM et voila. Ferme la fenetre du serveur pour tout arreter.
REM ============================================================
cd /d "%~dp0"
echo Lancement du serveur Reef Defender sur http://localhost:8420 ...
start "Reef Defender - serveur" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
timeout /t 1 /nobreak >nul
start "" http://localhost:8420
