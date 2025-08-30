(function () {
  if (window.matchMedia("(max-width: 767px)").matches) return; // desktop-only

  const diagram = document.querySelector(".diagram-home");
  if (!diagram) return;

  const svg = diagram.querySelector(".diagram-arrows");
  const nodesLayer = diagram.querySelector(".diagram-nodes");

  /* ------------ Tunables ------------ */
  const JSON_SRC = window.HOMEPAGE_GRAPH_SRC || "homepage-graph.json";
  const USE_LOCAL_PATHS =
    typeof window.USE_LOCAL_PATHS === "boolean" ? window.USE_LOCAL_PATHS : true;

  // (+) chain — steady outward rhythm (no creeping)
  const BUBBLE_STEP = 140;
  const FIRST_PLUS_MARGIN = 240;

  // Subpage cluster — placed around the *bubble*, not the hub
  const SUBPAGE_LOCAL_R = 110;             // distance from bubble center to subpages
  const SUBPAGE_OUTWARD_MARGIN = 30;       // must be at least this many px beyond the bubble (toward hub→outward ray)
  const SUBPAGE_SPREAD = Math.PI / 30;     // narrow fan (~6° baseline)
  const SUBPAGE_MAX_JITTER_R = 20;         // tiny radial jitter
  const SUBPAGE_MIN_GAP = 22;              // min gap between rectangles
  const SUBPAGE_RADIAL_TOLERANCE = 24;     // clamp to keep cluster tight

  /* ------------ State ------------ */
  let config = { clusters: [], nodes: [] };

  const nodeEls = new Map(); // nodeId -> element
  const hubEls = new Map();  // hubId -> element
  const plusEls = new Map(); // plusId -> element
  const plusMeta = new Map();// plusId -> {angle, baseR, depth, expanded, chunkIds, nextId, parentTarget, terminal}
  const plusOrder = [];      // creation order for reflow/lines

  const expanded = { work: false, writing: false, peripheral: false };

  // Work queues
  let workPriority = [];
  let workQueue = [];
  let workNext = 0;

  let workRingR1 = 280; // computed each layout
  let placed = [];      // collision registry: {l,t,r,b}
  const nodeDepth = new Map(); // nodeId -> plus depth (1,2,...)

  /* ------------ Utils ------------ */
  function ensureDefs() {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.appendChild(defs);
    }
    if (!defs.querySelector("#arrowhead")) {
      const m = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      m.setAttribute("id", "arrowhead");
      m.setAttribute("viewBox", "0 0 10 10");
      m.setAttribute("refX", "8");
      m.setAttribute("refY", "5");
      m.setAttribute("markerWidth", "6");
      m.setAttribute("markerHeight", "6");
      m.setAttribute("orient", "auto-start-reverse");
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      p.setAttribute("fill", "#1c1c1c");
      m.appendChild(p);
      defs.appendChild(m);
    }
    if (!defs.querySelector("#tinyhead")) {
      const m2 = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      m2.setAttribute("id", "tinyhead");
      m2.setAttribute("viewBox", "0 0 10 10");
      m2.setAttribute("refX", "8");
      m2.setAttribute("refY", "5");
      m2.setAttribute("markerWidth", "4");
      m2.setAttribute("markerHeight", "4");
      m2.setAttribute("orient", "auto-start-reverse");
      const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p2.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      p2.setAttribute("fill", "#1c1c1c");
      m2.appendChild(p2);
      defs.appendChild(m2);
    }
  }

  function normalizeHref(href) {
    if (!href) return "#";
    if (!/^https?:\/\//i.test(href)) return href.replace(/\/+$/, "");
    try {
      const u = new URL(href, window.location.origin);
      if (USE_LOCAL_PATHS && u.origin === window.location.origin)
        return u.pathname.replace(/\/+$/, "");
      return href;
    } catch { return href; }
  }

  function polarToXY(cx, cy, r, ang) { return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) }; }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

  function rectFromEl(el) {
    const r = el.getBoundingClientRect(), p = svg.getBoundingClientRect();
    return { left:r.left-p.left, top:r.top-p.top, right:r.right-p.left, bottom:r.bottom-p.top,
             cx:(r.left+r.right)/2-p.left, cy:(r.top+r.bottom)/2-p.top, w:r.width, h:r.height };
  }

  // line/rectangle intersection (edge-to-edge)
  function intersectRectEdge(rect, from, to) {
    const c = [], dx = to.x-from.x, dy = to.y-from.y;
    const push=(t,x,y)=>{ if(t>0 && t<1) c.push({t,x,y}); };
    if (dx!==0){ let t=(rect.left-from.x)/dx, y=from.y+t*dy; if(y>=rect.top&&y<=rect.bottom) push(t,rect.left,y);
                 t=(rect.right-from.x)/dx; y=from.y+t*dy; if(y>=rect.top&&y<=rect.bottom) push(t,rect.right,y); }
    if (dy!==0){ let t=(rect.top-from.y)/dy, x=from.x+t*dx; if(x>=rect.left&&x<=rect.right) push(t,x,rect.top);
                 t=(rect.bottom-from.y)/dy; x=from.x+t*dx; if(x>=rect.left&&x<=rect.right) push(t,x,rect.bottom); }
    if (!c.length) return {x:from.x,y:from.y}; c.sort((a,b)=>a.t-b.t); return c[0];
  }

  function frames() {
    const d = diagram.getBoundingClientRect();
    const W=d.width, H=d.height, aspect=W/H;
    const work = { x: W*0.5, y: H*(aspect<1.2?0.28:0.32), w: W*0.42, h: H*0.36 };
    const peripheral = { x: W*0.90, y: H*0.78, w: W*0.30, h: H*0.32 };
    const writing = { x: W*0.22, y: H*0.78, w: W*0.34, h: H*0.32 };
    const clamp = c => ({ x:c.x, y:c.y, w:Math.max(c.w,240), h:Math.max(c.h,200) });
    return { work:clamp(work), peripheral:clamp(peripheral), writing:clamp(writing), W, H };
  }

  /* ------------ Non-overlap & bounds ------------ */
  function overlaps(a, b, pad = 10) {
    return !(a.r + pad <= b.l - pad || a.l - pad >= b.r + pad || a.b + pad <= b.t - pad || a.t - pad >= b.b + pad);
  }

  function withinBounds(rect, pad = 16) {
    const r = svg.getBoundingClientRect();
    const box = { l: pad, t: pad, r: r.width - pad, b: r.height - pad };
    return rect.l >= box.l && rect.t >= box.t && rect.r <= box.r && rect.b <= box.b;
  }

  function addPlaced(x, y, w, h) { placed.push({ l:x-w/2, t:y-h/2, r:x+w/2, b:y+h/2 }); }

  // generic spiral search (used by clusters and fallbacks)
  function placeSmart(id, center, baseR, baseAng, depth, animate, opts = {}) {
    const { maxJitterR = 60, clusterTightness = 1, minGapPx = 10, radialClamp = null } = opts;
    const el = nodeEls.get(id); if (!el) return { x:center.x, y:center.y };
    const w = el.offsetWidth || 220, h = el.offsetHeight || 64;

    const clampR = (R) => radialClamp ? Math.min(Math.max(R, radialClamp[0]), radialClamp[1]) : R;

    let ang = baseAng + (Math.random()-0.5) * (Math.PI/18) * clusterTightness;
    let R = clampR(baseR + (Math.random()-0.5) * (maxJitterR*0.25) * clusterTightness);

    const MAX_TRIES = 72, STEP_ANG = (Math.PI/28) * clusterTightness, STEP_R = 10 * clusterTightness;
    for (let i=0;i<MAX_TRIES;i++){
      const p = polarToXY(center.x, center.y, R, ang);
      const cand = { l:p.x-w/2, t:p.y-h/2, r:p.x+w/2, b:p.y+h/2 };

      let hit = !withinBounds(cand, 16);
      if (!hit){
        for(const seen of placed){ if(overlaps(cand, seen, Math.max(minGapPx,10))){ hit = true; break; } }
      }
      if (!hit){
        placeNode(id, p.x, p.y, depth, animate); addPlaced(p.x, p.y, w, h); return p;
      }

      ang += ((i%2===0?1:-1) * (i+1)) * (STEP_ANG/3);
      if (i && i%8===0){ R = clampR(R + (i%16===0 ? STEP_R : -STEP_R)); }
    }

    const p = polarToXY(center.x, center.y, baseR, baseAng);
    const rect = { l:p.x-w/2, t:p.y-h/2, r:p.x+w/2, b:p.y+h/2 };
    if (!withinBounds(rect, 16)){
      const r = svg.getBoundingClientRect();
      const cx = Math.min(Math.max(p.x, 24), r.width-24);
      const cy = Math.min(Math.max(p.y, 24), r.height-24);
      placeNode(id, cx, cy, depth, animate); addPlaced(cx, cy, w, h); return {x:cx, y:cy};
    }
    placeNode(id, p.x, p.y, depth, animate); addPlaced(p.x, p.y, w, h); return p;
  }

  // *** NEW: place subpages near the *bubble* (not the hub), always outward ***
  function placeNearBubble(id, hubCenter, bubbleCenter, bubbleRadius, baseAngle, depth) {
    const el = nodeEls.get(id); if (!el) return;
    const w = el.offsetWidth || 220, h = el.offsetHeight || 64;

    const R0 = SUBPAGE_LOCAL_R;
    const Rmin = R0 - SUBPAGE_RADIAL_TOLERANCE;
    const Rmax = R0 + SUBPAGE_RADIAL_TOLERANCE;

    const angles = [];
    const samples = 7; // small, tight fan
    for (let k = 0; k < samples; k++) {
      const t = k / (samples - 1 || 1);
      const off = (t - 0.5) * SUBPAGE_SPREAD * 2; // [-spread, +spread]
      angles.push(baseAngle + off + (Math.random() - 0.5) * (SUBPAGE_SPREAD / 4));
    }

    // Try close radii first; keep cluster tight
    const radii = [];
    for (let r = R0 - 6; r <= R0 + 6; r += 6) radii.push(r);
    radii.push(R0 + 12, R0 + 18); // tiny expansion if needed

    for (const R of radii) {
      const RR = Math.min(Math.max(R + (Math.random() - 0.5) * SUBPAGE_MAX_JITTER_R, Rmin), Rmax);
      for (const ang of angles) {
        const p = polarToXY(bubbleCenter.x, bubbleCenter.y, RR, ang);
        // outward guarantee
        if (dist(hubCenter.x, hubCenter.y, p.x, p.y) < bubbleRadius + SUBPAGE_OUTWARD_MARGIN) continue;

        const cand = { l: p.x - w / 2, t: p.y - h / 2, r: p.x + w / 2, b: p.y + h / 2 };
        if (!withinBounds(cand, 16)) continue;

        let hit = false;
        for (const seen of placed) { if (overlaps(cand, seen, SUBPAGE_MIN_GAP)) { hit = true; break; } }
        if (!hit) {
          placeNode(id, p.x, p.y, depth, true);
          addPlaced(p.x, p.y, w, h);
          return;
        }
      }
    }

    // Fallback (rare): near-hub solver, but still outward along bubble angle
    placeSmart(
      id,
      hubCenter,
      bubbleRadius + SUBPAGE_OUTWARD_MARGIN,
      baseAngle,
      depth,
      true,
      {
        maxJitterR: 40,
        clusterTightness: 0.8,
        minGapPx: SUBPAGE_MIN_GAP,
        radialClamp: [bubbleRadius + SUBPAGE_OUTWARD_MARGIN, bubbleRadius + SUBPAGE_OUTWARD_MARGIN + 30],
      }
    );
  }

  // Convenience wrapper for multiple subpages
  function placeOutwardCluster(ids, hubCenter, bubbleRadius, bubbleAngle, depth) {
    const bubbleCenter = polarToXY(hubCenter.x, hubCenter.y, bubbleRadius, bubbleAngle);
    ids.forEach((nid, i) => {
      // small offset per item to reduce overlap pressure
      const off =
        (i - (ids.length - 1) / 2) * (SUBPAGE_SPREAD / Math.max(1, ids.length - 1));
      placeNearBubble(nid, hubCenter, bubbleCenter, bubbleRadius, bubbleAngle + off, depth);
    });
  }

  /* ------------ DOM build ------------ */
  function createHubs() {
    hubEls.clear();
    nodesLayer.querySelectorAll(".diagram-hub").forEach(n=>n.remove());
    const f = frames();

    config.clusters.forEach(c=>{
      const hub = document.createElement("div");
      hub.className = "diagram-node diagram-hub";
      hub.setAttribute("data-id", `${c.id}-hub`);
      hub.setAttribute("data-cluster", c.id);
      hub.setAttribute("role", "heading");
      hub.setAttribute("aria-level", "2");
      hub.style.left = (f[c.id]?.x || f.work.x) + "px";
      hub.style.top  = (f[c.id]?.y || f.work.y) + "px";

      const t = document.createElement("div");
      t.className = "node-title"; t.textContent = c.label; hub.appendChild(t);

      const btn = document.createElement("button");
      btn.className = "hub-toggle"; btn.type = "button";
      btn.setAttribute("aria-expanded", String(expanded[c.id]));
      btn.textContent = expanded[c.id] ? "−" : "+";
      btn.addEventListener("click", ()=>{
        expanded[c.id] = !expanded[c.id];
        btn.textContent = expanded[c.id] ? "−" : "+";
        btn.setAttribute("aria-expanded", String(expanded[c.id]));
        if (c.id==='work' && expanded[c.id]) seedWork(); // fresh randomness each open
        relayout();
      });
      hub.appendChild(btn);

      nodesLayer.appendChild(hub);
      hubEls.set(`${c.id}-hub`, hub);
    });
  }

  function createNodes() {
    nodesLayer.querySelectorAll(".diagram-node:not(.diagram-hub)").forEach(n=>n.remove());
    nodeEls.clear();

    config.nodes.forEach(n=>{
      const a = document.createElement("a");
      a.className = "diagram-node" + (n.thumbnail && n.importance==='high' ? ' has-thumb' : '');
      a.href = normalizeHref(n.href);
      a.setAttribute('data-id', n.id);
      a.setAttribute('data-cluster', n.cluster);
      a.setAttribute('role', 'listitem');

      const th = document.createElement('div'); th.className='node-thumb';
      if (n.thumbnail && n.importance==='high'){ const img=document.createElement('img'); img.src=n.thumbnail; img.alt=`${n.title} placeholder`; th.appendChild(img); }
      a.appendChild(th);

      const title = document.createElement('div'); title.className='node-title'; title.textContent=n.title; a.appendChild(title);

      a.style.left='50%'; a.style.top='50%'; a.style.visibility='hidden'; a.style.pointerEvents='none';
      nodesLayer.appendChild(a); nodeEls.set(n.id, a);
    });
  }

  /* ------------ Layout helpers ------------ */
  function avgWidth(list){ if(!list.length) return 220; const w=list.map(n=>nodeEls.get(n.id)?.offsetWidth||220); return w.reduce((a,b)=>a+b,0)/w.length; }

  function placeNode(id, x, y, depth=1, animate=true){
    const el=nodeEls.get(id); if(!el) return;
    const scale = depth<=1 ? 1 : depth===2 ? 0.97 : Math.max(0.84, 1-0.05*(depth-2));
    el.style.left=x+'px'; el.style.top=y+'px'; el.style.visibility='visible'; el.style.pointerEvents='';
    el.style.transform=`translate(-50%,-50%) scale(${scale})`;
    if(animate){ el.classList.add('appearing'); setTimeout(()=>el.classList.remove('appearing'),300); }
  }

  function layoutClusterSimple(clusterId, arr, frame){
    const center={x:frame.x,y:frame.y}, min=Math.min(frame.w,frame.h), PHI=0.61803398875;
    const big=arr.filter(n=>n.importance==='high'), rest=arr.filter(n=>n.importance!=='high');

    const R1 = big.length<=1 ? min*0.24 : Math.max(min*0.30, (avgWidth(big)*Math.max(1,big.length)*1.35)/(2*Math.PI)+60);
    const R2 = Math.min(min*0.75, Math.max(min*0.55, (avgWidth(rest)*Math.max(1,rest.length)*1.55)/(2*Math.PI)+80));

    const seedAngle = Math.random()*Math.PI*2;

    big.forEach((n,i)=>{ const a=seedAngle+((i+PHI)/Math.max(1,big.length))*Math.PI*2 - Math.PI/2;
      placeSmart(n.id, center, R1, a, 1, true, { maxJitterR:40, clusterTightness:0.8, minGapPx:SUBPAGE_MIN_GAP }); });
    rest.forEach((n,i)=>{ const a=seedAngle+((i+PHI)/Math.max(1,rest.length))*Math.PI*2 + Math.PI/8;
      placeSmart(n.id, center, R2, a, 2, true, { maxJitterR:60, clusterTightness:1, minGapPx:SUBPAGE_MIN_GAP }); });

    return { R1, R2, center };
  }

  /* ------------ Work fan-out ------------ */
  function seedWork(){
    const allWork=config.nodes.filter(n=>n.cluster==='work');
    workPriority = allWork.filter(n=>n.importance==='high');
    workQueue    = allWork.filter(n=>n.importance!=='high');
    workNext = 0;

    nodesLayer.querySelectorAll('.plus-bubble').forEach(n=>n.remove());
    plusEls.clear(); plusMeta.clear(); plusOrder.length=0; nodeDepth.clear();
  }

  function addBubbleToCollision(el){ const r=rectFromEl(el); addPlaced(r.cx,r.cy,r.w,r.h); }

  function fitBubbleAngle(center, baseR, depth, angle){
    const step = Math.PI/90, maxSweep=Math.PI/3;
    const test = ang => {
      const pos = polarToXY(center.x, center.y, baseR + (depth-1)*BUBBLE_STEP, ang);
      const rect = { l:pos.x-20, t:pos.y-20, r:pos.x+20, b:pos.y+20 };
      return withinBounds(rect, 20);
    };
    if (test(angle)) return angle;
    for(let k=1; k*step<=maxSweep; k++){ if(test(angle + k*step)) return angle + k*step; if(test(angle - k*step)) return angle - k*step; }
    return angle;
  }

  function createPlus(seed, center, label, expandedState, terminal=false){
    let fittedAngle = fitBubbleAngle(center, seed.baseR, seed.depth, seed.angle);
    const id=seed.id;
    const pos=polarToXY(center.x, center.y, seed.baseR + (seed.depth-1)*BUBBLE_STEP, fittedAngle);

    let el=plusEls.get(id);
    if(!el){
      el=document.createElement('button'); el.className='plus-bubble appearing'; el.type='button';
      el.setAttribute('data-id',id); el.setAttribute('data-cluster','work');
      nodesLayer.appendChild(el); plusEls.set(id,el); if(!plusOrder.includes(id)) plusOrder.push(id);
      setTimeout(()=>el.classList.remove('appearing'),280);
    }
    el.textContent=label; el.style.left=pos.x+'px'; el.style.top=pos.y+'px';

    addBubbleToCollision(el);

    const meta = plusMeta.get(id) || { angle:fittedAngle, baseR:seed.baseR, depth:seed.depth, expanded:!!expandedState,
                                       chunkIds:[], nextId:null, parentTarget:seed.parentTarget, terminal:!!terminal };
    meta.angle=fittedAngle; meta.baseR=seed.baseR; meta.depth=seed.depth; meta.parentTarget=seed.parentTarget;
    meta.expanded=!!expandedState; meta.terminal=!!terminal; plusMeta.set(id, meta);

    if (terminal){ el.disabled=true; } else { el.disabled=false; el.onclick=()=>togglePlus(id); }
  }

  function removePlusChain(id){
    const m=plusMeta.get(id); if(!m) return;
    (m.chunkIds||[]).forEach(nid=>{ const el=nodeEls.get(nid); if(el){el.style.visibility='hidden'; el.style.pointerEvents='none';} nodeDepth.delete(nid); });
    if(m.nextId) removePlusChain(m.nextId);
    const el=plusEls.get(id); if(el) el.remove();
    plusEls.delete(id); plusMeta.delete(id); const i=plusOrder.indexOf(id); if(i>=0) plusOrder.splice(i,1);
  }

  function togglePlus(id){
    const f=frames().work, center={x:f.x,y:f.y};
    const m=plusMeta.get(id); if(!m) return;

    if(m.expanded){
      m.expanded=false; const el=plusEls.get(id); if(el) el.textContent='+';
      (m.chunkIds||[]).forEach(nid=>{ const eln=nodeEls.get(nid); if(eln){ eln.style.visibility='hidden'; eln.style.pointerEvents='none'; } nodeDepth.delete(nid); });
      if(m.nextId){ removePlusChain(m.nextId); m.nextId=null; }
      drawArrows(); return;
    }

    // expanding
    const el=plusEls.get(id); if(el) el.textContent='−';
    const chunk = workQueue.slice(workNext, workNext+3); workNext += chunk.length;
    m.chunkIds = chunk.map(n=>n.id); m.expanded=true;

    // place subpages around the bubble (tight, outward)
    const bubbleR = m.baseR + (m.depth-1)*BUBBLE_STEP;
    placeOutwardCluster(m.chunkIds, center, bubbleR, m.angle, m.depth+2);
    m.chunkIds.forEach(nid => nodeDepth.set(nid, m.depth)); // depth 1 => first (+), etc.

    // spawn next bubble only if more links remain
    if (workNext < workQueue.length){
      const jitter = (Math.random()*2 - 1) * (Math.PI/16);
      const nextAngle = fitBubbleAngle(center, m.baseR, m.depth+1, m.angle + jitter);
      const nextId = id + '-n' + (m.depth+1);
      m.nextId = nextId;
      createPlus({ id:nextId, angle:nextAngle, baseR:m.baseR, depth:m.depth+1, parentTarget:id }, center, '+', false);
    } else {
      const tailId = id + '-end';
      m.nextId = tailId;
      createPlus({ id:tailId, angle:m.angle, baseR:m.baseR, depth:m.depth+1, parentTarget:id }, center, '+', false, true);
    }

    drawArrows();
  }

  /* ------------ Layout orchestration ------------ */
  function layout(){
    placed=[]; createHubs();
    const f=frames();

    // Work
    if (expanded.work){
      const pr = layoutClusterSimple('work', config.nodes.filter(n=>n.cluster==='work' && n.importance==='high'), f.work);
      workRingR1 = pr.R1;

      const center={x:f.work.x,y:f.work.y};
      if (plusOrder.length===0){
        const allWork=config.nodes.filter(n=>n.cluster==='work');
        workPriority = allWork.filter(n=>n.importance==='high');
        workQueue    = allWork.filter(n=>n.importance!=='high');
        workNext = 0; nodeDepth.clear();

        const baseR = workRingR1 + FIRST_PLUS_MARGIN;
        const seed = { id:'work-plus-1', angle:-Math.PI/9, baseR, depth:1, parentTarget:'work-hub' };
        createPlus(seed, center, '+', false);
      } else {
        plusOrder.forEach(pid=>{
          const m=plusMeta.get(pid); if(!m) return;
          createPlus({ id:pid, angle:m.angle, baseR:m.baseR, depth:m.depth, parentTarget:m.parentTarget }, center, m.expanded?'−':'+', m.expanded, m.terminal);
          if (m.expanded){
            const bubbleR = m.baseR + (m.depth-1)*BUBBLE_STEP;
            placeOutwardCluster(m.chunkIds, center, bubbleR, m.angle, m.depth+2);
            m.chunkIds.forEach(nid => nodeDepth.set(nid, m.depth));
          }
        });
      }
    } else {
      nodesLayer.querySelectorAll('.plus-bubble').forEach(n=>n.remove());
      plusEls.clear(); plusMeta.clear(); plusOrder.length=0; nodeDepth.clear();
      config.nodes.filter(n=>n.cluster==='work').forEach(n=>{ const el=nodeEls.get(n.id); if(el){ el.style.visibility='hidden'; el.style.pointerEvents='none'; } });
    }

    // Writing
    if (expanded.writing){
      layoutClusterSimple('writing', config.nodes.filter(n=>n.cluster==='writing'), f.writing);
    } else {
      config.nodes.filter(n=>n.cluster==='writing').forEach(n=>{ const el=nodeEls.get(n.id); if(el){ el.style.visibility='hidden'; el.style.pointerEvents='none'; } });
    }

    // Peripheral
    if (expanded.peripheral){
      layoutClusterSimple('peripheral', config.nodes.filter(n=>n.cluster==='peripheral'), f.peripheral);
    } else {
      config.nodes.filter(n=>n.cluster==='peripheral').forEach(n=>{ const el=nodeEls.get(n.id); if(el){ el.style.visibility='hidden'; el.style.pointerEvents='none'; } });
    }

    applyOpacities(lastMouse);
  }

  /* ------------ Spotlight & layered transparency ------------ */
  let lastMouse=null;
  function applyOpacities(mouse){
    nodeEls.forEach((el,id)=>{
      const n=config.nodes.find(x=>x.id===id);
      let base = (n && n.importance==='high') ? 1 : 0.72;
      if (nodeDepth.has(id)) {
        const d = nodeDepth.get(id);           // 1,2,3...
        base = Math.max(0.4, 1 - 0.1*(d-1));   // 1.0, 0.9, 0.8, ...
      }
      let spot=1;
      if (mouse){
        const r=el.getBoundingClientRect(), dx=r.left + r.width/2 - mouse.x, dy=r.top + r.height/2 - mouse.y;
        const s=Math.exp(-Math.pow(Math.hypot(dx,dy)/560,2));
        spot = 0.85 + 0.15*s;
      }
      el.style.opacity = String(Math.min(1, Math.max(0.4, base*spot)));
    });
  }
  diagram.addEventListener('mousemove', e=>{ lastMouse={x:e.clientX,y:e.clientY}; applyOpacities(lastMouse); });
  diagram.addEventListener('mouseleave', ()=>{ lastMouse=null; applyOpacities(null); });

  /* ------------ Arrows (4 rules) ------------ */
  function drawEdge(fromId,toId,{thin=false,tiny=false}={}){
    const from = hubEls.get(fromId)||plusEls.get(fromId)||nodeEls.get(fromId);
    const to   = hubEls.get(toId)||plusEls.get(toId)||nodeEls.get(toId);
    if(!from||!to) return;
    const r1=rectFromEl(from), r2=rectFromEl(to), p1={x:r1.cx,y:r1.cy}, p2={x:r2.cx,y:r2.cy};
    const s=intersectRectEdge(r1,p1,p2), e=intersectRectEdge(r2,p2,p1);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',s.x); line.setAttribute('y1',s.y); line.setAttribute('x2',e.x); line.setAttribute('y2',e.y);
    line.setAttribute('marker-end', tiny ? 'url(#tinyhead)' : 'url(#arrowhead)');
    if(thin) line.setAttribute('class','thin');
    svg.appendChild(line);
  }

  function drawArrows(){
    ensureDefs();
    const defs=svg.querySelector('defs'); while(svg.firstChild) svg.removeChild(svg.firstChild); if(defs) svg.appendChild(defs);

    if (expanded.work){
      // important work -> hub
      workPriority.forEach(n=>{ const el=nodeEls.get(n.id); if(el && el.style.visibility!=='hidden') drawEdge('work-hub', n.id, {}); });

      plusOrder.forEach(pid=>{
        const m=plusMeta.get(pid); if(!m) return;

        // Outward direction for bubble chain: parent -> child
        drawEdge(m.parentTarget, pid, {thin:true, tiny:true});

        if (m.expanded){
          // Outward direction: bubble -> subpage
          m.chunkIds.forEach(nid=>{ const el=nodeEls.get(nid); if(el && el.style.visibility!=='hidden') drawEdge(pid, nid, {thin:true, tiny:true}); });
        }
      });
    }

    if (expanded.writing){
      config.nodes.filter(n=>n.cluster==='writing').forEach(n=>{ const el=nodeEls.get(n.id); if(el && el.style.visibility!=='hidden') drawEdge('writing-hub', n.id, {}); });
    }
    if (expanded.peripheral){
      config.nodes.filter(n=>n.cluster==='peripheral').forEach(n=>{ const el=nodeEls.get(n.id); if(el && el.style.visibility!=='hidden') drawEdge('peripheral-hub', n.id, {}); });
    }
  }

  function relayout(){ layout(); drawArrows(); }

  /* ------------ Boot ------------ */
  fetch(JSON_SRC, { cache:'no-store' })
    .then(r=>r.json())
    .then(j=>{ config=j; })
    .then(()=>{ createNodes(); relayout(); })
    .catch(err=>console.error('[homepage diagram] JSON load failed:', err));

  let t=null; window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(relayout, 120); });
})();
