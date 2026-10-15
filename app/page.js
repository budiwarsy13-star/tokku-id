"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeData, setStoreData] = useState(null);

  const C = "#D85A30", CDEEP = "#a83f1f", BLACK = "#1C1C1A";
  const PAPER = "#F1EFE8", CREAM = "#FAFAF7", MID = "#5B6472";
  const MUTED = "#8B8D85", LINE = "#E5E2D9";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
    loadPreview();
  }, []);

  async function loadPreview() {
    try {
      const { data: st } = await supabase.from("stores")
        .select("id,logo_url").eq("slug","moreal-apparel").maybeSingle();
      if (!st?.id) return;
      const { data: pr } = await supabase.from("products")
        .select("name,price,images").eq("store_id",st.id)
        .order("created_at",{ascending:false}).limit(2);
      setStoreData({ store: st, products: pr||[] });
    } catch {}
  }

  // Scroll animation — hanya sekali masuk
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("vis"); });
    }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
    document.querySelectorAll(".fu").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const ic = (paths, opts={}) => (
    <svg width={opts.size||22} height={opts.size||22} viewBox="0 0 24 24"
      fill="none" stroke={opts.stroke||"currentColor"}
      strokeWidth={opts.sw||1.75} strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );

  const Check = ({dark}) => (
    <span style={{width:18,height:18,borderRadius:"50%",
      background:dark?"rgba(255,255,255,.09)":PAPER,
      display:"inline-flex",alignItems:"center",justifyContent:"center",
      fontSize:9,color:dark?"#F0997B":C,flexShrink:0,fontWeight:800,marginTop:2}}>✓</span>
  );

  return (
    <main style={{fontFamily:"'Plus Jakarta Sans',sans-serif",background:CREAM,color:BLACK,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth} body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
        a{text-decoration:none}

        /* --- Animasi masuk --- */
        .fu{opacity:0;transform:translateY(20px);transition:opacity .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)}
        .fu.vis{opacity:1;transform:none}
        .fu:nth-child(2){transition-delay:.07s}
        .fu:nth-child(3){transition-delay:.14s}

        /* --- Buttons --- */
        .btn-pri{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;border-radius:100px;cursor:pointer;transition:all .15s;border:none;background:${C};color:#fff;box-shadow:0 2px 10px rgba(216,90,48,.22)}
        .btn-pri:hover{background:${CDEEP};transform:translateY(-1px);box-shadow:0 6px 22px rgba(216,90,48,.32)}
        .btn-sec{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:600;border-radius:100px;cursor:pointer;transition:all .15s;background:transparent;color:${BLACK};border:1.5px solid ${LINE}}
        .btn-sec:hover{background:${PAPER};border-color:#ccc8bf}

        /* --- Cards --- */
        .card{border-radius:18px;overflow:hidden;padding:28px;border:1px solid ${LINE};background:#fff;transition:transform .2s,box-shadow .2s}
        .card:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(0,0,0,.07)}
        .card-dark{background:${BLACK};border-color:transparent}
        .card-coral{background:${C};border-color:transparent}
        .card-paper{background:${PAPER};border-color:transparent}

        /* --- Pills (fitur) --- */
        .pill-on{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:100px;font-size:11.5px;font-weight:600;background:rgba(255,255,255,.11);color:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.14)}
        .pill-on::before{content:'';width:4px;height:4px;border-radius:50%;background:#F0997B;flex-shrink:0}
        .pill-off{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:100px;font-size:11.5px;font-weight:600;background:rgba(255,255,255,.03);color:rgba(255,255,255,.28);border:1px solid rgba(255,255,255,.07)}
        .pill-off::before{content:'';width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.2);flex-shrink:0}

        /* --- Notif float --- */
        @keyframes floatIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}
        .notif-float{position:absolute;background:#fff;border-radius:13px;box-shadow:0 8px 28px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.06);padding:9px 13px;display:flex;align-items:center;gap:9px;z-index:10;opacity:0;animation:floatIn .5s cubic-bezier(.16,1,.3,1) forwards}

        /* --- Labels --- */
        .eyebrow{display:inline-block;font-size:11px;font-weight:700;color:${C};text-transform:uppercase;letter-spacing:.12em;background:#FAECE7;padding:4px 13px;border-radius:100px}
        .nav-a{font-size:13.5px;font-weight:500;color:${MID};text-decoration:none;transition:color .12s}
        .nav-a:hover{color:${BLACK}}
        .footer-a{font-size:13px;color:rgba(255,255,255,.38);text-decoration:none;transition:color .12s}
        .footer-a:hover{color:rgba(255,255,255,.72)}

        /* --- Responsive --- */
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr !important;padding:52px 20px 44px !important}
          .hero-vis{display:none !important}
          .trust-3{grid-template-columns:1fr !important}
          .trust-item-border{border-left:none !important;border-top:1px solid ${LINE} !important;padding-left:0 !important;margin-top:20px;padding-top:20px}
          .bento-grid{grid-template-columns:1fr !important}
          .span2{grid-column:span 1 !important}
          .px-2col{grid-template-columns:1fr !important}
          .how-3{grid-template-columns:1fr !important}
          .how-border{border-left:none !important;border-top:1px solid ${LINE} !important;padding:24px 0 !important}
          .price-2{grid-template-columns:1fr !important}
          .nav-desk{display:none !important}
          .ham{display:flex !important}
          .sec-pad{padding:64px 20px !important}
          .footer-inner{flex-direction:column !important;text-align:center !important;gap:18px !important}
          .footer-links{justify-content:center !important}
        }
        @media(min-width:901px){.ham{display:none !important}}
      `}</style>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(250,250,247,.97)",backdropFilter:"blur(14px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28}}>
          <button onClick={()=>setMenuOpen(false)} style={{position:"absolute",top:22,right:24,background:"none",border:"none",fontSize:20,cursor:"pointer",color:BLACK,lineHeight:1}}>✕</button>
          {[["Fitur","#fitur"],["Cara Pakai","#cara-pakai"],["Harga","#harga"],["Masuk","/masuk"]].map(([l,h])=>(
            <a key={l} href={h} onClick={()=>setMenuOpen(false)} style={{fontSize:24,fontWeight:700,color:BLACK}}>{l}</a>
          ))}
          <a href="/daftar" onClick={()=>setMenuOpen(false)} style={{fontSize:24,fontWeight:700,color:C}}>Daftar Gratis →</a>
        </div>
      )}

      {/* ANNOUNCEMENT BAR */}
      <div style={{background:BLACK,textAlign:"center",fontSize:12.5,fontWeight:500,padding:"10px 20px",letterSpacing:".005em"}}>
        <span style={{color:"rgba(255,255,255,.65)"}}>
          <strong style={{color:"#fff"}}>Add to Cart & Push Notification</strong> udah live —&nbsp;
          <a href="/daftar" style={{color:"#F0997B",fontWeight:600}}>Cobain gratis →</a>
        </span>
      </div>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(250,250,247,.92)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",borderBottom:`1px solid rgba(229,226,217,.65)`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",height:60}}>
        <a href="/" style={{fontSize:20,fontWeight:800,letterSpacing:"-.045em",color:BLACK,flexShrink:0}}>
          tok<span style={{color:C}}>k</span>u<span style={{color:MUTED,fontWeight:500}}>.id</span>
        </a>
        <div className="nav-desk" style={{display:"flex",gap:32,alignItems:"center"}}>
          {[["Fitur","#fitur"],["Cara Pakai","#cara-pakai"],["Harga","#harga"]].map(([l,h])=>(
            <a key={l} href={h} className="nav-a">{l}</a>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          {user ? (
            <>
              <button onClick={async()=>{await supabase.auth.signOut();window.location.reload()}} className="btn-sec" style={{fontSize:13.5,padding:"8px 18px"}}>Keluar</button>
              <a href="/dashboard" className="btn-pri" style={{fontSize:13.5,padding:"9px 20px"}}>Dashboard</a>
            </>
          ) : (
            <>
              <a href="/masuk" className="btn-sec nav-desk" style={{fontSize:13.5,padding:"8px 18px"}}>Masuk</a>
              <a href="/daftar" className="btn-pri" style={{fontSize:13.5,padding:"9px 20px"}}>Daftar Gratis</a>
            </>
          )}
          <button className="ham" onClick={()=>setMenuOpen(true)} style={{flexDirection:"column",gap:5,cursor:"pointer",padding:8,background:"transparent",border:"none",display:"none"}}>
            {[0,1,2].map(i=><span key={i} style={{width:20,height:1.5,background:BLACK,borderRadius:2,display:"block"}}/>)}
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════
          HERO — fixed: padding turun drastis dari 108px → 60px
          className2 bug dihapus, hero-grid sekarang apply beneran
      ═════════════════════════════════════════ */}
      <section
        className="hero-grid"
        style={{
          maxWidth:1120, margin:"0 auto",
          padding:"60px 48px 56px",          /* ← WAS: 108px 48px 88px */
          display:"grid",
          gridTemplateColumns:"1fr 420px",
          gap:56,
          alignItems:"center"
        }}
      >
        {/* LEFT */}
        <div className="fu">
          {/* badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"#FAECE7",color:C,fontSize:12,fontWeight:700,padding:"5px 13px",borderRadius:100,border:`1px solid rgba(216,90,48,.16)`,marginBottom:20,textTransform:"uppercase",letterSpacing:".04em"}}>
            <span style={{width:6,height:6,background:C,borderRadius:"50%",animation:"pulse 2.2s infinite",display:"inline-block",flexShrink:0}}/>
            Gratis sampai 15 order / bulan
          </div>

          <h1 style={{fontSize:"clamp(34px,4.2vw,58px)",fontWeight:800,lineHeight:1.04,letterSpacing:"-.04em",marginBottom:20}}>
            Jualan <em style={{fontStyle:"normal",color:C}}>langsung,</em><br/>
            tanpa potongan<br/>
            marketplace.
          </h1>

          <p style={{fontSize:16.5,lineHeight:1.72,color:MID,maxWidth:450,marginBottom:32}}>
            Bikin halaman checkout brand kamu dalam <strong style={{color:BLACK,fontWeight:700}}>2 menit</strong>. Ongkir otomatis, pixel iklan siap — dan margin kamu <strong style={{color:BLACK,fontWeight:700}}>100% utuh</strong>.
          </p>

          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <a href="/daftar" className="btn-pri" style={{fontSize:15.5,padding:"14px 28px"}}>Mulai Gratis Sekarang</a>
            <a href="#cara-pakai" className="btn-sec" style={{fontSize:14.5,padding:"13px 22px"}}>Lihat cara kerjanya</a>
          </div>

          <p style={{fontSize:12,color:MUTED,marginBottom:28}}>
            <span style={{color:"#3B6D11",fontWeight:700,marginRight:5}}>✓</span>
            Gak perlu kartu kredit · Upgrade kalau udah siap
          </p>

          <div style={{height:1,background:LINE,marginBottom:24}}/>

          {/* social proof */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex"}}>
              {["#5085e7",C,"#3B6D11",BLACK].map((c,i)=>(
                <div key={i} style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${CREAM}`,marginLeft:i===0?0:-8,background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:700,color:"#fff",flexShrink:0}}>
                  {["B","M","R","A"][i]}
                </div>
              ))}
            </div>
            <div>
              <p style={{fontSize:12.5,fontWeight:700,color:BLACK}}>Dipercaya seller di seluruh Indonesia</p>
              <p style={{fontSize:11.5,color:MUTED,marginTop:2}}>⭐⭐⭐⭐⭐ &nbsp;"Checkout cepat, margin gak kepotong"</p>
            </div>
          </div>
        </div>

        {/* RIGHT — VISUAL MOCKUP */}
        <div className="hero-vis" style={{position:"relative",paddingTop:16}}>
          {/* notif: bayar masuk */}
          <div className="notif-float" style={{top:-10,right:-12,animationDelay:".35s"}}>
            <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {ic(<><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></>,{size:16,stroke:"#3B6D11"})}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:BLACK}}>Pembayaran masuk!</div>
              <div style={{fontSize:10,color:MUTED,marginTop:1}}>Rp195.000 · MARK 1.0 Dark Grey M</div>
            </div>
          </div>

          {/* notif: pesanan baru */}
          <div className="notif-float" style={{bottom:88,left:-18,animationDelay:".75s"}}>
            <div style={{width:32,height:32,borderRadius:8,background:"#FAECE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {ic(<><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></>,{size:16,stroke:C})}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:BLACK}}>Pesanan baru masuk</div>
              <div style={{fontSize:10,color:MUTED,marginTop:1}}>Budi Wasito · 2 produk</div>
            </div>
          </div>

          {/* phone shell */}
          <div style={{background:BLACK,borderRadius:20,padding:20,boxShadow:"0 36px 80px rgba(0,0,0,.22),0 8px 24px rgba(0,0,0,.1)"}}>
            {/* mac dots */}
            <div style={{display:"flex",gap:5,marginBottom:13,alignItems:"center"}}>
              {["#E25C5C","#E2A95C","#5CE270"].map(c=><div key={c} style={{width:8,height:8,borderRadius:"50%",background:c}}/>)}
              <div style={{flex:1,height:7,background:"rgba(255,255,255,.07)",borderRadius:4,marginLeft:8}}/>
            </div>

            {/* store card */}
            <div style={{background:CREAM,borderRadius:13,overflow:"hidden"}}>
              <div style={{padding:"13px 15px",display:"flex",alignItems:"center",gap:9,borderBottom:`1px solid ${LINE}`,background:"#fff"}}>
                <div style={{width:38,height:38,borderRadius:9,overflow:"hidden",background:BLACK,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {storeData?.store?.logo_url
                    ? <img src={storeData.store.logo_url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="logo"/>
                    : <span style={{fontSize:10.5,fontWeight:800,color:"#fff"}}>MA</span>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:BLACK}}>MOREAL APPAREL</div>
                  <div style={{fontSize:10,color:MUTED,marginTop:1}}>tokku.id/moreal-apparel</div>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,padding:9}}>
                {[0,1].map(i=>{
                  const p = storeData?.products?.[i];
                  const img = p?.images?.[0];
                  return (
                    <div key={i} style={{background:"#fff",borderRadius:9,overflow:"hidden",border:`1px solid ${LINE}`}}>
                      <div style={{height:76,background:PAPER,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                        {img ? <img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={p?.name}/>
                          : <span style={{fontSize:10.5,color:MUTED,fontWeight:600}}>Foto Produk</span>}
                      </div>
                      <div style={{padding:"7px 8px 2px",fontSize:10,fontWeight:600,color:BLACK,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p?.name||["Kaos Oversized MARK1.0","MOREAL Basic Tees - KAIZU"][i]}</div>
                      <div style={{padding:"0 8px 7px",fontSize:11,fontWeight:800,color:C}}>Rp{Number(p?.price||[195000,115000][i]).toLocaleString("id-ID")}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{background:C,margin:"0 9px 9px",borderRadius:9,padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff"}}>
                <span style={{fontSize:10,fontWeight:600}}>🛒 2 produk · Rp310.000</span>
                <span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,.2)",padding:"3px 9px",borderRadius:20}}>Checkout →</span>
              </div>
            </div>

            {/* stat mini */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:9}}>
              {[{v:"12",l:"Pesanan hari ini",hi:false},{v:"Rp2,3jt",l:"Pendapatan",hi:true}].map(({v,l,hi})=>(
                <div key={l} style={{background:"rgba(255,255,255,.06)",borderRadius:11,padding:"11px 13px"}}>
                  <div style={{fontSize:17,fontWeight:800,color:hi?"#F0997B":"#fff",letterSpacing:"-.025em"}}>{v}</div>
                  <div style={{fontSize:9.5,color:"rgba(255,255,255,.4)",marginTop:2,fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TRUST STRIP
      ═════════════════════════════════════════ */}
      <div style={{background:PAPER,borderTop:`1px solid ${LINE}`,borderBottom:`1px solid ${LINE}`}}>
        <div className="trust-3" style={{maxWidth:860,margin:"0 auto",padding:"36px 48px",display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
          {[
            ["2"," Mnt","Setup selesai","Dari daftar sampai toko siap terima pesanan"],
            ["Rp","0","Biaya untuk mulai","Gratis selamanya sampai 15 order per bulan"],
            ["0","%","Komisi ke tokku.id","Semua hasil jualan langsung masuk kantong kamu"]
          ].map(([pre,suf,lbl,desc],i)=>(
            <div key={i} className={`fu${i>0?" trust-item-border":""}`}
              style={{textAlign:"center",padding:"0 32px",borderLeft:i>0?`1px solid ${LINE}`:"none"}}>
              <div style={{fontSize:46,fontWeight:800,letterSpacing:"-.045em",lineHeight:1}}>{pre}<span style={{color:C}}>{suf}</span></div>
              <div style={{fontSize:10.5,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:".1em",marginTop:7}}>{lbl}</div>
              <div style={{fontSize:12.5,color:MID,marginTop:4,lineHeight:1.55}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          FEATURES — BENTO
      ═════════════════════════════════════════ */}
      <section id="fitur" className="sec-pad" style={{maxWidth:1120,margin:"0 auto",padding:"88px 48px"}}>
        <span className="eyebrow">Fitur</span>
        <h2 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:800,letterSpacing:"-.038em",lineHeight:1.08,margin:"12px 0 14px"}}>
          Semua yang kamu butuhkan<br/>dalam satu link.
        </h2>
        <p style={{fontSize:15.5,color:MID,lineHeight:1.68,maxWidth:480,marginBottom:44}}>
          Dari checkout sampai laporan penjualan — jalan otomatis, gak perlu setup ribet.
        </p>

        <div className="bento-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>

          {/* dark — fitur list */}
          <div className="card card-dark fu span2" style={{gridColumn:"span 2"}}>
            <div style={{width:42,height:42,borderRadius:11,background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
              {ic(<path d="M13 10V3L4 14h7v7l9-11h-7z"/>,{stroke:"rgba(255,255,255,.72)"})}
            </div>
            <h3 style={{fontSize:16.5,fontWeight:700,color:"#fff",marginBottom:6}}>Fitur lengkap, bukan janji kosong</h3>
            <div style={{fontSize:11,color:"rgba(255,255,255,.36)",textTransform:"uppercase",letterSpacing:".07em",fontWeight:600,marginBottom:8}}>Aktif sekarang</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["1 Link Semua Produk","Ongkir Otomatis","Add to Cart","Pixel Meta & Google Ads","Kode Diskon","Lacak Pesanan Buyer","Push Notification","Dashboard Analitik","Upload Foto & Video","Manajemen Varian"].map(f=>(
                <span key={f} className="pill-on">{f}</span>
              ))}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.24)",textTransform:"uppercase",letterSpacing:".07em",fontWeight:600,marginTop:14,marginBottom:6}}>Segera hadir</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["1-Click Checkout","WA Integration","Payment Link","Invoice Otomatis","Flash Sale"].map(f=>(
                <span key={f} className="pill-off">{f}</span>
              ))}
            </div>
          </div>

          {/* coral — checkout */}
          <div className="card card-coral fu">
            <div style={{width:42,height:42,borderRadius:11,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
              {ic(<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,{stroke:"rgba(255,255,255,.88)"})}
            </div>
            <h3 style={{fontSize:16.5,fontWeight:700,color:"#fff",marginBottom:7}}>Checkout yang beneran convert</h3>
            <p style={{fontSize:13.5,lineHeight:1.65,color:"rgba(255,255,255,.75)",marginBottom:13}}>Buyer isi nama, pilih alamat & kurir, bayar. Tanpa bikin akun, tanpa friksi.</p>
            <div style={{background:"rgba(255,255,255,.1)",borderRadius:12,padding:14}}>
              {[["MARK 1.0 × 1","Rp195.000",false],["Ongkir SiCepat BEST","Rp9.000",false],["Voucher MOREAL10","-Rp19.500",true]].map(([l,r,disc])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:disc?"rgba(240,153,123,.9)":"rgba(255,255,255,.5)",fontWeight:disc?600:400,padding:"4px 0"}}><span>{l}</span><span>{r}</span></div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13.5,fontWeight:700,color:"#fff",padding:"9px 0 0",borderTop:"1px solid rgba(255,255,255,.1)",marginTop:5}}><span>Total</span><span>Rp184.500</span></div>
              <div style={{width:"100%",marginTop:10,background:"rgba(255,255,255,.14)",color:"#fff",border:"1px solid rgba(255,255,255,.22)",borderRadius:9,padding:"9px",fontSize:12,fontWeight:700,textAlign:"center"}}>Bayar Sekarang →</div>
            </div>
          </div>

          {/* paper — ongkir */}
          <div className="card card-paper fu">
            <div style={{width:42,height:42,borderRadius:11,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
              {ic(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,{stroke:C})}
            </div>
            <h3 style={{fontSize:16.5,fontWeight:700,marginBottom:7}}>Ongkir otomatis, harga transparan</h3>
            <p style={{fontSize:13.5,lineHeight:1.65,color:MID}}>60+ ekspedisi tersedia. Buyer pilih sendiri mana yang paling hemat.</p>
            <div style={{marginTop:13,display:"flex",flexDirection:"column",gap:6}}>
              {[["SiCepat BEST","1–2 hari","Rp9.000"],["J&T Express","2–3 hari","Rp12.000"]].map(([n,e,p])=>(
                <div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",borderRadius:9,padding:"9px 13px",border:`1px solid ${LINE}`}}>
                  <div><div style={{fontSize:12,fontWeight:700}}>{n}</div><div style={{fontSize:10.5,color:MUTED,marginTop:1}}>{e}</div></div>
                  <div style={{fontSize:12.5,fontWeight:800,color:C}}>{p}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:9,background:"#FAECE7",border:"1px dashed rgba(216,90,48,.3)",borderRadius:9,padding:"8px 12px",display:"flex",alignItems:"center",gap:7}}>
              <span>🎟</span>
              <div><div style={{fontSize:11,fontWeight:800,color:C,fontFamily:"monospace"}}>ONGKIRGRATIS</div><div style={{fontSize:10.5,color:MID}}>Diskon ongkir 100% — buyer langsung notice!</div></div>
            </div>
          </div>

          {/* dark — pixel */}
          <div className="card card-dark span2 fu" style={{gridColumn:"span 2"}}>
            <div className="px-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,alignItems:"center"}}>
              <div>
                <div style={{width:42,height:42,borderRadius:11,background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
                  {ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,{stroke:"rgba(255,255,255,.72)"})}
                </div>
                <h3 style={{fontSize:16.5,fontWeight:700,color:"#fff",marginBottom:8}}>Pixel iklan siap, algoritma makin pintar</h3>
                <p style={{fontSize:13.5,lineHeight:1.65,color:"rgba(255,255,255,.5)"}}>Meta Pixel & GA4 terhubung otomatis. Setiap transaksi dilaporkan ke akun iklan kamu — biar ROAS naik tanpa kerja ekstra.</p>
              </div>
              <div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:11}}>
                  {[["Meta Pixel",true],["GA4",true],["TikTok Pixel",false]].map(([l,on])=>(
                    <div key={l} style={{background:on?"rgba(216,90,48,.22)":"rgba(255,255,255,.08)",border:`1px solid ${on?"rgba(240,153,123,.45)":"rgba(255,255,255,.12)"}`,borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:600,color:on?"#F0997B":"rgba(255,255,255,.6)"}}>{l}</div>
                  ))}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[["ViewContent — produk dibuka",true],["AddToCart — masuk keranjang",true],["Purchase — pembayaran sukses ✓",true],["InitiateCheckout — form dibuka",false]].map(([l,live])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:7,fontSize:10.5,color:live?"rgba(255,255,255,.5)":"rgba(255,255,255,.24)"}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:live?"#F0997B":"rgba(255,255,255,.18)",flexShrink:0}}/>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ═════════════════════════════════════════ */}
      <div id="cara-pakai" style={{background:PAPER,borderTop:`1px solid ${LINE}`,borderBottom:`1px solid ${LINE}`}}>
        <div className="sec-pad" style={{maxWidth:1120,margin:"0 auto",padding:"88px 48px"}}>
          <span className="eyebrow">Cara pakai</span>
          <h2 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:800,letterSpacing:"-.038em",lineHeight:1.08,margin:"12px 0 44px"}}>
            Jualan online seharusnya<br/>sesimpel ini.
          </h2>
          <div className="how-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
            {[
              {n:"01",t:"Daftar & buat toko",d:"Daftar pakai email, isi nama toko, pilih link kamu — tokku.id/namabrand. Kurang dari 2 menit, serius."},
              {n:"02",t:"Tambah produk & share link",d:"Upload foto, isi harga, set varian. Ongkir otomatis sesuai berat. Sebar linknya ke IG, WA, TikTok, atau pasang di iklan."},
              {n:"03",t:"Terima pesanan, langsung cair",d:"Notifikasi push masuk ke HP kamu. Pembayaran langsung diterima — gak pake potongan komisi marketplace."}
            ].map((s,i)=>(
              <div key={i} className={`fu${i>0?" how-border":""}`}
                style={{padding:i===0?"0 40px 0 0":`0 ${i===2?0:40}px 0 40px`,borderLeft:i>0?`1px solid ${LINE}`:"none"}}>
                <div style={{fontSize:60,fontWeight:800,letterSpacing:"-.06em",color:C,opacity:.65,lineHeight:1,marginBottom:16}}>{s.n}</div>
                <div style={{fontSize:17.5,fontWeight:700,letterSpacing:"-.02em",marginBottom:9}}>{s.t}</div>
                <p style={{fontSize:13.5,lineHeight:1.7,color:MID}}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          PRICING
      ═════════════════════════════════════════ */}
      <section id="harga" className="sec-pad" style={{maxWidth:880,margin:"0 auto",padding:"88px 48px"}}>
        <div style={{textAlign:"center",marginBottom:44}}>
          <span className="eyebrow">Harga</span>
          <h2 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:800,letterSpacing:"-.038em",lineHeight:1.08,margin:"12px 0 11px"}}>
            Bayar sesuai skala<br/>jualan kamu.
          </h2>
          <p style={{fontSize:13.5,color:MID,maxWidth:420,margin:"0 auto",lineHeight:1.65}}>
            Komisi marketplace <span style={{color:MUTED}}>10–30% per transaksi</span>, atau <strong style={{color:C}}>Rp99rb flat per bulan</strong> ke tokku.id?
          </p>
        </div>

        <div className="price-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* free */}
          <div className="card fu" style={{padding:36}}>
            <div style={{fontSize:11,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>Gratis</div>
            <div style={{fontSize:52,fontWeight:800,letterSpacing:"-.05em",lineHeight:1,marginBottom:24}}>Rp0</div>
            <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:11,marginBottom:28}}>
              {["Sampai 15 order/bulan","Semua fitur storefront","Ongkir otomatis (60+ ekspedisi)","Kode diskon & voucher","Add to Cart & push notification","Dashboard analitik dasar"].map(f=>(
                <li key={f} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13.5,color:MID}}><Check/>{f}</li>
              ))}
            </ul>
            <a href="/daftar" style={{display:"block",width:"100%",padding:"13px",borderRadius:100,fontFamily:"inherit",fontSize:14.5,fontWeight:700,textAlign:"center",background:PAPER,color:BLACK,border:`1.5px solid ${LINE}`}}>Mulai gratis</a>
          </div>

          {/* paid */}
          <div className="card card-dark fu" style={{padding:36,position:"relative",boxShadow:"0 20px 56px rgba(0,0,0,.18)"}}>
            <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:C,color:"#fff",fontSize:10,fontWeight:700,padding:"4px 15px",borderRadius:100,whiteSpace:"nowrap",letterSpacing:".06em"}}>PALING LARIS</div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.36)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>Akses penuh</div>
            <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:24}}>
              <div style={{fontSize:52,fontWeight:800,letterSpacing:"-.05em",color:"#fff",lineHeight:1}}>Rp99rb</div>
              <div style={{fontSize:15,color:"rgba(255,255,255,.4)"}}>/bulan</div>
            </div>
            <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:11,marginBottom:28}}>
              {["Order tidak terbatas","COD & kode voucher lanjutan","Reminder WA otomatis ke buyer","Pixel Meta & Google Ads","Dashboard analitik lengkap","Prioritas support"].map(f=>(
                <li key={f} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13.5,color:"rgba(255,255,255,.62)"}}><Check dark/>{f}</li>
              ))}
            </ul>
            <a href="/daftar" className="btn-pri" style={{display:"block",width:"100%",padding:"13px",borderRadius:100,fontFamily:"inherit",fontSize:14.5,fontWeight:700,textAlign:"center"}}>Upgrade sekarang</a>
            <p style={{fontSize:11.5,color:"rgba(255,255,255,.28)",textAlign:"center",marginTop:10}}>Bisa cancel kapanpun · Tanpa kontrak</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA
      ═════════════════════════════════════════ */}
      <div style={{background:BLACK,padding:"80px 48px",textAlign:"center"}}>
        <h2 style={{fontSize:"clamp(24px,3vw,40px)",fontWeight:800,letterSpacing:"-.04em",color:"#fff",marginBottom:12,lineHeight:1.08}}>
          Mulai jualan hari ini,<br/><em style={{fontStyle:"normal",color:"#F0997B"}}>gratis, gak pake lama.</em>
        </h2>
        <p style={{fontSize:14.5,color:"rgba(255,255,255,.44)",marginBottom:32,lineHeight:1.7}}>
          Bergabung dengan seller yang udah jualan langsung<br/>tanpa khawatir potongan komisi marketplace.
        </p>
        <a href="/daftar" className="btn-pri" style={{fontSize:15.5,padding:"15px 34px"}}>Buat Toko Gratis →</a>
      </div>

      {/* FOOTER */}
      <footer style={{background:BLACK,borderTop:"1px solid rgba(255,255,255,.06)",padding:"36px 48px"}}>
        <div className="footer-inner" style={{maxWidth:1120,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
          <a href="/" style={{fontSize:18,fontWeight:800,letterSpacing:"-.045em",color:"#fff"}}>
            tok<span style={{color:C}}>k</span>u<span style={{color:"rgba(255,255,255,.3)",fontWeight:500}}>.id</span>
          </a>
          <nav className="footer-links" style={{display:"flex",gap:22,flexWrap:"wrap"}}>
            {[["Fitur","#fitur"],["Cara Pakai","#cara-pakai"],["Harga","#harga"],["Masuk","/masuk"],["Daftar","/daftar"]].map(([l,h])=>(
              <a key={l} href={h} className="footer-a">{l}</a>
            ))}
          </nav>
          <p style={{fontSize:12.5,color:"rgba(255,255,255,.28)"}}>© 2026 tokku.id</p>
        </div>
      </footer>
    </main>
  );
}