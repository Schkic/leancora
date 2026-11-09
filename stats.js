(function(){
try{
var API='https://leanopedija-api.marko-skiljan1.workers.dev/ev';
function send(p,e){
  try{
    fetch(API,{method:'POST',body:JSON.stringify({p:p,e:e}),headers:{'content-type':'text/plain'},keepalive:true}).catch(function(){});
  }catch(err){}
}
function pageName(){
  try{
    var p=location.pathname.replace(/^\/+/,'').replace(/\/+$/,'').replace(/\.html$/,'');
    return p===''?'index':p;
  }catch(err){return 'index';}
}
var PAGE=pageName();
var today=new Date().toISOString().slice(0,10);

function getSrc(ref){
  try{
    if(!ref) return 'src_direct';
    var h;
    try{h=new URL(ref).hostname;}catch(e){return 'src_other';}
    if(/leanopedija\.hr$/.test(h)) return null;
    if(/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/.test(h)) return 'src_ai';
    if(/google\./.test(h)) return 'src_google';
    if(/(^|\.)(bing\.com|duckduckgo\.com)$/.test(h)) return 'src_bing';
    if(/(^|\.)(linkedin\.com|lnkd\.in)$/.test(h)) return 'src_linkedin';
    if(/(^|\.)(facebook\.com|fb\.com|instagram\.com)$/.test(h)) return 'src_facebook';
    return 'src_other';
  }catch(err){return 'src_other';}
}

try{
  var isSocialUA=/FBAN|FBAV|Instagram/.test(navigator.userAgent||'');
  var lv=localStorage.getItem('lp_v');
  if(lv!==today){
    localStorage.setItem('lp_v',today);
    send('*','visit');
    var src=isSocialUA?'src_facebook':getSrc(document.referrer);
    if(src) send('*',src);
  }
}catch(err){}

try{
  var vk='lp_p_'+PAGE;
  if(localStorage.getItem(vk)!==today){
    localStorage.setItem(vk,today);
    send(PAGE,'view');
  }
}catch(err){}

function wrapPdf(){
  try{
    var ns=window.jspdf;
    var Orig=ns&&ns.jsPDF;
    if(!Orig||Orig.__lp) return;
    function Wrapped(){
      var inst=new (Function.prototype.bind.apply(Orig,[null].concat(Array.prototype.slice.call(arguments))))();
      try{
        if(typeof inst.save==='function'){
          var origSave=inst.save;
          inst.save=function(){
            try{send(PAGE,'pdf');}catch(e){}
            return origSave.apply(inst,arguments);
          };
        }
      }catch(e){}
      return inst;
    }
    Wrapped.prototype=Orig.prototype;
    Object.setPrototypeOf(Wrapped,Orig);
    Wrapped.__lp=true;
    ns.jsPDF=Wrapped;
  }catch(err){}
}
wrapPdf();
setTimeout(wrapPdf,1000);
setTimeout(wrapPdf,2500);

var lastDl=0;
function sendDownloadOnce(href){
  try{
    if(/^blob:/.test(href)||/^data:application\/pdf/.test(href)) return;
    var now=Date.now();
    if(now-lastDl<300) return;
    lastDl=now;
    send(PAGE,'download');
  }catch(err){}
}

try{
  var origClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){
    try{
      if(this.hasAttribute&&this.hasAttribute('download')) sendDownloadOnce(this.href||'');
    }catch(e){}
    return origClick.apply(this,arguments);
  };
}catch(err){}

document.addEventListener('click',function(ev){
  try{
    var a=ev.target&&ev.target.closest?ev.target.closest('a'):null;
    if(a){
      var href=a.getAttribute('href')||'';
      if(a.hasAttribute('download')) sendDownloadOnce(a.href||'');
      if(href.indexOf('app.leanopedija.hr')!==-1) send(PAGE,'pro_click');
      if(/linkedin\.com\/sharing/.test(href)||a.classList.contains('share-linkedin')) send(PAGE,'share_linkedin');
      else if(/wa\.me|api\.whatsapp\.com/.test(href)||a.classList.contains('share-whatsapp')) send(PAGE,'share_whatsapp');
      else if(/facebook\.com\/sharer/.test(href)||a.classList.contains('share-facebook')) send(PAGE,'share_facebook');
    }
    var cp=ev.target&&ev.target.closest?ev.target.closest('.share-copy,#copy-btn'):null;
    if(cp) send(PAGE,'share_copy');
  }catch(err){}
},true);

try{
  var tip=document.getElementById('napojnica');
  if(tip&&window.IntersectionObserver){
    var tipSent=false;
    var io=new IntersectionObserver(function(entries){
      try{
        entries.forEach(function(en){
          if(en.isIntersecting&&!tipSent){
            tipSent=true;
            send(PAGE,'tip_open');
            io.disconnect();
          }
        });
      }catch(e){}
    },{threshold:0.5});
    io.observe(tip);
  }
}catch(err){}
}catch(outerErr){}
})();
