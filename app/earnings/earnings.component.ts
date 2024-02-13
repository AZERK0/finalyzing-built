import {Component, Input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {QuoteComponent} from "../quote/quote.component";
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EarningsComponent implements OnInit {

  @Input() data: any = {'General' : {}, 'Highlights': {}, 'Technicals': {}}
  @Input() ticker: string = 'AAPL.US'

  showPremiumPopup: boolean = false

  constructor(public quoteComponent: QuoteComponent, public app: AppComponent) { }

  ngOnInit(): void {
  }

  getDates(dict: any): any {
    let dates = []
    for (let y = 0; y <= Object.keys(dict).length-1; y ++) {
      dates.push(dict[Object.keys(dict)[y]]["date"])
    }

    return dates.reverse()
  }

  dateFormat(dateString: string, format: string) {
    const date = new Date(dateString)
    let options = {}

    if (format == 'fullDate') {
      options = { day: '2-digit', month: 'short', year: 'numeric' }
    }
    else if (format == 'monthYear') {
      options = { month: 'short', year: 'numeric' }
    }

    return date.toLocaleDateString(this.quoteComponent.getNavigatorLanguage(), options)
  }

  isCurrentQuarter(date: string) {
    const dates = this.getDates(this.data['Earnings']['History'])

    const index = dates.indexOf(date)
    let currentIndex = dates.map((a: string) => new Date(a).getTime()).findIndex((element: number) => element <= Date.now())
    if (currentIndex == -1)
      currentIndex = dates.length - 1
    currentIndex--

    return index == currentIndex
  }

  getColor(val: number): string {
    if (!val) {
      return ''
    }
    else if (val > 0) {
      return '#1aff7e'
    }
    else {
      return '#ff1a45'
    }
  }

  getRandomColor(seed: string): string {
    const colors = ['#1aff7e', '#ff1a45', ''];
    const seedRandom = (seed: string) => {
      let seedValue = 0;
      for (let i = 0; i < seed.length; i++) {
        seedValue += seed.charCodeAt(i);
      }
      return (seedValue * 6969 + 270520) % 23328 / 23328;
    };
    const randomIndex = Math.floor(seedRandom(seed) * colors.length);

    return colors[randomIndex];
  }

  closePremiumPopup() {
    this.showPremiumPopup = false
  }

  protected readonly console = console;
}
