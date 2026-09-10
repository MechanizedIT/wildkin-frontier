// Shared keyboard contract for compact gameplay dialogs. Capture prevents an
// Escape dismissal from also opening the field menu underneath the dialog.
export function bindDialogInput(element, isVisible, dismiss) {
  const key=event=>{
    if(!isVisible())return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();return;}
    if(event.key!=='Tab')return;
    const controls=[...element.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    const first=controls[0],last=controls.at(-1);if(!first)return;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  window.addEventListener('keydown',key,true);
  return ()=>window.removeEventListener('keydown',key,true);
}
