import {Component, OnInit, ViewChild} from '@angular/core';
import {AppComponent} from '../app.component';
import {SearchComponent} from '../search/search.component';
import {DataApiService} from '../services/data-api.service';
import {AccountApiService} from '../services/account-api.service';
import {ChartConfiguration} from "chart.js";
import {BaseChartDirective} from "ng2-charts";
import 'chartjs-adapter-date-fns'
import {Subscription} from "rxjs";
import {first} from "rxjs/operators";
import {ActivatedRoute} from "@angular/router";
import * as XLSX from 'xlsx'


@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent implements OnInit {
  isExternalAccount: boolean = false
  externalAccountUsername: string = ''

  isAllGroupLoaded: boolean = false
  isTradeLoaded: boolean = true
  introCard: number = 0
  selectedDistribution: number = 0
  data: { [key: number | string]: any} = {
    'group': {
      'value': undefined,
      'percentageVar': undefined
    }
  }
  dividendData: any = {}
  currencies: { [key: string]: number } = {'US': 1, "CC": 1, "INDX": 1, "FOREX": 1}
  tickers: string[] = []
  tickersCountryType: any = {}
  allPositions: Position[] = []
  displayedData: string[] = ['value']
  benchmarkTicker: string = 'GSPC.INDX'
  canUpdateBenchmarkTicker: boolean = true
  riskFreeRate: number = 2
  currentDate: string = new Date().toISOString().slice(0, 10)
  oldestDate: any = ''

  groups: Group[] = []

  selectTab: 'overview' | 'portfolio' = 'overview'
  group: Group = new Group(this.accountService, 0, '', 'private')
  portfolio: Portfolio = new Portfolio(this.accountService, this.group, 0, '', 'manual')
  positionType: 'active' | 'history' = 'active'

  @ViewChild(SearchComponent) searchComponent: any;
  showSearch: boolean = false
  submitSearchSubscription: Subscription | undefined;

  showPremiumPopup: boolean = false
  showNotEnoughMargin: boolean = false

  isCreatingGroup: boolean = false
  isEditingGroup: boolean = false
  isDeletingGroup: any = null
  groupNameInputValue: string = ''
  groupSelectedOption: string = 'private'

  isCreatingPortfolio: boolean = false
  isEditingPortfolio: false | Portfolio = false
  isDeletingPortfolio: any = null
  portfolioNameInputValue: string = ''
  portfolioSelectedOption: string = 'manual'

  isCreatingPosition: boolean = false
  isClosingPosition: boolean = false
  isClosingDateCorrect: boolean = false
  createPositionTicker: string = ''
  isEditingPosition: false | Position = false
  isDeletingPosition: any = null


  @ViewChild(BaseChartDirective) chart: any;
  get config(): {'data': ChartConfiguration['data'], 'options': ChartConfiguration['options'], 'type': ChartConfiguration['type']} {
    let data: {datasets: any[]} = {
      datasets: []
    };

    const srcName: any = {
      'percentageVar': 'Return (%)',
      'value': 'Value (USD)',
      'meanVar' : 'Mean Return (%)',
      'standardDeviation': 'Standard Deviation',
      'alpha': 'Alpha',
      'beta': 'Beta',
      'sharpe': 'Sharpe',
      'rSquared': 'R-Squared'
    }

    let filterFactor = 1

    if (this.displayedData.length > 0) {
      if (this.selectTab === 'portfolio') {
        filterFactor += Math.trunc((new Date().getTime() - this.data[this.portfolio['id']]['value'][0].x) / 94608000000)
      } else {
        filterFactor += Math.trunc((new Date().getTime() - this.data['group']['value'][0].x) / 94608000000)
      }
    }

    for (let src of this.displayedData) {
      let srcData
      if (src != 'dividends') {
        if (src.includes('.')) {
          srcData = this.data[src]
          let index = 0
          if (this.selectTab == 'overview') {
            srcData = this.data['group']['benchmarkData']
            srcData = srcData.filter((_: any, index: number) => index % filterFactor === 0);
          } else {
            srcData = this.data[this.portfolio['id']]['benchmarkData']
            srcData = srcData.filter((_: any, index: number) => index % filterFactor === 0);
          }
          data['datasets'].push({
            'label': this.benchmarkTicker,
            'data': srcData
          })
        }
        else if (this.selectTab === 'portfolio') {
          srcData = this.data[this.portfolio['id']][src]
          srcData = srcData.filter((_: any, index: number) => index % filterFactor === 0);
          data['datasets'].push({
            'label': srcName[src],
            'data': srcData
          })
        }
        else if (this.selectTab === 'overview') {
          srcData = this.data['group'][src]
          srcData = srcData.filter((_: any, index: number) => index % filterFactor === 0);
          data['datasets'].push({
            'label': srcName[src],
            'data': srcData
          })
        }

        if (srcData.length > 0) {
          let color: string

          if (src === 'value' || src === 'percentageVar' || src.includes('.')) {
            if (srcData[0]['y'] < srcData.slice(-1)[0]['y']) {
              color = '#1aff7e'
            } else if (srcData[0]['y'] > srcData.slice(-1)[0]['y']) {
              color = '#ff1a45'
            } else {
              color = 'white'
            }
          } else {
            color = '#b6b6b6'
          }

          this.updateChartBackground(data['datasets'].slice(-1)[0], color)
        }
      } else {
        let barData: any = {
          backgroundColor: [
            '#333333',
            '#666666',
            '#999999',
            '#CCCCCC',
            '#E6E6E6',
            '#F2F2F2',
            '#F9F9F9',
            '#FAFAFA',
            '#FCFCFC',
            '#FFFFFF'
          ],
          datasets: []
        }
        if (this.selectTab == 'overview') {
          Object.entries(this.group.dividend).forEach(([ticker, resultArray]) => {
            barData['datasets'].push({
              label: ticker,
              data: resultArray,
            });
          });
        } else {
          Object.entries(this.portfolio.dividend).forEach(([ticker, resultArray]) => {
            barData['datasets'].push({
              label: ticker,
              data: resultArray,
            });
          });
        }
        return {
          'data': barData,
          'options': {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            //@ts-ignore
            borderWidth: 2,
            tension: 0.5,
            fill: 'start',
            pointRadius: 0,
            pointHoverBackgroundColor: '#d2d2d2',
            scales: {
              x: {
                display: true,
                type: "time",
                stacked: true,
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
                display: true,
                beginAtZero: false,
                stacked: true,
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
                intersect: false,
                mode: 'index',
                displayColors: false,
                backgroundColor: '#202020'
              },
              title: {
                display: false,
              }
            },
            hover: {
              mode: 'index',
              intersect: false
            }
          },
          'type': 'bar'
        };
      }
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
        pointHoverBackgroundColor: '#d2d2d2',
        scales: {
          x: {
            display: true,
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
            display: true,
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
            intersect: false,
            mode: 'index',
            displayColors: false,
            backgroundColor: '#202020'
          },
          title: {
            display: false,
          }
        },
        hover: {
          mode: 'index',
          intersect: false
        }
      },
      'type': 'line'
    };
  }
  getPieChartConfig(portfolios: Portfolio[]):  {'data': ChartConfiguration['data'], 'options': ChartConfiguration['options'], 'type': ChartConfiguration['type']} {
    let data: { labels: any[], datasets: any[] } = {
      labels: portfolios.map((portfolio: Portfolio) => portfolio['name']),
      datasets: [{
        data: portfolios.map((portfolio: Portfolio) => this.data[portfolio['id']]['value'].slice(-1)[0]['y']),
        backgroundColor: [
          '#333333',
          '#666666',
          '#999999',
          '#CCCCCC',
          '#E6E6E6',
          '#F2F2F2',
          '#F9F9F9',
          '#FAFAFA',
          '#FCFCFC',
          '#FFFFFF'
        ]
      }]
    };
    return {
      'data': data,
      'options': {
        responsive: true,
        maintainAspectRatio: true,
        color: 'white',
        borderColor: '#2A2A2A',
        animation: {
          //@ts-ignore
          animateRotate: false,
          animateScale: false
        },
        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            enabled: false
          }
        },
        onHover: (e, item) => {
          const portfolios = document.querySelectorAll('#portfolio')
          if (item.length > 0) {
            portfolios[item[0].index].classList.add('active')
            portfolios.forEach((portfolio: any, index: number) => {
              if (index !== item[0].index) {
                portfolio.classList.remove('active')
              }
            })
          }
          else {
            portfolios.forEach((portfolio: any) => {
              portfolio.classList.remove('active')
            })
          }
        },
        hoverOffset: 10,
        spacing: 1,
        layout: {
          padding: 10
        }
      },
      type: 'doughnut'
    };
  }
  getPieChartConfigDistribution(distribution: any):  {'data': ChartConfiguration['data'], 'options': ChartConfiguration['options'], 'type': ChartConfiguration['type']} {
    let data: { labels: any[], datasets: any[] } = {
      labels: Object.keys(distribution),
      datasets: [{
        data: Object.values(distribution),
        backgroundColor: [
          '#333333',
          '#666666',
          '#999999',
          '#CCCCCC',
          '#E6E6E6',
          '#F2F2F2',
          '#F9F9F9',
          '#FAFAFA',
          '#FCFCFC',
          '#FFFFFF'
        ]
      }]
    };
    return {
      'data': data,
      'options': {
        responsive: true,
        maintainAspectRatio: true,
        color: 'white',
        borderColor: '#2A2A2A',
        animation: {
          //@ts-ignore
          animateRotate: false,
          animateScale: false
        },
        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            enabled: true
          }
        },
        hoverOffset: 10,
        spacing: 1,
        layout: {
          padding: 10
        }
      },
      type: 'doughnut'
    };
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

      this.updateChartBackground(data['datasets'].slice(-1)[0], color, 75)
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

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'decimal': any, 'currency': any, 'percent': any, 'compact': any, 'hour': any } = {
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
    'currency': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'currency', 'currency': 'USD'}),
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2, 'signDisplay': "always"}),
    'compact': Intl.NumberFormat(this.getNavigatorLanguage(), {'notation': 'compact'}),
    'hour': Intl.DateTimeFormat(this.getNavigatorLanguage(), {hour: 'numeric', minute: 'numeric'})
  }

  constructor(private route: ActivatedRoute, public app: AppComponent, private service: DataApiService, public accountService: AccountApiService) {
  }

  async ngOnInit() {
    let ouho = new Date().getTime()
    let groups: any

    const urlParams: any = await this.route.params.pipe(first()).toPromise()

    if (!urlParams['username']) {
      groups = await this.accountService.getGroups().toPromise()
    }
    else {
      this.isExternalAccount = true
      this.externalAccountUsername = urlParams['username']

      const user = await this.accountService.getPublicUserInfo(urlParams['username']).toPromise()
      const userId = user['id']

      groups = await this.accountService.getPublicGroups(userId).toPromise()
    }

    this.service.getRealTime('US10Y.INDX').subscribe((response: any) => {
      this.riskFreeRate = response['0']['open'].toFixed(2)
    })

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

      if (!this.isExternalAccount) {
        this.group = this.groups[0]
      }
      else {
        this.group = this.groups.find(group => group.id === Number(urlParams['group_id']))!
      }

      this.group.portfolios.forEach((portfolio: Portfolio) => {
        this.allPositions = this.allPositions.concat(portfolio.positions)
      })

      this.updateDistribution().then()
      this.updateDividend().then()

      let oldestDateOfAllPositions: number | Date | null = null;
      let dictTickers: any = {}

      this.tickers.forEach((ticker) => {

        let oldestDate = null;

        for (const position of allPositionOldestDate) {
          if (position.ticker === ticker) {
            const enterDate = new Date(position.enterDate);
            if (!oldestDate || enterDate < oldestDate) {
              oldestDate = enterDate;
            }
            if (!oldestDateOfAllPositions || enterDate < oldestDateOfAllPositions) {
              oldestDateOfAllPositions = enterDate;
              this.oldestDate = enterDate;
              this.oldestDate.setDate(this.oldestDate.getDate() - 3);
              this.oldestDate = this.oldestDate.toISOString().slice(0, 10);
            }
          }
        }
        if (oldestDate != null) {
          oldestDate.setDate(oldestDate.getDate() - 3);
          dictTickers[ticker] = oldestDate.toISOString().slice(0, 10);
        }
      });

      this.tickers.push(this.benchmarkTicker);
      dictTickers[this.benchmarkTicker] = this.oldestDate
      const data = await this.service.getHistorical_portfolio(JSON.stringify(dictTickers)).toPromise();
      for (let i = 0; i < Object.keys(data).length; i++) {
        this.data[Object.keys(data)[i]] = (Object.values(data)[i] as any)
      }

      if (this.allPositions.length > 0) {
        let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker], 'group')
        this.data['group']['benchmarkData'] = benchmarkData
        this.data['group']['value'] = this.getPortfolioValueHistory(this.allPositions)
        this.data['group']['percentageVar'] = this.getPercentageVariationHistory(this.data['group']['value'])
        const metricsHistory = this.getMetricsHistory(this.data['group']['percentageVar'], benchmarkData)
        this.data['group']['beta'] = metricsHistory.betaHistory
        this.data['group']['rSquared'] = metricsHistory.rSquaredHistory
        this.data['group']['meanVar'] = metricsHistory.meanHistory
        this.data['group']['standardDeviation'] = metricsHistory.standardDeviationHistory
        this.data['group']['sharpe'] = this.getSharpeHistory(this.data['group']['meanVar'], this.riskFreeRate, 'group')
        this.data['group']['alpha'] = this.getAlphaHistory(this.data['group']['percentageVar'], benchmarkData, this.data['group']['beta'], this.riskFreeRate)
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
            this.data[portfolio['id']]['rSquared'] = undefined
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

  closePremiumPopup() {
    this.showPremiumPopup = false
  }

  incrementIntroCard() {
    this.introCard++
  }

  onPieChartClick(event: any) {
    if (event.active.length > 0) {
      this.selectTab = 'portfolio'
      this.changePortfolio(this.group.portfolios[event.active[0].index])
    }
  }

  onPieChartMouseOut() {
    const portfolios = document.getElementsByClassName("active")

    if (portfolios[0]) {
      portfolios[0].classList.remove("active")
    }
  }

  getFileName(name: string){
    let timeSpan = new Date().toISOString();
    let sheetName = name || "ExportResult";
    let fileName = `${sheetName}-${timeSpan}`;
    return {
      sheetName,
      fileName
    };
  };

  exportArrayToExcel(type: string = 'porfolio') {
    let newData: any[];
    let sheetName: string;
    let fileName: string;

    if (type == 'porfolio') {
      const fileInfo = this.getFileName(this.portfolio.name);
      sheetName = fileInfo.sheetName;
      fileName = fileInfo.fileName;
      newData = this.portfolio.positions.map(item => {
        // @ts-ignore
        const { id, portfolio, service, ...newItem } = item;
        return newItem;
      });
    } else {
      const fileInfo = this.getFileName(this.group.name);
      sheetName = fileInfo.sheetName;
      fileName = fileInfo.fileName;
      newData = this.allPositions.map(item => {
        // @ts-ignore
        const { id, portfolio, service, ...newItem } = item;
        return newItem;
      });
    }

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.json_to_sheet(newData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }


  updateChartBackground(data: any, color: string, height?: number) {
    if (this.chart && data['data'][0]) {
      const ctx = document.createElement('canvas').getContext('2d');
      let gradient

      if (height) {
        gradient = ctx!.createLinearGradient(0, -(height * 0.1), 0, height * 0.9);
      }
      else {
        gradient = ctx!.createLinearGradient(0, -(this.chart.ctx.canvas.height * 0.1), 0, this.chart.ctx.canvas.height * 0.9);
      }

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

  getPercentageVariationHistoryBenchmark(data: any[], type: string = 'portfolio') {
    let percentageVariationHistory = []
    let enterDates = []

    if (type == 'portfolio') {
      enterDates = this.portfolio.activePositionsDict.map(position => new Date(position.enterDate));
    } else {
      enterDates = this.allPositions.map(position => new Date(position.enterDate));
    }

    // @ts-ignore
    let currentDate = new Date(Math.min(...enterDates));
    const startDatePrice = data.slice(data.findIndex((element: any) => element['x'] >= currentDate.getTime()))[0]['y']


    while (currentDate <= new Date()) {
      const dataIndex = data.findIndex((element: any) => element['x'] >= currentDate.getTime())

      percentageVariationHistory.push(
        {
          x: currentDate.getTime(),
          y: ((data.slice(dataIndex)[0]['y'] - startDatePrice) / startDatePrice) * 100
        }
      )

      currentDate.setDate(currentDate.getDate() + 1)
    }
    return percentageVariationHistory
  }

  calculateRSquared(STD1: number, STD2: number, covar: number) {
    let SD = STD1 * STD2
    return (covar / SD) * (covar / SD)
  }

  calculateCovariance(returns1: number[], returns2: number[], mean1: number, mean2: number) {
    const n = returns1.length;
    const meanReturns1 = mean1;
    const meanReturns2 = mean2;

    let covariance = 0;

    for (let i = 0; i < n; i++) {
      covariance += (returns1[i] - meanReturns1) * (returns2[i] - meanReturns2);
    }

    covariance /= n - 1;
    return covariance;
  }

  calculateVariance(returns: number[], meanReturns: number) {
    const n = returns.length;

    let variance = 0;

    for (let i = 0; i < n; i++) {
      variance += (returns[i] - meanReturns) ** 2;
    }

    variance /= n - 1;
    return variance;
  }

  calculateMean(data: number[]) {
    const sum = data.reduce((total, value) => total + value, 0);
    return sum / data.length;
  }

  getMetricsHistory(data: any[], benchmarkData: any[]) {
    let standardDeviationHistory: any[] = [];

    let meanHistory: any[] = [];

    let betaHistory: any[] = [
      {
        x: data[0]['x'],
        y: null
      },
      {
        x: data[1]['x'],
        y: null
      }
    ];

    let rSquaredHistory: any[] = [

    ];

    for (let i = 0; i < data.length; i++) {
      const data1 = data.slice(0, i).map((a: any) => (a['y'] / 100))
      const data2 = benchmarkData.slice(0, i).map((a: any) => (a['y'] / 100))

      const mean1 = this.calculateMean(data1)
      const mean2 = this.calculateMean(data2)

      const covar = this.calculateCovariance(data1, data2, mean1, mean2)

      const variance1 = this.calculateVariance(data1, mean1)
      const variance2 = this.calculateVariance(data2, mean2)

      const STD1 = Math.sqrt(variance1)
      const STD2 = Math.sqrt(variance2)

      if (i < 15) {
        rSquaredHistory[i] = {
          x: data[i]['x'],
          y: 0
        }
      } else {
        rSquaredHistory.push({
          x: data[i]['x'],
          y: this.calculateRSquared(STD1, STD2, covar)
        })
      }

      if (i > 1) {
        betaHistory.push({
          x: data[i]['x'],
          y: covar / variance2
        })
      }

      meanHistory.push({
        x: data[i]['x'],
        y: mean1 * 100
      })

      standardDeviationHistory.push({
        x: data[i]['x'],
        y: STD1 * 100
      })
    }

    return { rSquaredHistory, betaHistory, meanHistory, standardDeviationHistory }
  }

  getAlphaHistory(data: any[], benchmarkData: any[], betaHistory: any[], riskFreeRate: number) {
    let alphaHistory: any[] = [
      {
        x: data[0]['x'],
        y: null
      },
      {
        x: data[1]['x'],
        y: null
      }
    ];

    for (let i = 2; i < data.length; i++) {
      alphaHistory.push({
        x: data[i]['x'],
        y: (data[i]['y'] / 100) - (riskFreeRate / 100) - (betaHistory[i]['y'] * ((benchmarkData[i]['y'] / 100) - (riskFreeRate / 100)))
      })
    }

    return alphaHistory
  }

  getSharpeHistory(data: any[], riskFreeRate: number, type: string = 'portfolio') {
    let sharpeHistory: any[] = [
      {
        x: data[0]['x'],
        y: null
      },
      {
        x: data[1]['x'],
        y: null
      },
      {
        x: data[2]['x'],
        y: null
      }
    ];

    if (type == 'portfolio') {
      for (let i = 3; i < data.length; i++) {
        sharpeHistory.push({
          x: data[i]['x'],
          y: (data[i]['y'] - riskFreeRate / 100) / (this.data[this.portfolio['id']]['standardDeviation'][i]['y'])
        })
      }
    } else {
      for (let i = 3; i < data.length; i++) {
        sharpeHistory.push({
          x: data[i]['x'],
          y: (data[i]['y'] - riskFreeRate / 100) / (this.data['group']['standardDeviation'][i]['y'])
        })
      }
    }

    return sharpeHistory
  }

  changeRiskFreeRate(riskFreeRate: number) {
    this.riskFreeRate = riskFreeRate

    let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker])
    this.data[this.portfolio['id']]['benchmarkData'] = benchmarkData
    this.data[this.portfolio['id']]['alpha'] = this.getAlphaHistory(this.data[this.portfolio['id']]['percentageVar'], benchmarkData, this.data[this.portfolio['id']]['beta'], riskFreeRate)
    this.data[this.portfolio['id']]['sharpe'] = this.getSharpeHistory(this.data[this.portfolio['id']]['meanVar'], riskFreeRate)
  }

  changeDisplayedData(src: string) {
    if (src != 'dividends') {
      if (this.displayedData.includes('dividends')) {
        this.displayedData.splice(this.displayedData.indexOf('dividends'), 1)
      }
      if (this.displayedData.includes(src)) {
        this.displayedData.splice(this.displayedData.indexOf(src), 1)
        if (this.displayedData.length === 0) {
          this.displayedData.push('value')
        }
      }
      else {
        if (src !== 'value') {
          if (this.displayedData.includes('value')) {
            this.displayedData.splice(this.displayedData.indexOf('value'), 1)
          }
          this.displayedData.push(src)
        }
        else {
          this.displayedData = [src]
        }
      }
    } else {
      this.displayedData = [src]
    }
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch
    if (this.showSearch) {
      document.body.style.overflowY = 'hidden';
    }
    else {
      document.body.style.overflowY = 'overlay';
      if (!this.isCreatingPosition && !this.isEditingPosition) {
        this.submitSearchSubscription!.unsubscribe()
      }
    }
  }

  totalInvestedCapital(type: string) {
    let total = 0
    if (type == 'invested') {
      this.portfolio.activePositionsDict.forEach((position: any) => {
        if (position.closePrice == null) {
          total += position.enterPriceUsd * position.quantity
        }
      })
    }
    if (type == 'investedManual') {
      this.portfolio.activePositionsDict.forEach((position: any) => {
        total += position.enterPriceUsd * position.quantity
      })
    }
    if (type == 'margin') {
      total = 10000
      this.portfolio.activePositionsDict.forEach((position: any) => {
        if (position.closePrice == null) {
          total -= position.enterPriceUsd * position.quantity
        } else {
          if (position.type == 'long') {
            total += (position.closePriceUsd - position.enterPriceUsd) * position.quantity
          } else {
            total += -(position.closePriceUsd - position.enterPriceUsd) * position.quantity
          }
        }
      })
    }
    if (type == 'group') {
      this.allPositions.forEach((position: any) => {
        total += position.enterPriceUsd * position.quantity
      })
    }
    return total
  }

  async changeBenchmarkTicker() {
    this.toggleSearch()

    this.submitSearchSubscription = this.searchComponent.submitSearchTrigger$.subscribe(async (ticker: string) => {
      this.toggleSearch();
      this.isTradeLoaded = false
      this.canUpdateBenchmarkTicker = true

      if (!this.tickers.includes(ticker)) {
        let dict: any = {}
        dict[ticker] = this.oldestDate
        const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()

        this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)
        this.tickers.push(ticker)
      } else if (new Date(this.data[ticker][0].x - 172800000).toISOString().split('T')[0] > this.oldestDate) {
        let dict: any = {}
        dict[ticker] = this.oldestDate
        const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()

        this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)

        if (this.data[ticker][0].x - new Date(this.oldestDate).getTime() >= 345600000) {
          this.canUpdateBenchmarkTicker = false
        }
      }

      if (this.displayedData.includes(this.benchmarkTicker) && this.benchmarkTicker != ticker) {
        this.changeDisplayedData(ticker)
        this.displayedData.splice(this.displayedData.indexOf(this.benchmarkTicker), 1)
      }

      this.benchmarkTicker = ticker
      this.isTradeLoaded = true
      let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker])
      this.data[this.portfolio['id']]['benchmarkData'] = benchmarkData
      const metricsHistory = this.getMetricsHistory(this.data[this.portfolio['id']]['percentageVar'], benchmarkData)
      this.data[this.portfolio['id']]['beta'] = metricsHistory.betaHistory
      this.data[this.portfolio['id']]['rSquared'] = metricsHistory.rSquaredHistory
      this.data[this.portfolio['id']]['alpha'] = this.getAlphaHistory(this.data[this.portfolio['id']]['percentageVar'], benchmarkData, this.data[this.portfolio['id']]['beta'], this.riskFreeRate)
    })
  }

  async changeActivePositions(position: any) {
    this.isTradeLoaded = false
    await new Promise(resolve => setTimeout(resolve, 100));

    const index = this.portfolio.positions.indexOf(position)
    if (this.portfolio.activePositions.includes(index)) {
      if (this.portfolio.activePositions.length == 1) {
        return
      }
      this.portfolio.activePositions.splice(this.portfolio.activePositions.indexOf(index), 1);
    } else {
      this.portfolio.activePositions.push(index)
    }
    await this.updatePortfolio()
    this.isTradeLoaded = true
  }

  async updateTickerData(ticker: string, enterDate: string) {
    if (!this.tickers.includes(ticker)) {
      let enterDateManual = new Date(enterDate)
      enterDateManual.setDate(enterDateManual.getDate() - 3)
      let enterDateManualStr = enterDateManual.toISOString().slice(0, 10)

      let dict: any = {}
      dict[ticker] = enterDateManualStr
      const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()
      this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)

      this.tickers.push(ticker)
    } else {
      let enterDateManual = new Date(enterDate)
      enterDateManual.setDate(enterDateManual.getDate() - 3)
      let enterDateManualStr = enterDateManual.toISOString().slice(0, 10)

      if (new Date(this.data[ticker][0].x - 172800000).toISOString().split('T')[0] > enterDate) {
        let dict: any = {}
        dict[ticker] = enterDateManualStr
        const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()
        this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)
      }
    }
  }

  updateOldestDate(enterDate: string) {
    if (enterDate < this.oldestDate || this.oldestDate == '') {
      this.oldestDate = new Date(enterDate)
      this.oldestDate.setDate(this.oldestDate.getDate() - 3);
      this.oldestDate = this.oldestDate.toISOString().slice(0, 10);
    }
  }

  async updateDistribution() {
    let allPositions: any[] = []

    this.group.portfolios.forEach((portfolio: Portfolio) => {
      allPositions = allPositions.concat(portfolio.positions)
    })

    const uniqueTickers = new Set<string>();
    for (const position of allPositions) {
      uniqueTickers.add(position.ticker);
    }
    const uniqueTickerList = Array.from(uniqueTickers);

    this.group.countryDistribution = {}
    this.group.typeDistribution = {}
    this.group.sectorDistribution = {}

    for (const ticker of uniqueTickerList) {
      if (!this.tickersCountryType.hasOwnProperty(ticker)) {
        const response = await this.service.getFundamentalFiltered(ticker, 'General::CountryISO,General::Type,General::Sector').toPromise()
        if (response) {
          this.tickersCountryType[`${ticker}`] = {
            // @ts-ignore
            country: response['General::CountryISO'],
            // @ts-ignore
            type: response['General::Type'],
            // @ts-ignore
            sector: response['General::Sector'],
          }
        }
      }
      const tickerCountryType = this.tickersCountryType[`${ticker}`]

      if (tickerCountryType['country'] == 'NA') {
        if (!this.group.countryDistribution.hasOwnProperty('unknown')) {
          this.group.countryDistribution['unknown'] = 0;
        }
      } else {
        if (!this.group.countryDistribution.hasOwnProperty(tickerCountryType['country'])) {
          this.group.countryDistribution[tickerCountryType['country']] = 0;
        }
      }

      if (tickerCountryType['sector'] == 'NA') {
        if (!this.group.sectorDistribution.hasOwnProperty('unknown')) {
          this.group.sectorDistribution['unknown'] = 0;
        }
      } else {
        if (!this.group.sectorDistribution.hasOwnProperty(tickerCountryType['sector'])) {
          this.group.sectorDistribution[tickerCountryType['sector']] = 0;
        }
      }

      if (!this.group.typeDistribution.hasOwnProperty(tickerCountryType['type'])) {
        this.group.typeDistribution[tickerCountryType['type']] = 0;
      }

      let total: number = 0
      let totalTicker: number = 0
      let total2: number = 0
      let totalTicker2: number = 0

      for (const position of allPositions) {
        total2 += position.enterPriceUsd * position.quantity
        total += position.enterPriceUsd * position.quantity
        if (position.ticker == ticker) {
          totalTicker2 += position.enterPriceUsd * position.quantity
          totalTicker += position.enterPriceUsd * position.quantity
        }
      }
      if (tickerCountryType['country'] != 'NA') {
        this.group.countryDistribution[`${tickerCountryType['country']}`] += totalTicker / total * 100
      } else {
        this.group.countryDistribution['unknown'] += totalTicker / total * 100
      }

      if (tickerCountryType['sector'] != 'NA') {
        this.group.sectorDistribution[`${tickerCountryType['sector']}`] += totalTicker / total * 100
      } else {
        this.group.sectorDistribution['unknown'] += totalTicker / total * 100
      }

      this.group.typeDistribution[`${tickerCountryType['type']}`] += totalTicker2 / total2 * 100
    }
  }

  calculateDetailedDividends(positions: Position[], dividendHistories: any) {
    const detailedMonthlyDividends: { [month: string]: { [ticker: string]: number } } = {};

    positions.forEach(position => {
      const dividends = dividendHistories[position.ticker];
      if (!dividends) return;

      const enterDate = new Date(position.enterDate);
      const closeDate = position.closeDate ? new Date(position.closeDate) : new Date();

      dividends.forEach((dividend: { date: string | number | Date; amount: number; }) => {
        const dividendDate = new Date(dividend.date);
        if (dividendDate >= enterDate && dividendDate <= closeDate && position.type == 'long') {
          const monthKey = `${dividendDate.getFullYear()}-${String(dividendDate.getMonth() + 1).padStart(2, '0')}`;

          if (!detailedMonthlyDividends[monthKey]) {
            detailedMonthlyDividends[monthKey] = {};
          }

          if (!detailedMonthlyDividends[monthKey][position.ticker]) {
            detailedMonthlyDividends[monthKey][position.ticker] = 0;
          }

          detailedMonthlyDividends[monthKey][position.ticker] += dividend.amount * position.quantity;
        }
      });
    });

    const resultList: any = {};

    const allTickers: string[] = Array.from(
      new Set(
        Object.values(detailedMonthlyDividends).flatMap((data) => Object.keys(data))
      )
    );
    allTickers.forEach((ticker) => {
      resultList[ticker] = [];
    });
    Object.entries(detailedMonthlyDividends).forEach(([date, data]) => {
      allTickers.forEach((ticker) => {
        const value = data[ticker] || 0;
        resultList[ticker].push({ x: date, y: value });
      });
    });
    return resultList;
  }

  async updateDividend() {
    let allPositions: any[] = []

    if (this.selectTab == 'overview') {
      this.group.portfolios.forEach((portfolio: Portfolio) => {
        allPositions = allPositions.concat(portfolio.positions)
      })
    } else {
      allPositions = allPositions.concat(this.portfolio.positions)
    }

    const uniqueTickers = new Set<string>();
    for (const position of allPositions) {
      uniqueTickers.add(position.ticker);
    }
    const uniqueTickerList = Array.from(uniqueTickers);

    for (const ticker of uniqueTickerList) {
      if (!this.dividendData.hasOwnProperty(ticker)) {
        const response: any = await this.service.getDividend(ticker).toPromise()
        if (response) {
          let currency = await this.getCurrencyVal(ticker.split('.')[1])
          for (let i = 0; i <= response.length - 1; i++) {
            response[i].amount = Number((response[i].value / currency).toFixed(3))
          }
          this.dividendData[`${ticker}`] = response
        }
      }
    }
    if (this.selectTab == 'overview') {
      this.group.dividend = this.calculateDetailedDividends(allPositions, this.dividendData)
    } else {
      this.portfolio.dividend = this.calculateDetailedDividends(allPositions, this.dividendData)
    }
  }


  createGroup(event: any) {
    if (this.groups.length < 1 || this.app.user['premium']) {
      event.preventDefault()
      const formData = new FormData(event.target)

      let name: any = formData.get('name')
      name = name.charAt(0).toUpperCase() + name.slice(1)
      const visibility: any = formData.get('visibility')

      this.accountService.createGroup(name, visibility).subscribe((response: any) => {
        const group = new Group(this.accountService, response['id'], name, visibility)
        this.groups.push(group)
        this.changeGroup(group)

        this.isCreatingGroup = false
      })
    }
    else {
      this.showPremiumPopup = true
      this.isCreatingGroup = false
    }
  }

  changeGroup(group: Group) {
    if (this.group !== group) {
      this.group = group

      this.allPositions = []
      this.group.portfolios.forEach((portfolio: Portfolio) => {
        this.allPositions = this.allPositions.concat(portfolio.positions)
      })

      if (this.allPositions.length > 0) {
        let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker], 'group')
        this.data['group']['benchmarkData'] = benchmarkData
        this.data['group']['value'] = this.getPortfolioValueHistory(this.allPositions)
        this.data['group']['percentageVar'] = this.getPercentageVariationHistory(this.data['group']['value'])
        const metricsHistory = this.getMetricsHistory(this.data['group']['percentageVar'], benchmarkData)
        this.data['group']['beta'] = metricsHistory.betaHistory
        this.data['group']['rSquared'] = metricsHistory.rSquaredHistory
        this.data['group']['meanVar'] = metricsHistory.meanHistory
        this.data['group']['standardDeviation'] = metricsHistory.standardDeviationHistory
        this.data['group']['sharpe'] = this.getSharpeHistory(this.data['group']['meanVar'], this.riskFreeRate, 'group')
        this.data['group']['alpha'] = this.getAlphaHistory(this.data['group']['percentageVar'], benchmarkData, this.data['group']['beta'], this.riskFreeRate)
        this.updateDistribution().then()
        this.updateDividend().then()

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
            this.data[portfolio['id']]['rSquared'] = undefined
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

      this.selectTab = 'overview'
      this.portfolio = new Portfolio(this.accountService, this.group, 0, '', 'manual')
    }
  }

  updateGroup() {
    if (this.allPositions.length > 0) {
      let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker], 'group')
      this.data['group']['benchmarkData'] = benchmarkData
      this.data['group']['value'] = this.getPortfolioValueHistory(this.allPositions)
      this.data['group']['percentageVar'] = this.getPercentageVariationHistory(this.data['group']['value'])
      const metricsHistory = this.getMetricsHistory(this.data['group']['percentageVar'], benchmarkData)
      this.data['group']['beta'] = metricsHistory.betaHistory
      this.data['group']['rSquared'] = metricsHistory.rSquaredHistory
      this.data['group']['meanVar'] = metricsHistory.meanHistory
      this.data['group']['standardDeviation'] = metricsHistory.standardDeviationHistory
      this.data['group']['sharpe'] = this.getSharpeHistory(this.data['group']['meanVar'], this.riskFreeRate, 'group')
      this.data['group']['alpha'] = this.getAlphaHistory(this.data['group']['percentageVar'], benchmarkData, this.data['group']['beta'], this.riskFreeRate)
      this.updateDistribution().then()
      this.updateDividend().then()
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
    }
  }

  async deleteGroup(group: Group) {
    this.groups.splice(this.groups.indexOf(group), 1)

    if (this.groups.length > 0) {
      this.group = this.groups[0]

    }
    this.allPositions = []
    this.group.portfolios.forEach((portfolio: Portfolio) => {
      this.allPositions = this.allPositions.concat(portfolio.positions)
    })

    this.selectTab = 'overview'

    for (let portfolio of group.portfolios) {
      for (let position of portfolio.positions) {
        await this.accountService.deletePosition(position['id']).toPromise()
      }
      await this.accountService.deletePortfolio(portfolio['id']).toPromise()
    }

    this.updateGroup()
    this.accountService.deleteGroup(group['id']).subscribe()
  }

  createPortfolio(event: any) {
    if (this.group.portfolios.length < 1 || this.app.user['premium']) {
      event.preventDefault()
      const formData = new FormData(event.target)

      let name: any = formData.get('name')
      name = name.charAt(0).toUpperCase() + name.slice(1)
      const type: any = formData.get('type')

      this.isCreatingPortfolio = false

      this.accountService.createPortfolio(name, type, this.group['id']).subscribe((response: any) => {
        const portfolio = new Portfolio(this.accountService, this.group, response['id'], name, type)
        this.group.portfolios.push(portfolio)

        this.data[portfolio['id']] = {}

        this.data[portfolio['id']]['value'] = [{
          x: new Date().getTime(),
          y: 0
        }]
        this.data[portfolio['id']]['percentageVar'] = [{
          x: new Date().getTime(),
          y: 0
        }]
        this.data[portfolio['id']]['standardDeviation'] = undefined
        this.data[portfolio['id']]['meanVar'] = undefined
        this.data[portfolio['id']]['beta'] = undefined
        this.data[portfolio['id']]['alpha'] = undefined
        this.data[portfolio['id']]['sharpe'] = undefined
        this.data[portfolio['id']]['rSquared'] = undefined

        this.changePortfolio(portfolio)
      })
    }
    else {
      this.showPremiumPopup = true
      this.isCreatingPortfolio = false
    }
  }

  async changePortfolio(portfolio: Portfolio) {
    if (this.portfolio !== portfolio) {
      this.portfolio = portfolio
      if (portfolio.positions.length > 0 && !this.data[portfolio['id']]['standardDeviation']) {
        this.portfolio.activePositions = Array.from({ length: portfolio.positions.length }, (_, i) => i);
        this.portfolio.activePositionsDict = this.portfolio.positions
        if (!this.tickers.includes(this.benchmarkTicker)) {
          let dict: any = {}
          dict[this.benchmarkTicker] = this.oldestDate
          const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()

          this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)
          this.tickers.push(this.benchmarkTicker)
        }
        let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker])
        this.data[portfolio['id']]['benchmarkData'] = benchmarkData
        const metricsHistory = this.getMetricsHistory(this.data[portfolio['id']]['percentageVar'], benchmarkData)
        this.data[portfolio['id']]['beta'] = metricsHistory.betaHistory
        this.data[portfolio['id']]['rSquared'] = metricsHistory.rSquaredHistory
        this.data[portfolio['id']]['meanVar'] = metricsHistory.meanHistory
        this.data[portfolio['id']]['standardDeviation'] = metricsHistory.standardDeviationHistory
        this.data[portfolio['id']]['sharpe'] = this.getSharpeHistory(this.data[portfolio['id']]['meanVar'], this.riskFreeRate)
        this.data[portfolio['id']]['alpha'] = this.getAlphaHistory(this.data[portfolio['id']]['percentageVar'], benchmarkData, this.data[portfolio['id']]['beta'], this.riskFreeRate)
      }
      this.updateDividend().then()
    }
  }

  async updatePortfolio() {
    if (this.portfolio.positions.length > 0) {
      this.portfolio.activePositionsDict = this.portfolio.activePositions
        .filter(index => index >= 0 && index < this.portfolio.positions.length)
        .map(index => this.portfolio.positions[index]);
      if (!this.tickers.includes(this.benchmarkTicker)) {
        let dict: any = {}
        dict[this.benchmarkTicker] = this.oldestDate
        const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()

        this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)
        this.tickers.push(this.benchmarkTicker)
      } else if (new Date(this.data[this.benchmarkTicker][0].x - 172800000).toISOString().split('T')[0] > this.oldestDate && this.canUpdateBenchmarkTicker) {
        let dict: any = {}
        dict[this.benchmarkTicker] = this.oldestDate
        const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()

        this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)
        if (this.data[this.benchmarkTicker][0].x - new Date(this.oldestDate).getTime() >= 345600000) {
          this.canUpdateBenchmarkTicker = false
        }
      }
      let benchmarkData: any[] = this.getPercentageVariationHistoryBenchmark(this.data[this.benchmarkTicker])
      this.data[this.portfolio['id']]['benchmarkData'] = benchmarkData
      this.data[this.portfolio['id']]['value'] = this.getPortfolioValueHistory(this.portfolio.activePositionsDict)
      this.data[this.portfolio['id']]['percentageVar'] = this.getPercentageVariationHistory(this.data[this.portfolio['id']]['value'])
      const metricsHistory = this.getMetricsHistory(this.data[this.portfolio['id']]['percentageVar'], benchmarkData)
      this.data[this.portfolio['id']]['beta'] = metricsHistory.betaHistory
      this.data[this.portfolio['id']]['rSquared'] = metricsHistory.rSquaredHistory
      this.data[this.portfolio['id']]['meanVar'] = metricsHistory.meanHistory
      this.data[this.portfolio['id']]['standardDeviation'] = metricsHistory.standardDeviationHistory
      this.data[this.portfolio['id']]['sharpe'] = this.getSharpeHistory(this.data[this.portfolio['id']]['meanVar'], this.riskFreeRate)
      this.data[this.portfolio['id']]['alpha'] = this.getAlphaHistory(this.data[this.portfolio['id']]['percentageVar'], benchmarkData, this.data[this.portfolio['id']]['beta'], this.riskFreeRate)
    }
    else {
      this.data[this.portfolio['id']]['value'] = [{
        x: new Date().getTime(),
        y: 0
      }]
      this.data[this.portfolio['id']]['percentageVar'] = [{
        x: new Date().getTime(),
        y: 0
      }]
      this.data[this.portfolio['id']]['standardDeviation'] = undefined
      this.data[this.portfolio['id']]['meanVar'] = undefined
      this.data[this.portfolio['id']]['beta'] = undefined
      this.data[this.portfolio['id']]['alpha'] = undefined
      this.data[this.portfolio['id']]['sharpe'] = undefined
      this.data[this.portfolio['id']]['rSquared'] = undefined
    }

    this.updateGroup()
  }

  async deletePortfolio(portfolio: Portfolio) {
    this.group.portfolios.splice(this.group.portfolios.indexOf(portfolio), 1)

    this.selectTab = 'overview'

    for (let position of portfolio.positions) {
      this.allPositions.splice(this.allPositions.indexOf(position), 1)
      await this.accountService.deletePosition(position['id']).toPromise()
    }

    this.updateGroup()
    this.accountService.deletePortfolio(portfolio['id']).subscribe()
  }

  async createPosition(step: number, event?: any) {
    if (step === 1) {
      this.isCreatingPosition = true
      this.submitSearchSubscription = this.searchComponent.submitSearchTrigger$.subscribe(async (ticker: string) => {
        this.createPositionTicker = ticker

        this.toggleSearch()
      })
    }
    else if (step === 2) {
      if (this.portfolio.positions.length < 5) {
        this.isCreatingPosition = false
        this.submitSearchSubscription!.unsubscribe()
        this.isTradeLoaded = false
        await new Promise(resolve => setTimeout(resolve, 100));

        event.preventDefault()
        const formData = new FormData(event.target)

        const type: any = event.submitter.name
        const ticker: any = this.createPositionTicker
        let enterPrice: any
        let enterDate: any
        const quantity: any = formData.get('quantity')

        if (!this.tickers.includes(ticker) && this.portfolio.type == "demo") {
          let dict: any = {}
          let enterDateDemo = new Date()
          enterDateDemo.setDate(enterDateDemo.getDate() - 5);
          let enterDateDemoStr = enterDateDemo.toISOString().slice(0, 10);
          dict[ticker] = enterDateDemoStr
          const response = await this.service.getHistorical_portfolio(JSON.stringify(dict)).toPromise()

          this.data[Object.keys(response)[0]] = (Object.values(response)[0] as any)
          this.tickers.push(ticker)
        }

        if (this.portfolio.type == "demo") {
          enterPrice = this.data[ticker][this.data[ticker].length - 1].y
          enterDate = new Date(this.data[ticker][this.data[ticker].length - 1].x).toISOString().split('T')[0];
          if (enterPrice * quantity > this.totalInvestedCapital("margin")) {
            this.createPositionTicker = ''
            this.showNotEnoughMargin = true
            this.isTradeLoaded = true
            return
          }
        } else {
          enterPrice = formData.get('enterPrice')
          enterDate = formData.get('enterDate')
          await this.updateTickerData(ticker, enterDate)
        }

        this.updateOldestDate(enterDate)

        this.accountService.createPosition(this.portfolio['id'], type, ticker, enterPrice, enterDate, quantity).subscribe(async (response: any) => {
          const position: Position = new Position(this.accountService, this.portfolio, response['id'], type, ticker, enterPrice, enterPrice  / await this.getCurrencyVal(ticker.split('.')[1]), enterDate, quantity, undefined, undefined, undefined)

          this.portfolio.positions.push(position)
          this.portfolio.activePositions.push(this.portfolio.positions.indexOf(position))

          this.createPositionTicker = ''

          this.allPositions.push(position)

          await this.updatePortfolio()
          this.isTradeLoaded = true
        })
      }
      else {
        this.showPremiumPopup = true
        this.isCreatingPosition = false
        this.submitSearchSubscription?.unsubscribe()
        this.createPositionTicker = ''
      }
    }
  }

  async editPosition(step: number, position: any, event?: any) {
    if (step === 1) {
      this.isEditingPosition = position
      this.createPositionTicker = position['ticker']

      this.submitSearchSubscription = this.searchComponent.submitSearchTrigger$.subscribe(async (ticker: string) => {
        this.createPositionTicker = ticker

        this.toggleSearch()
      })
    }
    else if (step === 2) {
      this.isTradeLoaded = false
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.isClosingPosition) {
        event.preventDefault()
        const formData = new FormData(event.target)
        const ticker: any = this.createPositionTicker
        const quantity: any = formData.get('quantity')
        const type: any = event.submitter.name
        if (position.closePrice == null) {
          const enterPrice: any = formData.get('enterPrice')
          const enterDate: any = formData.get('enterDate')
          position.edit(type, ticker, enterPrice, enterDate, quantity)

          this.updateOldestDate(enterDate)
          await this.updateTickerData(ticker, enterDate)

        } else {
          const price = Number(formData.get('enterPrice'))
          const date: any = formData.get('enterDate')
          position.closePrice = price
          position.closeDate = date
          position.quantity = quantity
          position.type = type
          position.edit(type, ticker, position.enterPrice, position.enterDate, quantity)
          this.accountService.closePosition(position['id'], price, date).subscribe()
        }

        this.isEditingPosition = false
        this.submitSearchSubscription!.unsubscribe()
        this.createPositionTicker = ''

        await this.updatePortfolio()
      } else {
        event.preventDefault()
        const formData = new FormData(event.target)

        const price = Number(formData.get('enterPrice'))
        const date: any = formData.get('enterDate')
        position.closePrice = price
        position.closeDate = date
        position.closePriceUsd = price / await this.getCurrencyVal(position['ticker'].split('.')[1])
        this.isEditingPosition = false
        this.isClosingPosition = false
        this.createPositionTicker = ''
        await this.updatePortfolio()
        this.accountService.closePosition(position['id'], price, date).subscribe()
      }
      this.isTradeLoaded = true
    }
  }

  async closePosition(position: Position) {
    this.isTradeLoaded = false
    await new Promise(resolve => setTimeout(resolve, 100));
    const price = this.data[position.ticker][this.data[position.ticker].length-1].y
    const date = new Date(this.data[position.ticker][this.data[position.ticker].length-1].x).toISOString().split('T')[0];
    position.closePrice = price
    position.closeDate = date
    await this.updatePortfolio()
    this.isTradeLoaded = true
    this.accountService.closePosition(position['id'], price, date).subscribe()
  }

  async deletePosition(position: Position) {
    this.isTradeLoaded = false
    await new Promise(resolve => setTimeout(resolve, 100));
    this.portfolio.positions.splice(this.portfolio.positions.indexOf(position), 1)
    this.allPositions.splice(this.allPositions.indexOf(position), 1)
    this.portfolio.activePositions = Array.from({ length: this.portfolio.positions.length }, (_, i) => i);
    await this.updatePortfolio()
    this.isTradeLoaded = true

    this.accountService.deletePosition(position['id']).subscribe()
  }

  isCorrectDate(date: any, date2: any, price: any) {
    this.isClosingDateCorrect =  new Date(date).toISOString().slice(0, 10) >= date2 && price > 0;
  }

  changeDistribution(n: number) {
    if (this.selectedDistribution + n > 3) {
      this.selectedDistribution = 0
    }
    else if (this.selectedDistribution + n < 0) {
      this.selectedDistribution = 3
    }
    else {
      this.selectedDistribution += n
    }
  }
}

