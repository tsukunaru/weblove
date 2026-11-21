"use client";
import {useEffect,useRef,useState} from "react";
import Lenis from "lenis";
import {attachDragScroll} from "../lib/drag-scroll.mjs";
import {clamp,ramp,homePan,stops,services,projects} from "../lib/story.mjs";

const arrow=<span className="arrow" aria-hidden="true">↗</span>;
function Mark(){return <svg viewBox="0 0 28 34" aria-hidden="true"><path fill="#e60038" d="M1 1h19l7 7v25H1z"/><path fill="#1a1217" d="m14 6 1.4 6.3 5.7-3.2-3.1 5.2 6.1 2.3-6.4 1.2 3.9 5.5-6-3.1-1.6 7.3-1.6-6.9-5.8 3.2 3.5-5.5-6.2-1.5 6.1-2.1-3.3-5.3 5.9 3.2z"/></svg>;}
function Wordmark(){return <svg className="wordmark" aria-hidden="true" viewBox="0 0 1000 180" preserveAspectRatio="none"><text x="-5" y="156" textLength="1008" lengthAdjust="spacingAndGlyphs">WEBLOVE</text></svg>;}
const format=n=>String(n+1).padStart(2,"0");

export default function Studio(){
  const root=useRef(null),canvas=useRef(null),lenis=useRef(null),dialog=useRef(null),opener=useRef(null);
  const live=useRef({p:0,x:0,y:0,turn:0,reduced:false,paused:false});
  const [section,setSection]=useState("home"),[ready,setReady]=useState(false),[panel,setPanel]=useState(null);
  const [service,setService]=useState(0),[downloaded,setDownloaded]=useState(false);
  function go(name){
    setPanel(null);const y=stops[name]/5*(document.documentElement.scrollHeight-innerHeight);
    lenis.current?.start();lenis.current?.scrollTo(y,{immediate:live.current.reduced,duration:1.25,force:true});
  }
  function open(value){opener.current=document.activeElement;setDownloaded(false);setPanel(value);}
  useEffect(()=>{
    const mq=matchMedia("(prefers-reduced-motion: reduce)");
    const smooth=new Lenis({lerp:.052,smoothWheel:!mq.matches});lenis.current=smooth;
    const preference=()=>{
      live.current.reduced=mq.matches;smooth.options.smoothWheel=!mq.matches;
    };preference();mq.addEventListener("change",preference);
    let raf=0,cancelled=false,stage,previousP=NaN,activeSection="home";
    const el=root.current;
    const releaseDrag=attachDragScroll(canvas.current.parentElement,smooth,live.current);
    const scope=Object.fromEntries(Object.entries({
      "--bar":".progress","--work-x":".work-track","--studio-x":".services",
      "--drift-x":".gallery-intro","--hero-x":".screen","--badge-y":".contact","--flyby":".w0",
      "--dark":".charcoal","--black":".night","--red":".atmosphere.red"
    }).map(([name,selector])=>[name,el.querySelector(selector)]));
    const previous=Object.create(null);
    const css=(name,value)=>{
      if(previous[name]===value)return;
      previous[name]=value;(scope[name]||el).style.setProperty(name,String(value));
    };
    const update=()=>{
      const p=clamp(smooth.scroll/Math.max(1,smooth.limit))*5;
      if(p===previousP)return;
      previousP=live.current.p=p;
      const hero=1-ramp(.07,.53,p), drift=ramp(.18,.67,p)*(1-ramp(1.19,1.51,p)),studio=ramp(1.12,1.52,p)*(1-ramp(2.14,2.62,p));
      const work=ramp(2.23,2.76,p)*(1-ramp(4.44,4.83,p)),contact=ramp(4.45,4.90,p);

      css("--hero",hero);css("--hero-x",(-100*homePan(p))+"vw");css("--drift",drift);
      css("--drift-x",((.84-clamp(p,.17,1.52))*68)+"vw");css("--studio",studio);css("--studio-x",((1-ramp(1.1,1.65,p))*37-ramp(2.12,2.58,p)*67)+"vw");
      css("--work",work);css("--work-x",((2.92-clamp(p,2.21,4.84))*70)+"vw");css("--contact",contact);
      css("--dark",ramp(1.04,1.48,p));css("--black",ramp(2,2.58,p));css("--red",ramp(3.15,4.88,p));
      css("--flyby",ramp(2.94,3.33,p)*(1-ramp(3.38,3.74,p)));
      css("--bar",clamp(p/5));css("--badge-y",((1-contact)*30)+"vh");
      const selected=p<.54?"home":p<1.25?"drift":p<2.48?"studio":p<4.65?"work":"contact";
      if(activeSection!==selected){activeSection=selected;setSection(selected);}
    };
    const tick=t=>{smooth.raf(t);update();stage?.draw(t);raf=requestAnimationFrame(tick);};
    update();raf=requestAnimationFrame(tick);
    import("../lib/stage.mjs").then(({mountStage})=>{
      if(cancelled)return;
      try{stage=mountStage(canvas.current,live.current,()=>setReady(true),i=>open(i%projects.length),()=>setReady(false));}
      catch(e){console.warn("Studio render fallback",e.message);}
    });
    return ()=>{cancelled=true;releaseDrag();stage?.dispose();cancelAnimationFrame(raf);smooth.destroy();mq.removeEventListener("change",preference);};
  },[]);
  useEffect(()=>{
    if(panel===null)return;
    const d=dialog.current;d.showModal();lenis.current?.stop();live.current.paused=true;
    return ()=>{d.close();lenis.current?.start();live.current.paused=false;opener.current?.focus?.({preventScroll:true});};
  },[panel]);
  function saveBrief(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const body=["WEBLOVE — PROJECT BRIEF","", "Name: "+f.get("name"),"Email: "+f.get("email"),"","Project",f.get("brief")].join("\n");
    const url=URL.createObjectURL(new Blob([body],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="weblove-project-brief.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);setDownloaded(true);
  }
  const card=(i,className,interactive=true)=><button key={className} className={"plate "+className} tabIndex={interactive?0:-1} onClick={()=>open(i)} aria-label={"View "+projects[i].name}>
    <img src={"./art/"+projects[i].image+".webp"} alt="" draggable="false"/><span><i>{format(i)} /</i> {projects[i].name} {arrow}</span></button>;
  return <main ref={root} className={"story section-"+section+(ready?" webgl":"")}>
    <div className="screen">
      <div className="atmosphere charcoal"/><div className="atmosphere night"/><div className="atmosphere red"/>
      <header>
        <button className="logo" onClick={()=>go("home")} aria-label="Weblove home"><Mark/>weblove</button>
        <nav aria-label="Sections">{["studio","work","contact"].map(n=><button key={n} aria-current={section===n?"location":undefined} onClick={()=>go(n)}><i>+</i> {n}</button>)}</nav>
        <button className="talk" onClick={()=>go("contact")}>Let's talk {arrow}</button>
      </header>
      <section className="hero layer" aria-label="Weblove studio" inert={section!=="home"}>
        <div className="intro-copy"><p className="micro"><i/> INDEPENDENT DIGITAL STUDIO</p>
        <h1>WE CRAFT<br/>WEBSITES YOU<br/>CAN FEEL.</h1>
        <div className="actions"><button className="pill" onClick={()=>go("work")}>See the work {arrow}</button><button className="text-action" onClick={()=>open("brief")}>Start a project {arrow}</button></div></div>
        <aside><div className="stats"><div><strong>100%</strong><small>Independent<br/>and detail driven</small></div><div><strong>3D</strong><small>Real-time objects<br/>in the browser</small></div></div>
        <p>Weblove is an independent creative web design and development studio. We build digital experiences people can feel, touch and remember.</p></aside>
        <Wordmark/>
      </section>
      <div className="gallery-intro layer" aria-hidden="true">{[3,2,0,1].map((n,i)=><img key={n} className={"float f"+i} src={"./art/"+projects[n].image+".webp"} alt=""/>)}</div>
      <section className="services layer" inert={section!=="studio"} aria-label="Studio services">
        <div className="service-lead"><p className="micro">01 / STUDIO</p><h2>EVERY PIXEL IS A MATERIAL.<br/>EVERY SCROLL IS A MOVEMENT.</h2></div>
        <div className="service-images"><img src="./art/keys.webp" alt=""/><img src="./art/nova.webp" alt=""/><img src="./art/signal.webp" alt=""/></div>
        <div className="accordion">{services.map(([title,desc],i)=><div className="service" key={title}><button onClick={()=>setService(s=>s===i?-1:i)} aria-expanded={service===i} aria-controls={"service-"+i}><small>0{i+1}/</small>{title}<span>{service===i?"−":"+"}</span></button><div id={"service-"+i} className="answer" data-open={service===i}><p>{desc}</p></div></div>)}</div>
      </section>
      <section className="launches layer" inert={section!=="work"} aria-label="Recent launches"><div className="work-track">
        <div className="work-heading"><p className="micro">02 / WORK</p><h2>RECENT LAUNCHES</h2></div>
        {card(0,"w0",section==="work")}{card(1,"w1",section==="work")}{card(2,"w2",section==="work")}{card(3,"w3",section==="work")}{card(4,"w4",section==="work")}{card(0,"w5",section==="work")}
      </div></section>
      <section className="contact layer" inert={section!=="contact"} aria-label="Contact"><div><h2>LET’S MAKE<br/>SOMETHING<br/>PEOPLE<br/>WANT TO TOUCH.</h2><button className="pill" onClick={()=>open("brief")}>Start a project {arrow}</button></div></section>
      <div className="fallback" aria-hidden="true"><img className="studio-chain" src="./art/studio-chain.webp" alt=""/><img className="work-chain" src="./art/work-chain.webp" alt=""/><picture><source media="(max-width:679px)" srcSet="./art/hero-mobile.webp"/><img className="hero-poster" src="./art/hero.webp" alt=""/></picture><picture><source media="(max-width:679px)" srcSet="./art/badge-mobile.webp"/><img className="contact-poster" src="./art/badge.webp" alt=""/></picture></div>
      <canvas className="scene" ref={canvas} aria-hidden="true"/>
      <div className="hint"><span/> Hover the sphere. Click a key to explore. <b>↗</b></div>
      <div className="progress" aria-label="Exhibition progress"><span>{(section==="home"||section==="drift")?"01":section==="studio"?"02":section==="work"?"03":"04"} / 04</span><i/></div>
    </div>
    {panel!==null&&<dialog ref={dialog} onCancel={e=>{e.preventDefault();setPanel(null);}} onClick={e=>{if(e.target===dialog.current)setPanel(null);}} aria-labelledby="panel-title"><article><button className="close" aria-label="Close" onClick={()=>setPanel(null)}>×</button>
      {panel==="brief"?<><p className="micro">WEBLOVE / CONTACT</p><h2 id="panel-title">START A PROJECT.</h2><form onSubmit={saveBrief}><label>Your name<input name="name" autoComplete="name" required/></label><label>Email<input type="email" name="email" autoComplete="email" required/></label><label>What do you have in mind?<textarea name="brief" required rows="3"/></label><button className="pill" type="submit">Save project brief {arrow}</button>{downloaded&&<p role="status">Your brief is ready to share.</p>}</form></>:
        <><img className="detail-img" src={"./art/"+projects[panel].image+".webp"} alt={projects[panel].name}/><p className="micro">OBJECT {format(panel)} / {projects[panel].type}</p><h2 id="panel-title">{projects[panel].name}</h2><p>{projects[panel].desc}</p><button className="pill" onClick={()=>{setPanel(null);go("work");}}>View the work {arrow}</button></>}
    </article></dialog>}
  </main>;
}






