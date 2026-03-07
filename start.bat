@echo off
echo ==========================================
echo    BEEBOX LAON - Demarrage Application
echo ==========================================
echo.

cd /d "%~dp0"

REM Tuer tout processus occupant le port 3000
echo Liberation du port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
ping -n 2 127.0.0.1 >nul

REM Synchroniser les dependances (rapide si deja a jour)
echo Verification des dependances...
call npm install --silent
echo.

REM Lancer le serveur dans une fenetre separee via server.bat
echo Lancement du serveur Vite...
start "" "%~dp0server.bat"

REM Attendre que le port 3000 soit reellement en ecoute (max 60 secondes)
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
netstat -ano | findstr ":3000 " >nul 2>&1
if %errorlevel% neq 0 (
    ping -n 2 127.0.0.1 >nul
    goto attente
)

echo Serveur pret ! Ouverture du navigateur...
rundll32 url.dll,FileProtocolHandler http://localhost:3000

:fin
echo.
echo Fermer la fenetre "BEEBOX LAON - Serveur" pour arreter.
