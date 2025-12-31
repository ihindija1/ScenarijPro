const WORD_RE = /[a-zčćžšđA-ZČĆŽŠĐ]+(?:['-][a-zčćžšđA-ZČĆŽŠĐ]+)*/g;

function countWordsInToken(token) {
  const m = token.match(WORD_RE);
  return m ? m.length : 0;
}

function wrap20Words(text) {
  const raw = (text ?? "").toString().trim();
  if (raw === "") return [""];

  const tokens = raw.split(/\s+/);
  const lines = [];
  let current = [];
  let words = 0;

  for (const t of tokens) {
    const w = countWordsInToken(t);
    if (words + w > 20 && current.length > 0) {
      lines.push(current.join(" "));
      current = [];
      words = 0;
    }
    current.push(t);
    words += w;
  }
  if (current.length) lines.push(current.join(" "));
  return lines.length ? lines : [""];
}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

module.exports = { wrap20Words, nowUnixSeconds };
