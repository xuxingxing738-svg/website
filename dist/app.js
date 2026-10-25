"use strict";

const $ = s => document.querySelector(s);
const screen = $("#screen"), stage = $("#stage"), canvas = $("#game"), ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const state = {
  participantId: `life_${Date.now().toString(36)}`,
  surname: "林", avatar: 0, muted: false,
  blockOrder: shuffle([10,5,1]), setOrder: shuffle(["A","B","C"]), amountMap: Math.random() < .5 ? "X" : "Y",
  blockIndex: 0, trialIndex: 0, trials: [], logs: [], recalls: [], ratings: {},
  scene: "title", dialogOpen: false, currentAdvance: null, trialStartedAt: 0,
  office: { doorOpen: false, card: false, offerKind: "shoppingcard", folders: false, document: false, knock: false },
  actors: {
    player: { x: 320, y: 138, visible: true, palette: 0, facing: "down" },
    secretary: { x: 596, y: 105, visible: false, palette: 1, facing: "left" },
    visitor: { x: 596, y: 105, visible: false, palette: 2, facing: "left" }
  },
  tutorial: { shelf:false, water:false, computer:false }, tutorialPlayer: { x:575, y:150, dir:"left" }
};

const palettes = [
  { skin:"#efb07d", hair:"#33251f", coat:"#294a70", shirt:"#eee7d8" },
  { skin:"#e5a278", hair:"#1f2027", coat:"#526b80", shirt:"#f0e7da" },
  { skin:"#c98c67", hair:"#221a1d", coat:"#755a42", shirt:"#eee5d6" },
  { skin:"#f0bd91", hair:"#65412f", coat:"#554b75", shirt:"#f1eadf" },
  { skin:"#f2bd91", hair:"#291f28", coat:"#8b3f56", shirt:"#f5dfc8" },
  { skin:"#d99a70", hair:"#171923", coat:"#34706a", shirt:"#e8d8bd" },
  { skin:"#9f684d", hair:"#19171a", coat:"#66508e", shirt:"#f0d7bc" },
  { skin:"#f4c79f", hair:"#a59a8d", coat:"#46658c", shirt:"#f2eadf" },
  { skin:"#c9825d", hair:"#41291f", coat:"#9a642f", shirt:"#f1dfc4" },
  { skin:"#e7aa80", hair:"#241f1d", coat:"#477a42", shirt:"#f3e3cc" },
  { skin:"#7f523f", hair:"#15171d", coat:"#a64a3f", shirt:"#f0cfaa" },
  { skin:"#efb88a", hair:"#c8bcb0", coat:"#3c7180", shirt:"#f6e8d4" }
];

function shuffle(xs){ const a=[...xs]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const wait = ms => new Promise(r => setTimeout(r, ms));
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function setTimeBadge(years){const b=$("#timeBadge");if(!b)return;b.hidden=years==null;b.textContent=years==null?"":`距离任约 ${years} 年`;}
function showScreen(html){ screen.innerHTML=html; screen.hidden=false; stage.hidden=true; setTimeBadge(null); window.scrollTo(0,0); }
function showStage(){ screen.hidden=true; stage.hidden=false; }
function toast(text){ const el=$("#toast"); el.textContent=text; el.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),1400); }

function showTitle(){
  state.scene="title";
  showScreen(`<div class="sheet title-sheet"><p class="eyebrow">PIXEL CAREER SIMULATION</p><h1 class="title">模拟人生</h1><p class="subtitle">一段职业人生，由许多个普通的工作日组成。</p><div class="hero-city"><div class="cloud c1"></div><div class="cloud c2"></div><div class="moon"></div><i class="building b1"></i><i class="building b2"></i><i class="building b3"></i><i class="building b4"></i><i class="car car1"></i><i class="car car2"></i><div class="street"></div></div><div class="prose"><p>你将来到虚构的青川市，担任城市发展委员会主任委员，体验若干个被随机打开的职业工作日。</p></div><button id="startBtn" class="btn primary">开始一段人生 <kbd>Space</kbd></button></div>`);
  $("#startBtn").onclick=showConsent;
}

function showConsent(){
  showScreen(`<div class="sheet"><p class="eyebrow">参与说明</p><h1 class="title small">公共管理者日常决策模拟</h1><div class="paper-note"><p>你将在像素风小游戏中扮演一位委员会主席，处理日常工作中的各种事务。游戏中可能涉及公务违规的情境。</p><p>所有人物、单位和情节都是虚构的，你的选择不代表对你本人的任何评价。请按照你认为这个角色在现实中最可能的做法选择，选择没有对错之分。</p><p>全程约25–30分钟。本Demo的数据只保存在你的浏览器中，不会自动上传。</p></div><label class="check-row"><input id="agree" type="checkbox">我已阅读并愿意进入体验</label><div class="row"><button id="consentBtn" class="btn primary" disabled>继续 <kbd>Space</kbd></button><button id="backBtn" class="btn ghost">返回</button></div></div>`);
  $("#agree").onchange=e=>$("#consentBtn").disabled=!e.target.checked; $("#consentBtn").onclick=showAvatarSetup; $("#backBtn").onclick=showTitle;
}

