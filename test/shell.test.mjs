import test from "node:test";
import assert from "node:assert/strict";
import {Vector3} from "three";
import {shellSlots,openAtPointer,shellRadius,pointerInfluence,wrapChain,yieldToChain,maxKeyRadius} from "../lib/shell.mjs";

test("closed shell covers both poles and both sides of the star",()=>{
  const slots=shellSlots();
  for(const {position} of slots)assert.ok(Math.abs(position.length()-shellRadius)<1e-7);
  for(const direction of [new Vector3(0,1,0),new Vector3(0,-1,0),new Vector3(0,0,1),new Vector3(0,0,-1)]){
    assert.ok(slots.some(({position})=>position.dot(direction)>shellRadius*.97));
  }
});
test("cursor opens both projected layers locally and releasing restores the home pose",()=>{
  const v=new Vector3(),p=new Vector3(.18,0,1.65);
  for(const z of [1.65,-1.65]){
    p.z=z;openAtPointer(p,v,0,0,1,0);assert.ok(v.x>1);assert.ok(v.z*z<0);
  }
  assert.equal(openAtPointer(p,v,-2,0,1,0).length(),0);
  assert.equal(openAtPointer(p,v,.18,0,0,0).length(),0);
  assert.equal(pointerInfluence(0,2.8),0);
});

test("links stay clear of tilted keys on both sides of the moving shell",()=>{
  for(const [cx,cy,scale,unit] of [[.15,.6,1,.38],[-1.8,.6,.57,.39],[.03,-.21,.64,.29]]){
    const center=new Vector3(cx,cy,0);
    for(const z of [1.2,-1.2,0]){
      const point=center.clone().add(new Vector3(.4,0,z));
      wrapChain(point,cx,cy,scale,unit);
      assert.ok(point.distanceTo(center)>(maxKeyRadius+.54)*scale+.62*unit);
      assert.equal(Math.sign(point.z),Math.sign(z));
    }
    const far=center.clone().addScalar(5),original=far.clone();
    wrapChain(far,cx,cy,scale,unit);assert.ok(far.equals(original));
  }
});

test("passing links part adjacent keys locally while preserving the hover target",()=>{
  const base=new Vector3(0,0,shellRadius),hover=new Vector3(.1,.1,0);
  const near=[new Vector3(.38,0,2.4)],goal=hover.clone();
  yieldToChain(base,goal,near,1,1);
  assert.ok(goal.x<hover.x && goal.z<0);
  assert.equal(goal.y,hover.y);
  for(const [point,amount] of [[near[0],0],[new Vector3(0,0,-2.4),1]]){
    goal.copy(hover);yieldToChain(base,goal,[point],1,amount);assert.ok(goal.equals(hover));
  }
});
