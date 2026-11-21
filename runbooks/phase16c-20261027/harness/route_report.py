import json,csv,re,sys
W=open('/home/claude/p16c/ws.path').read().strip()
c=json.load(open('/home/claude/p16c/ev/matrix/classified_start.json'))
hosted=json.load(open('/home/claude/p16c/ev/hosted_tables_from_phase16.json'))
PROT=re.compile(r'/(escrow|auction|auctions|auction-admin|auction-integrity|finance|reconciliation|ledger|payments?|mpesa|settlements?|refunds?|deposits?|wallets?|payouts?|commissions?|bids?|forfeit)')
FIXED={('POST','/api/feature-flags/batch/evaluate'):'FIXED 16C: now 400 INVALID_KEYS (live re-probe + Jest)',('POST','/api/dealer-health-score/admin/recalculate/:dealerId'):'FIXED 16C: now 404 DEALER_NOT_FOUND (live re-probe + Jest)'}
MODULE_TABLE=[('/api/admin/ads','ads'),('/api/admin/market-data','market_data'),('/api/announcements','announcements'),('/api/automation','workflows, automation_tasks, approval_chains, notification_templates'),('/api/config/','config_entries, reference_data, vehicle_master_data, location_master_data, country_configs'),('/api/lowcode','business_objects, form_definitions, view_definitions, custom_dashboards, object_relationships'),('/api/platform-factory','platform_products, platform_brands')]
rows=[]
for r in c:
    m,p,cl,d=r['method'],r['path'],r['class'],str(r['detail'])
    prot=bool(PROT.search(p))
    ev=''; bucket=None; cause=''; status='open'
    if cl.startswith('missing_schema:table'):
        t=d.split(' ')[0]; cause=f'missing table {t}'
        if 'absent in hosted' in d: bucket=3; cause+=' (absent in hosted too: feature never provisioned)'
        else: bucket=2; cause+=' (hosted has it; repo migrations do not create it: repo/hosted drift)'
        ev='classifier: logged 42P01/PGRST205 on authorised re-call; hosted existence from Phase 16 read-only map'
    elif cl.startswith('missing_schema:column'):
        bucket=2; cause=f'missing column {d}'; ev='classifier: logged 42703/PGRST204; hosted not re-queried'
    elif cl.startswith('invalid_fixture'):
        bucket=4; cause='empty probe body violates a NOT NULL/CHECK constraint (route accepts the request, DB rejects it); no valid-input defect shown'; ev='classifier: logged 23502/23514 on authorised re-call'
    else:
        if 'FeatureFlag is not defined' in d: bucket=1; cause='services/featureFlagService.js uses FeatureFlag without importing it, AND the model has none of the statics it calls (getByKey, isEnabled, ...); table feature_flags absent in hosted. Legacy Mongoose-era feature, deliberately fail-closed (Stage 4A).'; ev='ReferenceError in backend log; source grep: 13 uses, 0 imports; model statics absent'
        elif 'JobFailure is not defined' in d: bucket=1; cause='services/queueMetricsService.js uses JobFailure (getFailureRate/getFailureStatistics) without import; the model defines neither static. job_failures exists in hosted, not in repo migrations.'; ev='ReferenceError in log; source grep 3 uses 0 imports; model statics absent'
        elif 'MarketplaceHealth is not defined' in d: bucket=1; cause='services/marketplaceHealthService.js uses MarketplaceHealth.getActiveAlerts/getHealthTrend without import; statics not defined on the model.'; ev='ReferenceError in log; source grep'
        elif 'getTopDealers' in d or 'getScoreDistribution' in d: bucket=1; cause='controller calls DealerHealthScore statics that do not exist (getTopDealers/getScoreDistribution)'; ev='TypeError in log; source grep'
        elif 'keys is not iterable' in d: bucket=1; cause='missing input validation on keys'; ev='TypeError in log'; status=FIXED[(m,p)]
        elif 'Dealer not found' in d: bucket=1; cause='missing dealer thrown as plain Error -> 500 instead of 404'; ev='Error in log'; status=FIXED[(m,p)]
        elif 'users.country does not exist' in d or 'users.country' in d: bucket=2; cause='column users.country missing (not in repo migrations)'; ev='response message from the route (INTELLIGENCE_ERROR)'
        elif 'no logged cause' in d:
            tbl=next((t for k,t in MODULE_TABLE if p.startswith(k)),None)
            if tbl: bucket=3 if not any(hosted.get(x.strip(),False) for x in tbl.split(',')) else 2; cause='module tables absent locally and not created by any repo migration: '+tbl; ev='INFERRED at module level: route file imports models whose tables are absent (models_exist_local.json); direct model create({}) probe confirmed 42P01 for the config_* models; the controller error is swallowed without a message by the generic handler'
            elif 'auction' in p: bucket=5; cause='auction route; no cause logged (protected, not investigated)'; ev='protected'
            elif 'finance' in p: bucket=5; cause='finance route'; ev='protected'
            else: bucket=1; cause='UNDETERMINED'; ev='no logged cause'
        else: bucket=4; cause=d[:120]; ev='route response/log message'; 
    pb=None
    if prot: pb=bucket; bucket=5; cause=(cause or d[:100])+' [protected domain: not modified in 16C]'; status='excluded (protected)'
    rows.append(dict(method=m,path=p,roles_with_500=len(r['rolesWith500']),roles=' '.join(r['rolesWith500']),admin_recheck_status=r['adminStatus'],bucket=bucket,bucket_name={1:'1 confirmed application defect',2:'2 missing schema/migration dependency',3:'3 unprovisioned/unsupported feature',4:'4 invalid test fixture',5:'5 protected financial/auction/escrow route (excluded)'}[bucket],cause=cause,evidence=ev,underlying_class_if_protected=pb or '',status_16c=status))
out=f'{W}/KAYAD_PHASE16C_HTTP_500_ROUTE_EXCEPTION_REPORT.csv'
with open(out,'w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
import collections
cnt=collections.Counter(r['bucket_name'] for r in rows); print(len(rows),dict(cnt))
print('undetermined',[r['path'] for r in rows if 'UNDETERMINED' in r['cause']])
json.dump(rows,open('/home/claude/p16c/ev/matrix/report_rows.json','w'))
