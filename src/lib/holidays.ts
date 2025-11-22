export type HolidayEvent = {
  id: string;
  date: string;
  title: string;
  type: "holiday";
  isGlobal: true;
};

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number) {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return new Date(year, monthIndex, day);
}

export function getDefaultUsHolidaysForYear(year: number): HolidayEvent[] {
  const mothersDay = nthWeekdayOfMonth(year, 4, 0, 2); // May, Sunday, 2nd
  const fathersDay = nthWeekdayOfMonth(year, 5, 0, 3); // June, Sunday, 3rd
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4); // Nov, Thursday, 4th

  const fixed = [
    { title: "New Year's Day", month: 0, day: 1 },
    { title: "Valentine's Day", month: 1, day: 14 },
    { title: "Halloween", month: 9, day: 31 },
    { title: "Christmas", month: 11, day: 25 },
  ];

  const events: HolidayEvent[] = [];

  fixed.forEach(({ title, month, day }) => {
    const date = new Date(year, month, day);
    events.push({
      id: `holiday-${title}-${year}`,
      date: date.toISOString(),
      title,
      type: "holiday",
      isGlobal: true,
    });
  });

  [
    { title: "Mother's Day", date: mothersDay },
    { title: "Father's Day", date: fathersDay },
    { title: "Thanksgiving", date: thanksgiving },
  ].forEach(({ title, date }) => {
    events.push({
      id: `holiday-${title}-${year}`,
      date: date.toISOString(),
      title,
      type: "holiday",
      isGlobal: true,
    });
  });

  return events;
}
