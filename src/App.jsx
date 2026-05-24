import { useState, useEffect, useRef, useCallback } from "react";

// ── Fonts ──────────────────────────────────────────────────────────
const injectFonts = () => {
  if (document.getElementById("rj-fonts")) return;
  const s = document.createElement("style");
  s.id = "rj-fonts";
  s.textContent = "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Noto+Sans+Devanagari:wght@300;400;500;600&display=swap');";
  document.head.appendChild(s);
};

// ── Hindi Transliteration ─────────────────────────────────────────
const LCONS = [
  ["chh","छ"],["ksh","क्ष"],["shr","श्र"],
  ["gya","ज्ञ"],["jna","ज्ञ"],["ddh","ढ"],
  ["kh","ख"],["gh","घ"],["ch","च"],["jh","झ"],
  ["tt","ठ"],["th","थ"],["dd","ड"],["dh","ध"],
  ["nn","ण"],["ny","ञ"],["ng","ङ"],
  ["ph","फ"],["bh","भ"],["sh","श"],
  ["tr","त्र"],
  ["k","क"],["g","ग"],["j","ज"],["c","क"],
  ["t","त"],["d","द"],["n","न"],
  ["p","प"],["b","ब"],["m","म"],
  ["y","य"],["r","र"],["l","ल"],
  ["v","व"],["w","व"],["s","स"],["h","ह"],
  ["f","फ"],["z","ज"],["q","क"],
];
const LVOWS = [
  ["aa","आ","ा"],["ii","ई","ी"],["uu","ऊ","ू"],
  ["oo","ऊ","ू"],["ee","ई","ी"],
  ["ai","ऐ","ै"],["au","औ","ौ"],["ao","औ","ौ"],
  ["ri","ऋ","ृ"],["an","ं","ं"],["am","ं","ं"],
  ["ah","ः","ः"],
  ["a","अ",""],["i","इ","ि"],["u","उ","ु"],
  ["e","ए","े"],["o","ओ","ो"],
];
function localTranslit(word) {
  let res = "", i = 0, pc = false;
  const w = word.toLowerCase();
  while (i < w.length) {
    let con = null, cl = 0;
    for (const [p, d] of LCONS) {
      if (w.startsWith(p, i)) { con = d; cl = p.length; break; }
    }
    if (con !== null) {
      if (pc) res += "्";
      res += con; i += cl; pc = true;
      let hit = false, mt = "", vl = 0;
      for (const [p, , m] of LVOWS) {
        if (w.startsWith(p, i)) { mt = m; vl = p.length; hit = true; break; }
      }
      if (hit) { res += mt; i += vl; pc = false; }
    } else {
      let vf = null, vl = 0;
      for (const [p, f] of LVOWS) {
        if (w.startsWith(p, i)) { vf = f; vl = p.length; break; }
      }
      if (vf !== null) { res += vf; i += vl; pc = false; }
      else { pc = false; res += word[i]; i++; }
    }
  }
  return res;
}
async function googleTranslit(word) {
  try {
    const url = "https://inputtools.google.com/request?text="
      + encodeURIComponent(word) + "&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8";
    const res = await fetch(url);
    const data = await res.json();
    if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
      return { ok: true, results: data[1][0][1] };
    }
  } catch {}
  return { ok: false, results: [localTranslit(word)] };
}