function showAvatarSetup(){
  showScreen(`<div class="sheet"><p class="eyebrow">角色创建</p><h1 class="title small">这段人生中的你</h1><p class="subtitle">选择一个形象，并填写同事称呼你的姓氏。</p><div class="avatars">${palettes.slice(0,4).map((_,i)=>`<button class="avatar-card" data-i="${i}" aria-label="形象 ${i+1}" aria-pressed="${i===state.avatar}"><canvas width="72" height="72"></canvas></button>`).join("")}</div><label class="form-label">游戏姓氏<input id="surname" class="text-input" maxlength="2" value="${esc(state.surname)}"></label><button id="createBtn" class="btn primary">确认角色 <kbd>Space</kbd></button></div>`);
  document.querySelectorAll(".avatar-card").forEach((b,i)=>{ drawPortrait(b.querySelector("canvas"),i); b.onclick=()=>{state.avatar=i;document.querySelectorAll(".avatar-card").forEach((x,j)=>x.setAttribute("aria-pressed",j===i));}; });
  $("#createBtn").onclick=()=>{const v=$("#surname").value.trim().replace(/[^\u4e00-\u9fa5A-Za-z]/g,"").slice(0,2);state.surname=v||"林";showCinema(0);};
}

const cinemaFrames=[
  ["有些人生，由一次任命开始。","city"],
  ["兹聘任你担任青川市城市发展委员会主任委员。","letter"],
  ["在聘期内，你对部分公共项目评审、资源配置与例外事项拥有最终裁决权。","power"],
  ["主任委员实行固定聘任制，每届任期12年；届满后，本届职权自动移交下一任。","calendar"],
  ["秘书小陈已经在办公室门口等你。","secretary"]
];
function showCinema(i){ const [line,kind]=cinemaFrames[i],last=i===cinemaFrames.length-1; showScreen(`<div class="cinema"><div class="cinema-card"><div class="cinema-visual ${kind}"><span>${kind==="letter"?"聘任书":kind==="calendar"?"12 YEARS":"青川"}</span></div><p class="cinema-line">${line}</p><button id="cinemaNext" class="btn primary">${last?"进入办公室":"继续"} <kbd>Space</kbd></button></div></div>`); $("#cinemaNext").onclick=()=>last?startTutorial():showCinema(i+1); }

function startTutorial(){
  state.scene="tutorial"; showStage(); state.tutorial={shelf:false,water:false,computer:false}; state.tutorialPlayer={x:575,y:150,dir:"left"}; resetOffice();
  setTimeBadge(null);
  $("#chapterTag").textContent="办公室熟悉 · 教程"; $("#hint").textContent="鼠标点击发光物品，或用方向键 / WASD移动，E互动；空格键继续对话";
  $("#objective").textContent="熟悉办公室：取工作手册 · 接水 · 查看工作台";
  state.actors.player.visible=false; state.actors.secretary.visible=true; state.actors.secretary.x=552;state.actors.secretary.y=165;
  setDialog("小陈",`${state.surname}主任，您的办公室已经整理好了。正式开始今天的工作前，您可以先熟悉一下这里。`,[{label:"开始熟悉办公室",fn:closeDialog}],"secretary");
}

function tutorialInteract(kind){
  if(state.dialogOpen) return;
  const copy={shelf:["工作手册","你取出《青川市城市发展委员会工作手册》。作为主任委员，你需要对部分项目评审、资源配置和例外事项作出最终决定。"],water:["旁白","你接了一杯温水，并把水杯放到办公桌边。"]}[kind];
  if(kind==="computer"){
    state.tutorial.computer=true; const n=Object.values(state.tutorial).filter(Boolean).length;
    $("#objective").textContent=`办公室熟悉 ${n}/3：${n===3?"已完成":"继续查看发光物品"}`;
    showRoleProfile(()=>{if(n===3)tutorialFinish();}); return;
  }
  if(!copy) return; state.tutorial[kind]=true; const n=Object.values(state.tutorial).filter(Boolean).length; $("#objective").textContent=`办公室熟悉 ${n}/3：${n===3?"已完成":"继续查看发光物品"}`;
  setDialog(copy[0],copy[1],[{label:"知道了",fn:()=>{closeDialog();if(n===3)tutorialFinish();}}],kind==="computer"?"computer":"narrator");
}
function showRoleProfile(onClose){
  state.dialogOpen=true; const modal=$("#modal"); modal.hidden=false;
  modal.innerHTML=`<div class="modal-card role-profile"><div class="profile-head"><canvas id="profilePortrait" width="72" height="72"></canvas><div><p class="eyebrow">工作台 · 人事档案</p><h2>${esc(state.surname)}主任</h2><p>青川市城市发展委员会主任委员</p></div><span class="profile-stamp">在任</span></div><dl><dt>身份</dt><dd>本届主任委员，负责委员会日常决策</dd><dt>任期制度</dt><dd>固定聘任制，每届 12 年</dd><dt>当前权限</dt><dd>项目评审、资源配置与例外事项最终裁决</dd><dt>工作状态</dt><dd>已熟悉岗位制度，独立承担最终决定</dd><dt>办公室秘书</dt><dd>小陈，负责材料递送与来访通报</dd><dt>今日安排</dt><dd>待处理事项将由秘书依次送入办公室</dd></dl><button id="closeProfile" class="btn primary">关闭档案，返回办公室 <kbd>Space</kbd></button></div>`;
  drawPortrait($("#profilePortrait"),state.avatar);
  const close=()=>{modal.hidden=true;modal.innerHTML="";state.dialogOpen=false;state.currentAdvance=null;onClose?.();};
  state.currentAdvance=close; $("#closeProfile").onclick=close;
}
function tutorialFinish(){ setDialog("小陈","主任，看起来您已经熟悉了。接下来会陆续有一些工作需要您处理。有的是内部事务，有的是项目材料，也可能有来访者。您按自己的判断处理就好。",[{label:"准备好了",fn:()=>{closeDialog();showCorridor();}}],"secretary"); }

