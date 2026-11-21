import * as T from "three";
import {buildObjects, makeBadge, studioEnvironment, disposeScene} from "./objects.mjs";
import {clamp,ramp} from "./story.mjs";

import {shellRadius,shellSlots,openAtPointer,pointerInfluence,wrapChain,yieldToChain,maxKeyRadius} from "./shell.mjs";

const mix=T.MathUtils.lerp;
const heroPath=[[-.06,1.08,.7],[.09,.86,1],[.222,.54,1.15],[.32,.63,1.36],[.53,.75,1.37],[.686,.75,.4],[.658,.60,-1.6],[.42,.30,-2.15],[.235,.076,-.38],[.255,.15,.65],[.42,.36,2.03],[.65,.57,2.25],[.83,.666,1.56],[1.07,.761,.86]];

export function mountStage(canvas,live,onReady,onKey,onLost){
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});

  renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene(), env=studioEnvironment(renderer);scene.environment=env.texture;
  const camera=new T.OrthographicCamera(-5,5,3,-3,.1,60);camera.position.z=12;
  const mainLight=new T.DirectionalLight("#fff8ee",2.5);mainLight.position.set(-4,6,7);scene.add(mainLight);
  const fill=new T.DirectionalLight("#fee5ec",1.5);fill.position.set(4,1,-2);scene.add(fill);
  const objects=buildObjects(), cluster=new T.Group(),rotor=new T.Group(),star=objects.star();
  const slots=shellSlots(),count=slots.length;
  const shell=new T.InstancedMesh(objects.body,objects.red,count);
  const plates=objects.faces.map(mat=>new T.InstancedMesh(objects.tile,mat,Math.ceil(count/12)));
  const faceMatrix=new T.Matrix4(),faceLift=new T.Matrix4().makeTranslation(0,0,.236);
  const pose=new T.Object3D(),base=new T.Vector3(),goal=new T.Vector3(),local=new T.Vector3();
  const inverseRotor=new T.Quaternion(),tiltEuler=new T.Euler(0,0,0,"YXZ");
  slots.forEach((slot,i)=>{
    slot.offset=new T.Vector3();slot.easedGoal=new T.Vector3();slot.projected=new T.Vector3();
    slot.face=i*7%12;slot.faceIndex=Math.floor(i/12);
  });
  // Both the shell and the printed faces reuse the same key transforms.
  for(const mesh of [shell,...plates]){
    mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);rotor.add(mesh);
  }
  plates.forEach((mesh,i)=>{mesh.count=slots.filter(slot=>slot.face===i).length;});
  rotor.add(star);cluster.add(rotor);scene.add(cluster);
  const chainMat=new T.MeshStandardMaterial({color:"#303137",metalness:1,roughness:.18});
  const links=new T.InstancedMesh(objects.link,chainMat,280);links.frustumCulled=false;links.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(links);
  const curve=new T.CatmullRomCurve3(heroPath.map(()=>new T.Vector3()));
  const dummy=new T.Object3D(),pt=new T.Vector3(),tangent=new T.Vector3();
  const zAxis=new T.Vector3(0,0,1);
  objects.red.color.set("#25212b").lerp(new T.Color("#b40028"),.38);
  const color0=new T.Color("#34343a"),color1=new T.Color("#d5dbe0"),color2=new T.Color("#81d2e6");
  const badge=makeBadge(),hang=new T.Group();badge.position.y=-1.43;hang.add(badge);scene.add(hang);
  const chainEnd=new T.InstancedMesh(objects.link,chainMat,24);chainEnd.frustumCulled=false;scene.add(chainEnd);
  let width=10,height=6,mobile=false,age=0,time=0,last=0,first=true,lostContext=false;
  let cssWidth=1,cssHeight=1,pixelRatio=1,maxRatio=1,slowTime=0,fastTime=0;
  let pointing=false,screenX=0,screenY=0;
  const samples=Array.from({length:157},()=>new T.Vector3());
  const lengths=new Float32Array(samples.length);
  const nearby=samples.map(()=>new T.Vector3());let nearCount=0;
  const side=new T.Vector3(),normal=new T.Vector3(),basis=new T.Matrix4();
  let cachedP=NaN,cachedWidth=0,pathLength=0;
  let pointerX=0,pointerY=0,turn=0,lean=0,down=null,dirty=true;
  const resize=new ResizeObserver(()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    cssWidth=w;cssHeight=h;
    maxRatio=Math.min(devicePixelRatio,1.65,Math.sqrt(2400000/(w*h)));
    pixelRatio=maxRatio;renderer.setDrawingBufferSize(w,h,pixelRatio);
    width=6*w/h;mobile=w<680;cachedP=NaN;
    camera.left=-width/2;camera.right=width/2;camera.updateProjectionMatrix();dirty=true;
  });resize.observe(canvas);
  const target=canvas.parentElement;
  const ray=new T.Raycaster(),mouse=new T.Vector2();
  const interactive=(e)=>{
    if(e.target.closest("a,button,input,textarea,dialog,summary"))return false;
    return live.p<.45 || live.p>4.65;
  };
  function pick(e){
    const rect=canvas.getBoundingClientRect();
    mouse.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(mouse,camera);
    if(live.p>=.5)return ray.intersectObject(badge,true)[0]?.object.parent;
    // Bounds of the instances change while the aperture is moving.
    shell.computeBoundingSphere();
    const hit=ray.intersectObject(shell,false)[0];
    if(hit)return {userData:{slot:hit.instanceId}};
    const px=(mouse.x*width/2-cluster.position.x)/cluster.scale.x;
    const py=(mouse.y*height/2-cluster.position.y)/cluster.scale.y;
    let best=-1,nearest=Infinity;
    slots.forEach((slot,i)=>{
      const v=slot.projected,d=(v.x-px)**2+(v.y-py)**2;
      if(v.z>0 && d<.15 && d<nearest){nearest=d;best=i;}
    });
    if(best>=0)return {userData:{slot:best}};
    return px*px+py*py<=shellRadius*shellRadius?cluster:null;
  }
  function point(e){
    screenX=e.clientX;screenY=e.clientY;
    pointing=interactive(e);dirty=true;
  }
  const clearPointer=()=>{pointing=false;dirty=true;down=null;};
  const onDown=e=>{if(e.button!==0 || !e.isPrimary || !interactive(e))return;const hit=pick(e);point(e);if(!hit)return;
    const rotate=live.p<.45 || e.pointerType!=="mouse" || e.shiftKey;
    if(rotate && e.pointerType==="mouse"){e.preventDefault();target.setPointerCapture(e.pointerId);}
    down={x:e.clientX,y:e.clientY,last:e.clientX,moved:0,rotate,slot:hit.userData.slot};};
  const onMove=e=>{
    if(e.pointerType!=="touch" || down)point(e);
    if(!live.reduced){live.x=e.clientX/cssWidth-.5;live.y=e.clientY/cssHeight-.5;}
    if(down){down.moved=Math.max(down.moved,Math.hypot(e.clientX-down.x,e.clientY-down.y));if(down.rotate)live.turn+=(e.clientX-down.last)*.008;down.last=e.clientX;}
  };
  const onUp=e=>{if(down && down.moved<6 && e.type!=="pointercancel" && down.slot!==undefined)onKey(down.slot);down=null;if(e.pointerType==="touch"||e.type==="pointercancel")clearPointer();};
  target.addEventListener("pointerdown",onDown,true);window.addEventListener("pointermove",onMove,{passive:true});
  window.addEventListener("pointerup",onUp);window.addEventListener("pointercancel",onUp);
  target.addEventListener("pointerleave",clearPointer);
  window.addEventListener("blur",clearPointer);
  function draw(now){
    const interval=(now-last)/1000,dt=Math.min(interval||.016,.05);last=now;
    if(document.hidden||live.paused||lostContext)return;
    if(!first && interval>0 && interval<1 && !live.reduced){
      slowTime=interval>.020?slowTime+interval:Math.max(0,slowTime-interval*.4);
      fastTime=interval<.018?fastTime+interval:0;
      const floor=Math.min(maxRatio,.66,Math.sqrt(900000/(cssWidth*cssHeight)));
      if(slowTime>.85 && pixelRatio>floor){
        pixelRatio=Math.max(floor,pixelRatio*.84);renderer.setDrawingBufferSize(cssWidth,cssHeight,pixelRatio);slowTime=fastTime=0;
      }else if(fastTime>8 && pixelRatio<maxRatio && live.lastP===live.p){
        pixelRatio=Math.min(maxRatio,pixelRatio+.1);renderer.setDrawingBufferSize(cssWidth,cssHeight,pixelRatio);fastTime=0;
      }
    }
    const alpha=1-Math.exp(-dt*7),p=live.p,still=live.reduced;
    if(still&&!first&&!dirty&&live.lastP===p&&Math.abs(live.turn-turn)<.001)return;
    live.lastP=p;dirty=false;age+=dt;time+=still?0:dt;
    pointerX=mix(pointerX,live.x,alpha);pointerY=mix(pointerY,live.y,alpha);
    turn=mix(turn,live.turn,alpha);lean=mix(lean,down?0.09:0,alpha);

    const depart=ramp(.06,.68,p), light=ramp(1.03,1.47,p),ice=ramp(2.95,3.85,p)*(1-ramp(4.1,4.75,p));
    const mobileScale=mobile?Math.min(.83,width*.95/4.2):1;
    cluster.visible=depart<.999;
    const scale=mobileScale*(1-depart*.91);
    const cx=width*((mobile?.51:.515)-.5)-width*depart*.9,cy=6*(.5-(mobile?.535:.40));
    const sweep=ramp(.08,.87,p), end=ramp(4.38,4.9,p);
    links.visible=end<.998 && (still||age>.52);
    const stage=p*1.65;
    const unit=(mobile?.29:.38)*(1+light*.75+Math.sin(stage)*.12*sweep);
    if(links.visible && (cachedP!==p || cachedWidth!==width)){
      curve.points.forEach((v,i)=>{
        const k=i/(heroPath.length-1),[hx,hy,hz]=heroPath[i];
        const fly=Math.sin(k*5.3+stage)*(.035+.105*ramp(1.75,3.1,p));
        const y=mix(hy,.43+.19*k+fly+Math.sin(stage*1.52)*.10+.19*Math.sin((p-3.04)*6+k*2)*ramp(2.77,3.20,p)*(1-ramp(4.3,4.7,p)),sweep);
        v.set((mix(hx,-.3+k*1.6,sweep)-.5)*width,
          (.5-y-end*1.2)*height,
          mix(hz,Math.sin(k*6+stage)*1.3,sweep));
        if(mobile && sweep<1)v.y=(v.y*.67-.71)*(1-sweep)+v.y*sweep;
      });
      pathLength=0;nearCount=0;
      for(let j=0;j<samples.length;j++){
        const point=curve.getPoint(j/(samples.length-1),samples[j]);
        if(cluster.visible){
          wrapChain(point,cx,cy,scale,unit);
          const x=(point.x-cx)/scale,y=(point.y-cy)/scale,z=point.z/scale;
          if(x*x+y*y+z*z<(shellRadius+1.5)**2)nearby[nearCount++].set(x,y,z);
        }
        if(j)pathLength+=samples[j].distanceTo(samples[j-1]);
        lengths[j]=pathLength;
      }
      cachedP=p;cachedWidth=width;
    }
    if(cluster.visible){
      cluster.scale.setScalar(scale);
      cluster.position.set(cx,cy+.04*Math.sin(time*.9),0);
      rotor.rotation.set(-.025+pointerY*.08,time*.12+pointerX*.12+turn,.045*Math.sin(time*.36));
      inverseRotor.copy(rotor.quaternion).invert();
      const px=((screenX/cssWidth-.5)*width-cluster.position.x)/cluster.scale.x;
      const py=((.5-screenY/cssHeight)*height-cluster.position.y)/cluster.scale.y;
      const strength=pointing && p<.45?pointerInfluence(px,py):0;
      star.scale.setScalar(.75);
      star.rotation.set(.14*Math.sin(time*.44),-.28+.22*Math.sin(time*.67)+turn*.23,.07+time*.09);
      const follow=still?1:1-Math.exp(-dt*4.6);
      const chainInfluence=links.visible?ramp(.035,.21,p):0;
      slots.forEach((slot,i)=>{
        base.copy(slot.position).applyQuaternion(rotor.quaternion);
        slot.projected.copy(base);
        openAtPointer(base,goal,px,py,strength,i);
        if(chainInfluence)yieldToChain(base,goal,nearby,nearCount,chainInfluence);
        slot.easedGoal.lerp(goal,follow);
        slot.offset.lerp(slot.easedGoal,follow);
        local.copy(slot.offset).applyQuaternion(inverseRotor);
        pose.position.copy(slot.position).add(local).clampLength(0,maxKeyRadius);
        const travel=local.length();
        local.multiplyScalar(.55).add(slot.position).normalize();
        tiltEuler.set(-Math.asin(clamp(local.y,-1,1)),Math.atan2(local.x,local.z),0,"YXZ");
        pose.quaternion.setFromEuler(tiltEuler);
        pose.scale.setScalar(1.13*(1-.60*ramp(.24,1.45,travel)));
        pose.updateMatrix();shell.setMatrixAt(i,pose.matrix);
        plates[slot.face].setMatrixAt(slot.faceIndex,faceMatrix.multiplyMatrices(pose.matrix,faceLift));
      });
      shell.instanceMatrix.needsUpdate=true;plates.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;});
    }
    if(links.visible){
      chainMat.color.copy(color0).lerp(color1,light).lerp(color2,ice*.65);chainMat.roughness=.19-.035*light;
      links.position.y=.035*Math.sin(time*.72);
      const length=pathLength;
      const step=unit*.86,n=Math.min(280,Math.ceil(length/step));
      const reveal=still?1:ramp(.52,1.75,age);links.count=Math.floor(n*reveal);
      let j=1;
      for(let i=0;i<links.count;i++){
        const u=clamp((i+.3)*step/length,0,.9999);
        const distance=u*length;
        while(j<samples.length-1 && lengths[j]<distance)j++;
        const f=(distance-lengths[j-1])/Math.max(.00001,lengths[j]-lengths[j-1]);
        pt.lerpVectors(samples[j-1],samples[j],f);
        // Interpolated central differences keep links from snapping at sample boundaries.
        tangent.subVectors(samples[j],samples[Math.max(0,j-2)]);
        normal.subVectors(samples[Math.min(samples.length-1,j+1)],samples[j-1]);
        tangent.lerp(normal,f).normalize();
        side.crossVectors(zAxis,tangent).normalize();normal.crossVectors(tangent,side);
        dummy.position.copy(pt);dummy.quaternion.setFromRotationMatrix(basis.makeBasis(tangent,side,normal));
        dummy.rotateX((i%2)*Math.PI*.5+.48*Math.sin(u*14+time*.40)+.18);
        dummy.scale.setScalar(unit);dummy.updateMatrix();links.setMatrixAt(i,dummy.matrix);
      }
      links.instanceMatrix.needsUpdate=true;
    }
    hang.visible=chainEnd.visible=end>.001;
    if(hang.visible){
      const s=mobile?.66:1.22;
      hang.scale.setScalar(s);
      hang.position.set(width*(mobile?.12:.214)+width*(1-end)*.19,mobile?.32:1.92+(1-end)*5,0);
      hang.rotation.set(.08+pointerY*.16,.04+pointerX*.36+turn*.22,.025+.05*Math.sin(time*1.12)+pointerX*.095+lean);
      chainMat.color.copy(color0).lerp(color1,.27);
      for(let i=0;i<24;i++){
        dummy.position.copy(hang.position);dummy.position.y+=i*.18*s;dummy.position.x-=i*.032*s;
        dummy.quaternion.setFromAxisAngle(zAxis,1.73);dummy.rotateX(i%2*1.57+.3);
        dummy.scale.setScalar(.237*s);dummy.updateMatrix();chainEnd.setMatrixAt(i,dummy.matrix);
      }chainEnd.instanceMatrix.needsUpdate=true;
    }
    renderer.render(scene,camera);
    if(first){first=false;onReady();}
  }
  const lost=e=>{e.preventDefault();lostContext=true;onLost();};
  canvas.addEventListener("webglcontextlost",lost);
  return {draw,dispose(){target.removeEventListener("pointerleave",clearPointer);window.removeEventListener("blur",clearPointer);resize.disconnect();target.removeEventListener("pointerdown",onDown,true);
    window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerup",onUp);window.removeEventListener("pointercancel",onUp);
    canvas.removeEventListener("webglcontextlost",lost);disposeScene(scene);env.dispose();renderer.dispose();}};
}






