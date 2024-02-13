import {Component, OnInit} from '@angular/core';
import {DataApiService} from "../services/data-api.service";
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  data: any

  currentDate = new Date()
  date: { year: number; month: number; day: number; dates: { date: number; faded: boolean }[] }

  countriesList: any[] = []
  offset: number = 0
  country: string = ""

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'decimal': any, 'currency': any, 'percent': any, 'compact': any, 'hour': any } = {
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
    'currency': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'currency', 'currency': 'USD'}),
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'compact': Intl.NumberFormat(this.getNavigatorLanguage(), {'notation': 'compact'}),
    'hour': Intl.DateTimeFormat(this.getNavigatorLanguage(), {hour: 'numeric', minute: 'numeric'})
  }

  constructor(private service: DataApiService, private app: AppComponent) {
    const date = new Date()

    this.date = {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      dates: this.getMonthDates(date.getFullYear(), date.getMonth())
    }
  }

  ngOnInit(): void {
    this.update()
  }

  getCurrentMonth(year: number, month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return `${months[month]} ${year}`;
  }

  isCurrentDate(date: number) {
    if (this.date.year != this.currentDate.getFullYear() || this.date.month != this.currentDate.getMonth())
      return false
    return date == this.currentDate.getDate()
  }

  getMonthDates(year: number, month: number) {
    let dates: { date: number; faded: boolean }[] = []

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const daysInLastMonth = new Date(
      year,
      month,
      0
    ).getDate();

    for (let i = daysInLastMonth -  new Date(year, month, 0).getDay() + 1; i <= daysInLastMonth; i++) {
      dates.push({date: i, faded: true})
    }

    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({date: i, faded: false});
    }

    return dates
  }

  changeDate(deltaMonth: number, day: number) {
    let newDate = new Date(this.date.year, this.date.month, this.date.day)
    newDate.setMonth(newDate.getMonth() + +deltaMonth)
    newDate.setDate(day)

    this.date = {
      year: newDate.getFullYear(),
      month: newDate.getMonth(),
      day: newDate.getDate(),
      dates: this.getMonthDates(newDate.getFullYear(), newDate.getMonth())
    }
    this.update()
  }

  update() {
    this.country = ""

    let from = new Date(this.date.year, this.date.month, this.date.day);
    from.setDate(from.getDate() - 1);

    let to = new Date(this.date.year, this.date.month, this.date.day);
    to.setDate(to.getDate() + 1);

    this.service.getCalendar({ from: from.toISOString().substring(0, 10), to: to.toISOString().substring(0, 10), country: this.country }).subscribe((response: any) => {
      this.data = response.sort((a: any, b: any) => b.date - a.date)

      const filterDate = this.data.filter((item: { date: string | number | Date; }) => {
        const itemDate = new Date(item.date);
        return (
          itemDate.getDate() === this.date.day &&
          itemDate.getMonth() === this.date.month &&
          itemDate.getFullYear() === this.date.year
        );
      });

      this.data = filterDate
      const countries = filterDate.map((item: { country: string; }) => item.country);
      this.countriesList = [...new Set(countries)]
    })
  }

  getDataFiltered() {
    return this.country == "" ? this.data : this.data.filter((a: any) => a.country == this.country)
  }

  isNextEvent(date: number) {
    const dates = this.data.map((a: any) => a.date)

    const index = dates.indexOf(date)
    let currentIndex = dates.map((a: number) => new Date(a).getTime()).findIndex((element: number) => Date.now() > element)
    if (currentIndex == -1)
      currentIndex = dates.length - 1
    currentIndex--

    return index == currentIndex && this.date.year == this.currentDate.getFullYear() && this.date.month == this.currentDate.getMonth() && this.date.day == this.currentDate.getDate()
  }

  variation(v1: number, v2: number) {
    if (v1 && v2) {
      return (v2 - v1) / Math.abs(v1)
    } else {
      return 0
    }
  }

}
