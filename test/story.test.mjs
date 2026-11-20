import assert from "node:assert/strict";
import test from "node:test";
import {ramp,stops} from "../lib/story.mjs";
test("scene timing holds endpoints and advances continuously in both directions",()=>{
  assert.deepEqual([-.5,0,.5,1,2].map(x=>ramp(0,1,x)),[0,0,.5,1,1]);
  assert.deepEqual(Object.values(stops),Object.values(stops).sort((a,b)=>a-b));
  for(let i=0;i<=100;i++) assert.ok(Math.abs(ramp(0,1,i/100)+ramp(0,1,1-i/100)-1)<1e-9);
});
