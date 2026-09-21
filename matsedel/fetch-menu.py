#!/usr/bin/env python3
"""
Hämtar aktuell veckomeny från Matilda Menu och skriver matsedel/menu.json.

Strategi:
1. Hämtar Matildas veckosida med datumparametrar.
2. Gör HTML till ren text.
3. Letar efter respektive veckodag och plockar text mellan Dagens 1/Dagens 2.
4. Om parsningen misslyckas lämnas befintlig menu.json orörd.

Det gör lösningen "fail safe": GitHub Pages fortsätter visa senaste fungerande meny.
"""
from __future__ import annotations
from datetime import date, timedelta
from pathlib import Path
import html
import json
import re
import sys
import urllib.request

BASE = "https://menu.matildaplatform.com/meals/week/69775c47e2d237d90a0ebde8_meny-grundskola-eslov"
OUT = Path(__file__).with_name("menu.json")

DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
MONTHS = {
    1:"januari",2:"februari",3:"mars",4:"april",5:"maj",6:"juni",
    7:"juli",8:"augusti",9:"september",10:"oktober",11:"november",12:"december"
}

def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())

def normalize_text(raw_html: str) -> str:
    # Fångar både synlig SSR-text och text som ligger i inbäddad script-data.
    s = html.unescape(raw_html)
    s = re.sub(r"<script\b[^>]*>", "\n", s, flags=re.I)
    s = re.sub(r"</script>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "\n", s)
    s = s.replace("\\u0026", "&").replace("\\n", "\n")
    s = re.sub(r'\\["/]', lambda m: m.group(0)[1:], s)
    s = re.sub(r"[ \t\r\f\v]+", " ", s)
    s = re.sub(r"\n+", "\n", s)
    return s.strip()

def clean_dish(s: str) -> str:
    # Tar bort allergenetiketter och nästa rubrik om de råkat följa med.
    s = re.split(r"\b(?:Gluten|Sojabönor|Mjölk|Laktos|Ägg|Fisk|Svaveldioxid eller sulfit|Selleri|Senap|Sesamfrön|Jordnötter|Nötter)\b", s, 1)[0]
    s = re.split(r"\b(?:Dagens 2|Månadens|Grönsak)\b", s, 1)[0]
    s = re.sub(r"\s+", " ", s).strip(" -|,")
    return s

def parse_day(block: str):
    m1 = re.search(r"Dagens\s*1\s+(.+?)(?=Dagens\s*2|Månadens|$)", block, re.I|re.S)
    m2 = re.search(r"Dagens\s*2\s+(.+?)(?=Månadens|Grönsak|$)", block, re.I|re.S)
    return clean_dish(m1.group(1)) if m1 else "", clean_dish(m2.group(1)) if m2 else ""

def fetch() -> dict:
    today = date.today()
    monday = monday_of(today)
    sunday = monday + timedelta(days=6)
    url = f"{BASE}?startDate={monday.isoformat()}&endDate={sunday.isoformat()}"
    req = urllib.request.Request(url, headers={
        "User-Agent":"Mozilla/5.0 (compatible; OlyckeskolanMenu/1.0)",
        "Accept-Language":"sv-SE,sv;q=0.9,en;q=0.5"
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8", "replace")

    text = normalize_text(raw)
    days = []
    for i, day in enumerate(DAYS):
        d = monday + timedelta(days=i)
        # Matilda använder t.ex. "Måndag 31 Augusti". Matcha dagrubriken och
        # ta material fram till nästa veckodag.
        next_days = "|".join(DAYS[i+1:]) if i < 4 else r"$"
        head = rf"{day}\s+{d.day}\s+{MONTHS[d.month]}"
        m = re.search(head + rf"(.+?)(?={next_days})", text, re.I|re.S)
        if not m:
            # Lite tolerant reservmatchning: dag + datum, oavsett månadsstavning.
            m = re.search(rf"{day}\s+{d.day}\b(.+?)(?={next_days})", text, re.I|re.S)
        block = m.group(1) if m else ""
        meal1, meal2 = parse_day(block)
        if not meal1 and not meal2:
            raise RuntimeError(f"Kunde inte tolka {day} från Matilda.")
        days.append({
            "date": d.isoformat(),
            "day": day,
            "date_label": f"{d.day} {MONTHS[d.month]}",
            "meal1": meal1,
            "meal2": meal2,
        })

    green = ""
    gm = re.search(r"Vitkål,\s*tomat\s*&\s*äpple", text, re.I)
    if gm:
        green = "Vitkål, tomat & äpple"
    else:
        gm = re.search(r"Månadens\s*(?:Grönsak|Grönt)\s+(.+?)(?=Måndag|Tisdag|Onsdag|Torsdag|Fredag|$)", text, re.I|re.S)
        if gm:
            green = re.sub(r"\s+", " ", gm.group(1)).strip(" -|,")[:120]

    week = monday.isocalendar().week
    period = f"{monday.day} {MONTHS[monday.month]} – {(monday+timedelta(days=4)).day} {MONTHS[(monday+timedelta(days=4)).month]} {monday.year}"
    return {
        "school":"Ölyckeskolan",
        "source":url,
        "week":week,
        "year":monday.year,
        "period":period,
        "updated":date.today().isoformat(),
        "monthly_green":green,
        "days":days
    }

def main():
    try:
        data = fetch()
    except Exception as e:
        print(f"FEL: {e}", file=sys.stderr)
        print("Befintlig menu.json lämnas orörd.", file=sys.stderr)
        return 1
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Skrev {OUT} för vecka {data['week']}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