// ── Storage ────────────────────────────────────────────────────────
const SKEY = "likhavat:v2";
async function dbLoad() {
  try {
    const r = localStorage.getItem(SKEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}
async function dbSave(arr) {
  try { localStorage.setItem(SKEY, JSON.stringify(arr)); } catch {}
}

// ── Utils ──────────────────────────────────────────────────────────
const mkId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today  = () => new Date().toISOString().slice(0, 10);
const wc     = t => t.trim() ? t.trim().split(/\s+/).length : 0;
const fmtS   = d => new Date(d + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" });
const fmtL   = d => new Date(d + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const MOODS = ["😊","😔","🤔","😤","😴","🥰","🎉","😰","😐","✨"];

// Design tokens
const C = {
  bg:"#0A0806", surf:"#0E0B07", card:"#141009",
  bdr:"#201408", bdr2:"#180F07",
  acc:"#C28640", acc2:"#D4974E", accd:"#7A5022",
  hi:"#CC6535",
  tx:"#DFCAA0", tx2:"#8A6444", tx3:"#3E2814",
  serif:'"Cormorant Garamond", Georgia, serif',
  sans:'"DM Sans", system-ui, sans-serif',
  deva:'"Noto Sans Devanagari", "Cormorant Garamond", serif',
};

// ── Export / Import helpers ────────────────────────────────────────
function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function entriesToMarkdown(entries) {
  return entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(e => {
      const lines = [
        `# ${e.title || "Untitled"}`,
        ``,
        `**Date:** ${fmtL(e.date)}`,
        e.mood   ? `**Mood:** ${e.mood}` : null,
        e.tags?.length ? `**Tags:** ${e.tags.map(t => "#" + t).join("  ")}` : null,
        ``,
        e.body || "_No content_",
        ``,
        `---`,
      ].filter(l => l !== null);
      return lines.join("\n");
    })
    .join("\n\n");
}

// ── Component ──────────────────────────────────────────────────────
export default function Rojanama() {
  const taRef      = useRef(null);
  const tiRef      = useRef(null);
  const scrollRef  = useRef(null);
  const eRef       = useRef([]);
  const edRef      = useRef({});
  const saveTimer  = useRef(null);
  const lastConv   = useRef(null);
  const suggRef    = useRef(null);
  const suggIdxRef = useRef(0);
  const importRef  = useRef(null);   // hidden file input

  const [entries,    setEntries]    = useState([]);
  const [cid,        setCid]        = useState(null);
  const [hindi,      setHindi]      = useState(false);
  const [q,          setQ]          = useState("");
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [mood,       setMood]       = useState("");
  const [tags,       setTags]       = useState([]);
  const [tagInp,     setTagInp]     = useState("");
  const [dirty,      setDirty]      = useState(false);
  const [status,     setStatus]     = useState("idle");
  const [delId,      setDelId]      = useState(null);
  const [ready,      setReady]      = useState(false);
  const [tPos,       setTPos]       = useState(null);
  const [bPos,       setBPos]       = useState(null);
  const [sugg,       setSugg]       = useState(null);
  const [suggIdx,    setSuggIdx]    = useState(0);
  const [exportMenu, setExportMenu] = useState(false);
  const [importMsg,  setImportMsg]  = useState(null); // "Imported 12 entries"

  // ── Mobile layout state ───────────────────────────────────────────
  // 'list' = sidebar visible, 'editor' = editor visible
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth <= 768);
  const [mobileView, setMobileView] = useState("list");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { suggRef.current    = sugg;    }, [sugg]);
  useEffect(() => { suggIdxRef.current = suggIdx; }, [suggIdx]);
  useEffect(() => { eRef.current       = entries; }, [entries]);
  useEffect(() => {
    edRef.current = { cid, title, body, mood, tags, hindi };
  }, [cid, title, body, mood, tags, hindi]);

  // Boot
  useEffect(() => {
    injectFonts();
    dbLoad().then(data => { setEntries(data); setReady(true); });
  }, []);

  // Cursor restore after transliteration
  useEffect(() => {
    if (tPos !== null && tiRef.current) {
      tiRef.current.selectionStart = tPos;
      tiRef.current.selectionEnd   = tPos;
      setTPos(null);
    }
  }, [title, tPos]);

  useEffect(() => {
    if (bPos !== null && taRef.current) {
      taRef.current.selectionStart = bPos;
      taRef.current.selectionEnd   = bPos;
      setBPos(null);
    }
  }, [body, bPos]);

  // ── Save logic ─────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    const { cid: id, title: t, body: b, mood: mo, tags: tg, hindi: hi } = edRef.current;
    if (!id) return;
    setStatus("saving");
    const upd = eRef.current.map(e =>
      e.id === id
        ? { ...e, title: t, body: b, mood: mo, tags: tg, wc: wc(b),
            updatedAt: new Date().toISOString(), lang: hi ? "hi" : "en" }
        : e
    );
    setEntries(upd);
    await dbSave(upd);
    setDirty(false);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }, []);

  useEffect(() => {
    if (!dirty || !cid) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1400);
    return () => clearTimeout(saveTimer.current);
  }, [dirty, cid, title, body, mood, tags, doSave]);

  // ── CRUD ───────────────────────────────────────────────────────
  const openEntry = useCallback(e => {
    setCid(e.id); setTitle(e.title || ""); setBody(e.body || "");
    setMood(e.mood || ""); setTags(e.tags || []);
    setHindi(e.lang === "hi"); setDirty(false); setStatus("idle");
    setMobileView("editor");  // always switch to editor on mobile
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setTimeout(() => ((e.title ? taRef : tiRef).current || taRef.current)?.focus(), 80);
  }, []);

  const newEntry = async () => {
    clearTimeout(saveTimer.current);
    if (dirty) await doSave();
    const e = {
      id: mkId(), date: today(), title: "", body: "",
      mood: "", tags: [], wc: 0, lang: "en",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const upd = [e, ...eRef.current];
    setEntries(upd);
    await dbSave(upd);
    openEntry(e);
  };

  const pick = async e => {
    if (e.id === cid) { setMobileView("editor"); return; }
    clearTimeout(saveTimer.current);
    if (dirty) await doSave();
    openEntry(e);
  };

  const del = async id => {
    const upd = eRef.current.filter(e => e.id !== id);
    setEntries(upd);
    await dbSave(upd);
    if (cid === id) {
      setCid(null); setTitle(""); setBody(""); setMood(""); setTags([]);
      setDirty(false); setMobileView("list");
    }
    setDelId(null);
  };

  // ── Export / Import ────────────────────────────────────────────
  const exportJSON = () => {
    triggerDownload(
      JSON.stringify(entries, null, 2),
      `likhavat-backup-${today()}.json`,
      "application/json"
    );
    setExportMenu(false);
  };

  const exportMarkdown = () => {
    triggerDownload(
      entriesToMarkdown(entries),
      `likhavat-${today()}.md`,
      "text/markdown"
    );
    setExportMenu(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("bad format");
      const existingIds = new Set(eRef.current.map(x => x.id));
      const fresh = data.filter(x => x.id && !existingIds.has(x.id));
      const merged = [...fresh, ...eRef.current]
        .sort((a, b) => b.date.localeCompare(a.date));
      setEntries(merged);
      await dbSave(merged);
      setImportMsg(`✓ Imported ${fresh.length} new entr${fresh.length === 1 ? "y" : "ies"}`);
      setTimeout(() => setImportMsg(null), 3500);
    } catch {
      setImportMsg("✗ Invalid backup file");
      setTimeout(() => setImportMsg(null), 3500);
    }
  };

  // ── Hindi IME ─────────────────────────────────────────────────────
  const ime = async (e, val, setVal, ref, setPos) => {
    if (!hindi) return;

    if (e.key === "Backspace") {
      const pos = ref.current ? ref.current.selectionStart : val.length;
      const lc  = lastConv.current;
      if (lc && lc.setVal === setVal && pos === lc.pos) {
        e.preventDefault();
        setSugg(lc); setSuggIdx(0);
        return;
      }
      setSugg(null);
      return;
    }

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if (!suggRef.current) return;
      e.preventDefault();
      const len  = suggRef.current.words.length;
      const cur  = suggIdxRef.current;
      const next = e.key === "ArrowRight" ? (cur + 1) % len : (cur - 1 + len) % len;
      setSuggIdx(next);
      return;
    }
    if (e.key === "Escape") { setSugg(null); setSuggIdx(0); return; }
    if (e.key === "Enter" && suggRef.current) {
      e.preventDefault();
      const s = suggRef.current;
      const w = s.words[suggIdxRef.current];
      s.setVal(v => {
        const cur = s.words[0];
        const idx = v.indexOf(s.pre + cur + s.sep);
        if (idx === -1) return v;
        return v.slice(0, idx) + s.pre + w + s.sep + v.slice(idx + s.pre.length + cur.length + s.sep.length);
      });
      s.setPos(s.posBase + w.length + 1);
      setSugg(null); setSuggIdx(0);
      return;
    }
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    setSugg(null);

    const pos    = ref.current ? ref.current.selectionStart : val.length;
    const before = val.slice(0, pos);
    const after  = val.slice(pos);
    const si     = Math.max(before.lastIndexOf(" "), before.lastIndexOf("\n"));
    const word   = before.slice(si + 1);
    const pre    = before.slice(0, si + 1);
    const sep    = e.key === "Enter" ? "\n" : " ";

    if (word === ".") {
      setVal(pre + "।" + sep + after); setPos(pre.length + 2);
      setDirty(true); return;
    }
    if (!word || !/[a-zA-Z]/.test(word)) {
      setVal(before + sep + after); setPos(pos + 1);
      setDirty(true); return;
    }

    const local = localTranslit(word);
    setVal(pre + local + sep + after);
    setPos(pre.length + local.length + 1);
    setDirty(true);

    const { ok, results } = await googleTranslit(word);
    const finalWords = ok ? results : [local];
    if (!finalWords.includes(word)) finalWords.push(word);

    const best = finalWords[0];
    if (best !== local) {
      setVal(v => {
        const idx = v.indexOf(pre + local + sep);
        if (idx === -1) return v;
        return v.slice(0, idx) + pre + best + sep + v.slice(idx + pre.length + local.length + sep.length);
      });
    }
    const finalPos = pre.length + best.length + 1;
    setPos(finalPos);

    lastConv.current = { roman: word, words: finalWords, pre, sep, after,
      posBase: pre.length, pos: finalPos, setVal, setPos };
  };

  const addTag = e => {
    if (e.key !== "Enter" || !tagInp.trim()) return;
    const t = tagInp.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tags.includes(t)) { setTags([...tags, t]); setDirty(true); }
    setTagInp("");
  };

  // ── Derived ────────────────────────────────────────────────────
  const streak = (() => {
    const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
    let s = 0, cur = today();
    for (const d of dates) {
      if (d === cur) {
        s++;
        const dd = new Date(cur + "T12:00:00"); dd.setDate(dd.getDate() - 1);
        cur = dd.toISOString().slice(0, 10);
      } else break;
    }
    return s;
  })();

  const totalWc  = entries.reduce((s, e) => s + (e.wc || 0), 0);
  const filtered = q
    ? entries.filter(e =>
        (e.title || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.body  || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.tags  || []).some(t => t.includes(q.toLowerCase()))
      )
    : entries;

  const grouped = filtered.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e); return acc;
  }, {});
  const gDates = Object.keys(grouped).sort().reverse();
  const cur    = entries.find(e => e.id === cid);

  // ── Mobile visibility logic ────────────────────────────────────
  const showSidebar = !isMobile || mobileView === "list";
  const showMain    = !isMobile || mobileView === "editor";

  // ── Loading ────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"100vh", background:C.bg, fontFamily:C.serif, color:C.tx3, fontSize:14 }}>
        Loading…
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden",
      background:C.bg, color:C.tx, fontFamily:C.sans, position:"relative" }}>

      {/* ══ SIDEBAR ══ */}
      {showSidebar && (
        <div style={{
          width: isMobile ? "100%" : 258,
          flexShrink:0, background:C.surf,
          borderRight: isMobile ? "none" : `1px solid ${C.bdr}`,
          display:"flex", flexDirection:"column", overflow:"hidden",
        }}>

          {/* Logo */}
          <div style={{ padding:"20px 18px 14px", borderBottom:`1px solid ${C.bdr2}` }}>
            <div style={{ fontFamily:C.serif, fontSize:22, fontWeight:600, color:C.acc }}>{"लिखावट"}</div>
            <div style={{ fontSize:9, color:C.tx3, letterSpacing:"2.5px", textTransform:"uppercase", marginTop:4 }}>
              Your Writing Space
            </div>
          </div>

          {/* New entry button */}
          <button onClick={newEntry}
            style={{ margin:"12px 16px 0", padding:"9px 0", background:C.acc, color:C.bg,
              border:"none", borderRadius:8, fontSize:12, fontWeight:700, letterSpacing:0.4,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <span style={{ fontSize:18, lineHeight:1 }}>+</span>
            New Entry
          </button>

          {/* Search */}
          <div style={{ padding:"10px 16px 12px", borderBottom:`1px solid ${C.bdr2}` }}>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search entries…"
              style={{ width:"100%", marginTop:8, padding:"7px 10px", background:C.card,
                border:`1px solid ${C.bdr2}`, borderRadius:7, color:C.tx,
                fontSize:12, outline:"none", fontFamily:C.sans, boxSizing:"border-box" }} />
          </div>

          {/* List */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {gDates.length === 0 && (
              <div style={{ padding:"28px 18px", textAlign:"center", fontSize:12,
                color:C.tx3, fontStyle:"italic", lineHeight:1.7 }}>
                {q ? "No results." : "No entries yet.\nClick + New Entry."}
              </div>
            )}
            {gDates.map(date => (
              <div key={date}>
                <div style={{ padding:"10px 16px 3px", fontSize:9, color:C.tx3,
                  letterSpacing:"1.5px", textTransform:"uppercase", fontWeight:600 }}>
                  {fmtS(date)}
                </div>
                {grouped[date].map(e => (
                  <div key={e.id} onClick={() => pick(e)}
                    style={{ padding:"9px 16px", cursor:"pointer", userSelect:"none",
                      borderLeft:`2px solid ${cid === e.id ? C.acc : "transparent"}`,
                      background: cid === e.id ? "rgba(194,134,64,0.08)" : "transparent" }}>
                    <div style={{ fontSize:12, fontWeight:500, fontFamily:C.deva,
                      color: cid === e.id ? C.acc2 : C.tx,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:2 }}>
                      {e.title || <span style={{ fontStyle:"italic", color:C.tx3, fontFamily:C.sans }}>Untitled</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.tx3,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {(e.body || "").slice(0, 52) || "—"}
                    </div>
                    <div style={{ display:"flex", gap:5, marginTop:5, alignItems:"center" }}>
                      <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, fontWeight:700,
                        background: e.lang === "hi" ? "rgba(204,101,53,0.12)" : "rgba(194,134,64,0.1)",
                        color:      e.lang === "hi" ? C.hi : C.accd }}>
                        {e.lang === "hi" ? "हिं" : "EN"}
                      </span>
                      {e.mood && <span style={{ fontSize:12 }}>{e.mood}</span>}
                      {(e.wc || 0) > 0 && <span style={{ fontSize:9, color:C.tx3 }}>{e.wc}w</span>}
                      {(e.tags || []).slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize:9, color:C.tx3 }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── Export / Import toolbar ── */}
          <div style={{ borderTop:`1px solid ${C.bdr2}`, padding:"8px 14px",
            display:"flex", alignItems:"center", gap:6, position:"relative" }}>
            {importMsg && (
              <div style={{ position:"absolute", bottom:"100%", left:14, right:14,
                background: importMsg.startsWith("✓") ? "#1A2A18" : "#2A1010",
                border:`1px solid ${importMsg.startsWith("✓") ? "#3A6030" : "#6A2020"}`,
                borderRadius:6, padding:"6px 10px", fontSize:10,
                color: importMsg.startsWith("✓") ? "#80C070" : "#E06060",
                marginBottom:4 }}>
                {importMsg}
              </div>
            )}

            {/* Export button + dropdown */}
            <div style={{ position:"relative" }}>
              <button onClick={() => setExportMenu(v => !v)}
                title="Export entries"
                style={{ padding:"5px 10px", background:"transparent",
                  border:`1px solid ${C.bdr}`, borderRadius:6,
                  color:C.tx2, fontSize:10, cursor:"pointer", fontFamily:C.sans,
                  display:"flex", alignItems:"center", gap:4 }}>
                ↑ Export
              </button>
              {exportMenu && (
                <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0,
                  background:C.card, border:`1px solid ${C.bdr}`, borderRadius:8,
                  overflow:"hidden", minWidth:140, zIndex:20,
                  boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>
                  <button onClick={exportJSON}
                    style={{ width:"100%", padding:"10px 14px", background:"transparent",
                      border:"none", borderBottom:`1px solid ${C.bdr2}`,
                      color:C.tx, fontSize:11, cursor:"pointer", textAlign:"left",
                      fontFamily:C.sans }}>
                    📦 JSON Backup
                  </button>
                  <button onClick={exportMarkdown}
                    style={{ width:"100%", padding:"10px 14px", background:"transparent",
                      border:"none", color:C.tx, fontSize:11, cursor:"pointer",
                      textAlign:"left", fontFamily:C.sans }}>
                    📝 Markdown
                  </button>
                </div>
              )}
            </div>

            {/* Import button */}
            <button onClick={() => importRef.current?.click()}
              title="Import JSON backup"
              style={{ padding:"5px 10px", background:"transparent",
                border:`1px solid ${C.bdr}`, borderRadius:6,
                color:C.tx2, fontSize:10, cursor:"pointer", fontFamily:C.sans,
                display:"flex", alignItems:"center", gap:4 }}>
              ↓ Import
            </button>
            <input ref={importRef} type="file" accept=".json"
              onChange={handleImport} style={{ display:"none" }} />

            <div style={{ flex:1, textAlign:"right", fontSize:9, color:C.tx3 }}>
              {entries.length} entr{entries.length === 1 ? "y" : "ies"}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display:"flex", borderTop:`1px solid ${C.bdr2}`, padding:"12px 0" }}>
            {[[entries.length,"Entries"],[`${streak}${streak>0?" 🔥":""}`, "Streak"],
              [totalWc > 999 ? `${(totalWc/1000).toFixed(1)}k` : totalWc, "Words"]].map(([n,l],i) => (
              <div key={l} style={{ flex:1, textAlign:"center",
                borderRight: i < 2 ? `1px solid ${C.bdr2}` : "none" }}>
                <div style={{ fontFamily:C.serif, fontSize:18, fontWeight:500, color:C.acc, lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:9, color:C.tx3, letterSpacing:"1px", textTransform:"uppercase", marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ══ END SIDEBAR ══ */}

      {/* ══ MAIN ══ */}
      {showMain && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
          width: isMobile ? "100%" : undefined }}>

          {!cid ? (
            /* Empty state */
            <div style={{ flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", textAlign:"center", padding:48 }}>
              {/* Back button on mobile empty state */}
              {isMobile && (
                <button onClick={() => setMobileView("list")}
                  style={{ position:"absolute", top:16, left:16, padding:"6px 12px",
                    background:"transparent", border:`1px solid ${C.bdr}`,
                    borderRadius:6, color:C.tx2, fontSize:12, cursor:"pointer",
                    fontFamily:C.sans, display:"flex", alignItems:"center", gap:4 }}>
                  ← List
                </button>
              )}
              <div style={{ fontSize:56, marginBottom:18, opacity:0.1 }}>📖</div>
              <div style={{ fontFamily:C.serif, fontSize:28, fontWeight:300, color:C.tx3, marginBottom:10 }}>
                Begin your story
              </div>
              <div style={{ fontSize:13, color:C.tx3, opacity:0.55, fontStyle:"italic",
                marginBottom:28, lineHeight:1.8 }}>
                Write in English, Hindi, or both.
              </div>
              <button onClick={newEntry}
                style={{ padding:"11px 28px", background:C.acc, color:C.bg, border:"none",
                  borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", letterSpacing:0.4 }}>
                + Start Writing
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ padding: isMobile ? "10px 14px" : "12px 26px",
                borderBottom:`1px solid ${C.bdr2}`,
                display:"flex", alignItems:"center", gap:10, flexShrink:0, flexWrap:"wrap" }}>

                {/* Back button on mobile */}
                {isMobile && (
                  <button onClick={() => setMobileView("list")}
                    style={{ padding:"5px 10px", background:"transparent",
                      border:`1px solid ${C.bdr}`, borderRadius:6,
                      color:C.tx2, fontSize:12, cursor:"pointer",
                      fontFamily:C.sans, display:"flex", alignItems:"center", gap:4,
                      flexShrink:0 }}>
                    ← Back
                  </button>
                )}

                <div style={{ fontFamily:C.serif, fontSize:13, color:C.tx2,
                  fontStyle:"italic", flex:1, minWidth:0,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {fmtL(cur?.date || today())}
                </div>

                {/* Moods — hide on very narrow screens via flex-wrap */}
                <div style={{ display:"flex", gap:2 }}>
                  {MOODS.map(m => (
                    <button key={m} title={m}
                      onClick={() => { setMood(mood === m ? "" : m); setDirty(true); }}
                      style={{ fontSize:14, padding:"2px 3px", background:"transparent",
                        border:"none", cursor:"pointer",
                        opacity: mood === m ? 1 : 0.22,
                        transform: mood === m ? "scale(1.2)" : "scale(1)",
                        transition:"all 0.12s" }}>
                      {m}
                    </button>
                  ))}
                </div>

                {/* Language toggle */}
                <div style={{ display:"flex", background:C.card,
                  border:`1px solid ${C.bdr}`, borderRadius:8, overflow:"hidden", flexShrink:0 }}>
                  <button onClick={() => setHindi(false)}
                    style={{ padding:"5px 13px", fontSize:11, fontWeight:700, letterSpacing:0.5,
                      border:"none", cursor:"pointer",
                      background: !hindi ? C.acc : "transparent",
                      color:      !hindi ? C.bg  : C.tx3 }}>
                    EN
                  </button>
                  <button onClick={() => setHindi(true)}
                    style={{ padding:"5px 13px", fontSize:12, fontWeight:600,
                      border:"none", cursor:"pointer", fontFamily:C.deva,
                      background: hindi ? C.hi      : "transparent",
                      color:      hindi ? "#fff3ee" : C.tx3 }}>
                    {"हिंदी"}
                  </button>
                </div>
              </div>

              {/* Scroll area */}
              <div ref={scrollRef} style={{ flex:1, overflowY:"auto",
                padding: isMobile ? "18px 16px 16px" : "26px 28px 20px" }}>

                {/* Title */}
                <input ref={tiRef} value={title}
                  onChange={e => { setTitle(e.target.value); setDirty(true); }}
                  onKeyDown={e => ime(e, title, setTitle, tiRef, setTPos)}
                  placeholder="Title…"
                  style={{ width:"100%", boxSizing:"border-box", fontFamily:C.deva,
                    fontSize: isMobile ? 24 : 30, fontWeight:300, color:C.tx,
                    background:"transparent", border:"none", outline:"none",
                    lineHeight:1.3, marginBottom:6 }} />

                {/* Lang indicator */}
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  padding:"9px 0", borderBottom:`1px solid ${C.bdr2}`, marginBottom:20,
                  flexWrap:"wrap" }}>
                  <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%",
                    background: hindi ? C.hi : C.acc, flexShrink:0 }}></span>
                  <span style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase",
                    fontWeight:600, color: hindi ? C.hi : C.accd }}>
                    {hindi ? "Hindi Mode" : "English Mode"}
                  </span>
                  {hindi && (
                    <span style={{ fontSize:10, color:C.tx3, fontStyle:"italic",
                      marginLeft: isMobile ? 0 : "auto" }}>
                      {"type phonetically · space to convert"}
                    </span>
                  )}
                </div>

                {/* Body */}
                <textarea ref={taRef} value={body}
                  onChange={e => { setBody(e.target.value); setDirty(true); }}
                  onKeyDown={e => ime(e, body, setBody, taRef, setBPos)}
                  placeholder={hindi
                    ? "Yahan likhiye… (space dabane par convert hoga)"
                    : "Write freely…"}
                  style={{ width:"100%", boxSizing:"border-box",
                    minHeight: isMobile ? 260 : 340,
                    fontSize: isMobile ? 15 : 17, lineHeight:1.9, color:C.tx,
                    background:"transparent", border:"none", outline:"none",
                    resize:"none", fontFamily:C.deva }} />

                {/* Tags */}
                <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${C.bdr2}` }}>
                  <div style={{ fontSize:9, letterSpacing:"2px", textTransform:"uppercase",
                    color:C.tx3, marginBottom:9, fontWeight:600 }}>
                    Tags
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
                    {tags.map(t => (
                      <span key={t}
                        style={{ padding:"2px 9px", background:C.card,
                          border:`1px solid ${C.bdr}`, borderRadius:20,
                          fontSize:11, color:C.tx2, display:"flex", alignItems:"center", gap:4 }}>
                        #{t}
                        <span onClick={() => { setTags(tags.filter(x => x !== t)); setDirty(true); }}
                          style={{ cursor:"pointer", color:C.tx3, fontSize:15, lineHeight:1 }}>
                          ×
                        </span>
                      </span>
                    ))}
                    <input value={tagInp} onChange={e => setTagInp(e.target.value)} onKeyDown={addTag}
                      placeholder="+ add tag"
                      style={{ background:"transparent", border:"none", outline:"none",
                        fontSize:11, color:C.tx2, fontFamily:C.sans, width:80 }} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: isMobile ? "8px 16px" : "10px 26px",
                borderTop:`1px solid ${C.bdr2}`,
                display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                <div style={{ flex:1, display:"flex", gap:14, fontSize:10, color:C.tx3, flexWrap:"wrap" }}>
                  <span>{wc(body)} words</span>
                  <span>{body.length} chars</span>
                  {mood && <span>Feeling {mood}</span>}
                </div>
                <span style={{ fontSize:10,
                  color: status === "saving" ? C.accd
                       : status === "saved"  ? "#4A8A3A"
                       : dirty ? C.tx3 : "transparent",
                  transition:"color 0.3s" }}>
                  {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : dirty ? "● Unsaved" : ""}
                </span>
                <button onClick={() => setDelId(cid)}
                  style={{ padding:"5px 10px", background:"transparent",
                    border:"1px solid rgba(140,30,30,0.25)", borderRadius:6,
                    color:"rgba(180,60,60,0.6)", fontSize:10, cursor:"pointer",
                    fontFamily:C.sans }}>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {/* ══ END MAIN ══ */}

      {/* ══ SUGGESTIONS POPUP ══ */}
      {sugg && (
        <div style={{ position:"fixed", bottom:52, left:"50%", transform:"translateX(-50%)",
          background:"#1A1208", border:"1px solid #C28640", borderRadius:10,
          padding:"14px 10px", display:"flex", alignItems:"center", gap:8, zIndex:40,
          boxShadow:"0 4px 24px rgba(0,0,0,0.6)", maxWidth:"92vw", flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"#7A5022", padding:"2px 8px 2px 4px",
            borderRight:"1px solid #201408", marginRight:2, whiteSpace:"nowrap" }}>
            ←→ navigate · Enter select
          </span>
          {sugg.words.map((w, i) => {
            const isEng    = /^[a-zA-Z]+$/.test(w);
            const isActive = i === suggIdx;
            const pickWord = () => {
              sugg.setVal(v => {
                const cur = sugg.words[0];
                const idx = v.indexOf(sugg.pre + cur + sugg.sep);
                if (idx === -1) return v;
                return v.slice(0,idx) + sugg.pre + w + sugg.sep
                  + v.slice(idx + sugg.pre.length + cur.length + sugg.sep.length);
              });
              sugg.setPos(sugg.posBase + w.length + 1);
              setSugg(null);
            };
            return (
              <button key={i} onClick={pickWord} style={{
                padding:"8px 16px",
                background: isActive ? (isEng ? "#2A4828" : "#C28640") : isEng ? "#1A2818" : "transparent",
                border:"1px solid " + (isActive ? (isEng ? "#70C060" : "#C28640") : isEng ? "#3A6030" : "#3A2510"),
                borderRadius:6,
                color: isActive ? (isEng ? "#A0E090" : "#0A0806") : isEng ? "#70C060" : "#DFCAA0",
                fontSize: isEng ? 14 : 18, cursor:"pointer",
                fontFamily: isEng ? '"DM Sans",sans-serif' : '"Noto Sans Devanagari","Cormorant Garamond",serif',
                outline:"none",
              }}>
                {isEng ? w + " (EN)" : w}
              </button>
            );
          })}
          <button onClick={() => setSugg(null)}
            style={{ padding:"3px 8px", background:"transparent", border:"none",
              color:"#3A2814", fontSize:16, cursor:"pointer" }}>
            ×
          </button>
        </div>
      )}

      {/* ══ DELETE MODAL ══ */}
      {delId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
          <div style={{ background:C.card, border:`1px solid ${C.bdr}`,
            borderRadius:14, padding:26, maxWidth:300, width:"88%" }}>
            <div style={{ fontFamily:C.serif, fontSize:20, color:C.tx, marginBottom:8, fontWeight:500 }}>
              Delete this entry?
            </div>
            <div style={{ fontSize:12, color:C.tx2, marginBottom:22, lineHeight:1.6 }}>
              This cannot be undone.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setDelId(null)}
                style={{ padding:"7px 16px", background:"transparent",
                  border:`1px solid ${C.bdr}`, borderRadius:7,
                  color:C.tx2, fontSize:12, cursor:"pointer", fontFamily:C.sans }}>
                Cancel
              </button>
              <button onClick={() => del(delId)}
                style={{ padding:"7px 16px", background:"#7A1A1A", border:"none",
                  borderRadius:7, color:"#FFD0D0", fontSize:12, cursor:"pointer",
                  fontFamily:C.sans }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close export menu on outside click */}
      {exportMenu && (
        <div onClick={() => setExportMenu(false)}
          style={{ position:"fixed", inset:0, zIndex:10 }} />
      )}

    </div>
  );
}
