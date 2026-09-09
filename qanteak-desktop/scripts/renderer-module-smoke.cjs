const fs=require('fs');
const path=require('path');
const vm=require('vm');

class CL{add(){} remove(){} toggle(){return false} contains(){return false}}
class El{
  constructor(){this.dataset={};this.classList=new CL();this.style={};this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.textContent='';this.innerHTML='';this.src='';this.content='';this.onsubmit=null;this.onclick=null;this.oninput=null;}
  querySelector(){return new El()} querySelectorAll(){return []} addEventListener(){} removeEventListener(){}
  setAttribute(){} getAttribute(){return null} closest(){return null} focus(){} click(){} append(){} appendChild(){}
  remove(){} insertAdjacentHTML(){}
}
const store=new Map();
const document={documentElement:new El(),body:new El(),querySelector(){return new El()},querySelectorAll(){return []},addEventListener(){},createElement(){return new El()}};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const windowObj={matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},removeEventListener(){}};
const context=vm.createContext({
  console,document,localStorage,window:windowObj,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
  structuredClone,Intl,Date,Math,JSON,Number,String,Array,Object,RegExp,Map,Set,URL,URLSearchParams,FormData,Blob,
  navigator:{clipboard:{writeText:async()=>{}}},confirm:()=>false,location:{reload(){}},FileReader:class{}
});
windowObj.window=windowObj;windowObj.document=document;windowObj.localStorage=localStorage;
(async()=>{
  const source=fs.readFileSync(path.join(process.cwd(),'src/app.js'),'utf8');
  const mod=new vm.SourceTextModule(source,{context,identifier:'src/app.js'});
  await mod.link(()=>{throw new Error('Renderer unexpectedly imported another module.');});
  await mod.evaluate();
  console.log('Qanteak renderer ES-module smoke OK');
})().catch(err=>{console.error(err && err.stack || err);process.exit(1)});
