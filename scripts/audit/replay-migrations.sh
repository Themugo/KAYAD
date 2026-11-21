#!/usr/bin/env bash
# Replays supabase/migrations in filename order into a LOCAL substitute database.
# usage: replay-migrations.sh <db> <passlabel>   (env PGHOST/PGPORT/PGUSER)
DB=$1; LABEL=$2; OUT=evidence/db_replay/pass_${LABEL}.tsv; : > $OUT
for f in $(ls supabase/migrations/*.sql | sort); do
  err=$(psql -d "$DB" -q -v ON_ERROR_STOP=1 -1 -f "$f" 2>&1 >/dev/null | grep -m1 -i "error" | tr '\t\n' '  ')
  if [ -z "$err" ]; then echo -e "$(basename $f)\tOK\t" >> $OUT; else echo -e "$(basename $f)\tFAIL\t${err:0:220}" >> $OUT; fi
done
awk -F'\t' '{c[$2]++} END{for(k in c) print k, c[k]}' $OUT
