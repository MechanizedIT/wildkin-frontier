// Fullscreen is a browser-owned state, requested only by an explicit click.
export function createFullscreenControl(container, onMessage = () => {}) {
  const doc=container.ownerDocument??document;
  const button=doc.createElement('button');
  button.type='button';button.className='viewport-fullscreen';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
  const current=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
  function sync(){
    const active=current();button.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
    button.setAttribute('aria-pressed',String(active));button.title=active?'Exit fullscreen':'Fullscreen';
    button.classList.toggle('is-fullscreen',active);
  }
  let pending=false;
  async function activate(event){
    event.preventDefault();event.stopPropagation();if(pending)return;
    const active=current(),target=active?doc:doc.documentElement;
    const action=active?(doc.exitFullscreen??doc.webkitExitFullscreen):(target.requestFullscreen??target.webkitRequestFullscreen);
    if(!action){onMessage('Fullscreen unavailable','This browser cannot hide its bars. The game still fits the available screen.');return;}
    pending=true;
    try{await action.call(target);}
    catch{onMessage('Fullscreen unavailable','Your browser did not allow fullscreen. You can keep playing in this view.');}
    finally{pending=false;sync();}
  }
  button.addEventListener('click',activate);
  button.addEventListener('pointerdown',event=>event.stopPropagation());
  doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);
  container.appendChild(button);sync();
  return {button,destroy(){button.removeEventListener('click',activate);doc.removeEventListener('fullscreenchange',sync);doc.removeEventListener('webkitfullscreenchange',sync);button.remove();}};
}
