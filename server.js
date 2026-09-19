
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

console.log("=== ENV CHECK ===", { url: !!SUPABASE_URL, anon: !!SUPABASE_ANON_KEY, service: !!SUPABASE_SERVICE_KEY });
console.log("Dir:", __dirname);
console.log("Files in root:", fs.readdirSync(__dirname).slice(0,20));

let supabase = null, supabaseAnon = null;
try{
  if(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)){
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);
  }
  if(SUPABASE_URL && SUPABASE_ANON_KEY){
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  console.log("✅ Supabase clients ready");
}catch(e){ console.error("Supabase error:", e.message); }

function findHtml(){
  const possible = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'public', 'index-static.html'),
    path.join(process.cwd(), 'public', 'index.html'),
  ];
  for(const p of possible){
    if(fs.existsSync(p)){
      console.log("✅ Found HTML at:", p);
      return p;
    }
  }
  console.error("❌ No HTML found. Checked:", possible);
  try{ console.log("Root files:", fs.readdirSync(__dirname)); }catch{}
  try{ console.log("Public files:", fs.readdirSync(path.join(__dirname,'public'))); }catch{ console.log("No public folder"); }
  return null;
}

function getHtml(){
  const fp = findHtml();
  if(!fp){
    return `
      <h1>public/index.html not found</h1>
      <p>Your GitHub upload is missing the public folder.</p>
      <h3>Fix:</h3>
      <ol>
        <li>Go to GitHub repo → Check if you see <b>public</b> folder</li>
        <li>If not: Click <b>Add file → Upload files</b> → Drag the <b>public</b> folder from the zip I gave you</li>
        <li>Commit → Render will auto-redeploy</li>
      </ol>
      <p>Root dir: ${__dirname}</p>
      <p>Files: ${JSON.stringify(fs.readdirSync(__dirname))}</p>
    `;
  }
  let html = fs.readFileSync(fp, 'utf-8');
  const inject = `<script>window.__SSA_ENV__ = { SUPABASE_URL: "${SUPABASE_URL}", SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}" };</script>`;
  return html.replace('<!-- SSA_ENV_INJECT -->', inject);
}

app.get('/', (req,res)=> res.send(getHtml()));
app.get('/api/health', (req,res)=> res.json({ok:true, url: !!SUPABASE_URL, anon: !!SUPABASE_ANON_KEY, time: new Date().toISOString()}));
app.get('/api/debug', (req,res)=>{
  res.json({
    dirname: __dirname,
    root_files: fs.readdirSync(__dirname),
    public_exists: fs.existsSync(path.join(__dirname,'public')),
    public_files: fs.existsSync(path.join(__dirname,'public')) ? fs.readdirSync(path.join(__dirname,'public')) : 'no public folder'
  });
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.get('*', (req,res)=> res.send(getHtml()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', ()=> console.log(`✅ LIVE on ${PORT}`));
