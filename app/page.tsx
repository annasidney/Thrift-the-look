import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data, error } = await supabase.from("test").select("*");
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">ThriftTheLook</h1>
      <pre>{JSON.stringify(data ?? error, null, 2)}</pre>
    </main>
  );
}