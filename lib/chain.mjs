import {MathUtils} from "three";
import {ramp} from "./story.mjs";

// The strand continues beyond the right edge of the opening shot. A horizontal
// camera move reveals those links while the knot stays beside the sphere.
export const chainPath=[
  [-.06,1.08,.7],[.09,.86,1],[.23,.55,1.35],[.34,.66,1.6],
  [.54,.78,1.65],[.70,.78,.45],[.68,.59,-2.1],[.44,.30,-2.65],
  [.265,.08,-.50],[.29,.16,.85],[.43,.37,2.55],[.65,.57,2.72],
  [.83,.66,2.12],[1.07,.72,1.15],
  [1.33,.72,.65],[1.6,.66,.30],[1.89,.58,.05],[2.18,.56,-.14],
  [2.49,.59,-.36],[2.8,.63,-.65],[3.15,.68,-.85]
];
const extension=13;
const {lerp}=MathUtils;

export function setChainCurve(curve,p,width,mobile,pan,zoom){
  const blend=ramp(.74,1.35,p),stage=p*1.65,end=ramp(4.38,4.9,p);
  curve.points.forEach((point,i)=>{
    const [x,y,z]=chainPath[i];
    const homeY=mobile?(0.5-y)*6*.67-.71:(0.5-y)*6;
    point.set(((x-.5)*width)*zoom-pan,homeY*zoom,z*zoom);
    if(i<extension || !blend)return;
    const k=(i-extension)/(chainPath.length-1-extension);
    const fly=Math.sin(k*5.3+stage)*(.035+.105*ramp(1.75,3.1,p));
    const yChapter=.43+.19*k+fly+Math.sin(stage*1.52)*.10+
      .19*Math.sin((p-3.04)*6+k*2)*ramp(2.77,3.20,p)*(1-ramp(4.3,4.7,p));
    point.set(lerp(point.x,(-.8+k*1.6)*width,blend),
      lerp(point.y,(.5-yChapter-end*1.2)*6,blend),
      lerp(point.z,Math.sin(k*6+stage)*1.3,blend));
  });
}

// One smooth displacement field keeps adjacent links connected and the distant
// ends pinned. Lift the strand even when the cursor is exactly on its centreline.
export function swayAtPointer(point,x,y,strength){
  const dx=point.x-x,dy=point.y-y;
  const weight=strength*(1-ramp(.02,3.6,dx*dx+dy*dy));
  point.x+=dx*.24*weight;
  point.y+=(dy*.33+.25)*weight;
  point.z+=.29*weight;
}

// Project the whole pointer stroke onto the chain so a quick flick between
// frames still excites the links it crossed.
export function createChainSwing(points){
  const offset=new Float32Array(points.length),speed=new Float32Array(points.length);
  let moving=false;
  function pluck(x0,y0,x1,y1,first){
    const dx=x1-x0,dy=y1-y0,length2=dx*dx+dy*dy;
    const impulse=(first?4.8:Math.min(5.4,Math.sqrt(length2)*8))*
      (dy < -Math.abs(dx)*.5 ? -1 : 1);
    if(!impulse)return;
    for(let i=0;i<points.length;i++){
      const px=points[i].x-x0,py=points[i].y-y0;
      const t=length2?MathUtils.clamp((px*dx+py*dy)/length2,0,1):0;
      const d2=(px-t*dx)**2+(py-t*dy)**2;
      if(d2>=2.25)continue;
      const maxSpeed=Math.sqrt(Math.max(0,32-99*offset[i]**2));
      speed[i]=MathUtils.clamp(speed[i]+impulse*(1-ramp(.04,2.25,d2)),-maxSpeed,maxSpeed);
      moving=true;
    }
  }
  function advance(dt){
    if(!moving)return false;
    // Exact damped oscillator: displaced links swing past rest, then settle.
    const decay=Math.exp(-2.8*dt),c=decay*Math.cos(9.5*dt),s=decay*Math.sin(9.5*dt)/9.5;
    moving=false;
    for(let i=0;i<points.length;i++){
      const x=offset[i],v=speed[i];
      offset[i]=c*x+s*(v+2.8*x);
      speed[i]=c*v-s*(98.09*x+2.8*v);
      if(Math.abs(offset[i])>.0005 || Math.abs(speed[i])>.005)moving=true;
      else offset[i]=speed[i]=0;
    }
    return moving;
  }
  return {offset,pluck,advance};
}