function showCorridor(){
  state.scene="corridor"; const done=state.blockIndex;
  showScreen(`<div class="corridor"><div class="pixel-stars"></div><div class="hall-light"></div><div class="sheet center corridor-sheet"><p class="eyebrow">人生回廊</p><h1 class="title small">${done?"打开下一页职业日记":"随机翻开一页职业日记"}</h1><p class="subtitle">片段不按年份顺序排列。请把自己当成“那个时刻的你”。</p><div class="doors">${[0,1,2].map(i=>`<div class="door-wrap"><div class="door ${i<done?"done":""}"><span>${i<done?"":"???"}</span><i class="door-glow"></i></div></div>`).join("")}</div><button id="openDoor" class="btn primary">${done?"打开下一段人生":"打开第一段人生"} <kbd>Space</kbd></button><p class="progress-note">已体验 ${done}/3 段职业人生</p><div id="pixelTransition" class="pixel-transition"></div></div></div>`);
  $("#openDoor").onclick=()=>runDoorLottery([...document.querySelectorAll(".door:not(.done)")]);
}
async function runDoorLottery(doors){
  if(!doors.length) return; const button=$("#openDoor"),note=$(".progress-note"); button.disabled=true;
  note.textContent="正在随机抽取人生片段……";
  const target=Math.floor(Math.random()*doors.length),steps=doors.length*5+target+1;
  for(let i=0;i<steps;i++){
    doors.forEach(d=>d.classList.remove("slot-active")); doors[i%doors.length].classList.add("slot-active");
    await wait(65+Math.round(165*Math.pow(i/Math.max(1,steps-1),2)));
  }
  const chosen=doors[target]; doors.forEach(d=>d.classList.remove("slot-active")); chosen.classList.add("slot-active");
  note.textContent="抽取完成，正在打开这段人生……"; await wait(420); chosen.classList.remove("slot-active"); chosen.classList.add("opening");
  await wait(650); $("#pixelTransition").classList.add("active"); await wait(800); showDossier();
}

function showDossier(){
  const years=state.blockOrder[state.blockIndex];
  showScreen(`<div class="sheet"><p class="eyebrow">职业人生片段 ${state.blockIndex+1}/3</p><div class="dossier dossier-enter"><div class="dossier-head"><span>今天的人物状态卡</span><span class="stamp">内部</span></div><dl><dt>单位</dt><dd>青川市城市发展委员会</dd><dt>职务</dt><dd>主任委员</dd><dt>当前权限</dt><dd>项目评审、资源配置与例外事项最终裁决</dd><dt>岗位状态</dt><dd>已熟悉岗位与制度</dd><dt>秘书</dt><dd>小陈</dd><dt>今日待办</dt><dd>等待秘书递送</dd><dt>距本届聘期结束</dt><dd class="time-value">约 ${years} 年</dd></dl><p class="dossier-note">请根据这一页人生片段中的信息做出判断。</p></div><button id="enterBlock" class="btn primary">开始今天的工作 <kbd>Space</kbd></button></div>`);
  $("#enterBlock").onclick=startBlock;
}

function amountFor(event){ const odd=Number(event.id.slice(-2))%2===1; const low=state.amountMap==="X"?odd:!odd; return low?500:20000; }
function constrainedOrder(items){
  for(let tries=0;tries<3000;tries++){
    const first=shuffle(items.filter(x=>x.type==="ordinary"))[0], rest=shuffle(items.filter(x=>x!==first)), out=[first,...rest]; let ok=true;
    for(let i=2;i<out.length;i++) if(out[i].type===out[i-1].type&&out[i].type===out[i-2].type) ok=false;
    const bs=out.filter(x=>x.type==="bribe"); for(let i=2;i<bs.length;i++) if(bs[i].amount===bs[i-1].amount&&bs[i].amount===bs[i-2].amount) ok=false;
    if(ok) return out;
  }
  return items;
}
function makeTrials(set){ return constrainedOrder(MATERIALS[set].map(x=>x.type==="bribe"?{...x,amount:amountFor(x)}:{...x,options:shuffle(x.options.map((label,i)=>({label,code:i===0?"A":"B"})))})); }

function startBlock(){
  state.scene="block"; state.trialIndex=0; const set=state.setOrder[state.blockIndex]; state.trials=makeTrials(set); resetOffice(); showStage();
  const remainingYears=state.blockOrder[state.blockIndex]; setTimeBadge(remainingYears);
  state.actors.player.visible=true; state.actors.player.palette=state.avatar; state.actors.secretary.visible=false; state.actors.visitor.visible=false;
  $("#chapterTag").textContent=`人生片段 ${state.blockIndex+1}/3 · 办公室的一天`;
  $("#hint").textContent="鼠标点击选项 · 空格键继续对话 · 数字键1/2/3选择"; setObjective();
  enterSecretary().then(()=>setDialog("小陈",`${state.surname}主任，今天的工作已经开始了。我会把需要您决定的材料送进来，有来访者时也会先向您通报。`,[{label:"开始今天的工作",fn:()=>{closeDialog();exitSecretary().then(nextTrial);}}],"secretary"));
}
function setObjective(){ $("#objective").innerHTML=`<b>办公室的一天</b><span>·</span>${state.trialIndex===0?"正在准备待办材料":"小陈正在安排下一项工作"}`; }
function resetOffice(){ Object.assign(state.office,{doorOpen:false,card:false,offerKind:"shoppingcard",folders:false,document:false,knock:false}); }

