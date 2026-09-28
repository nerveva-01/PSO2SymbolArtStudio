/* Symbol Art Studio i18n — GPL-3.0-or-later. No network or document-data mutations. */
(function(root){
'use strict';
const catalog=/*CATALOG*/,supported=['zh-CN','ja','en'],storageKey='symbol-art-studio-language';
let language='zh-CN';try{const saved=localStorage.getItem(storageKey);if(supported.includes(saved))language=saved}catch{}
function t(key,params={}){const value=language==='zh-CN'?key:(catalog[key]?.[language]??key);return value.replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(params,k)?String(params[k]):m)}
function apply(){
 document.documentElement.lang=language;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
 for(const attr of ['title','alt','aria-label','placeholder'])document.querySelectorAll('[data-i18n-'+attr+']').forEach(el=>el.setAttribute(attr,t(el.getAttribute('data-i18n-'+attr))));
 const select=document.getElementById('language');if(select)select.value=language;
}
function setLanguage(value){if(!supported.includes(value))return false;language=value;try{localStorage.setItem(storageKey,language)}catch{}apply();return true}
root.I18N={t,apply,setLanguage,get language(){return language},supported,catalog};
apply();
})(globalThis);