export class Group {
  id: number
  name: string
  visibility: string
  portfolios: Portfolio[] = []
  countryDistribution: { [key: string]: number } = {}
  typeDistribution: { [key: string]: number } = {}
  sectorDistribution: { [key: string]: number } = {}
  dividend: any[] = []

  constructor(private service: AccountApiService, id: number, name: string, visibility: string) {
    this.id = id
    this.name = name
    this.visibility = visibility
    this.countryDistribution = {}
    this.typeDistribution = {}
    this.sectorDistribution = {}
    this.dividend = []
  }

  edit(name: string, visibility: string) {
    if (name.length >= 3) {
      this.name = name.charAt(0).toUpperCase() + name.slice(1)
      this.visibility = visibility
      this.service.editGroup(this.id, this.name, visibility).subscribe()
    }
  }
}

export class Portfolio {
  group: Group
  id: number
  name: string
  type: string
  positions: Position[] = []
  activePositions: any[] = []
  activePositionsDict: any[] = []
  dividend: any[] = []

  constructor(private service: AccountApiService, group: Group, id: number, name: string, type: string) {
    this.group = group
    this.id = id
    this.name = name
    this.type = type
    this.dividend = []
  }

  edit(name: string) {
    if (name.length >= 3) {
      this.name = name.charAt(0).toUpperCase() + name.slice(1)
      this.service.editPortfolio(this.id, this.name).subscribe()
    }
  }
}

