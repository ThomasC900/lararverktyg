#!/usr/bin/env python3
from __future__ import annotations

from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys
import urllib.request

BASE = "https://menu.matildaplatform.com/sv/meals/week/69775c47e2d237d90a0ebde8_meny-grundskola-eslov"
OUT = Path(__file__).with_name("menu.json")

DAYS = [
    ("Måndag", "mån"),
    ("Tisdag", "tis"),
    ("Onsdag", "ons"),
    ("Torsdag", "tors"),
    ("Fredag", "fre"),
]
MONTHS = {
    1: ("januari","jan."),
    2: ("februari","feb."),
    3: ("mars","mars"),
    4: ("april","apr."),
    5: ("maj","maj"),
    6: ("juni","juni"),
    7: ("juli","juli"),
    8: ("augusti","aug."),
    9: ("september","sep."),
    10: ("oktober","okt."),
    11: ("november","nov."),
    12: ("december","dec."),
}

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        s = re.sub(r"\s+", " ", data).strip()
        if s:
            self.parts.append(s)

def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())

def get_visible_text(raw_html: str) -> str:
    p = TextExtractor()
    p.feed(raw_html)
    return "\n".join(p.parts)

def clean(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip(" -|,")
    return s

def parse_between(text: str, start_pat: str, end_pat: str | None) -> str:
    if end_pat:
        m = re.search(start_pat + r"(.*?)" + end_pat, text, re.I | re.S)
    else:
        m = re.search(start_pat + r"(.*)", text, re.I | re.S)
    return m.group(1) if m else ""

def parse_day(block: str):
    # Matilda visar idag ungefär:
    # Dagens
    # Dagens 1
    # <rätt 1>
    # Dagens 2
    # <rätt 2>
    m1 = re.search(r"Dagens\s*1\s*(.*?)\s*Dagens\s*2", block, re.I | re.S)
    m2 = re.search(r"Dagens\s*2\s*(.*)", block, re.I | re.S)

    meal1 = clean(m1.group(1)) if m1 else ""
    meal2 = clean(m2.group(1)) if m2 else ""

    # Klipp bort sådant som kan komma efter rätten.
    stop_words = [
        "Månadens Grönsak", "Månadens Grönt",
        "mån ", "tis ", "ons ", "tors ", "fre ",
    ]
    for stop in stop_words:
        meal1 = meal1.split(stop)[0].strip()
        meal2 = meal2.split(stop)[0].strip()

    return meal1, meal2

def fetch() -> dict:
    today = date.today()
    monday = monday_of(today)
    sunday = monday + timedelta(days=6)

    url = f"{BASE}?startDate={monday.isoformat()}&endDate={sunday.isoformat()}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; OlyckeskolanMenu/1.1)",
            "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
        },
    )

    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8", "replace")

    text = get_visible_text(raw)

    days = []

    for i, (day_full, day_short) in enumerate(DAYS):
        d = monday + timedelta(days=i)
        month_full, month_short = MONTHS[d.month]

        # Matilda använder numera kortformat, t.ex. "mån 31 aug."
        start_pat = rf"\b{re.escape(day_short)}\s+{d.day}\s+(?:{re.escape(month_short)}|{re.escape(month_full)})\b"

        if i < 4:
            nd_full, nd_short = DAYS[i + 1]
            nd = monday + timedelta(days=i + 1)
            nmonth_full, nmonth_short = MONTHS[nd.month]
            end_pat = rf"(?=\b{re.escape(nd_short)}\s+{nd.day}\s+(?:{re.escape(nmonth_short)}|{re.escape(nmonth_full)})\b)"
        else:
            end_pat = None

        block = parse_between(text, start_pat, end_pat)

        if not block:
            raise RuntimeError(
                f"Kunde inte hitta rubriken för {day_full}. "
                f"Matilda kan ha ändrat sin sidstruktur."
            )

        meal1, meal2 = parse_day(block)

        if not meal1 or not meal2:
            raise RuntimeError(
                f"Kunde inte tolka Dagens 1/Dagens 2 för {day_full}."
            )

        days.append({
            "date": d.isoformat(),
            "day": day_full,
            "date_label": f"{d.day} {month_full}",
            "meal1": meal1,
            "meal2": meal2,
        })

    green = ""
    gm = re.search(
        r"Månadens\s+(?:Grönsak|Grönt)\s*(.*?)(?=\bmån\b|\btis\b|\bons\b|\btors\b|\bfre\b|$)",
        text,
        re.I | re.S,
    )
    if gm:
        green = clean(gm.group(1))
        green = re.sub(r"\s*-\s*månadens grönt.*$", "", green, flags=re.I)

    friday = monday + timedelta(days=4)
    period = (
        f"{monday.day} {MONTHS[monday.month][0]} – "
        f"{friday.day} {MONTHS[friday.month][0]} {friday.year}"
    )

    return {
        "school": "Ölyckeskolan",
        "source": url,
        "week": monday.isocalendar().week,
        "year": monday.year,
        "period": period,
        "updated": date.today().isoformat(),
        "monthly_green": green,
        "days": days,
    }

def main():
    try:
        data = fetch()
    except Exception as e:
        print(f"FEL: {e}", file=sys.stderr)
        print("Befintlig menu.json lämnas orörd.", file=sys.stderr)
        return 1

    OUT.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Skrev {OUT} för vecka {data['week']}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
