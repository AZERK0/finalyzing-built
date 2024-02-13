import {Component, OnInit, Renderer2, ViewChild} from '@angular/core';
import {AppComponent} from "../app.component";
import {TechnicalComponent} from "../technical/technical.component";
import {DataApiService} from "../services/data-api.service";
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from "@angular/platform-browser";
import * as moment from 'moment-timezone';
import {throttleTime} from "rxjs/operators";
import {fromEvent, Subscription} from 'rxjs';
import {AccountApiService} from "../services/account-api.service";

@Component({
  selector: 'app-quote',
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss']
})
export class QuoteComponent implements OnInit {
  openMenu: boolean = false
  userOpenMenu: boolean = false

  @ViewChild(TechnicalComponent) technicalComponent: any;

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

  ticker: string = 'AAPL.US'

  selectTab: string = 'technical'

  technicalData: { 'historical': any[], 'indiOnChart': any[], 'indiOutChart': any[] } = {
    'historical': [],
    'indiOnChart': [],
    'indiOutChart': []
  }
  lastUpdatePrice: number = 0

  fundamentalData: any = undefined
  exchangeDetails: any = []
  marketStatusDay: string = ""

  listenerFn: (() => void) | undefined;

  private loginTriggerSubscription: Subscription | undefined

  constructor(public service: DataApiService, private renderer: Renderer2, private route: ActivatedRoute, public router: Router, public appComponent: AppComponent, private titleService: Title, private accountService: AccountApiService) {
    this.route.params.subscribe(params => {
      this.ticker = params['ticker'];
    })
    this.titleService.setTitle(this.ticker + ' - Finalyzing');
  }

  ngOnInit(): void {
    if (this.appComponent.isLoggedIn === undefined) {
      this.loginTriggerSubscription = this.appComponent.loginTrigger$.subscribe(() => {
        if (!this.appComponent.isLoggedIn) {
          setInterval(() => {
            if (!this.appComponent.showLoginPopup) {
              this.appComponent.toggleLoginDialog();
            }
          }, 5 * 60 * 1000);
        }
      })
    }
    else {
      if (!this.appComponent.isLoggedIn) {
        setInterval(() => {
          if (!this.appComponent.showLoginPopup) {
            this.appComponent.toggleLoginDialog();
          }
        }, 5 * 60 * 1000);
      }
    }

    this.loginTriggerSubscription = this.appComponent.loginTrigger$.subscribe(() => {
      if (this.appComponent.isLoggedIn) {
        if (this.listenerFn) {
          this.listenerFn = undefined
        }
      }
    })

    let exchange = this.ticker.split('.')[1].toLowerCase();
    if (exchange === 'cc') {
      exchange = 'crypto'
    }

    const startTime = Date.now();

    this.service.getFundamental(this.ticker).subscribe((response: any) => {
      this.fundamentalData = response
      if (this.fundamentalData['General']['Type']=='Common Stock') {
        if (!this.fundamentalData['General']['LogoURL']) {
          document.getElementById('icon')!.style.display = 'none'
          document.getElementById('icon')!.parentNode!.textContent = this.ticker[0];
        }
      }

      if (exchange != 'crypto') {
        this.intlFormatObjs['currency'] = Intl.NumberFormat(this.getNavigatorLanguage(), {
          'style': 'currency',
          'currency': this.fundamentalData.General.CurrencyCode
        })
      } else {
        this.intlFormatObjs['currency'] = Intl.NumberFormat(this.getNavigatorLanguage(), {
          'style': 'currency',
          'currency': this.ticker.split('.')[0].split('-')[1]
        })
      }

      setTimeout(() => {
        this.technicalComponent.chartComponent.resize()
      }, 0);
    })

    this.service.getExchangeDetails(exchange).subscribe((response: any) => {
      response['TradingHours']['Open'] = this.convertUTCtoLocal(response['TradingHours']['OpenUTC'])
      response['TradingHours']['Close'] = this.convertUTCtoLocal(response['TradingHours']['CloseUTC'])

      const currentDateMilli = Date.now()
      const currentDate = new Date(currentDateMilli)
      const targetTime = new Date()

      targetTime.setHours(Number(response['TradingHours']["Open"].substring(0, 2)), Number(response['TradingHours']["Open"].substring(3, 5)), 0, 0)

      if (response.isOpen) {
        this.marketStatusDay = ""

      } else {
        const workingDaysList = response['TradingHours']["WorkingDays"].split(",")

        if (!workingDaysList.includes(new Date(currentDateMilli).toString().substring(0, 3))) {
          this.marketStatusDay = ", Mon."
        }

        if (currentDate > targetTime) {
          const nextIndexDay = workingDaysList.indexOf((new Date(currentDateMilli).toString().substring(0, 3))) + 1
          this.marketStatusDay = `, ${workingDaysList[nextIndexDay]}.`
        }
      }

      this.exchangeDetails = response
    })

    this.loadHistorical(startTime)

    let ws = new WebSocket(`wss://ws.eodhistoricaldata.com/ws/${exchange}?api_token=OeAFFmMliFG5orCUuwAKQ8l4WWFQ67YX`);

    fromEvent(ws, 'open').subscribe(() => {
      ws.send(`{"action": "subscribe", "symbols": "${this.ticker.split('.')[0]}"}`)
    });

    fromEvent(ws, 'message').subscribe((e: any) => {
      if (this.technicalData['historical'][0]) {
        const data = JSON.parse(e.data);
        const price = parseFloat(data['p'])

        if (price) {
          this.technicalData['historical'].slice(-1)[0]['c'] = price;

          if (price > this.technicalData['historical'].slice(-1)[0]['h']) {
            this.technicalData['historical'].slice(-1)[0]['h'] = price
          } else if (price < this.technicalData['historical'].slice(-1)[0]['l']) {
            this.technicalData['historical'].slice(-1)[0]['l'] = price
          }

          // if (this.technicalComponent.chartComponent.charts._results[0].chart && this.technicalComponent.chartComponent.charts._results[0].chart.scales['x'].max >= data['t']) {
          //   if (Math.abs(this.technicalComponent.chartComponent.charts._results[0].chart.scales['y'].getPixelForValue(this.lastUpdatePrice) - this.technicalComponent.chartComponent.charts._results[0].chart.scales['y'].getPixelForValue(price)) > 1 && !this.technicalComponent.chartComponent.isPanning && !this.technicalComponent.chartComponent.isZooming) {
          //     this.lastUpdatePrice = price
          //     this.technicalComponent.chartComponent.charts._results[0].update();
          //   }
          // }

          this.technicalComponent.chartComponent.updateYAxis()
        }
      }
    });

    fromEvent(ws, 'message').pipe(throttleTime(500)).subscribe(e => {
      if (this.technicalData['historical'][0]) {
        // this.technicalComponent.updateIndicators();
      }
    });
  }

