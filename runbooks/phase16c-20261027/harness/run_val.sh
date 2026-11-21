#!/bin/bash
W=$(cat /home/claude/p16c/ws.path); O=${1:-/home/claude/p16c/ev/val}; mkdir -p $O; : > $O/_summary.tsv; rm -f $O/_done
cd $W
r(){ n=$1; shift; ( "$@" ) > $O/$(echo $n | tr ':' '_').log 2>&1; printf "%s\t%s\texit=%s\n" "$n" "$*" "$?" >> $O/_summary.tsv; }
r typecheck npm run lint
r build npm run build
r frontend_vitest npm test
( cd backend; r backend_jest npm run test:jest; r backend_vitest npm run test:vitest; r backend_node npm run test:node ) 
for s in $(node -e 'const p=require("./package.json").scripts;console.log(Object.keys(p).filter(k=>/^validate:/.test(k)).join(" "))'); do r "validator_$s" timeout 600 npm run "$s"; done
echo done > $O/_done
