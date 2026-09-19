
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));

// Supabase - use SERVICE_KEY on server for secure writes if available, else ANON
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
  console.warn("⚠️  SUPABASE_URL or SUPABASE_ANON_KEY missing - set in Render env vars");
}

const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const supabaseAnon = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Serve frontend with env injection
app.get('/', (req,res)=>{
  const filePath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(filePath, 'utf-8');
  // Inject config safely into window - so frontend has no pasting, auto-connected
  const inject = `
    <script>window.__SSA_ENV__ = { SUPABASE_URL: "${SUPABASE_URL||''}", SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY||''}" };</script>
  `;
  html = html.replace('<!-- SSA_ENV_INJECT -->', inject);
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

// API - health check
app.get('/api/health', async (req,res)=>{
  let dbOk = false;
  let count = 0;
  if(supabase){
    try{
      const {data, error} = await supabase.from('ssa_store').select('key', {count:'exact'}).limit(1);
      if(!error){ dbOk=true; count = data?.length||0; }
    }catch{}
  }
  res.json({ 
    ok:true, 
    backend: !!supabase,
    db_connected: dbOk,
    supabase_url: SUPABASE_URL ? 'set' : 'missing',
    timestamp: new Date().toISOString()
  });
});

// API - get all store (for debugging)
app.get('/api/store', async (req,res)=>{
  if(!supabaseAnon) return res.status(500).json({error:"Supabase not configured"});
  const {data,error} = await supabaseAnon.from('ssa_store').select('*');
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

// API - proxy write (optional - frontend can also write directly to Supabase)
app.post('/api/store', async (req,res)=>{
  if(!supabase) return res.status(500).json({error:"Supabase not configured"});
  const {key, data} = req.body;
  if(!key) return res.status(400).json({error:"key required"});
  const {error} = await supabase.from('ssa_store').upsert({key, data, updated_at: new Date().toISOString()}, {onConflict:"key"});
  if(error) return res.status(500).json({error:error.message});
  res.json({ok:true});
});

// Fallback to index for SPA
app.get('*', (req,res)=>{
  const filePath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(filePath, 'utf-8');
  const inject = `<script>window.__SSA_ENV__ = { SUPABASE_URL: "${SUPABASE_URL||''}", SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY||''}" };</script>`;
  html = html.replace('<!-- SSA_ENV_INJECT -->', inject);
  res.send(html);
});

const PORT = process.env.PORT || 10000; // Render uses 10000
app.listen(PORT, ()=> {
  console.log(`✅ Smart Study Backend live on port ${PORT}`);
  console.log(`   Supabase: ${SUPABASE_URL ? 'Connected' : 'Not set - set env vars'}`);
});
