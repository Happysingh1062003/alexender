import { fromKey } from "./date";

/** Approximate life expectancy at birth, both sexes (UN World Population Prospects, 2023 estimates). */
export const LIFE_EXPECTANCY: Record<string, number> = {
  India: 72.0,
  Pakistan: 67.6,
  Bangladesh: 74.7,
  Nepal: 70.4,
  "Sri Lanka": 77.5,
  China: 78.0,
  Japan: 84.7,
  "South Korea": 83.7,
  Singapore: 83.7,
  Indonesia: 71.2,
  Philippines: 69.8,
  Thailand: 79.7,
  Vietnam: 74.6,
  "United Arab Emirates": 82.9,
  "Saudi Arabia": 78.7,
  Turkey: 77.2,
  Egypt: 70.2,
  Nigeria: 54.5,
  Kenya: 63.6,
  "South Africa": 61.5,
  "United States": 79.3,
  Canada: 82.6,
  Mexico: 75.1,
  Brazil: 75.8,
  "United Kingdom": 81.3,
  Germany: 81.4,
  France: 83.3,
  Italy: 83.7,
  Spain: 83.8,
  Netherlands: 82.1,
  Sweden: 83.3,
  Switzerland: 84.0,
  Russia: 73.2,
  Australia: 83.3,
  "New Zealand": 82.2,
};

const DAY = 86_400_000;
const YEAR = 365.2425 * DAY;

export function expectancyFor(country: string, override?: number) {
  return override && override > 0 ? override : (LIFE_EXPECTANCY[country] ?? 72);
}

export function computeLife(birthDate: string, expectancyYears: number, now: number) {
  const birth = fromKey(birthDate).getTime();
  const end = birth + expectancyYears * YEAR;
  const lived = Math.max(0, now - birth);
  const left = Math.max(0, end - now);

  // Calendar age: whole years and months since birth.
  const b = fromKey(birthDate);
  const n = new Date(now);
  let years = n.getFullYear() - b.getFullYear();
  let months = n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  const weeksLived = Math.floor(lived / (7 * DAY));
  const totalWeeks = Math.round((expectancyYears * YEAR) / (7 * DAY));
  return {
    years,
    months,
    daysLived: Math.floor(lived / DAY),
    daysLeft: Math.floor(left / DAY),
    yearsLeft: left / YEAR,
    weeksLived,
    weeksLeft: Math.max(0, totalWeeks - weeksLived),
    totalWeeks,
    pctLived: Math.min(100, (lived / (end - birth)) * 100),
  };
}

export const formatNumber = (n: number) => new Intl.NumberFormat().format(n);
