
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

console.log("=== ENV CHECK ===");
console.log("URL:", SUPABASE_URL ? "set" : "MISSING");
console.log("ANON:", SUPABASE_ANON_KEY ? "set" : "MISSING");
console.log("SERVICE:", SUPABASE_SERVICE_KEY ? "set" : "MISSING");

let supabase = null;
let supabaseAnon = null;
try{
  if(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)){
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);
    console.log("✅ Supabase backend client OK");
  }
  if(SUPABASE_URL && SUPABASE_ANON_KEY){
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase anon client OK");
  }
}catch(e){
  console.error("Supabase init error:", e.message);
}

function getHtml(){
  const fp = path.join(__dirname, 'public', 'index.html');
  if(!fs.existsSync(fp)){
    console.error("Missing:", fp);
    return "<h1>public/index.html not found</h1><p>Check GitHub upload - public folder must exist</p>";
  }
  let html = fs.readFileSync(fp, 'utf-8');
  const inject = `<script>window.__SSA_ENV__ = { SUPABASE_URL: "${SUPABASE_URL}", SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}" };</script>`;
  return html.replace('<!-- SSA_ENV_INJECT -->', inject);
}

app.get('/', (req,res)=> res.send(getHtml()));
app.get('/api/health', (req,res)=> res.json({ok:true, url_set: !!SUPABASE_URL, anon_set: !!SUPABASE_ANON_KEY, time: new Date().toISOString()}));
app.get('/api/store', async (req,res)=>{
  if(!supabaseAnon) return res.status(500).json({error:"Set env vars"});
  const {data,error} = await supabaseAnon.from('ssa_store').select('*');
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req,res)=> res.send(getHtml()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', ()=> console.log(`✅ LIVE on 0.0.0.0:${PORT}`));

