import { supabase } from "@/lib/supabaseClient";

export default async function SupabaseTestPage() {
  const urlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const keySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Simple call to verify we can reach Supabase.
  const { data, error } = await supabase.auth.getSession();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Supabase Test</h1>

      <ul>
        <li>Env URL set: {String(urlSet)}</li>
        <li>Env anon key set: {String(keySet)}</li>
      </ul>

      <h2>auth.getSession()</h2>
      {error ? (
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}
