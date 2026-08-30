require('http').createServer((req,res)=>res.end('STARBOT ONLINE')).listen(process.env.PORT||10000);
if(!global.crypto) global.crypto=require("crypto");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const P=require("pino"), fs=require("fs");
let db=JSON.parse(fs.readFileSync("./db.json"));
let cfgFile=JSON.parse(fs.readFileSync("./config.json"));
let aluguel=JSON.parse(fs.readFileSync("./aluguel.json"));
const salvar=()=>{ fs.writeFileSync("./db.json",JSON.stringify(db,null,2)); fs.writeFileSync("./config.json",JSON.stringify(cfgFile,null,2)); fs.writeFileSync("./aluguel.json",JSON.stringify(aluguel,null,2)); };
const getDB=(jid)=>{ if(!db[jid]) db[jid]={bloqueados:[]}; if(!db[jid].bloqueados) db[jid].bloqueados=[]; return db[jid]; }
const isDono=(jid)=> jid==cfgFile.dono || cfgFile.subdonos.includes(jid);
const parseTempo=(t)=>{ t=t.toLowerCase(); if(t=="30min"||t=="30m") return 1800000; if(t=="1h") return 3600000; if(t=="2h") return 7200000; if(t=="6h") return 21600000; if(t=="12h") return 43200000; if(t=="1d") return 86400000; if(t=="3d") return 259200000; if(t=="7d") return 604800000; if(t=="15d") return 1296000000; if(t=="30d") return 2592000000; return 0; };
let pets={}, eco={}, levels={};
const getEco=(id)=>{ if(!eco[id]) eco[id]={dinheiro:1000}; return eco[id]; };
const getLevel=(id)=>{ if(!levels[id]) levels[id]={xp:0, level:1}; return levels[id]; };
const gifs={ beijar:"https://media.tenor.com/8k2h1Bm5BW0AAAAC/anime-kiss.gif", socar:"https://media.tenor.com/2UYENRuvV6kAAAAC/anime-punch.gif", matar:"https://media.tenor.com/1d1B4Q6Sl3AAAAAC/anime-kill.gif", abraçar:"https://media.tenor.com/0vl21YIs-FEAAAAC/anime-hug.gif", tapar:"https://media.tenor.com/CvBTA0GyE2AAAAAC/anime-slap.gif", chutear:"https://media.tenor.com/Uh23pFc_WC4AAAAC/anime-kick.gif", lamber:"https://media.tenor.com/FaFv1vC-3YIAAAAC/anime-lick.gif", morder:"https://media.tenor.com/1CTBpMNDH3MAAAAC/anime-bite.gif", cafune:"https://media.tenor.com/DCM1H7qXJ2kAAAAC/anime-pat.gif" };
async function sendAcao(sock,jid,m,sender,acao){ let alvo=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; await sock.sendMessage(jid,{video:{url:gifs[acao]}, gifPlayback:true, caption:`@${sender.split("@")[0]} ${acao} @${alvo?alvo.split("@")[0]:""}`, mentions:[sender, alvo].filter(Boolean)},{quoted:m}); }

