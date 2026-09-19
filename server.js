import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({limit: '20mb'}));

const URL = process.env.SUPABASE_URL || '';
const ANON = process.env.SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_KEY || '';

function getHtml(){
  let html = fs.readFileSync(path.join(__dirname,'public','index.html'),'utf-8');
  const inject = `<script>window.__SSA_ENV__={SUPABASE_URL:"${URL}",SUPABASE_ANON_KEY:"${ANON}",SUPABASE_SERVICE_KEY:"${SERVICE}"};</script><!-- SSA_ENV_INJECT -->`;
  if(html.includes('<!-- SSA_ENV_INJECT -->')) return html.replace('<!-- SSA_ENV_INJECT -->', inject);
  return html.replace('</head>', inject + '</head>');
}

app.get('/', (req,res) => res.send(getHtml()));
app.use(express.static(path.join(__dirname,'public')));
app.get('*', (req,res) => res.send(getHtml()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Live on ${PORT}`));
