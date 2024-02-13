import {Component, OnInit, ViewChild} from '@angular/core';
import {DataApiService} from "../services/data-api.service";
import {ActivatedRoute} from "@angular/router";
import {ChartComponent, upgradeAnnoTrigger$} from "../chart/chart.component";

@Component({
  selector: 'app-chart-embed',
  templateUrl: './chart-embed.component.html',
  styleUrls: ['./chart-embed.component.scss']
})
export class ChartEmbedComponent implements OnInit {

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'decimal': any, 'currency': any, 'percent': any, 'compact': any } = {
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
    'currency': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'currency', 'currency': 'USD', 'minimumFractionDigits': 0}),
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'compact': Intl.NumberFormat(this.getNavigatorLanguage(), {'notation': 'compact'})
  }
  convertUTCtoLocal = (utcTimeString: string) => {
    const localTime = new Date();
    const [hours, minutes, seconds] = utcTimeString.split(':');

    localTime.setUTCHours(Number(hours), Number(minutes), Number(seconds));

    return new Intl.DateTimeFormat(this.getNavigatorLanguage(), {
      hour: 'numeric',
      minute: 'numeric'
    }).format(localTime);
  }

  @ViewChild(ChartComponent) chartComponent: any;

  ticker: string = 'AAPL.US'
  period: 'day' | 'week' | 'month' = 'day'
  dateRange: string = 'custom'
  colorTheme: 'light' | 'dark' = 'dark'
  backgroundColor: string = '#050505'
  panOffset: number = 0
  header: boolean = true

  data: { 'historical': any[], 'indiOnChart': any[], 'indiOutChart': any[] } = {
    'historical': [],
    'indiOnChart': [],
    'indiOutChart': []
  }
  exchangeDetails: any
  lastUpdatePrice: number = 0

  isLoading: boolean = false

  constructor(private service: DataApiService, private route: ActivatedRoute) {this.ticker = this.route.snapshot.queryParams['q'] || this.ticker
    this.period = this.route.snapshot.queryParams['period'] || this.period
    this.colorTheme = this.route.snapshot.queryParams['colorTheme'] || this.colorTheme
    this.backgroundColor = '#' + this.route.snapshot.queryParams['color'] || this.backgroundColor
    this.panOffset = this.route.snapshot.queryParams['panOffset'] || this.panOffset
    this.header = this.route.snapshot.queryParams['header'] || this.header
  }

  ngOnInit(): void {
    this.loadHistorical()
  }

  loadHistorical() {
    this.service.getHistorical(this.ticker, this.period[0]).subscribe(response => {
      const data = response.map((a: any) => (
        {
          x: a['Date'],
          o: a['Open'],
          h: a['High'],
          l: a['Low'],
          c: a['Close'],
          v: a['Volume']
        }
      ));

      this.data['historical'] = data
      this.lastUpdatePrice = data.slice(-1)[0]['c']

      (this.data['historical'])
    });
  }

  changePeriod(period: 'day' | 'week' | 'month') {
    if (this.period != period) {
      this.chartComponent.candlestickDraws.body[this.chartComponent.period][this.chartComponent.chartType].visible = false
      this.chartComponent.candlestickDraws.line[this.chartComponent.period][this.chartComponent.chartType].visible = false
      this.chartComponent.candlestickDraws.volume[this.chartComponent.period][this.chartComponent.chartType].visible = false
      this.period = period
      this.chartComponent.period = period
      if (this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType] == undefined) {
        this.service.getHistorical(this.ticker, period[0]).subscribe(response => {
          if (this.period == 'month') {
            for (let i = 1; i <= response.length-1; i++) {
              if (response[i]['Adjustment_factor'] / response[i-1]['Adjustment_factor'] > 1.2) {
                response[i]['Open'] = response[i]['Open'] * (response[i-1]['Adjustment_factor'] / response[i]['Adjustment_factor'])
                response[i]['High'] = response[i]['High'] * (response[i-1]['Adjustment_factor'] / response[i]['Adjustment_factor'])
              }
            }
          }
          let data

          data = response.map((a: any) => ({
            x: a['Date'], o: a['Open'], h: a['High'], l: a['Low'], c: a['Close'], v: a['Volume']
          }));

          this.chartComponent.candlestickDatas[this.chartComponent.period]['normal'] = data

          data = response.map((a: any) => ({
            x: a['Date'], o: Math.log(a['Open']), h: Math.log(a['High']), l: Math.log(a['Low']), c: Math.log(a['Close']), v: a['Volume']
          }));
          this.chartComponent.candlestickDatas[this.chartComponent.period]['log'] = data

          this.chartComponent.actualData = this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType]
          this.data['historical'] = this.chartComponent.candlestickDatas[this.chartComponent.period]['normal']
          this.chartComponent.actualDataXVals = (this.chartComponent.actualData.map((a: any) => a['x']))
          this.chartComponent.changePeriod()
          this.chartComponent.drawCandlestick()
        });
      } else if (this.chartComponent.candlestickDraws.body[this.chartComponent.period][this.chartComponent.chartType] == undefined) {
        this.chartComponent.actualData = this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType]
        this.data['historical'] = this.chartComponent.candlestickDatas[this.chartComponent.period]['normal']
        this.chartComponent.actualDataXVals = (this.chartComponent.actualData.map((a: any) => a['x']))
        this.chartComponent.changePeriod()
        this.chartComponent.drawCandlestick()
      } else {
        this.chartComponent.actualData = this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType]
        this.data['historical'] = this.chartComponent.candlestickDatas[this.chartComponent.period]['normal']
        this.chartComponent.actualDataXVals = (this.chartComponent.actualData.map((a: any) => a['x']))
        this.chartComponent.changePeriod()
        this.chartComponent.candlestickDraws.body[this.chartComponent.period][this.chartComponent.chartType].visible = true
        this.chartComponent.candlestickDraws.line[this.chartComponent.period][this.chartComponent.chartType].visible = true
        this.chartComponent.candlestickDraws.volume[this.chartComponent.period][this.chartComponent.chartType].visible = true
      }
    }
  }

  changeDateRange(dateRange: string) {
    this.dateRange = dateRange;

    const periodDict: {[key: string]: 'day' | 'week' | 'month'} = {
      '1M': 'day',
      '3M': 'day',
      '6M': 'day',
      'YTD': 'day',
      '1Y': 'day',
      '5Y': 'day',
      '20Y': 'day'
    };

    const period = periodDict[dateRange];

    const currentDate = Date.now();

    let scaleMinX = 0;
    let scaleMaxX = 0;

    switch (dateRange) {
      case '1M':
        scaleMaxX = currentDate;
        scaleMinX = currentDate - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3M':
        scaleMaxX = currentDate;
        scaleMinX = currentDate - 3 * 30 * 24 * 60 * 60 * 1000;
        break;
      case '6M':
        scaleMaxX = currentDate;
        scaleMinX = currentDate - 6 * 30 * 24 * 60 * 60 * 1000;
        break;
      case 'YTD':
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(`January 01, ${currentYear} 00:00:00`).getTime();
        scaleMaxX = currentDate;
        scaleMinX = yearStart;
        break;
      case '1Y':
        const oneYearAgo = currentDate - 365 * 24 * 60 * 60 * 1000;
        scaleMaxX = currentDate;
        scaleMinX = oneYearAgo;
        break;
      case '5Y':
        const fiveYearsAgo = currentDate - 5 * 365 * 24 * 60 * 60 * 1000;
        scaleMaxX = currentDate;
        scaleMinX = fiveYearsAgo;
        break;
      case '20Y':
        const twentyYearsAgo = currentDate - 20 * 365 * 24 * 60 * 60 * 1000;
        scaleMaxX = currentDate;
        scaleMinX = twentyYearsAgo;
        break;
      default:
        break;
    }

    this.changePeriod(period);
    this.chartComponent.view.x1 = this.chartComponent.getPixelForValueX(scaleMinX) + 2
    this.chartComponent.view.x2 = this.chartComponent.getPixelForValueX(scaleMaxX) + 2
    const YScale = this.chartComponent.updateYScale()
    if (this.chartComponent.view.y1 == YScale.highestPixel && this.chartComponent.view.y2 == YScale.lowestPixel) {
      upgradeAnnoTrigger$.next(false)
    }
    this.chartComponent.view.y1 = YScale.highestPixel
    this.chartComponent.view.y2 = YScale.lowestPixel
    const deltaTime = scaleMaxX - scaleMinX
    if (this.period == 'day') {
      this.chartComponent.candlestickDraws.body[this.period][this.chartComponent.chartType].visible = deltaTime < 31536000000 * 5;
    } else {
      this.chartComponent.candlestickDraws.body[this.period][this.chartComponent.chartType].visible = true
    }
    this.chartComponent.newView()
    this.chartComponent.updateGrid()
  }
}
