import assert from "node:assert/strict";
import test from "node:test";
import {attachDragScroll} from "../lib/drag-scroll.mjs";

test("primary horizontal drag uses the scroll range, reverses at its edges and preserves clicks",()=>{
  const surface=new EventTarget(),view=new EventTarget();
  let capture=null;
  Object.assign(surface,{ownerDocument:{defaultView:view},dataset:{},clientWidth:1200,clientHeight:750,
    closest:()=>null,setPointerCapture:id=>{capture=id;},hasPointerCapture:id=>capture===id,releasePointerCapture:()=>{capture=null;}});
  const scroll={scroll:400,limit:1000,scrollTo(y){this.scroll=y;}};
  const dispose=attachDragScroll(surface,scroll,{reduced:false});
  function send(type,x,extra={}){
    const e=Object.assign(new Event(type,{cancelable:true}),{pointerId:1,pointerType:"mouse",isPrimary:true,button:0,buttons:1,clientX:x,clientY:50,detail:1,...extra});
    (["pointerdown","click"].includes(type)?surface:view).dispatchEvent(e);
    return e;
  }
  send("pointerdown",100);send("pointermove",105);send("pointerup",105);
  assert.equal(scroll.scroll,400);assert.equal(send("click",105).defaultPrevented,false);
  send("pointerdown",800);send("pointermove",600);assert.equal(scroll.scroll,700);
  send("pointermove",250);assert.equal(scroll.scroll,1000);
  send("pointermove",350);assert.equal(scroll.scroll,850);
  send("pointerup",350);assert.equal(capture,null);assert.ok(send("click",550).defaultPrevented);
  send("pointerdown",100,{pointerType:"touch"});send("pointermove",300);assert.equal(scroll.scroll,850);
  send("pointerdown",100);send("pointercancel",100);send("pointermove",300);assert.equal(scroll.scroll,850);
  surface.addEventListener("pointerdown",e=>e.preventDefault(),{once:true});
  dispose();
  const detach=attachDragScroll(surface,scroll,{reduced:false});
  send("pointerdown",800);send("pointermove",300);assert.equal(scroll.scroll,850);
  detach();
});

