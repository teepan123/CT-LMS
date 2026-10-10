for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch("http://localhost:3000")).ok) process.exit(0);
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
console.error("Server did not become ready");
process.exit(1);
