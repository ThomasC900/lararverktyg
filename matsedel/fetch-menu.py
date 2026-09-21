#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://menu.matildaplatform.com/meals/week/6a5713fad6523cfd795c45ce_olyckeskolan"
OUT = Path(__file__).with_name("menu.json")
TZ = ZoneInfo("Europe/Stockholm")

DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
MONTHS = {
    1:"januari",2:"februari",3:"mars",4:"april",5:"maj",6:"juni",
    7:"juli",8:"augusti",9:"september",10:"oktober",11:"november",12:"december"
}

def current_week():
    today = datetime.now(TZ).date()
    monday = today - timedelta(days=today.weekday())
    return today, monday, monday + timedelta(days=6)

def fetch_html(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.7",
    }
    waits = [0, 15, 30, 60]
    last = None
    for i, wait in enumerate(waits, 1):
        if wait:
            print(f"Väntar {wait} sekunder före nytt försök...")
            time.sleep(wait)
        print(f"Hämtar Ölyckeskolans meny, försök {i}/{len(waits)}: {url}")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
                print(f"Hämtningen lyckades (HTTP {getattr(r, 'status', 200)}).")
                return raw.decode("utf-8", "replace")
        except Exception as e:
            last = e
            print(f"Försök {i} misslyckades: {type(e).__name__}: {e}", file=sys.stderr)
    raise RuntimeError(f"Matilda kunde inte hämtas efter {len(waits)} försök: {last}")

def extract_next_data(raw: str) -> dict:
    # Matilda är en Next.js-app. Själva matsedeln finns i __NEXT_DATA__,
    # inte i den synliga HTML-texten som Python först ser.
    m = re.search(
        r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
        raw, re.I | re.S
    )
    if not m:
        raise RuntimeError("Kunde inte hitta __NEXT_DATA__ i Matildas sida.")
    try:
        return json.loads(html.unescape(m.group(1)))
    except json.JSONDecodeError as e:
        raise RuntimeError(f"__NEXT_DATA__ hittades men kunde inte tolkas som JSON: {e}")

def get_meals(next_data: dict) -> list:
    try:
        meals = next_data["props"]["pageProps"]["meals"]
    except (KeyError, TypeError):
        raise RuntimeError("Matildas __NEXT_DATA__ saknar props.pageProps.meals.")
    if not isinstance(meals, list) or not meals:
        raise RuntimeError("Matilda returnerade ingen menydata för veckan.")
    return meals

def date_part(value):
    if not value:
        return ""
    return str(value)[:10]

def course_names(meal):
    courses = meal.get("courses") or []
    result = []
    for c in courses:
        if isinstance(c, dict):
            name = c.get("name") or c.get("title") or ""
        else:
            name = str(c)
        name = re.sub(r"\s+", " ", name).strip()
        if name:
            result.append(name)
    return result

def find_daily_courses(meals, date_iso):
    same_date = [m for m in meals if isinstance(m, dict) and date_part(m.get("date")) == date_iso]

    # Ölyckeskolans publicerade meny använder måltidsgruppen "Dagens".
    dagens = [m for m in same_date if str(m.get("name","")).strip().casefold() == "dagens"]
    candidates = dagens or same_date

    dishes = []
    for meal in candidates:
        for dish in course_names(meal):
            if dish not in dishes:
                dishes.append(dish)

    # Vi visar Dagens 1 och Dagens 2 i den egna layouten.
    return (dishes + ["", ""])[:2]

def find_monthly_green(obj):
    """Letar försiktigt efter 'Månadens grönt/grönsak' i Next-data."""
    hits = []

    def walk(x, path=""):
        if isinstance(x, dict):
            # Om ett objekt själv heter Månadens grönt, samla dess course-namn.
            label = " ".join(str(x.get(k, "")) for k in ("name","title","label","heading"))
            if re.search(r"månadens\s+(?:grönt|grönsak)", label, re.I):
                cs = course_names(x)
                if cs:
                    hits.extend(cs)
            for k, v in x.items():
                walk(v, f"{path}.{k}")
        elif isinstance(x, list):
            for v in x:
                walk(v, path)
        elif isinstance(x, str):
            # Fånga textfält av typen "Månadens grönt: Vitkål, tomat & äpple"
            m = re.search(r"månadens\s+(?:grönt|grönsak)\s*[:\-]?\s*(.+)", x, re.I)
            if m:
                val = re.sub(r"\s+", " ", m.group(1)).strip(" -:|,")
                if val and len(val) <= 150:
                    hits.append(val)

    walk(obj)
    for h in hits:
        h = re.sub(r"\s+", " ", h).strip()
        if h and not re.search(r"^månadens\s+", h, re.I):
            return h
    return ""

def build():
    today, monday, sunday = current_week()
    url = BASE + "?" + urllib.parse.urlencode({
        "startDate": monday.isoformat(),
        "endDate": sunday.isoformat()
    })

    raw = fetch_html(url)
    next_data = extract_next_data(raw)
    meals = get_meals(next_data)

    print(f"Matilda innehåller {len(meals)} måltidsposter i __NEXT_DATA__.")

    days = []
    for i, day in enumerate(DAYS):
        d = monday + timedelta(days=i)
        meal1, meal2 = find_daily_courses(meals, d.isoformat())
        if not meal1 and not meal2:
            raise RuntimeError(f"Inga 'Dagens'-rätter hittades för {day} {d.isoformat()}.")
        print(f"{day}: {meal1}" + (f" | {meal2}" if meal2 else ""))
        days.append({
            "date": d.isoformat(),
            "day": day,
            "date_label": f"{d.day} {MONTHS[d.month]}",
            "meal1": meal1,
            "meal2": meal2,
        })

    friday = monday + timedelta(days=4)
    if monday.month == friday.month:
        period = f"{monday.day}–{friday.day} {MONTHS[monday.month]} {monday.year}"
    else:
        period = f"{monday.day} {MONTHS[monday.month]} – {friday.day} {MONTHS[friday.month]} {friday.year}"

    green = find_monthly_green(next_data)
    if green:
        print(f"Månadens grönt: {green}")
    else:
        print("OBS: Månadens grönt kunde inte identifieras i Matildas data. Fältet lämnas tomt.")

    return {
        "school": "Ölyckeskolan",
        "source": url,
        "week": monday.isocalendar().week,
        "year": monday.year,
        "period": period,
        "updated": today.isoformat(),
        "monthly_green": green,
        "days": days
    }

def main():
    try:
        data = build()
    except Exception as e:
        print(f"FEL: {e}", file=sys.stderr)
        print("Befintlig menu.json lämnas orörd.", file=sys.stderr)
        return 1

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"KLART: skrev {OUT} för vecka {data['week']}, {data['year']}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