async function nextTrial(){
  if(state.trialIndex>=20) return endBlock(); setObjective(); const trial=state.trials[state.trialIndex]; state.currentTrial=trial;
  state.office.card=false;state.office.folders=false;state.office.document=false; await wait(300);
  if(trial.type==="bribe") runBribe(trial); else if(trial.type==="performance") runPerformance(trial); else runOrdinary(trial);
}

async function runBribe(trial){
  $("#objective").innerHTML="<b>办公室的一天</b><span>·</span>正在接待来访人员";
  Object.assign(state.actors.visitor,{palette:2,hair:"short",accessory:"none"},trial.appearance||{});
  state.office.knock=true; toast("咚、咚、咚——有人敲门"); await wait(550); state.office.knock=false; await enterSecretary();
  setDialog("小陈",`${state.surname}主任，${trial.visitor}到了，想谈一下“${trial.title}”。`,[{label:"让他进来",fn:async()=>{closeDialog();await enterVisitor();setDialog("小陈","好的，那我先出去，有事您叫我。",[{label:"继续",fn:async()=>{closeDialog();await exitSecretary();visitorBrief(trial);}}],"secretary");}}],"secretary");
}
function visitorBrief(trial){
  const who=trial.visitor.replace(/^.*的/,"");
  setDialog(who,`${trial.opening}\n\n${trial.text}`,[{label:"听他继续说",fn:()=>setDialog(who,trial.request,[{label:"继续",fn:()=>offerCard(trial,who)}],"visitor")}],"visitor");
}
function offerCard(trial,who){
  state.office.card=true; state.office.offerKind=trial.carrier.kind; state.trialStartedAt=performance.now();
  setDialog(who,`（${trial.carrier.action}）\n\n“${trial.offer}”\n\n${trial.carrier.label}：¥${trial.amount.toLocaleString()}`,[
    {label:"收下，并答应在该事项上提供帮助",fn:()=>recordDecision(trial,"accept")},
    {label:"拒绝好处，按正常程序处理",fn:()=>recordDecision(trial,"reject")},
    {label:"拒绝并报告相关情况",fn:()=>recordDecision(trial,"report")}
  ],"visitor",true);
}
async function runPerformance(trial){ $("#objective").innerHTML="<b>办公室的一天</b><span>·</span>正在审阅方案"; await enterSecretary(); state.office.folders=true; setDialog("小陈",`主任，这件事需要您定一下方向。\n\n${trial.lead}`,trial.options.map(o=>({label:o.label,fn:()=>recordDecision(trial,o.code)})),"secretary",true); state.trialStartedAt=performance.now(); }
async function runOrdinary(trial){ $("#objective").innerHTML="<b>办公室的一天</b><span>·</span>正在处理常规事务"; await enterSecretary(); state.office.document=true; setDialog("小陈",`主任，这里有一项常规事务需要您定一下。\n\n${trial.lead}`,trial.options.map(o=>({label:o.label,fn:()=>recordDecision(trial,o.code)})),"secretary",true); state.trialStartedAt=performance.now(); }

function recordDecision(trial,choice){
  const rt=Math.round(performance.now()-state.trialStartedAt);
  state.logs.push({participant_id:state.participantId,time_order:state.blockOrder.join("-"),set_order:state.setOrder.join("-"),amount_map:state.amountMap,block_position:state.blockIndex+1,remaining_years:state.blockOrder[state.blockIndex],event_set:state.setOrder[state.blockIndex],trial_index:state.trialIndex+1,trial_type:trial.type,event_id:trial.id,bribe_amount:trial.amount||null,benefit_carrier:trial.carrier?.kind||null,choice,accept:choice==="accept"?1:trial.type==="bribe"?0:null,rt_ms:rt,timestamp:new Date().toISOString()});
  if(trial.type==="bribe") finishBribe(); else finishSecretaryTrial(trial.type);
}
function finishBribe(){
  state.office.card=false; const who=state.currentTrial.visitor.replace(/^.*的/,"");
  setDialog(who,"好的，我明白了。那我先告辞。",[{label:"下一项工作",fn:async()=>{closeDialog();await enterSecretary();await exitTogether();advanceTrial();}}],"visitor");
}
function finishSecretaryTrial(type){
  state.office.folders=false;state.office.document=false; const line=type==="performance"?"好的，我按这个方向继续准备。":"好的，我去安排。";
  setDialog("小陈",line,[{label:"下一项工作",fn:async()=>{closeDialog();await exitSecretary();advanceTrial();}}],"secretary");
}
function advanceTrial(){ state.trialIndex++; setObjective(); nextTrial(); }

