import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {QuoteComponent} from "../quote/quote.component";
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-financials',
  templateUrl: './financials.component.html',
  styleUrls: ['./financials.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialsComponent implements OnInit {

  @Input() data: any = {'General' : {}, 'Highlights': {}, 'Technicals': {}}
  @Input() ticker: string = 'AAPL.US'

  tab: string = 'Balance_Sheet'

  period: string = "yearly"
  dates: string[] = []

  showPremiumPopup: boolean = false

  constructor(private app: AppComponent, public quoteComponent: QuoteComponent) { }

  ngOnInit(): void {
    this.dates[0] = this.getDates(this.data['Financials']['Balance_Sheet'][this.period])[0]
  }

  isObjectEmpty(obj: any): boolean {
    return obj && Object.keys(obj).length === 0;
  }

  getDates(dict: any): any {
    let dates = []
    for (let y = 0; y <= Object.keys(dict).length-1; y ++) {
      dates.push(Object.keys(dict)[y])
    }
    return dates.reverse()
  }

  changePeriod(period: string) {
    if (this.app.isLoggedIn && this.app.user['premium']) {
      this.period = period
      this.convertDate(period)
    }
    else if (!this.app.isLoggedIn && period=='quarterly') {
      this.showPremiumPopup = true
    }
    else if (period=='quarterly') {
      this.showPremiumPopup = true
    }
  }

  convertDate(to: string) {
    this.dates.forEach((date: string, i) => {
      const index = this.getDates(this.data['Financials'][this.tab][to]).map((a: string) => new Date(a).getTime()).findIndex((element: number) => element <= new Date(date).getTime())
      this.dates[i] = this.getDates(this.data['Financials'][this.tab][to]).at(index)
    })
  }

  addDate() {
    if (this.dates.length < 4 && this.app.isLoggedIn && this.app.user['premium']) {
      this.dates.unshift(this.getDates(this.data['Financials'][this.tab][this.period])[this.getDates(this.data['Financials'][this.tab][this.period]).indexOf((this.dates as any)[0]) + 1])
    }
    else if (!this.app.isLoggedIn) {
      this.showPremiumPopup = true
    }
    else {
      this.showPremiumPopup = true
    }
  }

  delDate(index: number) {
    this.dates.splice(index, 1)
  }

  checkAccount(dateIndex: number) {
    setTimeout(() => {
      if (!this.app.isLoggedIn) {
        this.showPremiumPopup = true
      }
      else if (this.app.isLoggedIn && !this.app.user['premium']) {
        this.showPremiumPopup = true
      }
      else {
        return
      }
      this.dates[dateIndex] = this.getDates(this.data['Financials'][this.tab][this.period])[0]
    })
  }

  toFloat(str: string): number {
    return parseFloat(str)
  }

  altmanZScore(date: string) {
    const xVals = (this.quoteComponent.technicalData['historical'].map((a: any) => a['x']))
    const nearestXValIndex = xVals.findIndex((element) => element >= new Date(date).getTime())
    const totalCurrentAssets = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalCurrentAssets"] ?? null;
    const totalCurrentLiabilities = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalCurrentLiabilities"] ?? null;
    const totalAssets = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalAssets"] ?? null;
    const retainedEarnings = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["retainedEarnings"] ?? null;
    const ebit = this.data["Financials"]["Income_Statement"][this.period][date]?.["ebit"] ?? null;
    const commonStockSharesOutstanding = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["commonStockSharesOutstanding"] ?? null;
    const totalLiab = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalLiab"] ?? null;
    const totalRevenue = this.data["Financials"]["Income_Statement"][this.period][date]?.["totalRevenue"] ?? null;


    if (totalCurrentAssets && totalCurrentLiabilities && totalAssets && retainedEarnings && ebit && commonStockSharesOutstanding && totalLiab && totalRevenue) {

      const a = (totalCurrentAssets - totalCurrentLiabilities) / totalAssets;
      const b = retainedEarnings / totalAssets;
      const c = ebit / totalAssets;
      const d = commonStockSharesOutstanding * this.quoteComponent.technicalData['historical'][nearestXValIndex]["c"] / totalLiab;
      const e = totalRevenue / totalAssets;
      return (1.2 * a + 1.4 * b + 3.3 * c + 0.6 * d + e).toFixed(2);

    } else {
      return "Missing value(s)";
    }
  }

  PiotroskiScore(date: string) {
    const dates = Object.keys(this.data["Financials"]["Balance_Sheet"][this.period]);
    let score = 0;
    const netIncome = this.data["Financials"]["Cash_Flow"][this.period][date]?.["netIncome"] ?? null;
    const totalAssets = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalAssets"] ?? null;
    const totalCashFromOperatingActivities = this.data["Financials"]["Cash_Flow"][this.period][date]?.["totalCashFromOperatingActivities"] ?? null;
    const longTermDebt = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["longTermDebt"] ?? null;
    const previousLongTermDebt = this.data["Financials"]["Balance_Sheet"][this.period][dates[dates.indexOf(date) - 1]]?.["longTermDebt"] ?? null;
    const totalCurrentAssets = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalCurrentAssets"] ?? null;
    const totalCurrentLiabilities = this.data["Financials"]["Balance_Sheet"][this.period][date]?.["totalCurrentLiabilities"] ?? null;
    const previousTotalCurrentAssets = this.data["Financials"]["Balance_Sheet"][this.period][dates[dates.indexOf(date) - 1]]?.["totalCurrentAssets"] ?? null;
    const previousTotalCurrentLiabilities = this.data["Financials"]["Balance_Sheet"][this.period][dates[dates.indexOf(date) - 1]]?.["totalCurrentLiabilities"] ?? null;
    const issuanceOfCapitalStock = this.data["Financials"]["Cash_Flow"][this.period][date]?.["issuanceOfCapitalStock"] ?? null;
    const totalRevenue = this.data["Financials"]["Income_Statement"][this.period][date]?.["totalRevenue"] ?? null;
    const costOfRevenue = this.data["Financials"]["Income_Statement"][this.period][date]?.["costOfRevenue"] ?? null;
    const previousTotalRevenue = this.data["Financials"]["Income_Statement"][this.period][dates[dates.indexOf(date) - 1]]?.["totalRevenue"] ?? null;
    const previousCostOfRevenue = this.data["Financials"]["Income_Statement"][this.period][dates[dates.indexOf(date) - 1]]?.["costOfRevenue"] ?? null;
    const previousTotalAssets = this.data["Financials"]["Balance_Sheet"][this.period][dates[dates.indexOf(date) - 1]]?.["totalAssets"] ?? null;


    if (netIncome && totalAssets && totalCashFromOperatingActivities && longTermDebt && previousLongTermDebt && totalCurrentAssets && totalCurrentLiabilities &&
      previousTotalCurrentLiabilities && totalRevenue && costOfRevenue && previousTotalRevenue && previousCostOfRevenue && previousTotalAssets) {

      if (netIncome > 0) {
        score += 1;
      }
      if ((netIncome / totalAssets) > 0) {
        score += 1;
      }
      if (totalCashFromOperatingActivities > 0) {
        score += 1;
      }
      if (totalCashFromOperatingActivities > netIncome) {
        score += 1;
      }
      if (longTermDebt < previousLongTermDebt) {
        score += 1;
      }
      if ((totalCurrentAssets / totalCurrentLiabilities) > (previousTotalCurrentAssets / previousTotalCurrentLiabilities)) {
        score += 1;
      }
      if (issuanceOfCapitalStock == null) {
        score += 1;
      }
      if (((totalRevenue - costOfRevenue) / totalRevenue) > ((previousTotalRevenue - previousCostOfRevenue) / previousTotalRevenue)) {
        score += 1;
      }
      if ((totalRevenue / totalAssets) > (previousTotalRevenue / previousTotalAssets)) {
        score += 1;
      }
      return score
    } else {
      return "Missing value(s)";
    }
  }

  closePremiumPopup() {
    this.showPremiumPopup = false
  }

  protected readonly Object = Object;
}
