"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="loading-page"><h1>Dashboard belum bisa dimuat</h1><p>Periksa konfigurasi koneksi lalu coba lagi.</p><button className="button" onClick={reset}>Coba lagi</button></main>; }
