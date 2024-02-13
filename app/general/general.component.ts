import {Component, Input, OnInit} from '@angular/core';
import {QuoteComponent} from "../quote/quote.component";
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
})
export class GeneralComponent implements OnInit {

  @Input() data: any = {'General' : {}, 'Highlights': {}, 'Technicals': {}}
  @Input() ticker: string = 'AAPL.US'

  showFullDesc: boolean = false

  showPremiumPopup: boolean = false

  constructor(public quoteComponent: QuoteComponent, public app: AppComponent) { }

  ngOnInit(): void {
    if (this.data['General']['Type'] == 'Common Stock') {
      this.data['Holders']['Funds'] = Object.values(this.data['Holders']['Funds'])
      this.data['Holders']['Institutions'] = Object.values(this.data['Holders']['Institutions'])
    }
  }

  getWebsite(url: string): string {
    if (url) {
      return new URL(url).hostname
    } else {
      return  ''
    }
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

  ROE() {
    if (Object.keys(this.data['Financials']['Income_Statement']['yearly']).length > 1) {

      const yearlyValuesIncome = Object.values(this.data["Financials"]["Income_Statement"]["yearly"])
      const yearlyValuesEquity = Object.values(this.data["Financials"]["Balance_Sheet"]["yearly"])

      // @ts-ignore
      const lastValueIncome = yearlyValuesIncome[yearlyValuesIncome.length - 1].netIncome

      // @ts-ignore
      const lastValueEquity = yearlyValuesEquity[yearlyValuesEquity.length - 1].totalStockholderEquity

      return lastValueIncome / lastValueEquity
    } else {
      return null
    }

  }

  closePremiumPopup() {
    this.showPremiumPopup = false
  }

  protected readonly Object = Object;
}
