@echo off
echo ========================================
echo   BEEBOX LAON - Deploiement Production
echo ========================================
echo.

REM Verifier que .env existe
if not exist ".env" (
    echo ERREUR : Fichier .env manquant.
    echo Copier .env.example en .env et renseigner les cles API.
    pause
    exit /b 1
)

echo [1/3] Build de l'application...
call npm run build
if errorlevel 1 (
    echo ERREUR : Le build a echoue.
    pause
    exit /b 1
)
echo Build OK.
echo.

echo [2/3] Deploiement (hosting + regles Firestore + regles Storage)...
call firebase deploy
if errorlevel 1 (
    echo ERREUR : Le deploiement a echoue.
    echo Verifiez que firebase-tools est installe : npm install -g firebase-tools
    echo Et que vous etes connecte : firebase login
    pause
    exit /b 1
)
echo.

echo [3/3] Deploiement termine !
echo.
echo L'application est en ligne sur :
echo   https://beebox-laon-gestion-14f28.web.app
echo.
echo Si vous avez configure un domaine personnalise :
echo   https://gestion.beeboxlaon.fr
echo.
pause
