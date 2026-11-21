#!/usr/bin/env node
/** Collect Render resource logs and recent GitHub Actions logs for a short-lived artifact. */
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const out=process.env.PLATFORM_LOGS_DIR||'artifacts/platform-logs';
fs.mkdirSync(out,{recursive:true});
const errors=[];
const report={generatedAt:new Date().toISOString(),render:null,github:null,errors};
const secrets=['RENDER_API_KEY','GITHUB_TOKEN','IMMOFINDER_RUN_SECRET'].map(k=>process.env[k]).filter(v=>v&&v.length>=8);
function redact(value){
 let s=String(value??''); for(const secret of secrets)s=s.split(secret).join('[REDACTED]');
 return s.replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"'<>]+/gi,'$1[REDACTED]')
 .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gsk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})\b/g,'[REDACTED_TOKEN]')
 .replace(/(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g,'$1[REDACTED]$2')
 .replace(/(\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s/@]+:)[^@\s/]+(@)/gi,'$1[REDACTED]$2')
 .replace(/((?:api[_-]?key|secret|token|password)\s*[:=]\s*)["']?[^\s,"'}]{12,}/gi,'$1[REDACTED]');
}
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function json(url,headers){
 for(let attempt=0;attempt<4;attempt++){
  const r=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
  if(r.ok)return r.json();
  const retryable=r.status===429||r.status>=500;
  if(!retryable||attempt===3)throw Error('HTTP '+r.status+' from '+new URL(url).pathname);
  const retryAfter=Number(r.headers.get('retry-after'));
  const resetAt=Number(r.headers.get('x-ratelimit-reset'));
  const serverDelay=Number.isFinite(retryAfter)&&retryAfter>0?retryAfter*1000:
   Number.isFinite(resetAt)&&resetAt>0?Math.max(0,resetAt*1000-Date.now()):0;
  const backoff=Math.min(30000,1000*(2**attempt));
  const wait=Math.min(60000,Math.max(serverDelay,backoff));
  console.warn(JSON.stringify({source:'render',event:'api_retry',status:r.status,attempt:attempt+1,waitMs:wait,path:new URL(url).pathname}));
  await sleep(wait);
 }
 throw Error('Render API retry budget exhausted');
}
async function render(){
 const key=process.env.RENDER_API_KEY,owner=process.env.RENDER_OWNER_ID,service=process.env.RENDER_SERVICE_ID;
 if(!key||!owner||!service)throw Error('Missing required Actions values: RENDER_API_KEY, RENDER_OWNER_ID, RENDER_SERVICE_ID');
 const resources=[service];if(process.env.RENDER_POSTGRES_ID)resources.push(process.env.RENDER_POSTGRES_ID);
 const end=new Date(),start=new Date(end.getTime()-Math.min(Math.max(Number(process.env.RENDER_LOG_LOOKBACK_MINUTES||180),5),1440)*60000);
 const headers={Accept:'application/json',Authorization:'Bearer '+key},logs=new Map();
 for(const resource of resources){
  let startTime=start.toISOString(),endTime=end.toISOString();const seen=new Set();
  for(let page=0;page<50;page++){
   const q=new URLSearchParams({ownerId:owner,resource,startTime,endTime,direction:'forward',limit:'100'});
   const body=await json('https://api.render.com/v1/logs?'+q,headers);
   for(const entry of (body.logs||[]))logs.set(String(entry.id||JSON.stringify(entry)),JSON.parse(redact(JSON.stringify(entry))));
   if(!body.hasMore)break;
   const ns=body.nextStartTime,ne=body.nextEndTime,c=String(ns)+'|'+String(ne);
   if(!ns||!ne||seen.has(c)||(ns===startTime&&ne===endTime))throw Error('Render log pagination cursor did not advance for '+resource);
   seen.add(c);startTime=ns;endTime=ne;if(page===49)throw Error('Render pagination safety limit exceeded for '+resource);
  }
 }
 const rows=[...logs.values()].sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
 fs.writeFileSync(path.join(out,'render-logs.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+(rows.length?'\n':''));
 return {resources:resources.length,logCount:rows.length,startTime:start.toISOString(),endTime:end.toISOString()};
}
async function github(){
 const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY;
 if(!token||!repo)throw Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
 const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
 const runs=await json('https://api.github.com/repos/'+repo+'/actions/runs?per_page=30',headers);
 const selected=(runs.workflow_runs||[]).filter(r=>String(r.id)!==String(process.env.GITHUB_RUN_ID||'')&&r.status==='completed').slice(0,8),files=[];
 for(const run of selected){
  const response=await fetch('https://api.github.com/repos/'+repo+'/actions/runs/'+run.id+'/logs',{headers,redirect:'follow',signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('GitHub workflow log download HTTP '+response.status+' for run '+run.id);
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  for(const file of Object.values(zip.files)){if(file.dir)continue;const name=path.basename(file.name).replace(/[^A-Za-z0-9._-]/g,'_').slice(0,120)||'job.log';files.push({path:'github/'+run.id+'/'+name,content:redact(await file.async('string'))});}
 }
 for(const file of files){const target=path.join(out,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content);}
 fs.writeFileSync(path.join(out,'github-runs.json'),JSON.stringify(selected.map(r=>({id:r.id,name:r.name,workflow:r.path,status:r.status,conclusion:r.conclusion,createdAt:r.created_at,url:r.html_url})),null,2)+'\n');
 return {runCount:selected.length,logFiles:files.length};
}
try{report.render=await render();}catch(e){errors.push({source:'render',message:redact(e.message)});}
try{report.github=await github();}catch(e){errors.push({source:'github',message:redact(e.message)});}
fs.writeFileSync(path.join(out,'collection-summary.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({render:report.render?.logCount??'FAILED',github:report.github?.logFiles??'FAILED',errors},null,2));
if(errors.length)process.exitCode=1;
