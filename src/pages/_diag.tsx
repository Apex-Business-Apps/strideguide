import React from "react";

const mask = (s?: string) => s ? s.slice(0, 6) + "…(masked)" : "missing";

async function ping(url: string, opts?: RequestInit) {
  const started = Date.now();
  try {
    const r = await fetch(url, opts);
    const text = await r.text();
    return { ok: r.ok, status: r.status, ms: Date.now() - started, body: text.slice(0, 200) };
  } catch (e: unknown) {
    const error = e as Error;
    return { ok: false, status: 0, ms: Date.now() - started, body: (error?.message || "fetch failed").slice(0, 200) };
  }
}

export default function Diag() {
  const [res, setRes] = React.useState<Record<string, unknown> | null>(null);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const site = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

  React.useEffect(() => {
    (async () => {
      const health = supabaseUrl
        ? await ping(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`)
        : { ok: false, status: 0, ms: 0, body: "VITE_SUPABASE_URL missing" };
      const options = supabaseUrl
        ? await ping(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/settings`)
        : { ok: false, status: 0, ms: 0, body: "VITE_SUPABASE_URL missing" };
      setRes({ health, options });
    })();
  }, [supabaseUrl]);

  return (
    <div style={{padding:"16px",fontFamily:"system-ui"}}>
      <h1>Runtime Diagnostics</h1>
      <p><b>Origin:</b> {window.location.origin}</p>
      <p><b>VITE_PUBLIC_SITE_URL:</b> {site}</p>
      <p><b>VITE_SUPABASE_URL:</b> {supabaseUrl || "missing"}</p>
      <p><b>VITE_SUPABASE_ANON_KEY:</b> {mask(anon)}</p>

      <h2>Supabase Auth Health</h2>
      <pre>{JSON.stringify(res, null, 2)}</pre>

      <h2>CSP Probe</h2>
      <p>
        If <code>health.ok</code> is false with <code>TypeError: Failed to fetch</code> but the URL is correct,
        your CSP is blocking <code>connect-src</code> and/or <code>wss:</code>.
      </p>
    </div>
  );
}
