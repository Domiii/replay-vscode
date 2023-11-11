export async function openUrl(url: string) {
    // Note: There is a compatability problem with open, requiring a dynamic import.
    const { openApp } = await import("open");
    await openApp(url);
}

export async function exec(url: string) {
  // Note: There is a compatability problem with open, requiring a dynamic import.
  const { openApp } = await import("open");
  await openApp(url);
}
