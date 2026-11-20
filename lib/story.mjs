export const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b,v));
export function ramp(a,b,v) { const t=clamp((v-a)/(b-a)); return t*t*(3-2*t); }
export const stops = { home:0, studio:1.76, work:2.92, contact:5 };
export const services = [
 ["Art direction","Concepts, visual languages and identities that give digital experiences a distinct point of view."],
 ["Web design","Expressive interfaces built around clear typography, bold composition and intuitive interaction."],
 ["3D and motion","Custom objects, materials and movement that bring a digital identity into physical focus."],
 ["Development","Responsive, real-time experiences engineered for the browser, from first frame to final interaction."]
];
export const projects = [
 {name:"Chain Reaction",type:"Motion study",image:"links",desc:"A tension study in interlocking chrome. Two chains catch alternating bands of cold and crimson light."},
 {name:"Supernova",type:"Art direction",image:"nova",desc:"A polished star suspended in a field of red. Its silhouette changes with every turn."},
 {name:"Input Objects",type:"Object design",image:"keys",desc:"A family of sculpted keycaps with contrasting faces and a shared set of tactile symbols."},
 {name:"Signal Red",type:"Material study",image:"signal",desc:"Scarlet polymer and black enamel meet in a close-up of the studio keyboard sculpture."},
 {name:"Studio Pass",type:"Identity",image:"pass",desc:"A clipped-corner pass carries the studio mark on a short, articulated chain."}
];
