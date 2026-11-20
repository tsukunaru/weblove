import test from "node:test";
import assert from "node:assert/strict";
import {Vector3} from "three";
import {shellSlots,openAtPointer,shellRadius,pointerInfluence} from "../lib/shell.mjs";

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
