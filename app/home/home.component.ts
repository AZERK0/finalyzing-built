import { Component, OnInit, HostListener } from '@angular/core';
import {AppComponent} from '../app.component';
import {DataApiService} from "../services/data-api.service";
import {AccountApiService} from "../services/account-api.service";
import {ActivatedRoute} from "@angular/router";
import {fromEvent, Subscription} from "rxjs";
import { trigger, state, style, animate, transition } from '@angular/animations';
import {Group, Portfolio, Position} from "../portfolio/portfolio.component";
import {ChartConfiguration} from "chart.js";
import 'chartjs-adapter-date-fns'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('textChange', [
      state('start', style({ opacity: 1 })),
      state('end', style({ opacity: 0 })),
      transition('start <=> end', animate('500ms ease-in')),
    ]),
  ],
})
export class HomeComponent implements OnInit {
  textState: string = 'start';
  textIndex: number = 0;
  texts: string[] = ['your portfolios', 'global markets', 'world economy'];

  homePrices: any = {
    'AAPL.US' : 0,
    'MSFT.US': 0,
    'BTC-USD.CC': 0
  }

  previewData: any = {'preview': {'stock': null, 'crypto': null, 'forex': null, 'index': null}, 'trending': {'US': null, 'LSE': null, 'PA': null, 'SHG': null}, 'watchlist': null}
  previewTickers: { [key: string]: string[] } = {
    'stock': ['AAPL.US', 'MSFT.US', '2222.SR', 'GOOG.US', 'AMZN.US', 'NVDA.US'],
    'crypto': ['BTC-USD.CC', 'ETH-USD.CC', 'USDT-USD.CC', 'BNB-USD.CC', 'USDC-USD.CC', 'XRP-USD.CC'],
    'forex': ['EURUSD.FOREX', 'GBPUSD.FOREX', 'AUDUSD.FOREX', 'USDJPY.FOREX', 'USDCAD.FOREX', 'USDCHF.FOREX'],
    'index': ['GSPC.INDX', 'FTSE.INDX', 'STOXX50E.INDX', 'GDAXI.INDX', 'DJI.INDX', 'FCHI.INDX']
  };

  now: number = Date.now()
  newsData: any[] = []

  isAllGroupLoaded: boolean = false
  data: { [key: number | string]: any} = {
    'group': {
      'value': undefined,
      'percentageVar': undefined
    }
  }
  tickers: string[] = []
  currencies: { [key: string]: number } = {'US': 1, "CC": 1, "INDX": 1, "FOREX": 1}
  allPositions: Position[] = []
  groups: Group[] = []
  group: Group = new Group(this.accountService, 0, '', 'private')
  portfolio: Portfolio = new Portfolio(this.accountService, this.group, 0, '', 'manual')

  private toggleWatchlistTriggerSubscription: Subscription;
  private loginTriggerSubscription: Subscription;

  previewType = 'stock'
  trendingType = 'US'

