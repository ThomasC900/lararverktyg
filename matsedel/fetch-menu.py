#!/usr/bin/env python3
"""
Hämtar aktuell veckomeny för Ölyckeskolan från Matilda Menus JSON-endpoint
och skriver matsedel/menu.json.

Fail safe:
- Om Matilda inte svarar eller datan inte kan tolkas lämnas befintlig
  menu.json orörd.
"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
import json
import sys
import urllib.parse
import urllib.request

SCHOOL = "6a5713fad6523cfd795c45ce_olyckeskolan"
API = f"https://menu.matildaplatform.com/api/v1/meals/week/{SCHOOL}"
OUT = Path(__file__).with_name("menu.json")

DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
MONTHS = {
    1:"januari",2:"februari",3:"mars",4:"april",5:"maj",6:"juni",
    7:"juli",8:"augusti",9:"september",10:"oktober",11:"november",12:"december"
}

def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())

def get_json(url: str):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; OlyckeskolanMenu/2.0)",
        "Accept": "application/json",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"HTTP {getattr(r, 'status', 200)} från {url}")
        content_type = r.headers.get("Content-Type", "")
        raw = r.read().decode("utf-8", "replace")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError(
            f"Matilda svarade inte med JSON (Content-Type: {content_type}). "
            f"Svaret började med: {raw[:160]!r}"
        )

def entry_date(item):
    value = item.get("date", "") if isinstance(item, dict) else ""
    return str(value)[:10]

def meal_names(item):
    """Stödjer både [{name: ...}] och kategorier med courses."""
    result = []
    if not isinstance(item, dict):
        return result

    meals = item.get("meals")
    if isinstance(meals, list):
        for m in meals:
            if not isinstance(m, dict):
                continue

            # Om API:t ger en kategori (t.ex. Dagens) med courses.
            courses = m.get("courses")
            if isinstance(courses, list) and courses:
                label = str(m.get("name", "")).strip().casefold()
                if label in ("dagens", "dagens 1", "dagens 2", ""):
                    for c in courses:
                        if isinstance(c, dict):
                            name = str(c.get("name", "")).strip()
                            if name and name not in result:
                                result.append(name)
                continue

            # Vanlig API-form: meals innehåller själva rätterna.
            name = str(m.get("name", "")).strip()
            if name and name not in result:
                result.append(name)

    # Reserv: vissa svar kan själva vara måltidsposten.
    courses = item.get("courses")
    if not result and isinstance(courses, list):
        for c in courses:
            if isinstance(c, dict):
                name = str(c.get("name", "")).strip()
                if name and name not in result:
                    result.append(name)

    return result

def find_entries(data):
    # Förväntad form är en lista. Tillåt även vanliga wrappers.
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "days", "meals", "items"):
            value = data.get(key)
            if isinstance(value, list):
                return value
    raise RuntimeError(f"Okänd JSON-struktur från Matilda: {type(data).__name__}")

def fetch() -> dict:
    today = date.today()
    monday = monday_of(today)
    sunday = monday + timedelta(days=6)

    params = urllib.parse.urlencode({
        "startDate": monday.isoformat(),
        "endDate": sunday.isoformat()
    })
    url = f"{API}?{params}"

    data = get_json(url)
    entries = find_entries(data)
    print(f"Matilda returnerade {len(entries)} poster.")

    days = []
    for i, day in enumerate(DAYS):
        d = monday + timedelta(days=i)
        matching = [x for x in entries if entry_date(x) == d.isoformat()]

        dishes = []
        for item in matching:
            for name in meal_names(item):
                if name not in dishes:
                    dishes.append(name)

        if not dishes:
            raise RuntimeError(f"Ingen mat hittades för {day} {d.isoformat()}.")

        # Din sida har två rader per dag.
        meal1 = dishes[0]
        meal2 = dishes[1] if len(dishes) > 1 else ""

        print(f"{day}: {meal1}" + (f" | {meal2}" if meal2 else ""))
        days.append({
            "date": d.isoformat(),
            "day": day,
            "date_label": f"{d.day} {MONTHS[d.month]}",
            "meal1": meal1,
            "meal2": meal2,
        })

    friday = monday + timedelta(days=4)
    period = (
        f"{monday.day} {MONTHS[monday.month]} – "
        f"{friday.day} {MONTHS[friday.month]} {monday.year}"
    )

    return {
        "school": "Ölyckeskolan",
        "source": url,
        "week": monday.isocalendar().week,
        "year": monday.year,
        "period": period,
        "updated": today.isoformat(),
        # Vi löser månadens grönt separat när vardagsmaten fungerar.
        "monthly_green": "",
        "days": days,
    }

def main():
    try:
        data = fetch()
    except Exception as e:
        print(f"FEL: {type(e).__name__}: {e}", file=sys.stderr)
        print("Befintlig menu.json lämnas orörd.", file=sys.stderr)
        return 1

    OUT.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"KLART: skrev {OUT} för vecka {data['week']}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
