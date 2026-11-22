with t as (select c.oid, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
cols as (select table_name tn, left(md5(string_agg(column_name||':'||udt_name||':'||is_nullable||':'||coalesce(column_default,''),'|' order by column_name)),6) h from information_schema.columns where table_schema='public' group by 1),
cons as (select t.relname tn, left(md5(string_agg(k.conname||':'||pg_get_constraintdef(k.oid),'|' order by k.conname)),6) h from pg_constraint k join t on t.oid=k.conrelid group by 1),
idx as (select tablename tn, left(md5(string_agg(indexname||':'||indexdef,'|' order by indexname)),6) h from pg_indexes where schemaname='public' group by 1),
pol as (select tablename tn, left(md5(string_agg(policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),'|' order by policyname)),6) h from pg_policies where schemaname='public' group by 1),
trg as (select t.relname tn, left(md5(string_agg(g.tgname||':'||pg_get_triggerdef(g.oid),'|' order by g.tgname)),6) h from pg_trigger g join t on t.oid=g.tgrelid where not g.tgisinternal group by 1)
select t.relname||','||coalesce(cols.h,'-')||','||coalesce(cons.h,'-')||','||coalesce(idx.h,'-')||','||coalesce(pol.h,'-')||','||coalesce(trg.h,'-') as r
from t left join cols on cols.tn=t.relname left join cons on cons.tn=t.relname left join idx on idx.tn=t.relname left join pol on pol.tn=t.relname left join trg on trg.tn=t.relname order by t.relname
