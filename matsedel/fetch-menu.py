#!/usr/bin/env python3
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
import json
import sys
import urllib.parse
import urllib.request

DISTRIBUTOR_ID = "69775c47e2d237d90a0ebde8"
API = "https://menu.matildaplatform.com/api/menu"
OUT = Path(__file__).with_name("menu.json")

DAY_NAMES = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
MONTHS = {
    1:"januari", 2:"februari", 3:"mars", 4:"april", 5:"maj", 6:"juni",
    7:"juli", 8:"augusti", 9:"september", 10:"oktober",
    11:"november", 12:"december"
}

def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())

def api_get(start_date: date, end_date: date) -> dict:
    query = urllib.parse.urlencode({
        "distributorId": DISTRIBUTOR_ID,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "lang": "sv",
    })
    url = f"{API}?{query}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/99.0.4844.82 Safari/537.36"
            ),
            "Accept": "application/json,text/plain,*/*",
            "Accept-Language": "sv-SE,sv;q=0.9",
        },
    )

    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8", "replace")

    data = json.loads(raw)
    if not isinstance(data, dict) or "meals" not in data:
        raise RuntimeError("Matilda API svarade i oväntat format.")
    return data

def parse_date(value: str) -> date:
    # Matilda brukar ge "2026-08-31T00:00:00".
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()

def norm(value) -> str:
    return " ".join(str(value or "").split()).strip()

def course_text(course: dict) -> str:
    # Nuvarande Matilda-format använder "name".
    # Några extra nycklar gör scriptet tolerant mot små schemaändringar.
    return norm(
        course.get("name")
        or course.get("dish")
        or course.get("dishName")
        or course.get("DayMenuName")
    )

def option_text(course: dict) -> str:
    return norm(
        course.get("optionName")
        or course.get("label")
        or course.get("MenuAlternativeName")
    )

def choose_daily_meals(meals_for_day: list[dict]) -> tuple[str, str, str, str]:
    """
    Returnerar (dagens1, dagens2, månadens_grönt, månadens_frukt).

    Matilda-strukturen är:
      meal -> name
      meal -> courses[]
      course -> name
      course -> optionName

    Eslöv använder normalt meal name "Dagens" med kurser
    märkta "Dagens 1" och "Dagens 2". Månadens grönt kan ligga
    som ett separat meal/course.
    """
    meal1 = ""
    meal2 = ""
    monthly_green = ""
    monthly_fruit = ""

    # Första passet: använd tydliga etiketter.
    unlabeled_daily = []

    for meal in meals_for_day:
        meal_name = norm(meal.get("name")).casefold()
        courses = meal.get("courses") or []

        for course in courses:
            dish = course_text(course)
            if not dish:
                continue

            option = option_text(course).casefold()
            combined = f"{meal_name} {option}".strip()

            # Månadens grönsak/grönt och månadens frukt hålls isär.
            is_monthly_green = (
                "månadens grönsak" in combined
                or "månadens grönt" in combined
                or ("månadens" in combined and ("grönsak" in combined or "grönt" in combined))
            )
            is_monthly_fruit = (
                "månadens frukt" in combined
                or ("månadens" in combined and "frukt" in combined)
            )

            if is_monthly_green:
                if not monthly_green:
                    monthly_green = dish
                continue

            if is_monthly_fruit:
                if not monthly_fruit:
                    monthly_fruit = dish
                continue

            # Dagens 1 / alternativ 1
            if (
                "dagens 1" in option
                or option in {"1", "alt 1", "alternativ 1"}
            ):
                if not meal1:
                    meal1 = dish
                continue

            # Dagens 2 / alternativ 2
            if (
                "dagens 2" in option
                or option in {"2", "alt 2", "alternativ 2"}
            ):
                if not meal2:
                    meal2 = dish
                continue

            # På Eslöv ligger båda normalt under måltiden "Dagens".
            if "dagens" in meal_name:
                unlabeled_daily.append(dish)

    # Reserv: om optionName saknas, ta de två första rätterna under "Dagens".
    if not meal1 and unlabeled_daily:
        meal1 = unlabeled_daily[0]
    if not meal2 and len(unlabeled_daily) > 1:
        meal2 = unlabeled_daily[1]

    # Ytterligare reserv: leta bland alla kurser som inte är månadens grönt.
    if not meal1 or not meal2:
        candidates = []
        for meal in meals_for_day:
            meal_name = norm(meal.get("name")).casefold()
            for course in (meal.get("courses") or []):
                dish = course_text(course)
                option = option_text(course).casefold()
                combined = f"{meal_name} {option}".strip()
                if not dish:
                    continue
                is_monthly_green = (
                    "månadens grönsak" in combined
                    or "månadens grönt" in combined
                    or ("månadens" in combined and ("grönsak" in combined or "grönt" in combined))
                )
                is_monthly_fruit = (
                    "månadens frukt" in combined
                    or ("månadens" in combined and "frukt" in combined)
                )
                if is_monthly_green or is_monthly_fruit:
                    continue
                if dish not in candidates:
                    candidates.append(dish)

        if not meal1 and candidates:
            meal1 = candidates[0]
        if not meal2 and len(candidates) > 1:
            meal2 = candidates[1]

    return meal1, meal2, monthly_green, monthly_fruit