async function iniciar(){
const { version } = await fetchLatestBaileysVersion();
const {state, saveCreds}=await useMultiFileAuthState("./auth");
const sock=makeWASocket({ version, auth:state, logger:P({level:"silent"}), browser:["Chrome (Linux)","Chrome","120.0.0.0"], printQRInTerminal:false });
sock.ev.on("creds.update", saveCreds);
let jaPediu=false, intervalo=null;
sock.ev.on("connection.update",async(u)=>{
const {connection, lastDisconnect}=u;
if(connection==="open"){ clearInterval(intervalo); console.log(`\n✅ STARBOT 556282575515 CONECTADO! DONO 5534997763828 ✅\n!menu\n`); }
if(connection==="close"){
 let code=lastDisconnect?.error?.output?.statusCode;
 console.log("Fechou:", code);
 if(code===405){ console.log("405 block 60s"); clearInterval(intervalo); setTimeout(iniciar,60000); return; }
 if(code!==DisconnectReason.loggedOut) setTimeout(iniciar,5000);
}
if(!state.creds.registered &&!jaPediu){
 jaPediu=true;
 setTimeout(async()=>{
  try{
   const c=await sock.requestPairingCode("556282575515");
   console.log(`\n========== CODIGO 1 MIN ==========\nBOT: 556282575515\nNOVO CODIGO: ${c}\nVOCE TEM 70 SEGUNDOS!\n====================================\n`);
   intervalo=setInterval(async()=>{
    try{ if(sock.authState.creds.registered){ clearInterval(intervalo); return; } const n=await sock.requestPairingCode("556282575515"); console.log(`NOVO CODIGO (70s): ${n}`); }catch(e){}
   },70000);
  }catch(e){ console.log("Erro:", e.message); jaPediu=false; }
 },10000);
}
});

sock.ev.on("messages.upsert", async({messages})=>{
let m=messages[0]; if(!m?.message||m.key.fromMe) return;
let jid=m.key.remoteJid, sender=m.key.participant||jid;
let txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||"";
let cfg=getDB(jid); salvar();
let meta; if(jid.endsWith("@g.us")){ try{ meta=await sock.groupMetadata(jid); }catch{} }
let lv=getLevel(sender); lv.xp+=10; if(lv.xp>lv.level*100){ lv.level++; }
if(!txt.startsWith("!")) return;
let args=txt.slice(1).trim().split(/ +/), cmd=args[0].toLowerCase(), q=txt.slice(cmd.length+1).trim();
const reply=(t)=>sock.sendMessage(jid,{text:t},{quoted:m});
if(cfg.bloqueados.includes(cmd)){ let isAdm=meta?.participants?.find(p=>p.id==sender)?.admin; if(!isAdm &&!isDono(sender)) return reply(`🔒!${cmd} bloqueado só ADM/Dono`); }

if(cmd=="dono") return reply(`👑 STARBOT\nBot: 556282575515\nDono: 5534997763828\nSubdonos: ${cfgFile.subdonos.length}\nPrefixo:!`);
if(["subdono","delsubdono","listsub","alugar","aluguel","listaluguel"].includes(cmd)){
if(!isDono(sender)) return reply("❌ Só dono/subdono");
if(cmd=="subdono"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!w) return reply("Marca @"); cfgFile.subdonos.push(w); salvar(); return reply(`✅ @${w.split("@")[0]} SUBDONO`); }
if(cmd=="delsubdono"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; cfgFile.subdonos=cfgFile.subdonos.filter(x=>x!=w); salvar(); return reply("Removido"); }
if(cmd=="listsub"){ return await sock.sendMessage(jid,{text:`👑 SUBDONOS (${cfgFile.subdonos.length})\n${cfgFile.subdonos.map(x=>`@${x.split("@")[0]}`).join("\n")}`, mentions:cfgFile.subdonos}); }
if(cmd=="alugar"){ let ms=parseTempo(args[1]); if(!ms) return reply("Tempo inválido! Use: 30min 1h 2h 6h 12h 1d 3d 7d 15d 30d"); let gp=args[2]||jid; aluguel[gp]={expira:Date.now()+ms, tempo:args[1]}; salvar(); return reply(`✅ Alugado ${args[1]} até ${new Date(aluguel[gp].expira).toLocaleString("pt-BR")}`); }
if(cmd=="aluguel"){ let info=aluguel[jid]; if(!info) return reply("Sem aluguel"); return reply(`⏰ ${info.tempo} Restam ${Math.ceil((info.expira-Date.now())/60000)}min`); }
if(cmd=="listaluguel"){ let t=`📋 ALUGADOS ${Object.keys(aluguel).length}\n`; for(let g in aluguel) t+=`${g} - ${aluguel[g].tempo}\n`; return reply(t); }
}
if(cmd=="bloquear"||cmd=="block"){ let isAdm=meta?.participants?.find(p=>p.id==sender)?.admin || isDono(sender); if(!isAdm) return reply("❌ Só ADM"); let c=q.toLowerCase().replace("!","").split(" ")[0]; if(!c) return reply("Use!bloquear beijar"); if(!cfg.bloqueados.includes(c)) cfg.bloqueados.push(c); salvar(); return reply(`🔒!${c} bloqueado`); }
if(cmd=="desbloquear"||cmd=="unblock"){ let c=q.toLowerCase().replace("!","").split(" ")[0]; cfg.bloqueados=cfg.bloqueados.filter(x=>x!=c); salvar(); return reply(`🔓!${c} desbloqueado`); }
if(cmd=="listablock") return reply(cfg.bloqueados.length?`🔒 BLOQUEADOS\n${cfg.bloqueados.map(c=>`!${c}`).join("\n")}`:"Nenhum bloqueado");

if(cmd=="menu") return reply(`┏━━━━ 🌟 MENU STARBOT 🌟 ━━━━┓
┃ Bot: 556282575515
┃ Dono: 5534997763828
┣━━━━━━━━━━━━━━━━━━━━┫
┃!menudono - Dono e aluguel
┃!menuadm - Administração 35
┃!menubloqueio - Bloqueio 🔒
┃!menugrupo - Grupo
┃!menujogos - Jogos
┃!menupets - Pets 🐾
┃!menurpg - RPG economia ⚔️
┃!menuacoes - Ações GIF 🥊
┃!menufig - Figurinhas
┃!menulogos - Logos
┃!menudl - Downloads
┃!menualuguel - Aluguel 30m/30d
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menudono") return reply(`┏━━━━ 👑 MENU DONO ━━━━┓
┃!dono - Info bot e dono
┃!subdono @ - Add subdono
┃!delsubdono @ - Remove subdono
┃!listsub - Lista subdonos
┃!menualuguel - Menu aluguel
┃!alugar 30min - 30 minutos
┃!alugar 1h - 1 hora
┃!alugar 2h - 2 horas
┃!alugar 6h - 6 horas
┃!alugar 12h - 12 horas
┃!alugar 1d - 1 dia
┃!alugar 3d - 3 dias
┃!alugar 7d - 7 dias
┃!alugar 15d - 15 dias
┃!alugar 30d - 30 dias
┃!aluguel - Tempo restante
┃!listaluguel - Lista alugados
┃!setmenu [tipo] - Troca foto menu
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menualuguel") return reply(`┏━━━━ ⏰ ALUGUEL ━━━━┓
┃!alugar 30min - 30 minutos
┃!alugar 1h - 1 hora
┃!alugar 2h - 2 horas
┃!alugar 6h - 6 horas
┃!alugar 12h - 12 horas
┃!alugar 1d - 1 dia
┃!alugar 3d - 3 dias
┃!alugar 7d - 7 dias
┃!alugar 15d - 15 dias
┃!alugar 30d - 30 dias
┃!aluguel - Ver tempo
┃!listaluguel - Listar
┃!subdono @ - Add subdono
┃!delsubdono @ - Remove
┃!listsub - Lista subdonos
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menubloqueio") return reply(`┏━━━━ 🔒 BLOQUEIO ━━━━┓
┃!bloquear [cmd] - Bloqueia
┃!block [cmd] - Bloqueia
┃!desbloquear [cmd] - Desbloqueia
┃!unblock [cmd] - Desbloqueia
┃!listablock - Lista bloqueados
┃!bloqueados - Lista bloqueados
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menuadm") return reply(`┏━━━━ 🛡️ MENU ADM 35 ━━━━┓
┃!ban @ - Banir
┃!kick @ - Kickar
┃!add 55xxx - Add número
┃!promover @ - Promover ADM
┃!rebaixar @ - Rebaixar ADM
┃!admins - Lista ADMs
┃!membros - Qtd membros
┃!infogrupo - Info grupo
┃!link - Link grupo
┃!revogar - Reseta link
┃!abrir - Abre grupo
┃!fechar - Fecha grupo
┃!setnome [txt] - Muda nome
┃!setdesc [txt] - Muda desc
┃!antilink on/off
┃!bemvindo on/off
┃!setbemvindo [txt]
┃!mutar @ - Muta
┃!desmutar @ - Desmuta
┃!listamuta - Lista mutados
┃!todos [txt] - Marca todos
┃!hidetag [txt] - Marca invisível
┃!marcar [txt] - Marca geral
┃!aviso @ - Warn
┃!warns @ - Ver warns
┃!resetwarns @
┃!del - Apaga msg
┃!bloquear [cmd]
┃!desbloquear [cmd]
┃!listablock
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menupets") return reply(`┏━━━━ 🐾 PETS ━━━━┓
┃!adotarpet [nome] - Adotar pet
┃!pet - Ver pet
┃!alimentar - Alimentar
┃!brincar - Brincar
┃!curar - Curar 100%
┃!pets - Listar pets grupo
┃!abandonarpets - Abandonar
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menurpg") return reply(`┏━━━━ ⚔️ RPG ━━━━┓
┃!saldo - Ver saldo
┃!dinheiro - Ver dinheiro
┃!trabalhar - Trabalhar +R$
┃!daily - Daily R$500
┃!roubar @ - Roubar
┃!pay @ [valor] - Pagar
┃!loja - Ver loja
┃!comprar [item]
┃!batalhar @ - Batalhar
┃!topdinheiro - Top ricos
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menuacoes") return reply(`┏━━━━ 🥊 AÇÕES GIFS ━━━━┓
┃!beijar @ - Beijar GIF
┃!beijo @ - Beijar GIF
┃!kiss @ - Beijar GIF
┃!abraçar @ - Abraçar GIF
┃!abracar @ - Abraçar GIF
┃!hug @ - Abraçar GIF
┃!tapa @ - Tapa GIF
┃!tapar @ - Tapa GIF
┃!slap @ - Tapa GIF
┃!socar @ - Socar GIF
┃!soco @ - Socar GIF
┃!chutar @ - Chutar GIF
┃!chute @ - Chutar GIF
┃!matar @ - Matar GIF
┃!kill @ - Matar GIF
┃!lamber @ - Lamber GIF
┃!morder @ - Morder GIF
┃!cafune @ - Cafuné GIF
┃!pat @ - Cafuné GIF
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menugrupo") return reply(`┏━━━━ 👥 GRUPO ━━━━┓
┃!perfil @ - Ver perfil
┃!perfil - Seu perfil
┃!level - Seu level
┃!rank - Rank level
┃!ping - Ping bot
┃!id - ID grupo
┃!calc [conta] - Calculadora
┃!cep [00000000] - CEP
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menujogos") return reply(`┏━━━━ 🎮 JOGOS ━━━━┓
┃!dado - Dado 1-6
┃!caraoucoroa - Cara/coroa
┃!ppt [pedra/papel/tesoura]
┃!gay @ - % gay
┃!gado @ - % gado
┃!corno @ - % corno
┃!gostoso @ - % gostoso
┃!feio @ - % feio
┃!casal - Casal do dia
┃!ship @ @ - Shipar 2
┃!amor @ @ - % amor
┃!quando - Quando acontece
┃!morte @ - Quando morre
┃!rankgay - Rank gay
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menufig") return reply(`┏━━━━ 🎨 FIG ━━━━┓
┃!s - Foto vira fig
┃!s [texto] - Texto vira fig
┃!toimg - Fig vira foto
┃!attp [texto] - Texto piscando
┃!roubar [nome] - Rouba fig
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menulogos") return reply(`┏━━━━ 🖌️ LOGOS ━━━━┓
┃!logo1 [texto] - Logo1
┃!neon [texto] - Neon
┃!3d [texto] - Texto 3D
┃!grafite [texto] - Grafite
┃!glitch [a|b] - Glitch
┃!harry [texto] - Harry Potter
┃!blackpink [texto] - BlackPink
┗━━━━━━━━━━━━━━━━━━━━┛`);
if(cmd=="menudl") return reply(`┏━━━━ 📥 DOWNLOADS ━━━━┓
┃!play [nome] - Música
┃!ytmp3 [link] - YT MP3
┃!ytmp4 [link] - YT MP4
┃!tiktok [link] - TikTok
┃!insta [link] - Instagram
┃!fb [link] - Facebook
┗━━━━━━━━━━━━━━━━━━━━┛`);

if(cmd=="ban"||cmd=="kick"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid; if(!w) return reply("Marca @"); await sock.groupParticipantsUpdate(jid,w,"remove"); return reply("✅ Banido"); }
if(cmd=="promover"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid; await sock.groupParticipantsUpdate(jid,w,"promote"); return reply("👑 Promovido ADM"); }
if(cmd=="rebaixar"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid; await sock.groupParticipantsUpdate(jid,w,"demote"); return reply("Rebaixado"); }
if(cmd=="admins"){ let a=meta.participants.filter(p=>p.admin).map(p=>p.id); return await sock.sendMessage(jid,{text:`👑 ADMINS (${a.length})\n${a.map(x=>`@${x.split("@")[0]}`).join("\n")}`, mentions:a}); }
if(cmd=="link"){ let l=await sock.groupInviteCode(jid); return reply(`https://chat.whatsapp.com/${l}`); }
if(cmd=="abrir") return await sock.groupSettingUpdate(jid,"not_announcement");
if(cmd=="fechar") return await sock.groupSettingUpdate(jid,"announcement");
if(cmd=="todos"||cmd=="hidetag"||cmd=="marcar"){ await sock.sendMessage(jid,{text:q||" ", mentions:meta.participants.map(p=>p.id)}); return; }

if(cmd=="adotarpet"){ pets[sender]={nome:q||"Rex", fome:100, feliz:100, level:1}; return reply(`✅ Adotou ${q||"Rex"} 🐾`); }
if(cmd=="pet"){ if(!pets[sender]) return reply("Sem pet!!adotarpet [nome]"); let p=pets[sender]; return reply(`🐾 ${p.nome}\nFome: ${p.fome}%\nFeliz: ${p.feliz}%\nLv: ${p.level}`); }
if(cmd=="saldo"||cmd=="dinheiro"){ return reply(`💰 Saldo: R$${getEco(sender).dinheiro}`); }
if(cmd=="trabalhar"){ let v=Math.floor(Math.random()*500)+100; getEco(sender).dinheiro+=v; return reply(`💼 Trabalhou +R$${v}\nSaldo: R$${getEco(sender).dinheiro}`); }
if(cmd=="daily"){ getEco(sender).dinheiro+=500; return reply(`✅ Daily +R$500\nSaldo: R$${getEco(sender).dinheiro}`); }
if(cmd=="ping") return reply("🏓 STARBOT 556282575515 ONLINE\nDono 5534997763828\nPing: "+Date.now()%1000+"ms");
if(cmd=="perfil"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||sender; let l=getLevel(w); return await sock.sendMessage(jid,{text:`👤 @${w.split("@")[0]}\nLevel: ${l.level}\nXP: ${l.xp}\nSaldo: R$${getEco(w).dinheiro}`, mentions:[w]}); }
if(cmd=="level") return reply(`⬆️ Level ${lv.level}\nXP: ${lv.xp}/${lv.level*100}`);
if(cmd=="dado") return reply(`🎲 Caiu: ${Math.floor(Math.random()*6)+1}`);
if(cmd=="gay"||cmd=="gado"||cmd=="corno"){ let w=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||sender; return await sock.sendMessage(jid,{text:`🏳️‍🌈 @${w.split("@")[0]} ${Math.floor(Math.random()*101)}% ${cmd}`, mentions:[w]}); }
if(cmd=="beijar"||cmd=="beijo"||cmd=="kiss") return await sendAcao(sock,jid,m,sender,"beijar");
if(cmd=="abraçar"||cmd=="abracar"||cmd=="hug") return await sendAcao(sock,jid,m,sender,"abraçar");
if(cmd=="tapa"||cmd=="tapar"||cmd=="slap") return await sendAcao(sock,jid,m,sender,"tapar");
if(cmd=="socar"||cmd=="soco") return await sendAcao(sock,jid,m,sender,"socar");
if(cmd=="chutar"||cmd=="chute") return await sendAcao(sock,jid,m,sender,"chutear");
if(cmd=="matar"||cmd=="kill") return await sendAcao(sock,jid,m,sender,"matar");
if(cmd=="lamber") return await sendAcao(sock,jid,m,sender,"lamber");
if(cmd=="morder") return await sendAcao(sock,jid,m,sender,"morder");
if(cmd=="cafune"||cmd=="pat") return await sendAcao(sock,jid,m,sender,"cafune");
if(cmd=="s"){ try{ let buf=await sock.downloadMediaMessage(m,'buffer',{},{}); await sock.sendMessage(jid,{sticker:buf},{quoted:m}); }catch{ return reply("Manda foto com!s"); } return; }
if(cmd=="toimg"){ try{ let buf=await sock.downloadMediaMessage(m,'buffer',{},{}); await sock.sendMessage(jid,{image:buf, caption:"✅ ToImg"},{quoted:m}); }catch{ return reply("Marca figurinha com!toimg"); } return; }
if(cmd.startsWith("logo")) return reply(`🖌️ Logo ${cmd} gerado: ${q}\n(Conecta API de logos depois)`);
});
}
iniciar();
