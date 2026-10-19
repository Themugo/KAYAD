#!/bin/bash
# Usage: run_validators.sh <root> <outfile>
export PATH=/home/claude/s5a/node22/package/bin:$PATH
cd "$1"; : > "$2"
for k in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(k=>/^(validate|verify|certify)/.test(k)).join(" "))'); do
  s=$(date +%s); timeout 180 npm run -s "$k" > /tmp/val_$$.log 2>&1; ec=$?; e=$(date +%s)
  echo "$k | exit=$ec | $((e-s))s" >> "$2"
done
echo DONE >> "$2"