function endBlock(){
  state.scene="recall"; const years=state.blockOrder[state.blockIndex];
  showScreen(`<div class="sheet"><p class="eyebrow">今天的工作结束了</p><h1 class="title small">档案回顾</h1><p class="subtitle">系统会保存这一页人生片段。在离开之前，请确认三条信息。</p><form id="recallForm" class="recall-form">
    ${radioQ("role","这一片段中你的职位是？",["主任委员","普通委员","秘书","项目经理"])}
    ${radioQ("years","距离本届聘期结束大约还有多久？",["10年","5年","1年","不记得"])}
    ${radioQ("secretary","今天你的秘书是谁？",["小陈","小林","小周","不记得"])}
    <button class="btn primary" type="submit">保存并返回人生回廊 <kbd>Space</kbd></button></form></div>`);
  $("#recallForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);if(!fd.get("role")||!fd.get("years")||!fd.get("secretary"))return alert("请完成三道回顾题。");state.recalls.push({remaining_years:years,role:fd.get("role"),years:fd.get("years"),secretary:fd.get("secretary")});state.blockIndex++;if(state.blockIndex<3)showCorridor();else showRatings();};
}
function radioQ(name,title,opts){return `<fieldset><legend>${title}</legend>${opts.map(o=>`<label><input type="radio" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</fieldset>`;}

const ratingItems=[
  ["remaining","你觉得自己的本届任期还剩得多还是少？","非常接近结束","还很久"],
  ["power","你觉得自己当前的决定权有多大？","很小","很大"],
  ["opportunity","从这个片段往后，你还有多少机会继续使用当前权力？","非常少","非常多"],
  ["ending","你有多强烈地感觉本届任期正在接近结束？","完全没有","非常强烈"],
  ["familiarity","你觉得自己对当前岗位有多熟悉？","非常陌生","非常熟悉"],
  ["inference","你是否觉得聘期较短意味着角色表现较差或受到了处罚？","完全没有","非常强"]
];
function showRatings(){
  showScreen(`<div class="sheet wide"><p class="eyebrow">三段人生已完成</p><h1 class="title small">对三个片段的整体感受</h1><p class="subtitle">请分别回想距本届聘期结束10年、5年和1年的三个片段。</p><form id="ratingForm" class="rating-form">${ratingItems.map(([key,q,l,r])=>`<section class="rating-card"><h3>${q}</h3><div class="rating-grid"><span></span><b>10年</b><b>5年</b><b>1年</b><span class="scale-left">${l}</span>${[10,5,1].map(y=>`<label><input required type="range" min="1" max="7" value="4" name="${key}_${y}"><output>4</output></label>`).join("")}<span class="scale-right">${r}</span></div></section>`).join("")}<label class="form-label">你觉得这个游戏主要想研究什么？<textarea name="purpose" rows="3"></textarea></label><label class="form-label">你注意到三个职业人生片段有哪些不同？<textarea name="awareness" rows="3"></textarea></label><button class="btn primary" type="submit">完成游戏</button></form></div>`);
  document.querySelectorAll('input[type="range"]').forEach(x=>x.oninput=()=>x.nextElementSibling.value=x.value);
  $("#ratingForm").onsubmit=e=>{e.preventDefault();state.ratings=Object.fromEntries(new FormData(e.target));showSummary();};
}

function showSummary(){
  const bribes=state.logs.filter(x=>x.trial_type==="bribe"),accepted=bribes.filter(x=>x.choice==="accept").length,perf=state.logs.filter(x=>x.trial_type==="performance").length;
  showScreen(`<div class="sheet wide"><p class="eyebrow">体验完成</p><h1 class="title small">这一段模拟人生已存档</h1><div class="summary-grid"><div class="metric"><b>${state.logs.length}</b><span>已完成决策</span></div><div class="metric"><b>${bribes.length}</b><span>不当利益情境</span></div><div class="metric"><b>${perf}</b><span>政绩取向情境</span></div><div class="metric"><b>${accepted}</b><span>选择收下</span></div></div><div class="paper-note"><h3>事后说明</h3><p>本游戏实际操纵了“距本届聘期结束10年 / 5年 / 1年”以及“不当利益价值¥500 / ¥20,000”。利益通过红包、购物卡、礼品、电子礼品兑换码等不同情境化载体呈现，用于考察权力剩余时间与利益价值对决策的影响。</p></div><div class="row"><button id="download" class="btn primary">下载本地JSON数据</button><button id="restart" class="btn ghost">重新体验</button></div><details><summary>查看研究流程记录</summary><pre>${esc(JSON.stringify({participant_id:state.participantId,block_order:state.blockOrder,set_order:state.setOrder,amount_map:state.amountMap,recalls:state.recalls,ratings:state.ratings},null,2))}</pre></details></div>`);
  $("#download").onclick=downloadData; $("#restart").onclick=()=>location.reload();
}
function downloadData(){const payload={meta:{participant_id:state.participantId,time_order:state.blockOrder,set_order:state.setOrder,amount_map:state.amountMap,exported_at:new Date().toISOString()},trials:state.logs,recalls:state.recalls,ratings:state.ratings};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));a.download=`simulation_life_${state.participantId}.json`;a.click();URL.revokeObjectURL(a.href);}

function setDialog(speaker,line,choices=[],portrait="narrator",decision=false){
  state.dialogOpen=true; state.currentAdvance=null; const dialog=$("#dialog"); dialog.hidden=false; dialog.classList.remove("talking"); void dialog.offsetWidth; dialog.classList.add("talking"); $("#speaker").textContent=speaker; $("#line").textContent=line;
  drawPortrait($("#portrait"),portrait==="secretary"?1:portrait==="visitor"?(state.currentTrial?.appearance||2):portrait==="computer"?3:state.avatar);
  const box=$("#choices");box.innerHTML="";
  choices.forEach((c,i)=>{const b=document.createElement("button");b.className=`choice ${decision?"decision":""}`;b.innerHTML=`<span class="n">${i+1}</span>${esc(c.label)}`;b.onclick=()=>c.fn();box.appendChild(b);});
  if(choices.length===1) state.currentAdvance=choices[0].fn;
}
function closeDialog(){state.dialogOpen=false;state.currentAdvance=null;$("#dialog").hidden=true;}

async function moveActor(name,x,y,duration=650){
  const a=state.actors[name],sx=a.x,sy=a.y,start=performance.now(); a.visible=true; a.walking=true; a.facing=x<sx?"left":x>sx?"right":y<sy?"up":"down";
  return new Promise(resolve=>{function step(now){const t=Math.min(1,(now-start)/duration),e=1-Math.pow(1-t,3);a.x=sx+(x-sx)*e;a.y=sy+(y-sy)*e;if(t<1)requestAnimationFrame(step);else{a.walking=false;resolve();}}requestAnimationFrame(step);});
}
async function enterSecretary(){state.office.doorOpen=true;const a=state.actors.secretary;a.visible=true;a.x=598;a.y=112;await moveActor("secretary",475,246,620);state.office.doorOpen=false;}
async function exitSecretary(){state.office.doorOpen=true;await moveActor("secretary",598,112,600);state.actors.secretary.visible=false;state.office.doorOpen=false;}
async function enterVisitor(){state.office.doorOpen=true;const a=state.actors.visitor;a.visible=true;a.x=598;a.y=112;await Promise.all([moveActor("secretary",500,230,420),moveActor("visitor",375,255,760)]);state.office.doorOpen=false;}
async function exitTogether(){state.office.doorOpen=true;await Promise.all([moveActor("visitor",598,112,720),moveActor("secretary",560,135,650)]);state.actors.visitor.visible=false;state.actors.secretary.visible=false;state.office.doorOpen=false;}

function drawPortrait(c,look){
  const a=typeof look==="number"?{palette:look,hair:"short",accessory:"none"}:(look||{palette:0}),x=c.getContext("2d"),p=palettes[a.palette]||palettes[0];
  x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);x.fillStyle="#20283d";x.fillRect(0,0,c.width,c.height);
  x.fillStyle=p.hair;
  if(["long","bob","graybob"].includes(a.hair)){x.fillRect(16,9,40,39);x.fillRect(13,24,7,26);x.fillRect(52,24,7,26);}
  else if(a.hair==="bun"){x.fillRect(25,4,23,12);x.fillRect(18,11,37,22);}
  else if(a.hair==="buzz"){x.fillRect(21,12,32,9);}
  else if(a.hair==="fade"){x.fillRect(22,8,31,15);x.fillRect(18,15,7,13);}
  else if(a.hair==="side"){x.fillRect(18,8,38,17);x.fillRect(18,18,9,18);}
  else{x.fillRect(19,10,34,22);}
  x.fillStyle=p.skin;x.fillRect(22,18,28,25);x.fillStyle=p.hair;if(["long","bob","graybob","bun"].includes(a.hair)){x.fillRect(18,17,7,25);x.fillRect(48,17,7,25);}else{x.fillRect(19,17,5,13);x.fillRect(49,17,5,13);}
  x.fillStyle="#211b1a";x.fillRect(28,29,4,4);x.fillRect(41,29,4,4);
  if(a.accessory==="glasses"){x.strokeStyle="#d8c46e";x.lineWidth=2;x.strokeRect(25,26,10,9);x.strokeRect(38,26,10,9);x.fillStyle="#d8c46e";x.fillRect(35,29,3,2);}
  if(a.accessory==="earrings"){x.fillStyle="#e9c45c";x.fillRect(19,35,3,4);x.fillRect(51,35,3,4);}
  x.fillStyle=p.coat;x.fillRect(16,43,42,25);x.fillStyle=p.shirt;x.fillRect(31,43,12,18);if(a.accessory==="tie"){x.fillStyle="#a83e3b";x.fillRect(34,46,6,13);}
}

function drawOffice(){
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#97947d";ctx.fillRect(0,0,w,90);ctx.fillStyle="#3f4435";ctx.fillRect(0,88,w,30);
  ctx.fillStyle="#93816a";ctx.fillRect(0,118,w,h-118);ctx.strokeStyle="#756650";ctx.lineWidth=3;
  for(let y=120;y<h;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();for(let x=(Math.floor(y/34)%2)*80;x<w;x+=160){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+34);ctx.stroke();}}
  ctx.fillStyle="#667080";ctx.fillRect(8,18,68,100);for(let y=32;y<112;y+=26){ctx.fillStyle="#758093";ctx.fillRect(14,y,56,19);ctx.fillStyle="#cbd0d6";ctx.fillRect(35,y+7,15,4);}
  ctx.fillStyle="#543925";ctx.fillRect(88,9,82,122);for(let y=18;y<120;y+=38){ctx.fillStyle="#382719";ctx.fillRect(95,y,68,33);for(let x=98;x<158;x+=10){ctx.fillStyle=["#a33d3d","#47728c","#d1a34f","#5a8c5e","#76527e"][Math.floor(x/10)%5];ctx.fillRect(x,y+5,7,25);}}
  ctx.fillStyle="#ece8dc";ctx.fillRect(184,10,74,78);ctx.fillStyle="#a84239";ctx.fillRect(184,10,74,16);ctx.fillStyle="#fff2df";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillText("任 期 日 历",221,21);
  ctx.fillStyle="#635b50";ctx.font="bold 10px sans-serif";ctx.fillText(state.scene==="block"?"距 离 任":"固定聘任制",221,45);
  ctx.fillStyle=state.scene==="block"?"#a43f3c":"#4d5362";ctx.font="bold 17px monospace";ctx.fillText(state.scene==="block"?`约 ${state.blockOrder[state.blockIndex]} 年`:"12 年",221,67);ctx.textAlign="left";
  ctx.fillStyle="#506273";ctx.fillRect(322,0,132,76);ctx.fillStyle="#a9cee0";ctx.fillRect(328,6,56,28);ctx.fillRect(392,6,56,28);ctx.fillRect(328,42,56,28);ctx.fillRect(392,42,56,28);ctx.fillStyle="#e5dfc9";ctx.fillRect(316,74,144,10);
  ctx.fillStyle="#eceeef";ctx.fillRect(500,35,42,80);ctx.fillStyle="#80b9d8";ctx.fillRect(503,16,36,28);ctx.fillStyle="#2f6bc0";ctx.fillRect(506,58,8,8);ctx.fillStyle="#c54545";ctx.fillRect(522,58,8,8);
  ctx.fillStyle="#3b291c";ctx.fillRect(557,0,76,121);ctx.fillStyle=state.office.doorOpen?"#17161b":"#765033";ctx.fillRect(564,8,62,106);ctx.fillStyle="#5b3822";ctx.fillRect(572,18,46,82);ctx.fillStyle="#e7c864";ctx.fillRect(608,54,8,8);
  ctx.fillStyle="#6f4939";ctx.fillRect(8,255,123,57);ctx.fillStyle="#8c5d49";ctx.fillRect(13,260,113,37);ctx.fillStyle="#70503a";ctx.fillRect(150,280,82,32);ctx.fillStyle="#efe8d6";ctx.fillRect(178,288,18,10);
  ctx.fillStyle="#41577e";ctx.fillRect(244,120,223,156);ctx.fillStyle="#4e648d";ctx.fillRect(252,128,207,140);
  ctx.fillStyle="#93613c";ctx.fillRect(274,170,170,55);ctx.fillStyle="#744629";ctx.fillRect(282,195,65,24);ctx.fillRect(371,195,65,24);ctx.fillStyle="#d9d6cb";ctx.fillRect(308,160,30,13);ctx.fillStyle="#20252b";ctx.fillRect(374,157,27,14);
  if(state.office.document){ctx.fillStyle="#efe8ce";ctx.fillRect(340,180,30,20);ctx.strokeStyle="#8d7957";ctx.strokeRect(340,180,30,20);}
  if(state.office.folders){ctx.fillStyle="#b34542";ctx.fillRect(330,178,32,21);ctx.fillStyle="#3c648a";ctx.fillRect(370,178,32,21);ctx.fillStyle="#fff";ctx.font="bold 10px monospace";ctx.fillText("A",343,192);ctx.fillText("B",383,192);}
  if(state.office.card){drawOfferObject(state.office.offerKind,354,182);}
  ctx.fillStyle="#a55b35";ctx.fillRect(230,92,30,25);ctx.fillStyle="#3d8150";ctx.fillRect(222,66,46,30);ctx.fillStyle="#a55b35";ctx.fillRect(590,303,26,46);ctx.fillStyle="#428653";ctx.fillRect(580,285,48,38);
  drawActors(); if(state.scene==="tutorial") drawTutorialTargets(); if(state.office.knock){ctx.fillStyle="#f1cf65";ctx.font="bold 18px monospace";ctx.fillText("咚 咚",550,135);}
}
function drawActors(){const list=state.scene==="tutorial"?[{...state.tutorialPlayer,visible:true,palette:state.avatar}]:[state.actors.player,state.actors.secretary,state.actors.visitor];list.filter(a=>a.visible).sort((a,b)=>a.y-b.y).forEach(a=>drawSprite(a.x,a.y+(a.walking?Math.round(Math.sin(performance.now()/70)*2):0),palettes[a.palette||0],a.facing,a.hair||"short",a.accessory||"none"));}
function drawOfferObject(kind,x,y){
  if(kind==="redpacket"){ctx.fillStyle="#b53935";ctx.fillRect(x,y,30,17);ctx.fillStyle="#e4b755";ctx.fillRect(x+13,y+2,4,13);return;}
  if(kind==="giftbox"||kind==="specialty"){ctx.fillStyle=kind==="giftbox"?"#8e4d79":"#b7833f";ctx.fillRect(x,y-7,32,24);ctx.fillStyle="#e9c361";ctx.fillRect(x+13,y-7,6,24);ctx.fillRect(x,y+1,32,5);return;}
  if(kind==="ecard"){ctx.fillStyle="#eee5c8";ctx.fillRect(x,y,31,18);ctx.fillStyle="#4c79a7";ctx.fillRect(x+4,y+4,23,3);ctx.fillRect(x+4,y+10,15,2);return;}
  if(kind==="storedcard"){ctx.fillStyle="#4b806a";ctx.fillRect(x,y,31,18);ctx.fillStyle="#e6d26c";ctx.fillRect(x+4,y+5,8,6);return;}
  ctx.fillStyle="#d4b356";ctx.fillRect(x,y,30,17);ctx.fillStyle="#fff4be";ctx.fillRect(x+5,y+4,20,3);
}
function drawSprite(x,y,p,dir="down",hair="short",accessory="none"){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.fillStyle="#0004";ctx.fillRect(-12,18,24,7);ctx.fillStyle=p.coat;ctx.fillRect(-10,-1,20,19);ctx.fillStyle=p.skin;ctx.fillRect(-8,-18,16,16);ctx.fillStyle=p.hair;
  if(["long","bob","graybob"].includes(hair)){ctx.fillRect(-11,-23,22,10);ctx.fillRect(-11,-15,5,20);ctx.fillRect(6,-15,5,20);}
  else if(hair==="bun"){ctx.fillRect(-5,-28,10,7);ctx.fillRect(-10,-22,20,9);ctx.fillRect(-10,-15,4,10);ctx.fillRect(6,-15,4,10);}
  else if(hair==="buzz"){ctx.fillRect(-8,-21,16,5);}
  else if(hair==="fade"){ctx.fillRect(-7,-23,17,8);ctx.fillRect(-10,-18,5,7);}
  else if(hair==="side"){ctx.fillRect(-11,-23,21,9);ctx.fillRect(-11,-16,6,9);}
  else{ctx.fillRect(-10,-22,20,8);ctx.fillRect(-10,-15,4,8);ctx.fillRect(6,-15,4,8);}
  ctx.fillStyle=p.shirt;ctx.fillRect(-4,0,8,10);if(accessory==="tie"){ctx.fillStyle="#a83e3b";ctx.fillRect(-2,1,4,9);}ctx.fillStyle="#1d2430";ctx.fillRect(-8,18,6,8);ctx.fillRect(2,18,6,8);
  if(dir==="down"){ctx.fillStyle="#282020";ctx.fillRect(-5,-11,3,3);ctx.fillRect(3,-11,3,3);if(accessory==="glasses"){ctx.strokeStyle="#d8c46e";ctx.lineWidth=1;ctx.strokeRect(-7,-13,7,6);ctx.strokeRect(1,-13,7,6);}if(accessory==="earrings"){ctx.fillStyle="#e9c45c";ctx.fillRect(-10,-8,2,3);ctx.fillRect(8,-8,2,3);}}
  ctx.restore();
}
function drawTutorialTargets(){const targets=[state.tutorial.shelf?null:{x:130,y:74,label:"工作手册"},state.tutorial.water?null:{x:520,y:74,label:"饮水机"},state.tutorial.computer?null:{x:388,y:160,label:"今日工作台"}].filter(Boolean);ctx.font="12px sans-serif";targets.forEach((t,i)=>{ctx.strokeStyle=i%2?"#78d99b":"#efcf66";ctx.lineWidth=3;ctx.strokeRect(t.x-24,t.y-25,48,50);ctx.fillStyle="#101522dd";ctx.fillRect(t.x-38,t.y+28,76,19);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText(t.label,t.x,t.y+42);});ctx.textAlign="left";}
function loop(){drawOffice();requestAnimationFrame(loop);} requestAnimationFrame(loop);

canvas.addEventListener("click",e=>{if(state.scene!=="tutorial"||state.dialogOpen)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;if(x<190&&y<150)tutorialInteract("shelf");else if(x>480&&y<150)tutorialInteract("water");else if(x>285&&x<450&&y>115&&y<225)tutorialInteract("computer");else{state.tutorialPlayer.x=x;state.tutorialPlayer.y=y;toast("点击发光物品进行互动");}});

const keys={};
window.addEventListener("keydown",e=>{
  if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)&&e.code==="Space")return;
  if(e.code==="Space"){e.preventDefault();if(!screen.hidden){const b=screen.querySelector(".btn.primary:not(:disabled)");if(b)b.click();}else if(state.dialogOpen&&state.currentAdvance){const fn=state.currentAdvance;state.currentAdvance=null;fn();}return;}
  if(!screen.hidden)return; if(state.dialogOpen&&/^Digit[123]$/.test(e.code)){const i=Number(e.code.slice(-1))-1;$("#choices")?.children[i]?.click();return;}
  keys[e.code]=true;
  if(state.scene==="tutorial"&&!state.dialogOpen){const p=state.tutorialPlayer,s=6;if(e.code==="ArrowLeft"||e.code==="KeyA"){p.x-=s;p.dir="left";}if(e.code==="ArrowRight"||e.code==="KeyD"){p.x+=s;p.dir="right";}if(e.code==="ArrowUp"||e.code==="KeyW"){p.y-=s;p.dir="up";}if(e.code==="ArrowDown"||e.code==="KeyS"){p.y+=s;p.dir="down";}p.x=Math.max(15,Math.min(625,p.x));p.y=Math.max(130,Math.min(340,p.y));}
  if(e.code==="KeyE"&&state.scene==="tutorial")nearestTutorial();
});
window.addEventListener("keyup",e=>keys[e.code]=false);
setInterval(()=>{if(state.scene!=="tutorial"||state.dialogOpen)return;const p=state.tutorialPlayer,s=5;if(keys.ArrowLeft||keys.KeyA){p.x-=s;p.dir="left";}if(keys.ArrowRight||keys.KeyD){p.x+=s;p.dir="right";}if(keys.ArrowUp||keys.KeyW){p.y-=s;p.dir="up";}if(keys.ArrowDown||keys.KeyS){p.y+=s;p.dir="down";}p.x=Math.max(15,Math.min(625,p.x));p.y=Math.max(130,Math.min(340,p.y));},32);
function nearestTutorial(){const p=state.tutorialPlayer,d=(x,y)=>Math.hypot(p.x-x,p.y-y);if(d(130,74)<100)tutorialInteract("shelf");else if(d(520,74)<100)tutorialInteract("water");else if(d(388,160)<110)tutorialInteract("computer");else toast("请再靠近一点");}

$("#muteBtn").onclick=()=>{state.muted=!state.muted;$("#muteBtn").textContent=state.muted?"×":"♪";};
showTitle();
