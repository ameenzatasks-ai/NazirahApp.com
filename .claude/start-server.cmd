@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\ameen\OneDrive\Desktop\Apps\The Nazira App\server"
node "..\node_modules\ts-node-dev\lib\bin.js" --respawn --transpile-only --exit-child src/index.ts