export class Position {
  portfolio: Portfolio;
  id: number
  type: string
  ticker: string
  enterPrice: number
  enterPriceUsd: number
  enterDate: string
  quantity: number
  closePrice: number | undefined
  closePriceUsd: number | undefined
  closeDate: string | undefined

  constructor(private service: AccountApiService, portfolio: Portfolio, id: number, type: string, ticker: string, enterPrice: number, enterPriceUsd: number, enterDate: string, quantity: number, closePrice: number | undefined, closePriceUsd: number | undefined, closeDate: string | undefined) {
    this.portfolio = portfolio
    this.id = id
    this.type = type
    this.ticker = ticker
    this.enterPrice = enterPrice
    this.enterPriceUsd = enterPriceUsd
    this.enterDate = enterDate
    this.quantity = quantity
    this.closePrice = closePrice
    this.closePriceUsd = closePriceUsd
    this.closeDate = closeDate
  }

  edit(type: 'long' | 'short', ticker: string, enterPrice: number, enterDate: string, quantity: number) {
    this.type = type
    this.ticker = ticker
    this.enterPriceUsd = enterPrice / (this.enterPrice / this.enterPriceUsd)
    this.enterPrice = enterPrice
    this.enterDate = enterDate
    this.quantity = quantity

    this.service.editPosition(this.id, type, ticker, enterPrice, enterDate, quantity).subscribe()
  }
}
