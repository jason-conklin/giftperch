export type HolidayEvent = {
  id: string;
  date: string;
  title: string;
  type: "holiday";
  isGlobal: true;
  iconKey?: string | null;
};

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number) {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  const date = new Date(year, monthIndex, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function getDefaultUsHolidaysForYear(year: number): HolidayEvent[] {
  const mothersDay = nthWeekdayOfMonth(year, 4, 0, 2); // May, Sunday, 2nd
  const fathersDay = nthWeekdayOfMonth(year, 5, 0, 3); // June, Sunday, 3rd
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4); // Nov, Thursday, 4th

  const fixed = [
    { title: "New Year's Day", month: 0, day: 1, iconKey: "icon-occasion-newyears.png" },
    { title: "Valentine's Day", month: 1, day: 14, iconKey: "icon-occasion-valentines.png" },
    { title: "Halloween", month: 9, day: 31, iconKey: "icon-occasion-halloween.png" },
    { title: "Christmas", month: 11, day: 25, iconKey: "icon-occasion-christmas.png" },
  ];

  const events: HolidayEvent[] = [];

  fixed.forEach(({ title, month, day, iconKey }) => {
    const date = new Date(year, month, day, 12, 0, 0);
    events.push({
      id: `holiday-${title}-${year}`,
      date: date.toISOString(),
      title,
      type: "holiday",
      isGlobal: true,
      iconKey,
    });
  });

  [
    { title: "Mother's Day", date: mothersDay, iconKey: "icon-occasion-mothersday.png" },
    { title: "Father's Day", date: fathersDay, iconKey: "icon-occasion-fathersday.png" },
    { title: "Thanksgiving", date: thanksgiving, iconKey: "icon-occasion-thanksgiving.png" },
  ].forEach(({ title, date, iconKey }) => {
    events.push({
      id: `holiday-${title}-${year}`,
      date: date.toISOString(),
      title,
      type: "holiday",
      isGlobal: true,
      iconKey,
    });
  });

  return events;
}
