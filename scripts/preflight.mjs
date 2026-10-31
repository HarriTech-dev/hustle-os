import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['package.json','src/app/api/ai/chat/route.ts','src/app/api/payments/paystack/webhook/route.ts','supabase'];
let failed=false;
for(const name of required){const ok=fs.existsSync(path.join(root,name));console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed=true;}
const ignore=['node_modules','.next','.git'];
const secretFiles=[];
function scan(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(ignore.includes(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())scan(p);else if(/^\.env(\.|$)/.test(ent.name)&&ent.name!=='.env.example')secretFiles.push(path.relative(root,p));}}
scan(root);
if(secretFiles.length){console.error('FAIL: secret environment files present:',secretFiles.join(', '));failed=true;}else console.log('PASS no .env secret files in source tree');
console.log('NOTE: Static preflight does not replace npm run build, RLS tests, or payment/WhatsApp integration tests.');
process.exitCode=failed?1:0;
