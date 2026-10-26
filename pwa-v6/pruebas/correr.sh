#!/bin/bash
# uso: correr.sh carpeta_app puerto comando...
cd "$1"; python3 -m http.server "$2" >/dev/null 2>&1 & PID=$!
sleep 1; shift 2; cd "$OLDPWD"
"$@"; R=$?; kill $PID; exit $R
