import {clamp} from "./story.mjs";

export function attachDragScroll(surface,scroll,preferences){
  const view=surface.ownerDocument.defaultView;
  let press=null,suppressClick=false;

  function finish(event){
    if(!press || (event?.pointerId!=null && event.pointerId!==press.id))return;
    const id=press.id;
    press=null;
    delete surface.dataset.mouseDown;
    delete surface.dataset.scrubbing;
    if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);
  }
  function start(e){
    suppressClick=false;
    if(e.defaultPrevented || !e.isPrimary || e.pointerType!=="mouse" || e.button!==0 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey)return;
    if(preferences.paused || e.target.closest("input,textarea,select,[contenteditable=true]"))return;
    press={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,active:false};
    surface.dataset.mouseDown="";
  }
  function move(e){
    if(!press || e.pointerId!==press.id)return;
    if(!(e.buttons&1) || preferences.paused){finish(e);return;}
    if(!press.active){
      const dx=Math.abs(e.clientX-press.x),dy=Math.abs(e.clientY-press.y);
      if(Math.max(dx,dy)<8)return;
      if(dy>dx){finish(e);return;}
      press.active=true;
      press.scroll=scroll.scroll;
      press.gain=2.4*surface.clientHeight/surface.clientWidth;
      surface.setPointerCapture(press.id);
      surface.dataset.scrubbing="";
      suppressClick=true;
    }
    press.scroll=clamp(press.scroll+(press.lastX-e.clientX)*press.gain,0,scroll.limit);
    press.lastX=e.clientX;
    scroll.scrollTo(press.scroll,{programmatic:false,lerp:.27,immediate:preferences.reduced});
  }
  function click(e){
    if(suppressClick && e.detail>0){e.preventDefault();e.stopPropagation();suppressClick=false;}
  }
  const listeners=new AbortController();
  const options={signal:listeners.signal};
  surface.addEventListener("pointerdown",start,options);
  view.addEventListener("pointermove",move,options);
  for(const type of ["pointerup","pointercancel","blur"])view.addEventListener(type,finish,options);
  surface.addEventListener("lostpointercapture",finish,options);
  surface.addEventListener("click",click,{...options,capture:true});
  return ()=>{finish();listeners.abort();};
}

