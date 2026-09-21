#!/usr/bin/env python3
"""Hämtar aktuell veckomeny för Ölyckeskolan från Matilda Menus JSON-API."""
from __future__ import annotations
from datetime import date, timedelta
from pathlib import Path
import json, sys, urllib.parse, urllib.request

API = "https://menu.matildaplatform.com/api/menu"
DISTRIBUTOR_ID = "6a5713fad6523cfd795c45ce"
OUT = Path(__file__).with_name("menu.json")
DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
MONTHS = {1:"januari",2:"februari",3:"mars",4:"april",5:"maj",6:"juni",7:"juli",8:"augusti",9:"september",10:"oktober",11:"november",12:"december"}

def monday_of(d): return d - timedelta(days=d.weekday())

def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; OlyckeskolanMenu/3.0)","Accept":"application/json","Accept-Language":"sv-SE,sv;q=0.9,en;q=0.5"})
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"HTTP {getattr(r,'status',200)} från Matilda.")
        raw = r.read().decode("utf-8", "replace")
    try: data = json.loads(raw)
    except json.JSONDecodeError as e: raise RuntimeError("Matilda svarade inte med giltig JSON.") from e
    if not isinstance(data, dict): raise RuntimeError("Matildas svar har oväntad JSON-struktur.")
    return data

def course_by_option(meal, option):
    for c in meal.get("courses", []):
        if isinstance(c, dict) and str(c.get("optionName","")).strip().casefold() == option.casefold():
            return str(c.get("name","")).strip()
    return ""

def first_course_name(meal):
    for c in meal.get("courses", []):
        if isinstance(c, dict) and str(c.get("name","")).strip(): return str(c["name"]).strip()
    return ""

def fetch():
    today = date.today(); monday = monday_of(today); sunday = monday + timedelta(days=6)
    params = urllib.parse.urlencode({"distributorId":DISTRIBUTOR_ID,"startDate":monday.isoformat(),"endDate":sunday.isoformat(),"lang":"sv"})
    url = f"{API}?{params}"
    data = get_json(url)
    distributor = data.get("distributor", {})
    if str(distributor.get("id","")).strip() != DISTRIBUTOR_ID: raise RuntimeError("Matilda returnerade fel distributör.")
    school = str(distributor.get("name","")).strip() or "Ölyckeskolan"
    meals = data.get("meals", [])
    if not isinstance(meals, list): raise RuntimeError("Fältet 'meals' saknas eller har fel format.")
    days=[]; monthly_green=""
    for i, day_name in enumerate(DAYS):
        d=monday+timedelta(days=i); iso=d.isoformat()
        todays=[m for m in meals if isinstance(m,dict) and str(m.get("date",""))[:10]==iso]
        daily=next((m for m in todays if str(m.get("name","")).strip().casefold()=="dagens"),None)
        if daily is None: raise RuntimeError(f"Ingen 'Dagens'-meny hittades för {day_name} {iso}.")
        meal1=course_by_option(daily,"Dagens 1"); meal2=course_by_option(daily,"Dagens 2")
        if not meal1:
            names=[str(c.get("name","")).strip() for c in daily.get("courses",[]) if isinstance(c,dict) and str(c.get("name","")).strip()]
            if names: meal1=names[0]; meal2=meal2 or (names[1] if len(names)>1 else "")
        if not meal1: raise RuntimeError(f"Ingen maträtt hittades för {day_name} {iso}.")
        if not monthly_green:
            green=next((m for m in todays if "månadens grönsak" in str(m.get("name","")).strip().casefold()),None)
            if green:
                monthly_green=first_course_name(green)
                suffix=" - månadens grönt"
                if monthly_green.casefold().endswith(suffix): monthly_green=monthly_green[:-len(suffix)].strip()
        print(f"{day_name}: {meal1}" + (f" | {meal2}" if meal2 else ""))
        days.append({"date":iso,"day":day_name,"date_label":f"{d.day} {MONTHS[d.month]}","meal1":meal1,"meal2":meal2})
    friday=monday+timedelta(days=4)
    period=f"{monday.day} {MONTHS[monday.month]} – {friday.day} {MONTHS[friday.month]} {monday.year}"
    return {"school":school,"source":url,"week":monday.isocalendar().week,"year":monday.year,"period":period,"updated":today.isoformat(),"monthly_green":monthly_green,"days":days}

def main():
    try: data=fetch()
    except Exception as e:
        print(f"FEL: {type(e).__name__}: {e}", file=sys.stderr); print("Befintlig menu.json lämnas orörd.", file=sys.stderr); return 1
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Månadens grönt: {data['monthly_green'] or 'saknas'}")
    print(f"KLART: skrev {OUT} för vecka {data['week']}.")
    return 0
if __name__ == "__main__": raise SystemExit(main())