  ngOnDestroy() {
    if (this.listenerFn) {
      this.listenerFn();
    }

    this.loginTriggerSubscription!.unsubscribe()
  }

  logoutScrollCheck(e: any) {
    if (this.appComponent.isLoggedIn === undefined) {
      this.loginTriggerSubscription = this.appComponent.loginTrigger$.subscribe(() => {
        if (!this.appComponent.isLoggedIn) {
          const quoteContent: any = e.target
          this.listenerFn = this.renderer.listen(quoteContent, 'scroll', (e: any) => {
            if (!this.appComponent.showLoginPopup && e.target.scrollTop > 200) {
              this.appComponent.loginCancelable = false
              this.appComponent.toggleLoginDialog();
              quoteContent.style.overflowY = 'hidden'
            }
          });
        }
      })
    }
    else {
      if (!this.appComponent.isLoggedIn) {
        const quoteContent: any = e.target
        this.listenerFn = this.renderer.listen(quoteContent, 'scroll', (e: any) => {
          if (!this.appComponent.showLoginPopup && e.target.scrollTop > 200) {
            this.appComponent.loginCancelable = false
            this.appComponent.toggleLoginDialog();
            quoteContent.style.overflowY = 'hidden'
          }
        });
      }
    }
  }

  loadHistorical(startTime: number) {
    this.service.getHistorical(this.ticker, 'd').subscribe(response => {
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

      this.technicalData['historical'] = data
      this.lastUpdatePrice = data.slice(-1)[0]['c']
    });
  }

  loadNews() {
    if (!this.fundamentalData['News']) {
      this.fundamentalData['News'] = undefined
      this.service.getNews(this.ticker, 0).subscribe(
        (response: any) => {
          this.fundamentalData['News'] = response
        },
        (error: any) => {
          this.fundamentalData['News'] = null
        }
      )
    }
  }

  createBillingPortalSession() {
    this.accountService.createBillingPortalSession().subscribe((response: any) => {
      window.location.href = response['billing_portal_session']
    })
  }

  protected readonly undefined = undefined;
}
