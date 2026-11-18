import fs from 'fs';
const code = fs.readFileSync('build.js','utf8');
let id=0; const nodes=[];
function mkNode(type, opts={}, children=[]){ const n={type, opts:{...opts}, children:[], id:'1:'+(++id), parent:null};
  const api={ __n:n, set(o){Object.assign(n.opts,o);return api;}, append(...c){c.forEach(x=>{x.__n.parent=n;n.children.push(x.__n)});return api;}, get node(){return {id:n.id, parent:null};}, screenshot(){return api;} };
  ['text','rectangle','frame','autoLayout','ellipse','svg'].forEach(t=>api[t]=(o,c)=>{const ch=F[t](o,c);api.append(ch);return ch;});
  (children||[]).forEach(c=>{ if(!c||!c.__n) throw new Error('bad child in '+type+' '+(opts.name||'')); c.__n.parent=n; n.children.push(c.__n);});
  nodes.push(n); return api; }
const F={ frame:(o,c)=>mkNode('FRAME',o,c), autoLayout:(o,c)=>mkNode('AL',{layoutMode:'HORIZONTAL',...o},c), text:o=>{ if(typeof o.characters!=='string') throw new Error('chars'); return mkNode('TEXT',o)}, rectangle:o=>mkNode('RECT',o), ellipse:o=>mkNode('ELL',o),
  svg:(s,o)=>{ if(!s.startsWith('<svg')) throw new Error('svg'); return mkNode('SVG',{...o,svg:s}) }, gradient:(n,t,st)=>{n.__n.opts.grad=st;}, done:async()=>{} };
globalThis.$fig=F;
const hex=h=>h; 
globalThis.figma={ listAvailableFontsAsync: async()=>['Regular','Medium','Bold'].map(s=>({fontName:{family:'Noto Sans SC',style:s}})).concat(['Regular','Medium','Semi Bold','Bold'].map(s=>({fontName:{family:'Inter',style:s}}))),
 util:{ solidPaint:h=>({type:'SOLID',hex:h}), rgba:h=>({hex:h}), rgb:h=>({hex:h}) } };
const fn = new Function('return (async()=>{'+code+'})()');
const res = await fn();
console.log(JSON.stringify(res), 'nodes', nodes.length);
// compose preview svg
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const col=p=>{ if(!p||!p.length) return ['none',1]; const h=p[0].hex; if(h.length===9) return [h.slice(0,7), parseInt(h.slice(7),16)/255]; return [h,1]; };
function tw(n){ const o=n.opts; let w=0; for(const ch of o.characters) w+= /[\u0000-\u00ff]/.test(ch)? o.fontSize*0.58 : o.fontSize; return w; }
function size(n){ const o=n.opts; if(n.type==='TEXT'){ const w=o.width||tw(n); const lines=o.characters.split('\n').length*(o.width? Math.max(1,Math.ceil(tw(n)/o.width)) :1); return [w, o.fontSize*1.4*lines]; }
 if(n.type==='AL'){ const cs=n.children.map(size); const pl=o.paddingLeft||0,pr=o.paddingRight||0,pt=o.paddingTop||0,pb=o.paddingBottom||0,g=o.itemSpacing||0; let w,h; if(o.layoutMode==='VERTICAL'){w=Math.max(0,...cs.map(c=>c[0]));h=cs.reduce((a,c)=>a+c[1],0)+g*Math.max(0,cs.length-1);} else {w=cs.reduce((a,c)=>a+c[0],0)+g*Math.max(0,cs.length-1);h=Math.max(0,...cs.map(c=>c[1]));} return [o.width||w+pl+pr, o.height||h+pt+pb]; }
 const m=o.svg && o.svg.match(/width="(\d+)" height="(\d+)"/); if(m) return [+m[1],+m[2]]; return [o.width||0,o.height||0]; }
function draw(n, ox, oy, out){ const o=n.opts; const x=ox+(o.x||0), y=oy+(o.y||0); const [w,h]=size(n); const [f,fo]=col(o.fills); const [s]=col(o.strokes);
 if(n.type==='TEXT'){ const anchor=o.textAlignHorizontal==='CENTER'?'middle':o.textAlignHorizontal==='RIGHT'?'end':'start'; const ax= anchor==='middle'? x+w/2 : anchor==='end'? x+w : x; const lines=o.characters.split('\n'); lines.forEach((l,i)=>out.push(`<text x="${ax}" y="${y+o.fontSize*1.1+i*o.fontSize*1.4}" font-size="${o.fontSize}" font-family="Noto Sans CJK SC" font-weight="${/Bold/.test(o.fontName.style)?700:/Medium|Semi/.test(o.fontName.style)?500:400}" fill="${f}" text-anchor="${anchor}">${esc(l)}</text>`)); return; }
 if(n.type==='SVG'){ out.push(`<g transform="translate(${x},${y})">${o.svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`); return; }
 if(n.type==='ELL'){ out.push(`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${f}" fill-opacity="${fo}"/>`); return; }
 const r=o.cornerRadius||0; if(f!=='none'||s!=='none') out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(r,h/2)}" fill="${f}" fill-opacity="${fo}" stroke="${s}"/>`);
 if(n.type==='AL'){ const pl=o.paddingLeft||0,pt=o.paddingTop||0,g=o.itemSpacing||0; let cx=x+pl, cy=y+pt; const ih=h-pt-(o.paddingBottom||0); const iw=w-pl-(o.paddingRight||0); const cs=n.children.map(size); const tot=cs.reduce((a,c)=>a+c[0],0)+g*(cs.length-1);
   if(o.primaryAxisAlignItems==='CENTER') cx+= (iw-tot)/2;
   n.children.forEach((c,i)=>{ const [cw,ch]=cs[i]; const yy= o.counterAxisAlignItems==='CENTER'? cy+(ih-ch)/2 : o.counterAxisAlignItems==='MAX'? cy+ih-ch : cy; const cc={...c, opts:{...c.opts,x:0,y:0}}; draw(cc, cx, yy, out); cx+=cw+g; }); return; }
 n.children.forEach(c=>draw(c,x,y,out)); }
const root=nodes.find(n=>n.opts.name==='ERP设计图_全部');
const out=[]; draw(root,0,0,out);
fs.writeFileSync('preview.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="3240">${out.join('')}</svg>`);
