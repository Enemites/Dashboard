"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="loading-page"><h1>Unable to load the dashboard</h1><p>Check the connection settings and try again.</p><button className="button" onClick={reset}>Try again</button></main>; }
