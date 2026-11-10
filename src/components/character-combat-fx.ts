import type { Fx } from "@/lib/ability-action";
type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** Painted water volumes and shadow weapon choreography, layered around the body. */
export function characterCombatFx(c: C, fx: Fx[], x: number, y: number, ground: number, target: number, s: number, k: number, t: number, front: boolean) {
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  const ribbon = (pts: {x: number; y: number}[], width: number, shadow = false) => {
    const first = pts[0]; if (!first) return;
    const stroke = (col: string, w: number) => {
      c.fillStyle = col; c.beginPath();
      const edges = pts.map((p, i) => {
        const next = pts[Math.min(pts.length - 1, i + 1)] ?? p, prev = pts[Math.max(0, i - 1)] ?? p;
        const dx=next.x-prev.x,dy=next.y-prev.y,length=Math.hypot(dx,dy)||1;
        const profile = Math.pow(Math.sin(i / Math.max(1, pts.length - 1) * Math.PI), .55);
        const half=w*.5*profile*(.8+.2*Math.sin(i*.45+t*5));
        return {a:{x:p.x-dy/length*half,y:p.y+dx/length*half},b:{x:p.x+dy/length*half,y:p.y-dx/length*half}};
      });
      for (const e of edges) c.lineTo(e.a.x,e.a.y);
      for (const e of edges.reverse()) c.lineTo(e.b.x,e.b.y);
      c.closePath();c.fill();
    };
    stroke(shadow ? "#09161b" : "#075f91", width * 1.18);
    stroke(shadow ? "#164851" : "#27a9de", width);
    stroke(shadow ? "#53c8c4" : "#b6f6ff", width * .45);
    stroke(shadow ? "#bdffec" : "#efffff", width * .1);
  };
  if (fx.includes("waterRibbon") || fx.includes("waterSpiral")) {
    const spiral = fx.includes("waterSpiral"), rings = spiral ? 4 : 1;
    for (let ring = 0; ring < rings; ring++) {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * Math.PI + (front ? 0 : Math.PI) + t * 5;
        const radius = s * (.18 + ring * .014), height = spiral ? ground - ring * s * .105 - s * .045 : y - s * .19;
        pts.push({x: x + Math.cos(a) * radius, y: height + Math.sin(a) * s * .045 + Math.sin(a * 2 + t * 4) * s * .012});
      }
      ribbon(pts, s * (spiral ? .034 : .043));
    }
    for (let i=0;i<15;i++) {const a=i*2.4+t*3; c.fillStyle=i%2?"#b6f6ff":"#27a9de"; c.beginPath(); c.ellipse(x+Math.cos(a)*s*.23,ground-((i*.071+t*.2)%1)*s*.4,s*.004,s*.01,a,0,TAU);c.fill();}
  }
  if (fx.includes("waterCrash") && front) {
    const cx=x+(target-x)*Math.min(1,k*1.5), crest=s*(.21+.14*Math.sin(k*Math.PI));
    const pts=[];for(let i=0;i<=60;i++){const a=-Math.PI*.7+i/60*Math.PI*1.35;pts.push({x:cx+Math.cos(a)*crest*.65,y:ground-crest+Math.sin(a)*crest});}
    ribbon(pts,s*.085);
    for(let i=0;i<14;i++){const px=cx+s*(i/14-.5)*.5; ribbon([{x:px,y:ground},{x:px+s*.06*Math.sin(i),y:ground-s*(.08+.16*Math.abs(Math.sin(i+k*4)))}],s*.012);}
  }
  if (fx.includes("shadowPool") && !front) {
    c.fillStyle="#081215";c.beginPath();c.ellipse(x,ground,s*.17,s*.026,0,0,TAU);c.fill();
    c.strokeStyle="#4bc8ba";c.lineWidth=s*.004;c.stroke();
    for(let i=0;i<20;i++){const q=(t*.7+i*.063)%1;c.fillStyle=i%3?"#172c32":"#54bdb6";c.fillRect(x+Math.sin(i*3.7)*s*.17*(1-q),ground-q*s*.34,s*.007*(1-q),s*.018);}
  }
  if (fx.includes("shadowSlash") && front) {
    const pts=[];for(let i=0;i<=60;i++){const a=-2.8+i/60*4.7;pts.push({x:x+Math.cos(a)*s*(.21+k*.06),y:y-s*.2+Math.sin(a)*s*.24});}
    ribbon(pts,s*.024,true);
    for(let i=0;i<12;i++){c.fillStyle="#0a2027"; c.fillRect(x+Math.sin(i*6+t)*s*.3,y-s*.2+Math.cos(i*4)*s*.24,s*.008,s*.017);}
  }
  if (fx.includes("kunai") && front) {
    for(let i=-2;i<=2;i++) { const px=x+(target-x)*k, py=y-s*.22+i*s*.032*k;
      c.save();c.translate(px,py);c.rotate(i*.16+t*8);c.fillStyle="#d1eeef";c.beginPath();c.moveTo(s*.035,0);c.lineTo(-s*.012,-s*.009);c.lineTo(-s*.012,s*.009);c.closePath();c.fill();c.strokeStyle="#73bbc0";c.lineWidth=s*.002;c.beginPath();c.moveTo(-s*.012,0);c.lineTo(-s*.09,0);c.stroke();c.restore(); }
  }
  c.restore();
}