import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const TAU = Math.PI*2;
const physical = (color,metalness,roughness,coat=0) => new T.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:coat,clearcoatRoughness:.18});
function texture(w,h,draw) {
  const canvas=document.createElement("canvas"); canvas.width=w;canvas.height=h;
  const c=canvas.getContext("2d"); draw(c,w,h);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function burst(c,x,y,r,n=12){
  c.beginPath();
  for(let i=0;i<n*2;i++){const a=Math.PI*i/n-Math.PI/2, d=i%2?r*.35:r; c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}
  c.closePath();c.fill();
}
function stamp(i) {
  return texture(144,144,(c,w,h)=>{
    const dark=i%4===0||i%4===3;
    c.fillStyle=dark?"#17161a":"#f2eee6";
    c.beginPath();c.roundRect(2,2,w-4,h-4,15);c.fill();
    c.fillStyle=c.strokeStyle=dark?"#fbf8f0":"#18151c";c.lineWidth=5;
    c.textAlign="center";c.textBaseline="middle";c.font="bold 47px Arial";
    if(i===0||i===6)burst(c,72,70,30,i===0?12:8);
    if(i===1){for(let j=0;j<3;j++){c.beginPath();c.ellipse(72,67+j*6,27-j*6,13-j*3,0,0,TAU);c.stroke();}}
    if(i===2||i===9){c.beginPath();c.arc(72,70,23,0,TAU);c.stroke();c.fillRect(59,68,26,4);if(i===2)c.fillRect(70,57,4,25);}
    if(i===3)c.fillText("↗",72,71);
    if(i===4){c.beginPath();c.moveTo(72,88);c.bezierCurveTo(27,65,55,40,72,61);c.bezierCurveTo(91,39,118,65,72,88);c.fill();}
    if(i===5||i===10)c.fillText(i===5?"W":"✳",72,71);
    if(i===7||i===8){for(let j=0;j<4;j++){c.beginPath();c.arc(72+Math.cos(j*1.57)*12,68+Math.sin(j*1.57)*12,12,0,TAU);c.fill();}}
    if(i===11)c.fillText("⌘",72,70);
    c.font="9px monospace";c.fillText(["STUDIO","FORM","INPUT","SHIFT","LOVE","WEB"][i%6],72,117);
  });
}

function starGeo(){
  const geometry=new T.IcosahedronGeometry(1,34);
  const directions=[];
  // A polished convex centre with eight long silhouette points and two front/back peaks.
  for(let i=0;i<8;i++){const a=i*TAU/8+.11;directions.push(new T.Vector3(Math.cos(a),Math.sin(a),i%2?.17:-.17).normalize());}
  directions.push(new T.Vector3(.18,.17,1).normalize(),new T.Vector3(-.22,.13,-1).normalize());
  const p=geometry.attributes.position,v=new T.Vector3(),normal=new T.Vector3(),grad=new T.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).normalize();let radius=.47;grad.set(0,0,0);
    for(const d of directions){const dot=v.dot(d);if(dot<=0)continue;
      const k=Math.exp(-6.4*Math.sqrt(Math.max(.00001,1-dot)));
      radius+=1.15*k;
      grad.addScaledVector(d,1.15*k*3.2/Math.sqrt(Math.max(.00001,1-dot)));
    }
    normal.copy(grad).addScaledVector(v,-v.dot(grad)).multiplyScalar(-1/radius).add(v).normalize();
    geometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);
    p.setXYZ(i,v.x*radius,v.y*radius,v.z*radius);
  }
  return geometry;
}
function linkGeometry(){
  const positions=[], normals=[], indices=[];
  const arcSteps=10, sides=10, rings=2*(arcSteps+1);
  // Only the rounded ends need subdivisions. Each straight rail is a single strip.
  for(let end=0;end<2;end++){
    for(let j=0;j<=arcSteps;j++){
      const a=(end-.5)*Math.PI+j*Math.PI/arcSteps;
      const nx=Math.cos(a),ny=Math.sin(a),cx=(end?-.24:.24)+.26*nx,cy=.26*ny;
      const ring=end*(arcSteps+1)+j;
      for(let k=0;k<sides;k++){
        const b=k*TAU/sides,c=Math.cos(b),z=Math.sin(b);
        positions.push(cx+.093*nx*c,cy+.093*ny*c,.093*z);
        normals.push(nx*c,ny*c,z);
        const v=ring*sides+k,n=((ring+1)%rings)*sides+k;
        const u=ring*sides+(k+1)%sides,m=((ring+1)%rings)*sides+(k+1)%sides;
        indices.push(v,n,u,n,m,u);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute("normal",new T.Float32BufferAttribute(normals,3));
  geometry.setIndex(indices);
  return geometry;
}

export function buildObjects(){
  const red=physical("#ce0634",.31,.24,.5),black=physical("#202024",.75,.20,.4);
  const metal=physical("#d8dce0",1,.13,.13);
  const body=new RoundedBoxGeometry(.58,.57,.47,2,.061);
  const pos=body.attributes.position;
  for(let i=0;i<pos.count;i++){const z=pos.getZ(i),s=1-(z+.235)*.23;pos.setXYZ(i,pos.getX(i)*s,pos.getY(i)*s,z);}
  body.computeVertexNormals();
  const tile=new T.PlaneGeometry(.449,.449);
  const faces=Array.from({length:12},(_,i)=>new T.MeshStandardMaterial({map:stamp(i),metalness:.22,roughness:.28,alphaTest:.4}));
  function key(i){
    const root=new T.Group();
    const shell=new T.Mesh(body,red);
    const face=new T.Mesh(tile,faces[i%faces.length]);
    face.position.z=.236;
    root.add(shell,face);
    return root;
  }
  const stellation=starGeo(),link=linkGeometry(),smokedChrome=physical("#797881",1,.105,.12);
  return {key,body,tile,faces,red,black,metal,link,star:()=>new T.Mesh(stellation,smokedChrome)};
}

export function studioEnvironment(renderer){
  const env=new T.Scene();env.background=new T.Color(.14,.15,.16);
  for(const [x,y,z,w,h,intensity,color] of [[-5,4,3,4,7,5,0xfff9f0],[3,4,1,2,6,5,0xffffff],[1,-4,3,6,.8,3,0xffe9e6],[-3,1,-4,3,8,3,0xe7f3ff],[5,-2,-3,5,3,.8,0xf60035],[0,2,6,2,5,.03,0xffffff]]){
    const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,0,0);env.add(panel);
  }
  const pmrem=new T.PMREMGenerator(renderer);
  const target=pmrem.fromScene(env,.018,.1,40);
  pmrem.dispose();env.children.forEach(m=>{m.geometry.dispose();m.material.dispose()});return target;
}

export function makeBadge(){
  const g=new T.Group(),shape=new T.Shape();
  shape.moveTo(-.99,1.65);shape.lineTo(.76,1.65);shape.lineTo(1.04,1.37);shape.lineTo(1.04,-1.53);
  shape.quadraticCurveTo(1.04,-1.62,.94,-1.62);shape.lineTo(-.94,-1.62);shape.quadraticCurveTo(-1.04,-1.62,-1.04,-1.51);shape.lineTo(-1.04,1.56);shape.quadraticCurveTo(-1.04,1.65,-.99,1.65);
  const hole=new T.Path();hole.absellipse(0,1.44,.21,.058,0,TAU,true);shape.holes.push(hole);
  const shell=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:true,bevelSegments:3,bevelSize:.033,bevelThickness:.035}),physical("#11161b",.75,.26,.35));
  const graphic=texture(640,900,(c,w,h)=>{
    c.fillStyle="#101219";c.fillRect(0,0,w,h);
    c.fillStyle="#ec1832";c.beginPath();c.roundRect(10,10,620,617,17);c.fill();
    c.fillStyle="#111015";burst(c,320,320,248);
    c.fillStyle="#f3f4f1";c.textAlign="center";c.font="500 151px Arial";c.fillText("weblove",320,766,603);
    c.strokeStyle="#909298";c.lineWidth=2;c.beginPath();c.moveTo(37,795);c.lineTo(603,795);c.stroke();
    c.font="500 32px Arial";c.fillText("Web Designer",320,851);
  });
  const front=new T.Mesh(new T.PlaneGeometry(1.92,2.68),new T.MeshStandardMaterial({map:graphic,roughness:.42,metalness:.14}));
  front.position.set(0,-.17,.129);g.add(shell,front);
  return g;
}
export function disposeScene(scene){
  const geometries=new Set(),materials=new Set(),maps=new Set();
  scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);if(m.map)maps.add(m.map);}});
  maps.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}


