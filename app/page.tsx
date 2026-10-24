import AuthStatus from "@/components/AuthStatus";

export default function Home() {
  return (
    <main className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ThriftTheLook</h1>
        <AuthStatus />
      </header>
      <p>Turn any outfit photo into a shoppable look.</p>
    </main>
  );
}