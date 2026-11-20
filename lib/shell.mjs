import {Vector3} from "three";
import {clamp,ramp} from "./story.mjs";

export const shellRadius=1.68;
export function shellSlots(){
  const slots=[];
  for(let row=0;row<=8;row++){
    const latitude=Math.PI*(row/8-.5);
    const count=Math.max(1,Math.round(17*Math.cos(latitude)));
    for(let col=0;col<count;col++){
      const angle=(col+(row%2)*.5)*2*Math.PI/count;
      const normal=new Vector3(Math.sin(angle)*Math.cos(latitude),Math.sin(latitude),Math.cos(angle)*Math.cos(latitude));
      slots.push({position:normal.multiplyScalar(shellRadius),latitude,angle});
    }
  }
  return slots;
}

// Orthographic view-space coordinates keep the opening under the pointer as the shell rotates.
export function openAtPointer(base,offset,px,py,strength,slot){
  offset.set(0,0,0);
  const radius=1.79,dx=base.x-px,dy=base.y-py,d=Math.hypot(dx,dy);
  if(!strength || d>=radius)return offset;
  const push=1.44*(1-d/radius)**1.20*strength;
  const x=base.x+(d>.0001?dx/d:Math.cos(slot*2.40))*push;
  const y=base.y+(d>.0001?dy/d:Math.sin(slot*2.40))*push;
  const r=Math.hypot(x,y),limit=Math.min(1,(shellRadius+.105)/Math.max(.001,r));
  const depth=Math.sqrt(Math.max(.012,shellRadius**2-(r*limit)**2));
  offset.set(x*limit-base.x,y*limit-base.y,(Math.sign(base.z)||1)*depth-base.z);
  // Ease the depth change near the silhouette, where a small shift in x/y spans both hemispheres.
  offset.z*=clamp(push/.35);
  return offset;
}
export function pointerInfluence(x,y){return 1-ramp(shellRadius+.05,shellRadius+.43,Math.hypot(x,y));}

