@echo off
echo ============================================
echo TrackX - MongoDB Replica Set Setup
echo ============================================
echo.
echo This script will enable MongoDB replica set mode.
echo Required for Prisma with MongoDB.
echo.
echo Please run this script as Administrator!
echo.
pause

REM Backup current config
copy "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg" "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg.backup"

REM Add replication config
echo. >> "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
echo replication: >> "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
echo   replSetName: rs0 >> "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"

echo.
echo Config updated. Restarting MongoDB service...

net stop MongoDB
net start MongoDB

echo.
echo Waiting for MongoDB to start...
timeout /t 5

echo.
echo Initializing replica set...
mongosh --eval "rs.initiate()"

echo.
echo ============================================
echo MongoDB replica set configured!
echo Now run: npm run seed
echo ============================================
pause