  homeImgLoaded: boolean = false
  previewLoaded: boolean = false

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'decimal': any, 'currency': any, 'percent': any, 'compact': any } = {
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
    'currency': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'currency', 'currency': 'USD', 'minimumFractionDigits': 0}),
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'compact': Intl.NumberFormat(this.getNavigatorLanguage(), {'notation': 'compact'})
  }

  @HostListener('window:scroll', ['$event'])
  scroll(event: any) {
    if (window.scrollY > 10 && !this.previewLoaded) {
      this.previewLoaded = true
      this.changePreviewType('stock')
      this.changeTrendingType('US')
      this.service.getHomeNews().subscribe((response: any) => {
        this.newsData = response
      })
    }
  }

  getPreviewConfig(previewData: any[]): {'data': ChartConfiguration['data'], 'options': ChartConfiguration['options'], 'type': ChartConfiguration['type']} {
    let data: {datasets: any[]} = {
      datasets: []
    };

    data['datasets'].push({
      'label': '',
      'data': previewData
    })

    if (previewData.length > 0) {
      let color: string

      if (previewData[0]['y'] < previewData.slice(-1)[0]['y']) {
        color = '#1aff7e'
      } else if (previewData[0]['y'] > previewData.slice(-1)[0]['y']) {
        color = '#ff1a45'
      } else {
        color = 'white'
      }

      this.updateChartBackground(data['datasets'].slice(-1)[0], color, 100)
    }

    return {
      'data': data,
      'options': {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        borderColor: '#fff',
        //@ts-ignore
        borderWidth: 2,
        tension: 0.5,
        fill: 'start',
        backgroundColor: '#0000',
        pointRadius: 0,
        pointHoverRadius: 0,
        scales: {
          x: {
            display: false,
            type: "time",
            grid: {
              display: false,
            },
            ticks: {
              source: 'auto',
              display: true,
              minRotation: 0,
              maxRotation: 0,
            }
          },
          y: {
            display: false,
            beginAtZero: false,
            grace: 1,
            ticks: {
              source: 'auto',
              display: true,
              minRotation: 0,
              maxRotation: 0,
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false,
          },
          title: {
            display: false,
          }
        },
        elements: {
          point: {
            radius: 0
          }
        },
        hover: {
          mode: undefined
        }
      },
      'type': 'line'
    };
  }

  constructor(private service: DataApiService, private route: ActivatedRoute, private accountService: AccountApiService, public app: AppComponent) {
    this.loginTriggerSubscription = this.app.loginTrigger$.subscribe(() => {
      this.service.getBulk('stock', this.app.user!['watchlist']).subscribe((response: any) => {
        this.previewData['watchlist'] = response
      })
    });

    this.toggleWatchlistTriggerSubscription = this.app.toggleWatchlistTrigger$.subscribe((result) => {
      if (result['delete']) {
        this.previewData['watchlist'] = this.previewData['watchlist'].filter((dict: any) => dict.code !== result['ticker'])
      }
      else {
        this.service.getBulk('stock', [result['ticker']]).subscribe((response: any) => {
          this.previewData['watchlist'] = this.previewData['watchlist'].concat(response)
        })
      }
    });
  }

  ngOnInit() {
    if (this.route.snapshot.queryParams['account_successfully_verified'] || this.route.snapshot.queryParams['reset_password_token'] || this.route.snapshot.queryParams['successful_payment']) {
      this.app.toggleRegisterDialog()
    }

    navigator.mediaSession.setActionHandler('play', () => {});
    navigator.mediaSession.setActionHandler('pause', () => {});
    navigator.mediaSession.setActionHandler('stop', () => {});

    this.changeText();

    fetch('https://eodhd.com/api/real-time/AAPL.US?fmt=json&s=MSFT,BTC-USD.CC&api_token=demo')
      .then(response => {
        return response.json()
      })
      .then(data => {
        this.homePrices['AAPL.US'] = data[0].close
        this.homePrices['MSFT.US'] = data[1].close
        this.homePrices['BTC-USD.CC'] = data[2].close
      })
      .catch(error => {
        console.error('Shortcuts data error.', error);
      })

    this.app.loginTrigger$.subscribe(async () => {
      if (this.app.isLoggedIn) {
        let groups: any

        groups = await this.accountService.getGroups().toPromise()

        const allPositionOldestDate: Position[] = []

        if (groups.length > 0) {
          for (const group of groups) {
            const newGroup = new Group(this.accountService, group['id'], group['name'], group['visibility']);
            this.groups.push(newGroup);

            const portfolios: any = await this.accountService.getPortfolios(group['id']).toPromise();

            for (const portfolio of portfolios) {
              const newPortfolio = new Portfolio(this.accountService, newGroup, portfolio['id'], portfolio['name'], portfolio['type']);
              newGroup.portfolios.push(newPortfolio);

              const positions: any = await this.accountService.getPositions(portfolio['id']).toPromise();

              for (const position of positions) {
                const newPosition = new Position(
                  this.accountService,
                  newPortfolio,
                  position['id'],
                  position['type'],
                  position['ticker'],
                  position['enterPrice'],
                  position['enterPrice'] / await this.getCurrencyVal(position['ticker'].split('.')[1]),
                  position['enterDate'],
                  position['quantity'],
                  position['closePrice'],
                  position['closePrice'] / await this.getCurrencyVal(position['ticker'].split('.')[1]),
                  position['closeDate']
                );
                newPortfolio.positions.push(newPosition);

                if (!this.tickers.includes(position['ticker'])) {
                  this.tickers.push(position['ticker'])
                }
                allPositionOldestDate.push(newPosition)
              }
            }
          }

          this.group = this.groups[0]

          this.group.portfolios.forEach((portfolio: Portfolio) => {
            this.allPositions = this.allPositions.concat(portfolio.positions)
          })

          let oldestDateOfAllPositions: number | Date | null = null;
          let dictTickers: any = {}

          this.tickers.map(async (ticker) => {
            let oldestDate = null;

            for (const position of allPositionOldestDate) {
              if (position.ticker === ticker) {
                const enterDate = new Date(position.enterDate);
                if (!oldestDate || enterDate < oldestDate) {
                  oldestDate = enterDate;
                }
                if (!oldestDateOfAllPositions || enterDate < oldestDateOfAllPositions) {
                  oldestDateOfAllPositions = enterDate;
                  oldestDate = enterDate;
                }
              }
            }
            if (oldestDate != null) {
              oldestDate.setDate(oldestDate.getDate() - 3);
              dictTickers[ticker] = oldestDate.toISOString().slice(0, 10);
            }
          });

          const data = await this.service.getHistorical_portfolio(JSON.stringify(dictTickers)).toPromise();
          for (let i = 0; i < Object.keys(data).length; i++) {
            this.data[Object.keys(data)[i]] = (Object.values(data)[i] as any)
          }

          if (this.allPositions.length > 0) {
            this.data['group']['value'] = this.getPortfolioValueHistory(this.allPositions)
            this.data['group']['percentageVar'] = this.getPercentageVariationHistory(this.data['group']['value'])

            for (const portfolio of this.group.portfolios) {
              if (portfolio.positions.length > 0) {
                this.data[portfolio['id']] = {}

                this.data[portfolio['id']]['value'] = this.getPortfolioValueHistory(portfolio.positions)
                this.data[portfolio['id']]['percentageVar'] = this.getPercentageVariationHistory(this.data[portfolio['id']]['value'])
                this.data[portfolio['id']]['standardDeviation'] = undefined
                this.data[portfolio['id']]['meanVar'] = undefined
                this.data[portfolio['id']]['beta'] = undefined
                this.data[portfolio['id']]['alpha'] = undefined
                this.data[portfolio['id']]['sharpe'] = undefined
              }
              else {
                this.data[portfolio['id']] = {}

                this.data[portfolio['id']]['value'] = [{
                  x: new Date().getTime(),
                  y: 0
                }]
                this.data[portfolio['id']]['percentageVar'] = [{
                  x: new Date().getTime(),
                  y: 0
                }]
              }
            }
          }
          else {
            this.data['group']['value'] = [{
              x: new Date().getTime(),
              y: 0
            }]
            this.data['group']['percentageVar'] = [{
              x: new Date().getTime(),
              y: 0
            }]

            for (const portfolio of this.group.portfolios) {
              this.data[portfolio['id']] = {}

              this.data[portfolio['id']]['value'] = [{
                x: new Date().getTime(),
                y: 0
              }]
              this.data[portfolio['id']]['percentageVar'] = [{
                x: new Date().getTime(),
                y: 0
              }]
            }
          }
        }

        this.isAllGroupLoaded = true

      }
      else {
        let stock_ws = new WebSocket(`wss://ws.eodhistoricaldata.com/ws/us?api_token=OeAFFmMliFG5orCUuwAKQ8l4WWFQ67YX`);
        let crypto_ws = new WebSocket(`wss://ws.eodhistoricaldata.com/ws/crypto?api_token=OeAFFmMliFG5orCUuwAKQ8l4WWFQ67YX`);
        fromEvent(stock_ws, 'open').subscribe(() => {
          stock_ws.send(`{"action": "subscribe", "symbols": "MSFT, AAPL"}`)
        });
        fromEvent(crypto_ws, 'open').subscribe(() => {
          crypto_ws.send(`{"action": "subscribe", "symbols": "BTC-USD"}`)
        });
        fromEvent(stock_ws, 'message').subscribe((response: any) => {
          const data = JSON.parse(response.data)
          if (data.message != 'Authorized') {
            const price = parseFloat(data['p'])
            if (data.s == 'MSFT') {
              this.homePrices['MSFT.US'] = price
            } else {
              this.homePrices['AAPL.US'] = price
            }
          }
        });
        fromEvent(crypto_ws, 'message').subscribe((response: any) => {
          const data = JSON.parse(response.data);
          this.homePrices['BTC-USD.CC'] = parseFloat(data['p'])
        });
      }
    })
  }

  changeText() {
    setTimeout(() => {
      this.textState = 'end';
      setTimeout(() => {
        this.textIndex = (this.textIndex + 1) % this.texts.length;
        this.textState = 'start';
        this.changeText();
      }, 500);
    }, 2500);
  }

  updateChartBackground(data: any, color: string, height: number) {
    if (data['data'][0]) {
      const ctx = document.createElement('canvas').getContext('2d');

      let gradient = ctx!.createLinearGradient(0, -(height * 0.1), 0, height * 0.9);

      gradient.addColorStop(0, color);
      gradient.addColorStop(1, '#0000');

      data['borderColor'] = color
      data['backgroundColor'] = gradient
    }
  }

  async getCurrencyVal(exchange: string) {
    if (!this.currencies[exchange] && exchange != "US" && exchange != "CC" && exchange != "INDX" && exchange != "FOREX")
      this.currencies[exchange] = (await this.service.getExchangeCurrencyVal(exchange).toPromise() as number)

    return this.currencies[exchange]
  }

  changeGroup(group: Group) {
    if (this.group !== group) {
      this.group = group

      this.allPositions = []
      this.group.portfolios.forEach((portfolio: Portfolio) => {
        this.allPositions = this.allPositions.concat(portfolio.positions)
      })

      if (this.allPositions.length > 0) {
        this.data['group']['value'] = this.getPortfolioValueHistory(this.allPositions)
        this.data['group']['percentageVar'] = this.getPercentageVariationHistory(this.data['group']['value'])

        for (const portfolio of this.group.portfolios) {
          if (portfolio.positions.length > 0) {
            this.data[portfolio['id']] = {}

            this.data[portfolio['id']]['value'] = this.getPortfolioValueHistory(portfolio.positions)
            this.data[portfolio['id']]['percentageVar'] = this.getPercentageVariationHistory(this.data[portfolio['id']]['value'])
            this.data[portfolio['id']]['standardDeviation'] = undefined
            this.data[portfolio['id']]['meanVar'] = undefined
            this.data[portfolio['id']]['beta'] = undefined
            this.data[portfolio['id']]['alpha'] = undefined
            this.data[portfolio['id']]['sharpe'] = undefined
          }
          else {
            this.data[portfolio['id']] = {}

            this.data[portfolio['id']]['value'] = [{
              x: new Date().getTime(),
              y: 0
            }]
            this.data[portfolio['id']]['percentageVar'] = [{
              x: new Date().getTime(),
              y: 0
            }]
          }
        }
      }
      else {
        this.data['group']['value'] = [{
          x: new Date().getTime(),
          y: 0
        }]
        this.data['group']['percentageVar'] = [{
          x: new Date().getTime(),
          y: 0
        }]

        for (const portfolio of this.group.portfolios) {
          this.data[portfolio['id']] = {}

          this.data[portfolio['id']]['value'] = [{
            x: new Date().getTime(),
            y: 0
          }]
          this.data[portfolio['id']]['percentageVar'] = [{
            x: new Date().getTime(),
            y: 0
          }]
        }
      }
    }
  }

  getPortfolioValueHistory(positions: Position[]) {
    let portfolioValueHistory: any[] = [];

    let cumulativeDepositsVal: number = 0;
    for (const position of positions) {
      cumulativeDepositsVal += position['enterPriceUsd'] * position['quantity']
    }

    if (positions.length > 0) {
      positions.sort((a, b) => new Date(a.enterDate).getTime() - new Date(b.enterDate).getTime());

      let currentDate = new Date(positions[0]['enterDate']);

      while (currentDate <= new Date()) {
        let portfolioVal = cumulativeDepositsVal
        for (const position of positions) {
          if (currentDate >= new Date(position['enterDate'])) {
            if (position.closeDate == null) {
              const dataIndex = this.data[position['ticker']].findIndex((element: any) => element['x'] >= currentDate.getTime())
              if (position['type'] === 'long') {
                portfolioVal += (this.data[position['ticker']].slice(dataIndex)[0]['y'] - position['enterPriceUsd']) * position['quantity']
              } else {
                portfolioVal -= (this.data[position['ticker']].slice(dataIndex)[0]['y'] - position['enterPriceUsd']) * position['quantity']
              }
            } else {

              const dataIndex = this.data[position['ticker']].findIndex((element: any) => element['x'] >= currentDate.getTime())
              if (new Date(this.data[position['ticker']].slice(dataIndex)[0]['x']).toISOString().slice(0, 10) < position.closeDate) {
                if (dataIndex == -1) {
                  if (position['type'] === 'long') {
                    portfolioVal += (position['closePriceUsd']! - position['enterPriceUsd']) * position['quantity']
                  } else {
                    portfolioVal -= (position['closePriceUsd']! - position['enterPriceUsd']) * position['quantity']
                  }
                } else {
                  if (position['type'] === 'long') {
                    portfolioVal += (this.data[position['ticker']].slice(dataIndex)[0]['y'] - position['enterPriceUsd']) * position['quantity']
                  } else {
                    portfolioVal -= (this.data[position['ticker']].slice(dataIndex)[0]['y'] - position['enterPriceUsd']) * position['quantity']
                  }
                }
              } else {
                if (position['type'] === 'long') {
                  // @ts-ignore
                  portfolioVal += (position['closePriceUsd'] - position['enterPriceUsd']) * position['quantity']
                } else {
                  // @ts-ignore
                  portfolioVal -= (position['closePriceUsd'] - position['enterPriceUsd']) * position['quantity']
                }
              }
            }
          }
        }

        portfolioValueHistory.push(
          {
            x: currentDate.getTime(),
            y: portfolioVal
          }
        )

        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    portfolioValueHistory[0] = {
      x: portfolioValueHistory[0].x,
      y: cumulativeDepositsVal
    }
    return portfolioValueHistory
  }

  getPercentageVariationHistory(data: any[]) {
    let currentDate = new Date(data[0]['x']);

    let percentageVariationHistory = []

    while (currentDate <= new Date()) {
      const dataIndex = data.findIndex((element: any) => element['x'] >= currentDate.getTime())

      percentageVariationHistory.push(
        {
          x: currentDate.getTime(),
          y: ((data.slice(dataIndex)[0]['y'] - data[0]['y']) / data[0]['y']) * 100
        }
      )

      currentDate.setDate(currentDate.getDate() + 1)
    }
    return percentageVariationHistory
  }

  combineData(data1: any[], data2: any[]): any[] {
    const combinedData: any[] = [];

    for (let i = 0; i < data1.length-1; i++) {
      const data1Item = data1[i];
      const data2Item = data2.find(item => item.code === `${data1Item.data.code}.${data1Item.data.exchange}`);

      if (data2Item) {
        const combinedItem: any = {
          ...data1Item.data,
          ...data2Item
        };
        combinedData.push(combinedItem);
      }
    }

    return combinedData;
  }

  horizontalScrollEffect(e: any) {
    e.target.parentElement.getElementsByClassName('chevron-right')[0].hidden = !(e.target.scrollWidth - e.target.clientWidth - e.target.scrollLeft > 0);
    e.target.parentElement.getElementsByClassName('chevron-left')[0].hidden = !(e.target.scrollLeft > 0);

    if (e.target.scrollWidth - e.target.clientWidth - e.target.scrollLeft > 0 && e.target.scrollLeft > 0) {
      e.target.style['mask-image'] = 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
      e.target.style['-webkit-mask-image'] = 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
    }
    else if (e.target.scrollWidth - e.target.clientWidth - e.target.scrollLeft > 0) {
      e.target.style['mask-image'] = 'linear-gradient(to right, black 90%, transparent 100%)'
      e.target.style['-webkit-mask-image'] = 'linear-gradient(to right, black 90%, transparent 100%)'
    }
    else if (e.target.scrollLeft > 0) {
      e.target.style['mask-image'] = 'linear-gradient(to right, transparent 0%, black 10%)'
      e.target.style['-webkit-mask-image'] = 'linear-gradient(to right, transparent 0%, black 10%)'
    }
  }

  horizontalScrollOnClick(scrollId: string, delta: number) {
    document.getElementById(scrollId)!.scrollBy({
      top: 0,
      left: delta,
      behavior: 'smooth'
    });
  }

  changePreviewType(type: string) {
    this.previewType = type
    if (!this.previewData['preview'][type]) {
      this.service.getBulk(type, this.previewTickers[type]).subscribe((response: any) => {
        this.previewData['preview'][type] = response
      })
    }
  }

  changeTrendingType(type: string) {
    this.trendingType = type
    if (!this.previewData['trending'][type]) {
      this.service.getScreener(`[["exchange","=","${type}"],["market_capitalization",">","1000000000"],["avgvol_200d",">","1000000"]]`, 'refund_5d_p.desc', 6, 0).subscribe((screenerResponse: any) => {
        let dateUpdate: Date
        dateUpdate = new Date(screenerResponse[0]["data"].last_day_data_date)
        dateUpdate.setDate(dateUpdate.getDate() + 1)
        dateUpdate.setHours(2, 0, 0, 0)
        let todayDate = new Date()
        todayDate.setDate(todayDate.getDate() + 1)
        this.service.getBulk(
          type,
          screenerResponse.map((item: {
            data: { code: any; exchange: any; };
          }) => `${item.data.code}.${item.data.exchange}`),
          todayDate > dateUpdate ? 'true' : 'falseTrending'
        ).subscribe((response: any) => {
          this.previewData['trending'][type] = this.combineData(screenerResponse, response)
        })
      })
    }
  }

  elapsedTime(date: string): string {
    const timestamp = new Date(date).getTime();
    const elapsed = this.now - timestamp;

    return elapsed < 3600000 ? `${Math.floor(elapsed/60000)} minutes ago`
      : elapsed >= 3600000 && elapsed < 86400000 ? `${Math.floor(elapsed/3600000)} hours ago`
        : elapsed >= 2592000000 ? `${Math.floor(elapsed/2592000000)} months ago`
          : `${Math.floor(elapsed/86400000)} days ago`
  }

  getSource(url: string): string {
    return new URL(url).hostname
  }

  removeSimilarTickers(items: string[], maxDistance: number = 3): string[] {
    const uniqueItems = new Set<string>();
    const similarityMap = new Map<string, string>();

    for (const item of items) {
      let ticker = item.split(".")[0];
      if (similarityMap.has(ticker)) {
        ticker = similarityMap.get(ticker)!;
      } else {
        for (const uniqueItem of uniqueItems) {
          const distance = this.getLevenshteinDistance(ticker, uniqueItem);
          if (distance <= maxDistance) {
            similarityMap.set(ticker, uniqueItem);
            ticker = uniqueItem;
            break;
          }
        }
      }
      uniqueItems.add(ticker);
    }

    return Array.from(uniqueItems);
  }

  getLevenshteinDistance(s: string, t: string): number {
    let m = s.length;
    let n = t.length;
    if (m === 0) {
      return n;
    }
    if (n === 0) {
      return m;
    }
    if (s === t) {
      return 0;
    }

    if (m > n) {
      [s, t] = [t, s];
      [m, n] = [n, m];
    }

    const currentRow = new Uint16Array(m + 1);
    for (let i = 0; i <= m; i++) {
      currentRow[i] = i;
    }

    for (let j = 1; j <= n; j++) {
      let previousDiagonal = currentRow[0];
      currentRow[0] = j;
      for (let i = 1; i <= m; i++) {
        const previous = currentRow[i];
        let insertions = currentRow[i - 1] + 1;
        let deletions = previous + 1;
        let substitutions = previousDiagonal + (s[i - 1] === t[j - 1] ? 0 : 1);
        currentRow[i] = Math.min(insertions, deletions, substitutions);
        previousDiagonal = previous;
      }
    }
    return currentRow[m];
  }

  cutName(str: string, maxLen: number) {
    if (str.length - 3 > maxLen)
      return str.slice(0, maxLen - 3) + "..."
    return str
  }

  protected readonly window = window;
}
