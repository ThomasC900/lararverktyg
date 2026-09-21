#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import html
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = "https://menu.matildaplatform.com/meals/week/6a5713fad6523cfd795c45ce_olyckeskolan"
OUT = Path("matsedel/matilda-diagnos.html")
TZ = ZoneInfo("Europe/Stockholm")

def week_range():
    today = dt.datetime.now(TZ).date()
    monday = today - dt.timedelta(days=today.weekday())
    sunday = monday + dt.timedelta(days=6)
    return monday, sunday

def make_url(monday, sunday):
    return BASE + "?" + urllib.parse.urlencode({
        "startDate": monday.isoformat(),
        "endDate": sunday.isoformat(),
    })

def clean_text(raw):
    # Gör en enkel textversion för loggen utan externa paket.
    txt = re.sub(r"(?is)<script.*?</script>", " ", raw)
    txt = re.sub(r"(?is)<style.*?</style>", " ", txt)
    txt = re.sub(r"(?i)<br\s*/?>", "\n", txt)
    txt = re.sub(r"(?i)</(?:div|p|li|h[1-6]|section|article)>", "\n", txt)
    txt = re.sub(r"(?s)<[^>]+>", " ", txt)
    txt = html.unescape(txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n\s*\n+", "\n", txt)
    return txt.strip()

monday, sunday = week_range()
url = make_url(monday, sunday)

print(f"Diagnos för {monday.isoformat()}–{sunday.isoformat()}")
print(f"Hämtar: {url}")

req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.7",
})

try:
    with urllib.request.urlopen(req, timeout=30) as r:
        status = getattr(r, "status", None)
        ctype = r.headers.get("Content-Type", "")
        body = r.read()
except Exception as e:
    print(f"FEL vid hämtning: {type(e).__name__}: {e}", file=sys.stderr)
    sys.exit(1)

print(f"HTTP-status: {status}")
print(f"Content-Type: {ctype}")
print(f"Antal bytes: {len(body)}")

# Försök avgöra teckenkodning.
charset = "utf-8"
m = re.search(r"charset=([A-Za-z0-9._-]+)", ctype, re.I)
if m:
    charset = m.group(1)
raw = body.decode(charset, errors="replace")

OUT.write_text(raw, encoding="utf-8")
print(f"Fullt svar sparat som artifact: {OUT}")

text = clean_text(raw)

print("\n========== DIAGNOS: TEXT SOM MATILDA SKICKAR ==========")
# Begränsa loggen så att den blir läsbar, men visa tillräckligt för att hitta strukturen.
print(text[:12000])
print("========== SLUT PÅ DIAGNOS ==========\n")

keywords = ["måndag", "monday", "dagens", "månadens", "grönt", "lunch", "meal", "menu", "__next_data__", "application/json"]
lower = raw.lower()
print("Sökord i råsvaret:")
for word in keywords:
    pos = lower.find(word.lower())
    print(f"  {word!r}: {'HITTAT vid tecken ' + str(pos) if pos >= 0 else 'inte hittat'}")

# Visa korta råa utdrag runt relevanta ord, om de finns.
print("\nRåa utdrag runt träffar:")
shown = set()
for word in keywords:
    pos = lower.find(word.lower())
    if pos >= 0:
        start = max(0, pos - 500)
        end = min(len(raw), pos + 1500)
        snippet = raw[start:end]
        key = (start, end)
        if key not in shown:
            shown.add(key)
            print(f"\n--- runt {word!r} ---")
            print(snippet)

print("\nDiagnoskörningen är klar. Ingen menu.json har ändrats.")
