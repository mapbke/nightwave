const {app,BrowserWindow,ipcMain,dialog} = require('electron');
const fs=require('node:fs');
const path=require('node:path');
let win;
function dataPath(){return path.join(app.getPath('userData'),'notes.json');}
function load(){
  try{const items=JSON.parse(fs.readFileSync(dataPath(),'utf8'));return Array.isArray(items)?items:[];}
  catch(e){if(e.code!=='ENOENT')console.error('Cannot read notes:',e);return [];}
}
function save(items){
  const target=dataPath(),tmp=target+'.tmp';
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(tmp,JSON.stringify(items,null,2),'utf8');
  fs.renameSync(tmp,target);
}
app.whenReady().then(()=>{
  ipcMain.handle('silence:list',()=>load());
  ipcMain.handle('silence:save',(_event,note)=>{
    if(!note||typeof note!=='object'||typeof note.text!=='string'||note.text.length>500000)throw Error('Invalid note');
    const items=load(),now=new Date().toISOString();
    const existing=items.findIndex(n=>n.id===note.id);
    const entry={id:existing>=0?items[existing].id:require('node:crypto').randomUUID(),text:note.text,createdAt:existing>=0?items[existing].createdAt:now,updatedAt:now};
    if(existing>=0)items[existing]=entry;else items.unshift(entry);
    save(items);return entry;
  });
  ipcMain.handle('silence:delete',(_event,id)=>{
    if(typeof id!=='string')throw Error('Invalid ID');
    save(load().filter(n=>n.id!==id));return true;
  });
  ipcMain.handle('silence:export',async()=>{
    const result=await dialog.showSaveDialog(win,{title:'Export notes',defaultPath:'silence-backup.json',filters:[{name:'JSON',extensions:['json']}]});
    if(result.canceled||!result.filePath)return false;
    fs.writeFileSync(result.filePath,JSON.stringify(load(),null,2),'utf8');return true;
  });
  win=new BrowserWindow({width:1100,height:760,minWidth:730,minHeight:520,title:'silence.',backgroundColor:'#111211',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.loadFile(path.join(__dirname,'..','silence','index.html'));
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)app.relaunch();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