def find_monthly_items(raw_meals: list[dict]) -> tuple[str, str]:
    """
    Letar globalt i hela Matilda-svaret efter månadens grönsak/grönt och frukt.

    Vi använder både meal.name, course.optionName och själva rättnamnet.
    Det sista är viktigt eftersom Eslöv t.ex. publicerar:
    "Vitkål, tomat & äpple - månadens grönt".
    """
    import re

    monthly_green = ""
    monthly_fruit = ""

    for meal in raw_meals:
        meal_name = norm(meal.get("name"))
        for course in (meal.get("courses") or []):
            dish = course_text(course)
            option = option_text(course)
            haystack = f"{meal_name} {option} {dish}".casefold()

            if not monthly_green and (
                "månadens grönt" in haystack
                or "månadens grönsak" in haystack
            ):
                monthly_green = re.sub(
                    r"\s*[-–]\s*månadens\s+(?:grönt|grönsak).*$",
                    "",
                    dish,
                    flags=re.I,
                ).strip()

                # Om etiketten, inte rättnamnet, bar signalen behåller vi rättnamnet.
                if not monthly_green:
                    monthly_green = dish.strip()

            if not monthly_fruit and "månadens frukt" in haystack:
                monthly_fruit = re.sub(
                    r"\s*[-–]\s*månadens\s+frukt.*$",
                    "",
                    dish,
                    flags=re.I,
                ).strip()

                if not monthly_fruit:
                    monthly_fruit = dish.strip()

    return monthly_green, monthly_fruit

def build_menu() -> dict:
    today = date.today()
    monday = monday_of(today)
    friday = monday + timedelta(days=4)

    data = api_get(monday, monday + timedelta(days=6))
    raw_meals = data.get("meals") or []

    # Hämta månadens poster globalt ur hela veckosvaret.
    global_green, global_fruit = find_monthly_items(raw_meals)

    by_date: dict[date, list[dict]] = defaultdict(list)
    for meal in raw_meals:
        raw_date = meal.get("date")
        if not raw_date:
            continue
        d = parse_date(raw_date)
        by_date[d].append(meal)

    days = []
    green_values = []
    fruit_values = []

    for i, day_name in enumerate(DAY_NAMES):
        d = monday + timedelta(days=i)
        meals_for_day = by_date.get(d, [])
        meal1, meal2, monthly_green, monthly_fruit = choose_daily_meals(meals_for_day)

        if not meal1 and not meal2:
            raise RuntimeError(
                f"Matilda API innehåller ingen tolkbar lunch för {day_name} {d.isoformat()}."
            )

        if monthly_green:
            green_values.append(monthly_green)
        if monthly_fruit:
            fruit_values.append(monthly_fruit)

        days.append({
            "date": d.isoformat(),
            "day": day_name,
            "date_label": f"{d.day} {MONTHS[d.month]}",
            "meal1": meal1 or "–",
            "meal2": meal2 or "–",
        })

    # Vanligen samma hela veckan. Ta första värdet som hittas.
    # Global sökning är säkrast; dagssökningen finns kvar som reserv.
    monthly_green = global_green or (green_values[0] if green_values else "")
    monthly_fruit = global_fruit or (fruit_values[0] if fruit_values else "")

    # Ta bort eventuella kvarvarande förklarande suffix.
    import re
    if monthly_green:
        monthly_green = re.sub(
            r"\s*[-–]\s*månadens\s+(?:grönt|grönsak).*$",
            "",
            monthly_green,
            flags=re.I,
        ).strip()
    if monthly_fruit:
        monthly_fruit = re.sub(
            r"\s*[-–]\s*månadens\s+frukt.*$",
            "",
            monthly_fruit,
            flags=re.I,
        ).strip()

    period = (
        f"{monday.day} {MONTHS[monday.month]} – "
        f"{friday.day} {MONTHS[friday.month]} {friday.year}"
    )

    query = urllib.parse.urlencode({
        "distributorId": DISTRIBUTOR_ID,
        "startDate": monday.isoformat(),
        "endDate": (monday + timedelta(days=6)).isoformat(),
        "lang": "sv",
    })

    return {
        "school": "Ölyckeskolan",
        "source": f"{API}?{query}",
        "week": monday.isocalendar().week,
        "year": monday.year,
        "period": period,
        "updated": date.today().isoformat(),
        "monthly_green": monthly_green,
        "monthly_fruit": monthly_fruit,
        "days": days,
    }

def main() -> int:
    try:
        data = build_menu()
    except Exception as e:
        print(f"FEL: {e}", file=sys.stderr)
        print("Befintlig menu.json lämnas orörd.", file=sys.stderr)
        return 1

    OUT.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Skrev {OUT} för vecka {data['week']}.")
    for d in data["days"]:
        print(f"{d['day']}: {d['meal1']} | {d['meal2']}")
    if data.get("monthly_green"):
        print(f"Månadens grönsak: {data['monthly_green']}")
    else:
        print("Månadens grönsak: ingen post hittad i API-svaret")

    if data.get("monthly_fruit"):
        print(f"Månadens frukt: {data['monthly_fruit']}")
    else:
        print("Månadens frukt: ingen post hittad i API-svaret")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
