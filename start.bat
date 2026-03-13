@echo off
echo ==========================================
echo    BEEBOX LAON - Demarrage Application
echo ==========================================
echo.

cd /d "%~dp0"

REM Lancer le serveur dans une fenetre separee via server.bat
echo Lancement du serveur Vite...
start "" "%~dp0server.bat"

REM Attendre que le port 3001 soit reellement en ecoute (max 60 secondes)
echo Attente du demarrage (max 60s)...
set /a tries=0
:attente
set /a tries+=1
if %tries% gtr 60 (
    echo ERREUR: Le serveur n'a pas demarre en 60 secondes.
    echo Verifiez la fenetre serveur pour voir l'erreur.
    pause
    goto fin
)
netstat -ano | findstr ":3001 " >nul 2>&1
if %errorlevel% neq 0 (
    ping -n 2 127.0.0.1 >nul
    goto attente
)

echo Serveur pret ! Ouverture du navigateur...
rundll32 url.dll,FileProtocolHandler http://localhost:3001

:fin
echo.
echo Fermer la fenetre "BEEBOX LAON - Serveur" pour arreter.
