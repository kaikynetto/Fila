// Render documentation images in an isolated headless browser. Never uses a personal browser profile.
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'Web/package.json'));
const { chromium, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:4178';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4178','--strictPort'], {cwd:path.join(root,'Web'),stdio:'ignore'});
let browser;
try {
  for (let i=0;i<100;i++) {try {if((await fetch(base)).ok)break;} catch {} await new Promise(r=>setTimeout(r,100));}
  const files = await Promise.all(['bastidores','nova-forma','processo','detalhes'].map(async name=>{
    const data=await readFile(path.join(root,'Web/public/Examples',`${name}.png`));
    return {id:randomUUID(),name:`${name}.png`,storageName:`${randomUUID()}.png`,size:data.length,mime:'image/png',thumbnail:`data:image/png;base64,${data.toString('base64')}`};
  }));
  const accounts=[['Instagram','@studiolume','Lume principal','Empresa'],['TikTok','@studiolume','TikTok principal','Empresa'],['TikTok','@lumelab','Lume Lab','Dark'],['TikTok','@lume.cortes','Cortes criativos','Dark'],['LinkedIn','studiolume','Studio Lume','Empresa']].map(([network,handle,label,kind])=>({id:randomUUID(),network,handle,label,kind}));
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dateAt=n=>{const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);};
  const state={version:1,profile:{userName:'Ana',companyName:'Studio Lume',timeZone:'America/Sao_Paulo',accounts},trash:[],posts:[['Bastidores do studio',0,'12:00',0,'Publicado',0],['O detalhe faz diferença',0,'18:30',0,'Rascunho',3],['Uma nova forma de criar',1,'09:00',0,'Planejado',1],['Nosso processo criativo',1,'17:00',4,'Planejado',2],['Da ideia ao resultado',3,'19:00',2,'Planejado',0],['Uma pausa para inspirar',4,'11:00',3,'Planejado',2]].map(([title,offset,time,a,status,f])=>({id:randomUUID(),title,date:dateAt(offset),time,accountId:accounts[a].id,network:accounts[a].network,format:accounts[a].network==='TikTok'?'Vídeo':'Carrossel',status,caption:'Ideias, testes e os detalhes do nosso processo.\n\n#StudioLume #ProcessoCriativo',reminderMinutes:15,attachments:[files[f],files[3]],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}))};
  browser=await chromium.launch({headless:true,executablePath:process.env.FILA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:820},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({state,files})=>{
    const empty={version:1,profile:null,posts:[],trash:[]};
    window.__filaFixture=state;
    window.webkit={messageHandlers:{fila:{postMessage:async({action,payload})=>{
      const load=()=>({state:JSON.parse(localStorage.getItem('fila-capture')||JSON.stringify(empty)),notifications:'authorized',pending:4,demo:true});
      if(action==='load')return load();
      if(action==='save'){localStorage.setItem('fila-capture',JSON.stringify(payload));return load();}
      if(action==='importFiles')return {files};
      if(action==='notificationPermission'||action==='notificationStatus')return {status:'authorized',pending:4};
      return {ok:true};
    }}}};
  },{state,files});
  await mkdir(path.join(root,'docs/screenshots'),{recursive:true});
  const capture=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(root,'docs/screenshots',`${name}.png`)});};
  await page.goto(base);
  await page.getByLabel('Como você se chama?').fill('Ana');
  await page.getByLabel('Nome da empresa',{exact:true}).fill('Studio Lume');
  await capture('onboarding');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  for (const [label,handle,dark] of [['TikTok principal','@studiolume',false],['Lume Lab','@lumelab',true]]) {
    await page.getByRole('button',{name:'Adicionar conta do TikTok',exact:true}).click();
    await page.getByLabel('Nome interno',{exact:true}).fill(label);
    await page.getByLabel('Perfil ou link',{exact:true}).fill(handle);
    if(dark)await page.getByRole('button',{name:'Dark',exact:true}).click();
    await page.getByRole('button',{name:'Concluir',exact:true}).click();
  }
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Criar meu espaço',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sua agenda',exact:true})).toBeVisible();
  const onboarding=await page.evaluate(()=>JSON.parse(localStorage.getItem('fila-capture')));
  if(onboarding.profile.accounts.length!==2||onboarding.profile.accounts[1].kind!=='Dark')throw Error('Onboarding did not preserve multiple TikTok accounts');
  await page.evaluate(()=>localStorage.setItem('fila-capture',JSON.stringify(window.__filaFixture)));
  await page.reload();
  await page.getByRole('button',{name:/Bastidores do studio, Instagram/}).click();
  await capture('agenda');
  await page.getByRole('button',{name:'Contas sociais',exact:false}).first().click();
  await expect(page.locator('.network-card')).toHaveCount(5);
  await capture('contas-dark');
  await page.getByRole('button',{name:'Biblioteca',exact:false}).first().click();
  await capture('biblioteca');
  await page.getByRole('button',{name:'Agenda',exact:true}).first().click();
  await page.getByRole('button',{name:'Novo post',exact:true}).click();
  await page.getByLabel('Título da postagem',{exact:true}).fill('Da ideia ao próximo post');
  await page.locator('.creation-network-options button').filter({hasText:'Lume Lab'}).click();
  await page.getByLabel('Legenda opcional').fill('Um olhar sobre o processo criativo.\n\n#LumeLab #Criatividade');
  await capture('criar-post');
  await page.getByRole('button',{name:'Próximo: arquivos',exact:true}).click();
  await page.getByRole('button',{name:'Escolher arquivos no Mac',exact:true}).click();
  await expect(page.locator('.composer-file')).toHaveCount(4);
  await page.getByRole('button',{name:'Próximo: agendamento',exact:true}).click();
  await page.getByLabel('Horário da postagem',{exact:true}).fill('23:59');
  await capture('agendamento');
  await page.getByRole('button',{name:'Planejar postagem',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sua agenda',exact:true})).toBeVisible();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fila-capture')).posts.find(p=>p.title==='Da ideia ao próximo post'));
  if(saved.accountId!==accounts[2].id||saved.status!=='Planejado'||saved.attachments.length!==4)throw Error('Composer did not preserve account / media / schedule');
  await page.reload();
  await expect(page.getByRole('button',{name:/Da ideia ao próximo post, TikTok/})).toBeVisible();
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Onboarding, múltiplas contas TikTok, criação, anexos, agendamento e recarga: OK. Capturas em docs/screenshots.');
} finally {await browser?.close();server.kill();}
