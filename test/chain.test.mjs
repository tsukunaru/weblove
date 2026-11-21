import assert from "node:assert/strict";
import test from "node:test";
import {CatmullRomCurve3,Vector3} from "three";
import {homePan,ramp} from "../lib/story.mjs";
import {chainPath,setChainCurve,swayAtPointer} from "../lib/chain.mjs";
import {wrapChain,maxKeyRadius} from "../lib/shell.mjs";

test("the camera passes the same loop and reveals its outgoing strand",()=>{
  for(const [width,mobile] of [[9.6,false],[2.8,true]]){
    const curve=new CatmullRomCurve3(chainPath.map(()=>new Vector3()));
    setChainCurve(curve,0,width,mobile,0,1);
    const rest=curve.getPoints(200);
    for(const p of [.23,.51,.74]){
      const pan=homePan(p)*width,zoom=1+.17*ramp(.035,.56,p);
      setChainCurve(curve,p,width,mobile,pan,zoom);
      curve.getPoints(200).forEach((v,i)=>{
        v.x+=pan;assert.ok(v.divideScalar(zoom).distanceTo(rest[i])<1e-6);
      });
    }
    assert.ok(curve.points[13].x<-width/2);
    assert.ok(curve.points.at(-1).x>width/2);
  }
});

test("a hover flexes a nearby link, preserves remote anchors and clears the keys",()=>{
  const origin=new Vector3(.2,.3,-2),near=origin.clone(),far=origin.clone();
  swayAtPointer(near,.2,.3,1);swayAtPointer(far,4,4,1);
  assert.ok(near.distanceTo(origin)>.2);
  assert.ok(far.equals(origin));
  wrapChain(near,0,0,1,.66,0);
  assert.ok(near.length()>(maxKeyRadius+.54)+.62*.66);
  const released=origin.clone();swayAtPointer(released,.2,.3,0);
  assert.ok(released.equals(origin));
});
