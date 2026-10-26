const $=id=>document.getElementById(id);
let notes=[],activeId=null,dirty=false;
const date=t=>new Date(t).toLocaleDateString('ru-RU',{day:'2-digit',month:'long',year:'numeric'});
const preview=s=>(s.trim().split('\n').find(Boolean)||'Без названия').slice(0,90);
function render(){
 $('count').textContent=String(notes.length).padStart(2,'0');
 const root=$('notes');root.replaceChildren();
 if(!notes.length){const msg=document.createElement('div');msg.className='empty';msg.textContent='Тишина. Пока ни одной записи.';root.append(msg)}
 for(const n of [...notes].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))){
   const b=document.createElement('button');b.className='note-item'+(activeId===n.id?' active':'');
   const title=document.createElement('span');title.className='note-title';title.textContent=preview(n.text);
   const time=document.createElement('span');time.className='note-time';time.textContent=date(n.updatedAt);
   b.append(title,time);b.onclick=()=>select(n.id);root.append(b);
 }
}
function select(id){
 if(dirty&&!confirm('Есть несохранённые изменения. Продолжить без сохранения?'))return;
 activeId=id;const n=notes.find(n=>n.id===id);
 $('editor').value=n?.text||'';$('date').textContent=n?date(n.createdAt).toUpperCase():'НОВАЯ ЗАПИСЬ';
 dirty=false;$('status').textContent=n?'сохранено':'новая запись';render();
}
async function save(){
 if(!$('editor').value.trim()){ $('status').textContent='введите текст';return }
 try{
 const n=await window.silence.save({id:activeId,text:$('editor').value});
 notes=notes.filter(x=>x.id!==n.id);notes.unshift(n);activeId=n.id;dirty=false;
 $('status').textContent='сохранено локально';$('date').textContent=date(n.createdAt).toUpperCase();render();
 }catch(e){$('status').textContent='ошибка сохранения';alert('Не удалось сохранить запись: '+e.message)}
}
async function remove(){
 if(!activeId)return;
 if(!confirm('Удалить запись без возможности восстановления?'))return;
 try{await window.silence.remove(activeId);notes=notes.filter(n=>n.id!==activeId);activeId=null;dirty=false;$('editor').value='';$('date').textContent='НОВАЯ ЗАПИСЬ';$('status').textContent='удалено';render()}catch(e){alert('Ошибка удаления: '+e.message)}
}
$('editor').addEventListener('input',()=>{dirty=true;$('status').textContent='не сохранено'});
$('save').onclick=save;$('delete').onclick=remove;$('new').onclick=()=>select(null);
$('export').onclick=async()=>{try{await window.silence.export()}catch(e){alert('Ошибка экспорта: '+e.message)}};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}});
(async()=>{try{notes=await window.silence.list();render();if(notes.length)select(notes[0].id)}catch(e){alert('Ошибка загрузки записей: '+e.message)}})();