// Just a few things that make dev life a bit easier for myself.

const envVars = [
  "REPLAY_DIR",
  "RECORD_REPLAY_API_KEY"
];

envVars.forEach(v => {
  if (!process.env[v]) {
    throw new Error(`ENV VAR not defined: ${v}`);
  }
});
