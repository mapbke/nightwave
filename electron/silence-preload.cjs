const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('silence',{
 list:()=>ipcRenderer.invoke('silence:list'),
 save:note=>ipcRenderer.invoke('silence:save',note),
 remove:id=>ipcRenderer.invoke('silence:delete',id),
 export:()=>ipcRenderer.invoke('silence:export')
});