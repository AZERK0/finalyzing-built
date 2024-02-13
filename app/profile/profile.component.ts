import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AppComponent} from "../app.component";
import {AccountApiService} from "../services/account-api.service";
import {Group, Portfolio, Position} from "../portfolio/portfolio.component";
import {DataApiService} from "../services/data-api.service";
import {ChartConfiguration} from "chart.js";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  user = {
    'id': '',
    'username': '',
    'description': '',
    'creation_date': '',
    'premium': 0
  }
  username: string = '';

  data: { [key: number | string]: any} = {}
  tickers: string[] = []
  currencies: { [key: string]: number } = {'US': 1, "CC": 1, "INDX": 1, "FOREX": 1}
  groups: Group[] = []

  isAllGroupLoaded = false

  isEditingUsername: boolean = false
  usernameInputValue: string = ''
  isUsernameAvailable: boolean = true

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

  constructor(private route: ActivatedRoute, private router: Router, private service: DataApiService, public app: AppComponent, private accountService: AccountApiService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['username']) {
        this.username = params['username']
        this.getPublicUserInfo()
      }
      else {
        this.app.loginTrigger$.subscribe(() => {
          if (this.app.isLoggedIn) {
            this.router.navigate(['/profile', this.app.user['username']])
            this.username = this.app.user['username']
            this.getPublicUserInfo()
          }
          else {
            this.router.navigate(['/'])
            this.app.toggleLoginDialog()
          }
        });
      }
    });
  }

  getPublicUserInfo() {
    this.accountService.getPublicUserInfo(this.username).subscribe((response) => {
      this.user = response
      this.getPublicGroups()
    })
  }

  async getPublicGroups() {
    const groups: any = await this.accountService.getPublicGroups(this.user['id']).toPromise();

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

      for (let group of this.groups) {
        let allPositions: any[] = []
        group.portfolios.forEach((portfolio: Portfolio) => {
          allPositions = allPositions.concat(portfolio.positions)
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

        this.data[group['id']] = {}

        if (allPositions.length > 0) {
          this.data[group['id']]['value'] = this.getPortfolioValueHistory(allPositions)
          this.data[group['id']]['percentageVar'] = this.getPercentageVariationHistory(this.data[group['id']]['value'])
        }
        else {
          this.data[group['id']]['value'] = [{
            x: new Date().getTime(),
            y: 0
          }]
          this.data[group['id']]['percentageVar'] = [{
            x: new Date().getTime(),
            y: 0
          }]
        }
      }
    }


    this.isAllGroupLoaded = true
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

  getBestPerformance() {
    const percentageVarNumberHistory = this.groups.map((group: Group) => (this.data[group['id']]['percentageVar'].slice(-1)[0]['y']))

    if (percentageVarNumberHistory.length > 0) return Math.max(...percentageVarNumberHistory)
    else return 0
  }

  getHighestValue() {
    const valueNumberHistory = this.groups.map((group: Group) => (this.data[group['id']]['value'].slice(-1)[0]['y']))

    if (valueNumberHistory.length > 0) return Math.max(...valueNumberHistory)
    else return 0
  }

  editUsername() {
    this.accountService.editUsername(this.usernameInputValue).subscribe((response) => {
      this.router.navigateByUrl(`/profile/${this.usernameInputValue}`)
        .then(() => {
          location.reload()
        })
    })
  }

  editDescription(description: string) {
    this.accountService.editDescription(description).subscribe()
  }

  checkUsername() {
    this.accountService.checkUsername(this.usernameInputValue).subscribe((response: any) => {
      this.isUsernameAvailable = !response['exists']
    })
  }
}
