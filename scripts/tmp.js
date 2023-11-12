const { spawn } = require("child_process");

(async function main() {
  const p = spawn(
    "/home/domi/replay/chromium/src/out/Release/chrome", 
    ["--no-first-run", "--no-default-browser-check", "--user-data-dir=/home/domi/replay/chromium/src/out/Release/runtimes/profiles/chromium", "http://localhost:3456"], 
    { 
      // stdio: "inherit",
      detached: true,
    }
  );
  p.unref();
})();
