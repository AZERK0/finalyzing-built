import {Component, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {ChartComponent, upgradeAnnoTrigger$} from "../chart/chart.component";
import {QuoteComponent} from "../quote/quote.component";
import {DataApiService} from "../services/data-api.service";
import {AccountApiService} from "../services/account-api.service";
import { Subject, Subscription } from 'rxjs';
import {AppComponent} from "../app.component";
import * as PIXI from "pixi.js";

@Component({
  selector: 'app-technical', templateUrl: './technical.component.html', styleUrls: ['./technical.component.scss']
})
export class TechnicalComponent implements OnInit {

  @Input() data: { 'historical': any[], 'indiOnChart': any[], 'indiOutChart': any[] } = {
    'historical': [], 'indiOnChart': [], 'indiOutChart': []
  }
  indiPosition: ['indiOnChart', 'indiOutChart'] = ['indiOnChart', 'indiOutChart']
  period: 'day' | 'week' | 'month' = 'day'
  indiId: number = 0

  @ViewChild(ChartComponent) chartComponent: any;

  isSelected: boolean = false

  listenerFn: (() => void) | undefined;

  showPanel: any | null = null
  showPremiumPopup: boolean = false

  indiDict = [
    {code: 'SMA', name: 'Simple Moving Average', category: 'trend'},
    {code: 'EMA', name: 'Exponential Moving Average', category: 'trend'},
    {code: 'RSI', name: 'Relative Strength Index', category: 'momentum'},
    {code: 'MACD', name: 'Moving Average Convergence/Divergence', category: 'trend'},
    {code: 'BB', name: 'Bollinger Bands', category: 'volatility'},
    {code: 'PSAR', name: 'Parabolic SAR', category: 'trend'},
    {code: 'ATR', name: 'Average True Range', category: 'volatility'},
    {code: 'VWAP', name: 'Volume-Weighted Average Price', category: 'volume'},
    {code: 'ADX', name: 'Average Directional Index', category: 'trend'},
    {code: 'CCI', name: 'Commodity Channel Index', category: 'trend'},
    {code: 'STOCH', name: 'Stochastic', category: 'momentum'},
  ];
  indiSearchResults = this.indiDict

  annotations: any[] = []

  lastAnnoSelected: string = ""

  private editTriggerSubscription: Subscription;
  private isDragTriggerSubscription: Subscription;
  private isCreatingAnnoSubscription: Subscription;
  private updateAnnoTriggerSub: Subscription;
  creatingAnnoType: string = ''
  editingAnno: any = null
  isEditingAnno: boolean = false
  selectedBackgroundColor: string | undefined = '#000000'
  selectedBackgroundColorOp: number | undefined = 0
  selectedBorderColor: string | undefined = '#000000'
  selectedBorderColorOp: number | undefined = 0
  selectedBorderWidth: number = 1

  panEvent = new Subject<Event>();

  constructor(private service: DataApiService, public accountService: AccountApiService, public app: AppComponent, public quoteComponent: QuoteComponent, private renderer: Renderer2) {
    this.editTriggerSubscription = editTrigger$.subscribe((annotation) => {
      this.editingAnno = null
      for (let i = 0; i < this.annotations.length; i++) {
        if (this.annotations[i].isSelected) {
          this.editingAnno = this.annotations[i]
        }
      }
      if (annotation.styles != undefined) {
        if (annotation.styles.background) {
          this.selectedBackgroundColor = annotation.styles.background
          this.selectedBackgroundColorOp = annotation.styles.backOp
        } else {
          this.selectedBackgroundColor = undefined
          this.selectedBackgroundColorOp = undefined
        }
        if (annotation.styles.border) {
          this.selectedBorderColor = annotation.styles.border
          this.selectedBorderColorOp = annotation.styles.borderOp
        } else {
          this.selectedBorderColor = undefined
          this.selectedBorderColorOp = undefined
        }
      }
    });
    this.isDragTriggerSubscription = isDragTrigger$.subscribe((bool) => {
      this.chartComponent.isDraggingAnno = bool
    });
    this.isCreatingAnnoSubscription = isCreatingAnnoTrigger$.subscribe((bool: boolean) => {
      if (bool) {
        this.creatingAnnoType = ''
        this.lastAnnoSelected = ''
      }
    })
    this.updateAnnoTriggerSub = upgradeAnnoTrigger$.subscribe((bool: boolean) => {
      this.updateAnno(bool)
    });
  }

  ngOnInit(): void {
    this.listenerFn = this.renderer.listen('window', 'click', (e: any) => {
      if (e.target.className == "panel-background") {
        this.showPanel = null;
      }
    });

    this.loadData()
  }

  closePremiumPopup() {
    this.showPremiumPopup = false
  }

  loadData() {
    this.accountService.getData(this.quoteComponent.ticker).subscribe((response: any) => {
      this.indiPosition.forEach((position: 'indiOnChart' | 'indiOutChart') => {
        response[position].forEach((indi: any, index: number) => {
          let indiUrl: string = '/indicator?ticker=' + this.quoteComponent.ticker + '&indicator=' + indi['name']

          for (const key in indi['params']['params']) {
            indiUrl += `&${key}=${indi['params']['params'][key]}`
          }

          this.service.getIndicator(indiUrl, this.data['historical']).subscribe(response => {
            const items: string[] = Object.keys(response['data'][0]).filter(item => item !== 'x')

            this.indiId++

            if (response['onChart']) {
              indi['data'] = {
                'day': {
                  'normal': undefined,
                  'log': undefined
                },
                'week': {
                  'normal': undefined,
                  'log': undefined
                },
                'month': {
                  'normal': undefined,
                  'log': undefined
                },
              }

              indi['data'][this.chartComponent.period]['normal'] = []
              indi['data'][this.chartComponent.period]['log'] = []

              items.forEach((key, index) => {
                indi['data'][this.chartComponent.period]['normal'].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
                indi['data'][this.chartComponent.period]['log'].push(response['data'].map((a: any) => ({x: a['x'], y: Math.log(a[key])})))
              })
              this.data['indiOnChart'].push(indi)
              this.chartComponent.drawIndicator(index)

            }
            else {
              indi['data'] = {
                'day': undefined,
                'week': undefined,
                'month': undefined
              }

              indi['data'][this.chartComponent.period] = []
              items.forEach((key, index) => {
                indi['data'][this.chartComponent.period].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
              })

              this.data['indiOutChart'].push(indi)
              this.chartComponent.drawIndicatorOut(index)
            }
          });
        })
      })
    })
  }

  saveData() {
    const data = {
      indiOnChart: this.data['indiOnChart'].map((item: any) => {
        const { data, view, ...newItem } = item;
        return newItem;
      }),
      indiOutChart: this.data['indiOutChart'].map((item: any) => {
        const { data, view, app, grid, ...newItem } = item;
        return newItem;
      }),
    };
    this.accountService.saveData(this.quoteComponent.ticker, data).subscribe((response) => {
    })
  }

  HSLToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c: number = (1 - Math.abs(2 * l - 1)) * s;
    const x: number = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m: number = l - c / 2;
    let r: number = 0, g: number = 0, b: number = 0;

    if (0 <= h && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
      [r, g, b] = [x, 0, c];
    } else if (300 <= h && h < 360) {
      [r, g, b] = [c, 0, x];
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    const hexR: string = r.toString(16).padStart(2, '0');
    const hexG: string = g.toString(16).padStart(2, '0');
    const hexB: string = b.toString(16).padStart(2, '0');

    return `#${hexR}${hexG}${hexB}`;
  }

  changePeriod(period: 'day' | 'week' | 'month') {
    if (this.period != period) {
      this.chartComponent.candlestickDraws.body[this.chartComponent.period][this.chartComponent.chartType].visible = false
      this.chartComponent.candlestickDraws.line[this.chartComponent.period][this.chartComponent.chartType].visible = false
      this.chartComponent.candlestickDraws.volume[this.chartComponent.period][this.chartComponent.chartType].visible = false
      this.period = period
      this.chartComponent.period = period
      if (this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType] == undefined) {
        this.service.getHistorical(this.quoteComponent.ticker, period[0]).subscribe(response => {
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
          this.changeIndiPeriod()

          const YScale = this.chartComponent.updateYScale()
          if (this.chartComponent.view.y1 == YScale.highestPixel && this.chartComponent.view.y2 == YScale.lowestPixel) {
            upgradeAnnoTrigger$.next(false)
          }

          this.chartComponent.view.y1 = YScale.highestPixel
          this.chartComponent.view.y2 = YScale.lowestPixel

          this.chartComponent.newView()
          this.chartComponent.updateGrid()
        });
      } else if (this.chartComponent.candlestickDraws.body[this.chartComponent.period][this.chartComponent.chartType] == undefined) {
        this.chartComponent.actualData = this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType]
        this.data['historical'] = this.chartComponent.candlestickDatas[this.chartComponent.period]['normal']
        this.chartComponent.actualDataXVals = (this.chartComponent.actualData.map((a: any) => a['x']))
        this.chartComponent.changePeriod()
        this.chartComponent.drawCandlestick()
        this.changeIndiPeriod()
      } else {
        this.chartComponent.actualData = this.chartComponent.candlestickDatas[this.chartComponent.period][this.chartComponent.chartType]
        this.data['historical'] = this.chartComponent.candlestickDatas[this.chartComponent.period]['normal']
        this.chartComponent.actualDataXVals = (this.chartComponent.actualData.map((a: any) => a['x']))
        this.chartComponent.changePeriod()
        this.changeIndiPeriod()
        this.chartComponent.candlestickDraws.body[this.chartComponent.period][this.chartComponent.chartType].visible = true
        this.chartComponent.candlestickDraws.line[this.chartComponent.period][this.chartComponent.chartType].visible = true
        this.chartComponent.candlestickDraws.volume[this.chartComponent.period][this.chartComponent.chartType].visible = true
      }
      const YScale = this.chartComponent.updateYScale()
      if (this.chartComponent.view.y1 == YScale.highestPixel && this.chartComponent.view.y2 == YScale.lowestPixel) {
        upgradeAnnoTrigger$.next(false)
      }

      this.chartComponent.view.y1 = YScale.highestPixel
      this.chartComponent.view.y2 = YScale.lowestPixel

      this.chartComponent.newView()
      this.chartComponent.updateGrid()
    }
  }

  changeIndiPeriod() {
    for (let i = 0; i <= this.chartComponent.data['indiOnChart'].length-1; i++) {
      const indi = this.chartComponent.data['indiOnChart'][i]
      if (this.chartComponent.data['indiOnChart'][i]['data'][this.chartComponent.period][this.chartComponent.chartType] == undefined) {

        let indiUrl: string = '/indicator?ticker=' + this.quoteComponent.ticker + '&indicator=' + indi['name']

        for (const key in indi['params']['params']) {
          indiUrl += `&${key}=${indi['params']['params'][key]}`
        }

        this.service.getIndicator(indiUrl, this.data['historical']).subscribe(response => {
          const items: string[] = Object.keys(response['data'][0]).filter(item => item !== 'x')

          this.chartComponent.data['indiOnChart'][i]['data'][this.chartComponent.period]['normal'] = []
          this.chartComponent.data['indiOnChart'][i]['data'][this.chartComponent.period]['log'] = []
          items.forEach((key, index) => {
            this.chartComponent.data['indiOnChart'][i]['data'][this.chartComponent.period]['normal'].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
            this.chartComponent.data['indiOnChart'][i]['data'][this.chartComponent.period]['log'].push(response['data'].map((a: any) => ({x: a['x'], y: Math.log(a[key])})))
          })
          this.chartComponent.drawIndicator(i)
        })
      } else {
        this.chartComponent.drawIndicator(i)
      }
    }

    for (let i = 0; i <= this.chartComponent.data['indiOutChart'].length-1; i++) {
      const indi = this.chartComponent.data['indiOutChart'][i]
      if (this.chartComponent.data['indiOutChart'][i]['data'][this.chartComponent.period] == undefined) {

        let indiUrl: string = '/indicator?ticker=' + this.quoteComponent.ticker + '&indicator=' + indi['name']

        for (const key in indi['params']['params']) {
          indiUrl += `&${key}=${indi['params']['params'][key]}`
        }

        this.service.getIndicator(indiUrl, this.data['historical']).subscribe(response => {
          const items: string[] = Object.keys(response['data'][0]).filter(item => item !== 'x')

          this.chartComponent.data['indiOutChart'][i]['data'][this.chartComponent.period] = []
          items.forEach((key, index) => {
            this.chartComponent.data['indiOutChart'][i]['data'][this.chartComponent.period].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
          })
          this.chartComponent.drawIndicatorOut(i)
        })
      } else {
        this.chartComponent.drawIndicatorOut(i)
      }
    }
  }

  searchIndicator(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    let results: any[] = [];
    if (search.length == 0) {
      results = this.indiDict
    } else {
      for (const indicator of this.indiDict) {
        if (
          indicator.code.toLowerCase().includes(search.toLowerCase()) ||
          indicator.name.toLowerCase().includes(search.toLowerCase())
        ) {
          results.push(indicator);
        }
      }
    }
    this.indiSearchResults = results;
  }

  addIndicator(url: string) {
    if (this.app.isLoggedIn && (this.data['indiOnChart'].length + this.data['indiOutChart'].length < 3 || this.app.user['premium'])) {
      this.service.getIndicator(url + '&ticker=' + this.quoteComponent.ticker, this.data['historical']).subscribe(response => {
        const items: string[] = Object.keys(response['data'][0]).filter(item => item !== 'x')

        const color = this.HSLToHex((72 * this.indiId + 260) - (360 * (Math.floor((72 * this.indiId + 260) / 360))), 100, 50)
        this.indiId++

        let indi: { 'name': string, 'params': any, 'data': any } = {
          'name': items[0].split("_")[0],
          'params': {
            'params': response['params'], 'style': {
              'fill': true, 'backgroundColor': color, 'lineStyle': []
            }
          },
          'data': [],
        }

        if (response['onChart']) {
          indi['data'] = {
            'day': {
              'normal': undefined,
              'log': undefined
            },
            'week': {
              'normal': undefined,
              'log': undefined
            },
            'month': {
              'normal': undefined,
              'log': undefined
            },
          }

          indi['data'][this.chartComponent.period]['normal'] = []
          indi['data'][this.chartComponent.period]['log'] = []

          items.forEach((key, index) => {
            indi['data'][this.chartComponent.period]['normal'].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
            indi['data'][this.chartComponent.period]['log'].push(response['data'].map((a: any) => ({x: a['x'], y: Math.log(a[key])})))
            indi['params']['style']['lineStyle'].push({
              'id': key, 'type': 'line', 'borderColor': color, 'borderWidth': 2,
            })
          })
          // }


          this.data['indiOnChart'].push(indi)
          this.chartComponent.drawIndicator(this.data['indiOnChart'].length - 1)
        } else {
          indi['data'] = {
            'day': undefined,
            'week': undefined,
            'month': undefined
          }
          indi['data'][this.chartComponent.period] = []
          items.forEach((key, index) => {
            indi['data'][this.chartComponent.period].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
            indi['params']['style']['lineStyle'].push({
              'id': key, 'type': 'line', 'borderColor': color, 'borderWidth': 2,
            })
          })

          this.data['indiOutChart'].push(indi)
          this.chartComponent.drawIndicatorOut(this.data['indiOutChart'].length - 1)
        }

        this.saveData()
      })
    }
    else if (this.app.isLoggedIn && this.data['indiOnChart'].length + this.data['indiOutChart'].length >= 3) {
      this.showPremiumPopup = true
    }
    else {
      this.app.toggleLoginDialog()
    }
  }

  editIndicator(data: any, indi: any, position: 'indiOnChart' | 'indiOutChart', index: number) {
    indi['params']['style']['backgroundColor'] = data['style']['backgroundColor']
    indi['params']['style']['fill'] = data['style']['fill']

    for (const i in data['style']['lineStyle']) {
      for (const key in data['style']['lineStyle'][i]) {
        indi['params']['style']['lineStyle'][i][key] = data['style']['lineStyle'][i][key]
      }
    }

    if (JSON.stringify(data['params']) !== JSON.stringify(indi['params']['params'])) {
      let indiUrl: string = '/indicator?ticker=' + this.quoteComponent.ticker + '&indicator=' + indi['name']

      for (const key in data['params']) {
        indiUrl += `&${key}=${data['params'][key]}`
      }

      indi['params']['params'] = data['params']

      if (position == 'indiOnChart') {
        indi['data'] = {
          'day': {
            'normal': undefined,
            'log': undefined
          },
          'week': {
            'normal': undefined,
            'log': undefined
          },
          'month': {
            'normal': undefined,
            'log': undefined
          },
        }

        indi['data'][this.chartComponent.period]['normal'] = []
        indi['data'][this.chartComponent.period]['log'] = []

        this.service.getIndicator(indiUrl, this.data['historical']).subscribe(response => {
          const items: string[] = Object.keys(response['data'][0]).filter(item => item !== 'x')

          items.forEach((key, index) => {
            indi['data'][this.chartComponent.period]['normal'].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
            indi['data'][this.chartComponent.period]['log'].push(response['data'].map((a: any) => ({x: a['x'], y: Math.log(a[key])})))
          })
          this.chartComponent.drawIndicator(index)
        })
      } else {

        indi['data'] = {
          'day': undefined,
          'week': undefined,
          'month': undefined
        }

        indi['data'][this.chartComponent.period] = []

        this.service.getIndicator(indiUrl, this.data['historical']).subscribe(response => {
          const items: string[] = Object.keys(response['data'][0]).filter(item => item !== 'x')

          items.forEach((key, index) => {
            indi['data'][this.chartComponent.period].push(response['data'].map((a: any) => ({x: a['x'], y: a[key]})))
          })
          this.chartComponent.drawIndicatorOut(index)
        })

      }

    } else {
      if (position == 'indiOnChart') {
        this.chartComponent.drawIndicator(index)
      } else {
        this.chartComponent.drawIndicatorOut(index)
      }
    }

    this.saveData()

    this.showPanel = null
  }

  deleteIndicator(indi: any[], position: 'indiOnChart' | 'indiOutChart') {
    const index: number = this.data[position].indexOf(indi)

    if (position === 'indiOnChart')
      this.chartComponent.bufferCanvasVector.stage.removeChild(this.data[position][index].view)
    else {
      document.getElementById(`pixiIndicatorContainer-${index}`)!.parentElement!.parentElement!.remove()

      this.chartComponent.responsiveScale.splice(index + 1, 1)

      for (let i = index + 1; i < this.data['indiOutChart'].length; i++) {
        let wrapper = document.getElementById('charts')!.children[i]

        this.renderer.listen(wrapper.children[0], 'panstart', () => this.chartComponent.resizeIndiWrapper('start', i));
        this.renderer.listen(wrapper.children[0], 'panmove', (event) => this.chartComponent.resizeIndiWrapper(event, i));
        this.renderer.listen(wrapper.children[0], 'panend', () => this.chartComponent.resizeIndiWrapper('end', i));
        this.renderer.listen(wrapper.children[1], 'mousemove', (event) => this.chartComponent.cursorPosAxis(event, i - 1));

        document.getElementById(`pixiIndicatorContainer-${i}`)!.id = `pixiIndicatorContainer-${i - 1}`
      }
    }

    this.data[position].splice(index, 1)

    if (position === 'indiOutChart')
      this.chartComponent.resize()

    this.saveData()
  }

  createAnnotation(annotationType: string): void {
    if (this.app.isLoggedIn) {
      this.creatingAnnoType = annotationType
      if (this.lastAnnoSelected == "") {
        this.lastAnnoSelected = annotationType
      } else if (!this.annotations[this.annotations.length - 1].isAnnotationCreated) {
        if (this.lastAnnoSelected == annotationType) {
          this.annotations[this.annotations.length - 1].isAnnotationCreated = true
          this.annotations[this.annotations.length - 1].deleteAnnotation()
          this.lastAnnoSelected = ""
          this.creatingAnnoType = ""
          return
        }
      }

      let annotation
      if (annotationType === 'box') {
        annotation = new BoxAnnotation(this.chartComponent)
      } else if (annotationType === 'line') {
        annotation = new LineAnnotation(this.chartComponent)
      } else if (annotationType === 'fibo') {
        annotation = new FiboAnnotation(this.chartComponent)
      } else if (annotationType === 'var') {
        annotation = new VarAnnotation(this.chartComponent)
      } else if (annotationType === 'elliott') {
        annotation = new ElliottAnnotation(this.chartComponent)
      } else if (annotationType === 'elliott2') {
        annotation = new Elliott2Annotation(this.chartComponent)
      } else if (annotationType === 'channel') {
        annotation = new ChannelAnnotation(this.chartComponent)
      } else if (annotationType === 'long') {
        annotation = new LongAnnotation(this.chartComponent)
      } else if (annotationType === 'short') {
        annotation = new ShortAnnotation(this.chartComponent)
      }
      this.lastAnnoSelected = annotationType
      this.annotations.push(annotation)
      for (let i = 0; i <= this.annotations.length - 2; i++) {
        if (!this.annotations[i].isAnnotationCreated) {
          this.annotations[i].isAnnotationCreated = true
          this.annotations[i].deleteAnnotation()
          this.annotations.splice(this.annotations.indexOf(this.annotations[i]), 1)
        }
      }
    }
    else {
      this.app.toggleLoginDialog()
    }
  }

  updateAnno(bool: boolean) {
    if (!bool) {
      for (let i = 0; i < this.annotations.length; i++) {
        if (this.annotations[i].type == 'Fibonacci' || this.annotations[i].type == 'Measure' || this.annotations[i].type == 'Elliott (1-5)' || this.annotations[i].type == 'Elliott (A-C)') {
          this.annotations[i].update()
        }
      }
    } else {
      for (let i = 0; i < this.annotations.length; i++) {
        for (let e = 0; e < Object.values(this.annotations[i].annotationCoor).length; e++) {
          if (Object.keys(this.annotations[i].annotationCoor)[e].toString().includes('y')) {
            if (this.chartComponent.chartType == 'log') {
              const normalPixel = this.chartComponent.getValueForPixelYIndi(Object.values(this.annotations[i].annotationCoor)[e], this.chartComponent.candlestickDatas[this.chartComponent.period]['normal'].map((item: { c: any; }) => item.c), this.chartComponent.bufferCanvasVector.view.height)
              this.annotations[i].annotationCoor[Object.keys(this.annotations[i].annotationCoor)[e]] = this.chartComponent.getPixelForValueY(Math.log(normalPixel)) * this.chartComponent.responsiveScale[0][this.chartComponent.period]['normal'].y
            } else {
              const normalPixel = this.chartComponent.getValueForPixelYIndi(Object.values(this.annotations[i].annotationCoor)[e], this.chartComponent.candlestickDatas[this.chartComponent.period]['log'].map((item: { c: any; }) => item.c), this.chartComponent.bufferCanvasVector.view.height)
              this.annotations[i].annotationCoor[Object.keys(this.annotations[i].annotationCoor)[e]] = this.chartComponent.getPixelForValueY(Math.exp(normalPixel)) * (1 / this.chartComponent.responsiveScale[0][this.chartComponent.period]['normal'].y)
            }
          }
        }
        this.annotations[i].update()
      }
    }
  }

  deleteAnno() {
    this.annotations.splice(this.annotations.indexOf(this.editingAnno), 1)
    this.editingAnno.deleteAnnotation()
  }

  editAnno() {
    if (this.selectedBackgroundColor != undefined && this.selectedBackgroundColorOp != undefined) {
      this.editingAnno.styles.background = this.selectedBackgroundColor

      if (this.selectedBackgroundColorOp > 100) {
        this.selectedBackgroundColorOp = 100
      } else if (this.selectedBackgroundColorOp < 0) {
        this.selectedBackgroundColorOp = 0
      }
      this.editingAnno.styles.backOp = Math.floor(this.selectedBackgroundColorOp)
    }

    if (this.selectedBorderColor != undefined && this.selectedBorderColorOp != undefined) {
      this.editingAnno.styles.border = this.selectedBorderColor

      if (this.selectedBorderColorOp > 100) {
        this.selectedBorderColorOp = 100
      } else if (this.selectedBorderColorOp < 0) {
        this.selectedBorderColorOp = 0
      }
      this.editingAnno.styles.borderOp = Math.floor(this.selectedBorderColorOp)
    }
    this.editingAnno.isSelected = false
    this.editingAnno.update()
    this.editingAnno = null
  }


  test(txt: any) {
  }

}

export const editTrigger$ = new Subject<any>();
export const isDragTrigger$ = new Subject<boolean>();
export const isCreatingAnnoTrigger$ = new Subject<boolean>();

export class BoxAnnotation {
  private chart: any;
  private styles: any;
  private isSelected: boolean;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isDragging: boolean;
  private activePoint: string | null;
  private type: string = 'Rectangle';

  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.styles = {
      background: '#007bff',
      border: '#007bff',
      backOp: 20,
      borderOp: 100,
      width: 1
    };
    this.isSelected = false
    editTrigger$.next(null);
    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin: 0, yMin: 0, xMax: 0, yMax: 0}
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isDragging = false;
    this.activePoint = 'topRight';
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    mainDraw.lineStyle(1, this.styles.border,  this.styles.borderOp / 100, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin, this.annotationCoor.yMin)
    mainDraw.lineTo(this.annotationCoor.xMax, this.annotationCoor.yMin)
    mainDraw.lineTo(this.annotationCoor.xMax, this.annotationCoor.yMax)
    mainDraw.lineTo(this.annotationCoor.xMin, this.annotationCoor.yMax)
    mainDraw.lineTo(this.annotationCoor.xMin, this.annotationCoor.yMin)

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, this.styles.border,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }
    mainDraw2.addChild(mainDraw)

    const mainDraw3 = new PIXI.Graphics()
    mainDraw3.beginFill(this.styles.background, this.styles.backOp / 100)
    if (this.annotationCoor.xMax > this.annotationCoor.xMin) {
      if (this.annotationCoor.yMax > this.annotationCoor.yMin) {
        mainDraw3.drawRect(this.annotationCoor.xMin, this.annotationCoor.yMin, this.annotationCoor.xMax - this.annotationCoor.xMin, this.annotationCoor.yMax - this.annotationCoor.yMin)
      } else {
        mainDraw3.drawRect(this.annotationCoor.xMin, this.annotationCoor.yMax, this.annotationCoor.xMax - this.annotationCoor.xMin, this.annotationCoor.yMin - this.annotationCoor.yMax)
      }
    } else {
      if (this.annotationCoor.yMax > this.annotationCoor.yMin) {
        mainDraw3.drawRect(this.annotationCoor.xMax, this.annotationCoor.yMin, this.annotationCoor.xMin - this.annotationCoor.xMax, this.annotationCoor.yMax - this.annotationCoor.yMin)
      } else {
        mainDraw3.drawRect(this.annotationCoor.xMax, this.annotationCoor.yMax, this.annotationCoor.xMin - this.annotationCoor.xMax, this.annotationCoor.yMin - this.annotationCoor.yMax)
      }
    }
    mainDraw3.endFill()
    mainDraw2.addChild(mainDraw3)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
  }

  triggerEdit() {
    editTrigger$.next(this);
  }

  createAnnotation() {
    this.annotation = {};
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const { xMin, xMax, yMin, yMax } = this.annotationCoor;

    if (point === 'topLeft') {
      return { x: xMin, y: yMax };
    } else if (point === 'topRight') {
      return { x: xMax, y: yMax };
    } else if (point === 'bottomLeft') {
      return { x: xMin, y: yMin };
    } else if (point === 'bottomRight') {
      return { x: xMax, y: yMin };
    }

    else if (point === 'middleTop') {
      return { x: ((xMax + xMin) / 2), y: yMax };
    } else if (point === 'middleRight') {
      return { x: xMax, y: ((yMax + yMin) / 2) };
    } else if (point === 'middleBottom') {
      return { x: ((xMax + xMin) / 2), y: yMin };
    } else if (point === 'middleLeft') {
      return { x: xMin, y: ((yMax + yMin) / 2) };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === 'topLeft') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMax = y;
    } else if (point === 'topRight') {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMax = y;
    } else if (point === 'bottomLeft') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMin = y;
    } else if (point === 'bottomRight') {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMin = y;
    }

    else if (point === 'middleTop') {
      this.annotationCoor.yMax = y;
    } else if (point === 'middleRight') {
      this.annotationCoor.xMax = x;
    } else if (point === 'middleBottom') {
      this.annotationCoor.yMin = y;
    } else if (point === 'middleLeft') {
      this.annotationCoor.xMin = x;
    }
    this.isSelected = true
    editTrigger$.next(this);
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin += dx;
      this.annotationCoor.xMax += dx;
      this.annotationCoor.yMin += dy;
      this.annotationCoor.yMax += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        } else if (this.isSelected) {
          this.isSelected = false
          editTrigger$.next(null);
          this.update()
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update();
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin = mouseX
      this.annotationCoor.xMax = mouseX
      this.annotationCoor.yMin = mouseY
      this.annotationCoor.yMax = mouseY
      this.createAnnotation()
      this.isDragging = true;
      this.activePoint = 'topRight';
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
      isCreatingAnnoTrigger$.next(true)
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;

        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;

        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.isDragging = false;
      this.activePoint = null;
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'topLeft', end: 'topRight' },
      { start: 'topLeft', end: 'bottomLeft' },
      { start: 'topRight', end: 'bottomRight' },
      { start: 'bottomLeft', end: 'bottomRight' }
    ];

    if (this.annotation != null) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update();
          } else {
            this.update();
          }
          return;
        }
      }

    }
    if (this.isSelected) {
      this.update();
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class LineAnnotation {
  private chart: any;
  private styles: any;
  private isSelected: boolean;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isDragging: boolean;
  private activePoint: string | null;
  private type: string = 'Line';
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.styles = {
      border: '#007bff',
      borderOp: 100,
    };
    this.isSelected = false
    editTrigger$.next(null);
    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin: 0, yMin: 0, xMax: 0, yMax: 0}
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isDragging = false;
    this.activePoint = 'end';
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    mainDraw.lineStyle(1, this.styles.border,  this.styles.borderOp / 100, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin, this.annotationCoor.yMin)
    mainDraw.lineTo(this.annotationCoor.xMax, this.annotationCoor.yMax)

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['start', 'end']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, this.styles.border,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }

    mainDraw2.addChild(mainDraw)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  triggerEdit() {
    editTrigger$.next(this);
  }

  createAnnotation(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.annotation = {};
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const { xMin, xMax, yMin, yMax } = this.annotationCoor;
    if (point === 'start') {
      return { x: xMin, y: yMin };
    } else {
      return { x: xMax, y: yMax };
    }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === 'start') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMin = y;
    } else {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMax = y;
    }
    this.isSelected = true
    editTrigger$.next(this);
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin += dx;
      this.annotationCoor.xMax += dx;
      this.annotationCoor.yMin += dy;
      this.annotationCoor.yMax += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['start', 'end']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        } else if (this.isSelected) {
          this.isSelected = false
          editTrigger$.next(null);
          this.update()
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin = mouseX
      this.annotationCoor.xMax = mouseX
      this.annotationCoor.yMin = mouseY
      this.annotationCoor.yMax = mouseY
      this.createAnnotation(mouseX, mouseX, mouseY, mouseY, 'mouseX')
      this.isDragging = true;
      this.activePoint = 'end';
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
      isCreatingAnnoTrigger$.next(true)
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      if (this.activePoint) {

        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX
        const y = mouseY

        this.dragPoint(this.activePoint, x, y);
        this.update()
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const dx = event.movementX * panFactorX;
        const dy = event.movementY * panFactorY;

        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.isDragging = false;
      this.activePoint = null;
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'start', end: 'end' }
    ];

    if (this.annotation != null) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }

    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class VarAnnotation {
  private chart: any;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isSelected: boolean;
  private isDragging: boolean;
  private activePoint: string | null;
  private type: string = 'Measure';
  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'percent': any, 'decimal': any } = {
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
  }

  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin: 0, yMin: 0, xMax: 0, yMax: 0}
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isSelected = false
    editTrigger$.next(null);
    this.isDragging = false;
    this.activePoint = 'topRight';
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
    }
    this.update()
  }

  private update() {
    this.annotationPixi.destroy()

    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    const mainDraw3 = new PIXI.Graphics()
    let yMinValue = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMin)
    let yMaxValue = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMax)

    if (this.chart.chartType == 'log') {
      yMinValue = Math.exp(yMinValue)
      yMaxValue = Math.exp(yMaxValue)
    }

    if (this.annotationCoor.yMin < this.annotationCoor.yMax) {
      mainDraw.lineStyle(1, 0xff0059,  1, 0.5, true)
      mainDraw3.beginFill(0xff0059, 0.1)
      const style = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#ff0059',
        fontWeight: 'bold',
      });
      const text = new PIXI.Text(`${yMinValue.toFixed(3)} - ${yMaxValue.toFixed(3)} - ${((yMaxValue - yMinValue) / yMinValue * 100).toFixed(3)} %`, style)
      text.x = ((this.annotationCoor.xMax + this.annotationCoor.xMin) / 2)
      text.anchor.x = 0.5
      text.y = (this.annotationCoor.yMin) - (25 / this.chart.bufferCanvasVector.stage.scale.y)

      text.resolution = 2
      mainDraw.addChild(text)
      text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y

    } else {
      mainDraw.lineStyle(1, 0x007bff,  1, 0.5, true)
      mainDraw3.beginFill(0x007bff, 0.1)
      const style = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#007bff',
        fontWeight: 'bold',
      });
      const text = new PIXI.Text(`${yMinValue.toFixed(3)} - ${yMaxValue.toFixed(3)} - +${((yMaxValue - yMinValue) / yMinValue * 100).toFixed(3)} %`, style)
      text.x = ((this.annotationCoor.xMax + this.annotationCoor.xMin) / 2)
      text.anchor.x = 0.5
      text.y = (this.annotationCoor.yMax) - (25 / this.chart.bufferCanvasVector.stage.scale.y)

      text.resolution = 2
      mainDraw.addChild(text)
      text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y
    }

    mainDraw.moveTo(this.annotationCoor.xMin, this.annotationCoor.yMin)
    mainDraw.lineTo(this.annotationCoor.xMax, this.annotationCoor.yMin)
    mainDraw.lineTo(this.annotationCoor.xMax, this.annotationCoor.yMax)
    mainDraw.lineTo(this.annotationCoor.xMin, this.annotationCoor.yMax)
    mainDraw.lineTo(this.annotationCoor.xMin, this.annotationCoor.yMin)

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, 0x007bff,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }
    mainDraw2.addChild(mainDraw)

    if (this.annotationCoor.xMax > this.annotationCoor.xMin) {
      if (this.annotationCoor.yMax > this.annotationCoor.yMin) {
        mainDraw3.drawRect(this.annotationCoor.xMin, this.annotationCoor.yMin, this.annotationCoor.xMax - this.annotationCoor.xMin, this.annotationCoor.yMax - this.annotationCoor.yMin)
      } else {
        mainDraw3.drawRect(this.annotationCoor.xMin, this.annotationCoor.yMax, this.annotationCoor.xMax - this.annotationCoor.xMin, this.annotationCoor.yMin - this.annotationCoor.yMax)
      }
    } else {
      if (this.annotationCoor.yMax > this.annotationCoor.yMin) {
        mainDraw3.drawRect(this.annotationCoor.xMax, this.annotationCoor.yMin, this.annotationCoor.xMin - this.annotationCoor.xMax, this.annotationCoor.yMax - this.annotationCoor.yMin)
      } else {
        mainDraw3.drawRect(this.annotationCoor.xMax, this.annotationCoor.yMax, this.annotationCoor.xMin - this.annotationCoor.xMax, this.annotationCoor.yMin - this.annotationCoor.yMax)
      }
    }

    mainDraw3.endFill()
    mainDraw2.addChild(mainDraw3)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  createAnnotation() {
    this.annotation = {}
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const { xMin, xMax, yMin, yMax } = this.annotationCoor;

    if (point === 'topLeft') {
      return { x: xMin, y: yMax };
    } else if (point === 'topRight') {
      return { x: xMax, y: yMax };
    } else if (point === 'bottomLeft') {
      return { x: xMin, y: yMin };
    } else if (point === 'bottomRight') {
      return { x: xMax, y: yMin };
    }

    else if (point === 'middleTop') {
      return { x: ((xMax + xMin) / 2), y: yMax };
    } else if (point === 'middleRight') {
      return { x: xMax, y: ((yMax + yMin) / 2) };
    } else if (point === 'middleBottom') {
      return { x: ((xMax + xMin) / 2), y: yMin };
    } else if (point === 'middleLeft') {
      return { x: xMin, y: ((yMax + yMin) / 2) };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === 'topLeft') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMax = y;
    } else if (point === 'topRight') {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMax = y;
    } else if (point === 'bottomLeft') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMin = y;
    } else if (point === 'bottomRight') {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMin = y;
    }

    else if (point === 'middleTop') {
      this.annotationCoor.yMax = y;
    } else if (point === 'middleRight') {
      this.annotationCoor.xMax = x;
    } else if (point === 'middleBottom') {
      this.annotationCoor.yMin = y;
    } else if (point === 'middleLeft') {
      this.annotationCoor.xMin = x;
    }
    this.isSelected = true
    editTrigger$.next(this);

  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin += dx;
      this.annotationCoor.xMax += dx;
      this.annotationCoor.yMin += dy;
      this.annotationCoor.yMax += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin = mouseX
      this.annotationCoor.xMax = mouseX
      this.annotationCoor.yMin = mouseY
      this.annotationCoor.yMax = mouseY
      this.createAnnotation()
      this.isDragging = true;
      this.activePoint = 'topRight';
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
      isCreatingAnnoTrigger$.next(true)
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;

        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.isDragging = false;
      this.activePoint = null;
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'topLeft', end: 'topRight' },
      { start: 'topLeft', end: 'bottomLeft' },
      { start: 'topRight', end: 'bottomRight' },
      { start: 'bottomLeft', end: 'bottomRight' }
    ];

    if (this.annotation != null) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class FiboAnnotation {
  private chart: any;
  private styles: any;
  private annotationEdit: any;
  private annotations: any[] = [];
  private annotationPixi: any;
  private annotationCoor: any;
  private annotationDelete: any;
  private annotation: any;
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isDragging: boolean;
  private isSelected: boolean;
  private activePoint: string | null;
  private fiboLevels: any[] = [];
  private type: string = 'Fibonacci';
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.styles = {
      border: '#007bff',
      borderOp: 100,
    };
    this.annotations = [];
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin: 0, yMin: 0, xMax: 0, yMax: 0}
    this.annotationDelete = null;
    this.annotationEdit = null;
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isDragging = false;
    this.isSelected = false
    editTrigger$.next(null);;
    this.activePoint = 'end';
    this.fiboLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    const annoDiff = this.annotationCoor.yMax - this.annotationCoor.yMin
    mainDraw.lineStyle(1, this.styles.border,  this.styles.borderOp / 100, 0.5, true)
    for (let i = 0; i <= 6; i++) {
      mainDraw.moveTo(this.annotationCoor.xMin, this.annotationCoor.yMin + annoDiff * this.fiboLevels[i])
      mainDraw.lineTo(this.annotationCoor.xMax, this.annotationCoor.yMin + annoDiff * this.fiboLevels[i])

      const style = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 12,
        fill: '#ffffff',
        fontWeight: "bold"
      });
      const text = new PIXI.Text(this.fiboLevels[i].toString(), style)
      if (this.annotationCoor.xMax - this.annotationCoor.xMin > 0) {
        text.x = this.annotationCoor.xMax + (5 / this.chart.bufferCanvasVector.stage.scale.x)
      } else {
        text.x = this.annotationCoor.xMin + (5 / this.chart.bufferCanvasVector.stage.scale.x)

      }
      text.y = (this.annotationCoor.yMin + annoDiff * this.fiboLevels[i])
      text.anchor.y = 0.5
      text.resolution = 2
      mainDraw.addChild(text)
      text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y
    }

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, this.styles.border,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }

    mainDraw2.addChild(mainDraw)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  triggerEdit() {
    editTrigger$.next(this);
  }

  createAnnotation() {
    this.annotation = {}
    this.annotations.push(140)
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const { xMin, xMax, yMin, yMax } = this.annotationCoor;

    if (point === 'topLeft') {
      return { x: xMin, y: yMax };
    } else if (point === 'topRight') {
      return { x: xMax, y: yMax };
    } else if (point === 'bottomLeft') {
      return { x: xMin, y: yMin };
    } else if (point === 'bottomRight') {
      return { x: xMax, y: yMin };
    }
    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === 'topLeft') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMax = y;
    } else if (point === 'topRight') {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMax = y;
    } else if (point === 'bottomLeft') {
      this.annotationCoor.xMin = x;
      this.annotationCoor.yMin = y;
    } else if (point === 'bottomRight') {
      this.annotationCoor.xMax = x;
      this.annotationCoor.yMin = y;
    }
    this.isSelected = true
    editTrigger$.next(this);
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin += dx;
      this.annotationCoor.xMax += dx;
      this.annotationCoor.yMin += dy;
      this.annotationCoor.yMax += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotationCoor) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
    this.annotations = []
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        } else if (this.isSelected) {
          this.isSelected = false
          editTrigger$.next(null);
          this.update()
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin = mouseX
      this.annotationCoor.xMax = mouseX
      this.annotationCoor.yMin = mouseY
      this.annotationCoor.yMax = mouseY
      this.createAnnotation()
      this.isDragging = true;
      this.activePoint = 'topRight';
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
      isCreatingAnnoTrigger$.next(true)
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX
        const y = mouseY

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;

        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.isDragging = false;
      this.activePoint = null;
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'topLeft', end: 'topRight' },
      { start: 'topLeft', end: 'bottomLeft' },
      { start: 'topRight', end: 'bottomRight' },
      { start: 'bottomLeft', end: 'bottomRight' }
    ];

    if (this.annotations.length > 0) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class ElliottAnnotation {
  private chart: any;
  private styles: any;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private annotations: any[];
  private labels: any[];
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isDragging: boolean;
  private isSelected: boolean;
  private activePoint: string | null;
  private stepCreated: number
  private type: string = 'Elliott (1-5)';
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.styles = {
      border: '#007bff',
      borderOp: 100,
    };
    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {x0: undefined, y0: undefined, x1: undefined, y1: undefined, x2: undefined, y2: undefined, x3: undefined, y3: undefined, x4: undefined, y4: undefined, x5: undefined, y5: undefined}
    this.annotations = [];
    this.labels = [];
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isDragging = false;
    this.isSelected = false
    editTrigger$.next(null);
    this.activePoint = '1';
    this.stepCreated = 0
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    mainDraw.lineStyle(1, this.styles.border,  this.styles.borderOp / 100, 0.5, true)
    for (let i = 0; i <= 5; i++) {
      if (this.annotationCoor[`y${i}`] != undefined) {
        if (i > 0) {
          mainDraw.moveTo(this.annotationCoor[`x${i-1}`], this.annotationCoor[`y${i-1}`])
          mainDraw.lineTo(this.annotationCoor[`x${i}`], this.annotationCoor[`y${i}`])
        }
        const style = new PIXI.TextStyle({
          fontFamily: 'Montserrat',
          fontSize: 14,
          fill: '#ffffff',
          fontWeight: 'bold'
        });
        const text = new PIXI.Text(i.toString(), style)
        text.x = this.annotationCoor[`x${i}`]
        text.y = (this.annotationCoor[`y${i}`]) - (25 / this.chart.bufferCanvasVector.stage.scale.y)
        text.resolution = 2
        mainDraw.addChild(text)
        text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
        text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y
      }
    }

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['0', '1', '2', '3', '4', '5']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, this.styles.border,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }

    mainDraw2.addChild(mainDraw)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  triggerEdit() {
    editTrigger$.next(this);
  }

  createAnnotation() {
    this.annotation = {}
    this.annotations.push(140)
    this.labels.push(140)
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const {x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5} = this.annotationCoor

    if (point === '0') {
      return { x: x0, y: y0 };

    } else if (point === '1') {
      return { x: x1, y: y1 };

    } else if (point === '2') {
      return { x: x2, y: y2 };

    } else if (point === '3') {
      return { x: x3, y: y3 };

    } else if (point === '4') {
      return { x: x4, y: y4 };

    } else if (point === '5') {
      return { x: x5, y: y5 };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === '0') {
      this.annotationCoor.x0 = x;
      this.annotationCoor.y0 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '1') {
      this.annotationCoor.x1 = x;
      this.annotationCoor.y1 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '2') {
      this.annotationCoor.x2 = x;
      this.annotationCoor.y2 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '3') {
      this.annotationCoor.x3 = x;
      this.annotationCoor.y3 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '4') {
      this.annotationCoor.x4 = x;
      this.annotationCoor.y4 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '5') {
      this.annotationCoor.x5 = x;
      this.annotationCoor.y5 = y;
      this.isSelected = true
      editTrigger$.next(this);
    }
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.x0 += dx;
      this.annotationCoor.y0 += dy;
      this.annotationCoor.x1 += dx;
      this.annotationCoor.y1 += dy;
      this.annotationCoor.x2 += dx;
      this.annotationCoor.y2 += dy;
      this.annotationCoor.x3 += dx;
      this.annotationCoor.y3 += dy;
      this.annotationCoor.x4 += dx;
      this.annotationCoor.y4 += dy;
      this.annotationCoor.x5 += dx;
      this.annotationCoor.y5 += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
    this.annotations = []
    this.labels = []
    this.stepCreated = 6
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['0', '1', '2', '3', '4', '5']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.x0 = mouseX
      this.annotationCoor.y0 = mouseY
      this.createAnnotation()
      this.isDragging = true;
      this.activePoint = '1';
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
      isCreatingAnnoTrigger$.next(true)
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotations.length > 0) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;

        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.stepCreated += 1
      if (this.stepCreated >= 5) {
        if (this.stepCreated == 5) {
          isCreatingAnnoTrigger$.next(true)
        }
        this.isDragging = false;
        this.activePoint = null;
        this.update();
      } else if (this.stepCreated < 5) {
        this.annotation = null;
        this.isAnnotationCreated = false;
        this.isHover = false;
        this.isDragging = false;
        this.activePoint = `1`;
        this.createAnnotation();
        this.isDragging = true;
        this.activePoint = `${this.stepCreated+1}`;
      }
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: '0', end: '1' },
      { start: '1', end: '2' },
      { start: '2', end: '3' },
      { start: '3', end: '4' },
      { start: '4', end: '5' },
    ];

    if (this.annotations.length > 0) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class Elliott2Annotation {
  private chart: any;
  private styles: any;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private annotations: any[];
  private labels: any[];
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isDragging: boolean;
  private isSelected: boolean;
  private activePoint: string | null;
  private stepCreated: number
  private type: string = 'Elliott (A-C)';
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.styles = {
      border: '#007bff',
      borderOp: 100,
    };
    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {x0: undefined, y0: undefined, x1: undefined, y1: undefined, x2: undefined, y2: undefined, x3: undefined, y3: undefined}
    this.annotations = [];
    this.labels = [];
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isDragging = false;
    this.isSelected = false
    editTrigger$.next(null);;
    this.activePoint = '1';
    this.stepCreated = 0
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    const textes = ['0', 'a', 'b', 'c']

    mainDraw.lineStyle(1, this.styles.border,  this.styles.borderOp / 100, 0.5, true)
    for (let i = 0; i <= 3; i++) {
      if (this.annotationCoor[`y${i}`] != undefined) {
        if (i > 0) {
          mainDraw.moveTo(this.annotationCoor[`x${i-1}`], this.annotationCoor[`y${i-1}`])
          mainDraw.lineTo(this.annotationCoor[`x${i}`], this.annotationCoor[`y${i}`])
        }
        const style = new PIXI.TextStyle({
          fontFamily: 'Montserrat',
          fontSize: 14,
          fill: '#ffffff',
          fontWeight: 'bold'
        });
        const text = new PIXI.Text(textes[i], style)
        text.x = this.annotationCoor[`x${i}`]
        text.y = (this.annotationCoor[`y${i}`]) - (25 / this.chart.bufferCanvasVector.stage.scale.y)
        text.resolution = 2
        mainDraw.addChild(text)
        text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
        text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y
      }
    }

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['0', '1', '2', '3']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, this.styles.border,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }

    mainDraw2.addChild(mainDraw)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  triggerEdit() {
    editTrigger$.next(this);
  }

  createAnnotation() {
    this.annotation = {}
    this.annotations.push(140)
    this.labels.push(140)
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const {x0, y0, x1, y1, x2, y2, x3, y3} = this.annotationCoor

    if (point === '0') {
      return { x: x0, y: y0 };

    } else if (point === '1') {
      return { x: x1, y: y1 };

    } else if (point === '2') {
      return { x: x2, y: y2 };

    } else if (point === '3') {
      return { x: x3, y: y3 };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === '0') {
      this.annotationCoor.x0 = x;
      this.annotationCoor.y0 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '1') {
      this.annotationCoor.x1 = x;
      this.annotationCoor.y1 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '2') {
      this.annotationCoor.x2 = x;
      this.annotationCoor.y2 = y;
      this.isSelected = true
      editTrigger$.next(this);

    } else if (point === '3') {
      this.annotationCoor.x3 = x;
      this.annotationCoor.y3 = y;
      this.isSelected = true
      editTrigger$.next(this);
    }
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.x0 += dx;
      this.annotationCoor.y0 += dy;
      this.annotationCoor.x1 += dx;
      this.annotationCoor.y1 += dy;
      this.annotationCoor.x2 += dx;
      this.annotationCoor.y2 += dy;
      this.annotationCoor.x3 += dx;
      this.annotationCoor.y3 += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
    this.annotations = []
    this.labels = []
    this.stepCreated = 6
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['0', '1', '2', '3']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.x0 = mouseX
      this.annotationCoor.y0 = mouseY
      this.createAnnotation()
      this.isDragging = true;
      this.activePoint = '1';
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
      isCreatingAnnoTrigger$.next(true)
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotations.length > 0) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;

        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.stepCreated += 1
      if (this.stepCreated >= 3) {
        if (this.stepCreated == 3) {
          isCreatingAnnoTrigger$.next(true)
        }
        this.isDragging = false;
        this.activePoint = null;
        this.update();
      } else if (this.stepCreated < 3) {
        this.annotation = null;
        this.isAnnotationCreated = false;
        this.isHover = false;
        this.isDragging = false;
        this.activePoint = `1`;
        this.createAnnotation();
        this.isDragging = true;
        this.activePoint = `${this.stepCreated+1}`;
      }
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: '0', end: '1' },
      { start: '1', end: '2' },
      { start: '2', end: '3' },
    ];

    if (this.annotations.length > 0) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class ChannelAnnotation {
  private chart: any;
  private styles: any;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private annotations: any[];
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isSelected: boolean;
  private isDragging: boolean;
  private activePoint: string | null;
  private stepCreated: number
  private type: string = 'Channel';
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.styles = {
      border: '#007bff',
      borderOp: 100,
    };
    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin0: 0, yMin0: 0, xMax0: 0, yMax0: 0, xMin1: 0, yMin1: 0, xMax1: 0, yMax1: 0}
    this.annotations = [];
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isSelected = false
    editTrigger$.next(null);
    this.isDragging = false;
    this.activePoint = 'bottomRight';
    this.stepCreated = 0
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    mainDraw.lineStyle(1, this.styles.border,  this.styles.borderOp / 100, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin0, this.annotationCoor.yMin0)
    mainDraw.lineTo(this.annotationCoor.xMax0, this.annotationCoor.yMax0)
    mainDraw.moveTo(this.annotationCoor.xMin1, this.annotationCoor.yMin1)
    mainDraw.lineTo(this.annotationCoor.xMax1, this.annotationCoor.yMax1)
    mainDraw2.addChild(mainDraw)

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleBottom']) {
        const { x, y } = this.getPoint(point);
        mainDraw.lineStyle(1, this.styles.border,  1, 0.5, true)
        mainDraw.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }
    }
    mainDraw2.addChild(mainDraw)

    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  triggerEdit() {
    editTrigger$.next(this);
  }

  createAnnotation() {
    this.annotation = {}
    this.annotations.push(140)
    this.isSelected = true
    editTrigger$.next(this);
  }

  getPoint(point: string) {
    const { xMin0, yMin0, xMax0, yMax0, xMin1, yMin1, xMax1, yMax1 } = this.annotationCoor;

    if (point === 'topLeft') {
      return { x: xMin1, y: yMin1 };
    } else if (point === 'topRight') {
      return { x: xMax1, y: yMax1 };
    } else if (point === 'bottomLeft') {
      return { x: xMin0, y: yMin0 };
    } else if (point === 'bottomRight') {
      return { x: xMax0, y: yMax0 };
    } else if (point === 'middleTop') {
      return { x: ((xMin1 + xMax1) / 2), y: ((yMin1 + yMax1) / 2) };
    } else if (point === 'middleBottom') {
      return { x: ((xMax0 + xMin0) / 2), y: ((yMin0 + yMax0) / 2) };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number, dx: number, dy: number) {
    if (this.stepCreated == 1) {
      this.annotationCoor.xMax0 = x;
      this.annotationCoor.yMax0 = y;
    } else if (this.stepCreated == 2) {
      this.annotationCoor.xMin1 = this.annotationCoor.xMin0
      this.annotationCoor.xMax1 = this.annotationCoor.xMax0
      this.annotationCoor.yMax1 = y
      this.annotationCoor.yMin1 = this.annotationCoor.yMin0 + (y - this.annotationCoor.yMax0)

    } else if (this.stepCreated > 2) {
      if (point === 'topLeft') {
        this.annotationCoor.xMin0 = x;
        this.annotationCoor.xMin1 = x;
        this.annotationCoor.yMin1 = y;
        this.annotationCoor.yMin0 = y - (this.annotationCoor.yMax1 - this.annotationCoor.yMax0);
      } else if (point === 'topRight') {
        this.annotationCoor.xMax0 = x;
        this.annotationCoor.xMax1 = x;
        this.annotationCoor.yMax1 = y;
        this.annotationCoor.yMax0 = y - (this.annotationCoor.yMin1 - this.annotationCoor.yMin0);
      } else if (point === 'bottomLeft') {
        this.annotationCoor.xMin0 = x;
        this.annotationCoor.xMin1 = x;
        this.annotationCoor.yMin0 = y;
        this.annotationCoor.yMin1 = y + (this.annotationCoor.yMax1 - this.annotationCoor.yMax0);
      } else if (point === 'bottomRight') {
        this.annotationCoor.xMax0 = x;
        this.annotationCoor.xMax1 = x;
        this.annotationCoor.yMax0 = y;
        this.annotationCoor.yMax1 = y + (this.annotationCoor.yMin1 - this.annotationCoor.yMin0);
      } else if (point === 'middleTop') {
        this.annotationCoor.yMax1 += dy;
        this.annotationCoor.yMin1 += dy;
      } else if (point === 'middleBottom') {
        this.annotationCoor.yMax0 += dy;
        this.annotationCoor.yMin0 += dy;
      }
    }
    this.isSelected = true
    editTrigger$.next(this);
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin0 += dx;
      this.annotationCoor.xMax0 += dx;
      this.annotationCoor.xMin1 += dx;
      this.annotationCoor.xMax1 += dx;

      this.annotationCoor.yMin0 += dy;
      this.annotationCoor.yMax0 += dy;
      this.annotationCoor.yMin1 += dy;
      this.annotationCoor.yMax1 += dy;

      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number, dx: number, dy: number) {
    if (this.annotation) {
      this.setPoint(point, x, y, dx, dy);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
    this.annotations = []
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      if (this.stepCreated == 1) {
        this.isHover = true
      }
      for (const point of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        this.isSelected = false
        editTrigger$.next(null);
        this.update()
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin0 = mouseX
      this.annotationCoor.xMax0 = mouseX
      this.annotationCoor.yMin0 = mouseY
      this.annotationCoor.yMax0 = mouseY
      this.annotationCoor.xMin1 = mouseX
      this.annotationCoor.xMax1 = mouseX
      this.annotationCoor.yMin1 = mouseY
      this.annotationCoor.yMax1 = mouseY
      this.createAnnotation()
      this.isDragging = true;
      this.activePoint = 'bottomRight';
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
      const dx = event.movementX * panFactorX;
      const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
      const dy = event.movementY * panFactorY;
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y, dx, dy);
      } else {
        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      if (this.stepCreated >= 2) {
        this.isDragging = false;
        this.activePoint = null;
        this.stepCreated += 1
      }
    } else {
      if (this.stepCreated == 2 && this.annotation) {
        this.isAnnotationCreated = true;
        this.isDragging = false;
        this.activePoint = null;
        isCreatingAnnoTrigger$.next(true)
      }
      this.stepCreated += 1
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'topLeft', end: 'topRight' },
      { start: 'topLeft', end: 'bottomLeft' },
      { start: 'topRight', end: 'bottomRight' },
      { start: 'bottomLeft', end: 'bottomRight' }
    ];

    if (this.annotations.length > 0) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class LongAnnotation {
  private chart: any;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isSelected: boolean;
  private isDragging: boolean;
  private activePoint: string | null;
  private type: string = 'Long';

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'percent': any, 'decimal': any } = {
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
  }
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin0: 0, yMin0: 0, xMax0: 0, yMax0: 0, xMin1: 0, yMin1: 0, xMax1: 0, yMax1: 0}
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isSelected = false
    editTrigger$.next(null);
    this.isDragging = false;
    this.activePoint = 'topRight';
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
    if (this.isSelected || this.isHover) {
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    // bleu
    mainDraw.lineStyle(1, 0x007bff,  1, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin0, this.annotationCoor.yMin0)
    mainDraw.lineTo(this.annotationCoor.xMax0, this.annotationCoor.yMin0)
    mainDraw.lineTo(this.annotationCoor.xMax0, this.annotationCoor.yMax0)
    mainDraw.lineTo(this.annotationCoor.xMin0, this.annotationCoor.yMax0)
    mainDraw.lineTo(this.annotationCoor.xMin0, this.annotationCoor.yMin0)

    // rouge
    mainDraw.lineStyle(1, 0xff0059,  1, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin1, this.annotationCoor.yMin1)
    mainDraw.lineTo(this.annotationCoor.xMax1, this.annotationCoor.yMin1)
    mainDraw.lineTo(this.annotationCoor.xMax1, this.annotationCoor.yMax1)
    mainDraw.lineTo(this.annotationCoor.xMin1, this.annotationCoor.yMax1)
    mainDraw.lineTo(this.annotationCoor.xMin1, this.annotationCoor.yMin1)
    mainDraw2.addChild(mainDraw)

    const mainDraw3 = new PIXI.Graphics()
    mainDraw3.beginFill(0xff0059, 0.1)
    if (this.annotationCoor.xMax1 > this.annotationCoor.xMin1) {
      mainDraw3.drawRect(this.annotationCoor.xMin1, this.annotationCoor.yMin1, this.annotationCoor.xMax1 - this.annotationCoor.xMin1, this.annotationCoor.yMax1 - this.annotationCoor.yMin1)
    } else {
      mainDraw3.drawRect(this.annotationCoor.xMax1, this.annotationCoor.yMin1, this.annotationCoor.xMin1 - this.annotationCoor.xMax1, this.annotationCoor.yMax1 - this.annotationCoor.yMin1)
    }
    mainDraw3.endFill()

    mainDraw3.beginFill(0x007bff, 0.1)
    if (this.annotationCoor.xMax0 > this.annotationCoor.xMin0) {
      mainDraw3.drawRect(this.annotationCoor.xMin0, this.annotationCoor.yMax0, this.annotationCoor.xMax0 - this.annotationCoor.xMin0, this.annotationCoor.yMin0 - this.annotationCoor.yMax0)
    } else {
      mainDraw3.drawRect(this.annotationCoor.xMax0, this.annotationCoor.yMax0, this.annotationCoor.xMin0 - this.annotationCoor.xMax0, this.annotationCoor.yMin0 - this.annotationCoor.yMax0)
    }
    mainDraw3.endFill()

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        mainDraw3.lineStyle(1, 0x007bff,  1, 0.5, true)
        mainDraw3.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }


      let open = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMin1)
      let closeSl = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMax1)
      let closeTp = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMax0)
      if (this.chart.chartType == 'log') {
        open = Math.exp(open)
        closeSl = Math.exp(closeSl)
        closeTp = Math.exp(closeTp)
      }

      const style = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#007bff',
        fontWeight: 'bold',
      });
      const text = new PIXI.Text(`TP : Close = ${closeTp.toFixed(3)} Var = +${(closeTp - open).toFixed(3)} (+${((closeTp - open) / open * 100).toFixed(3)} %)`, style)
      text.x = ((this.annotationCoor.xMax0 + this.annotationCoor.xMin0) / 2)
      text.anchor.x = 0.5
      text.y = (this.annotationCoor.yMax0) - (25 / this.chart.bufferCanvasVector.stage.scale.y)

      text.resolution = 2
      mainDraw.addChild(text)
      text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y


      const style2 = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#ff0059',
        fontWeight: 'bold',
      });
      const text2 = new PIXI.Text(`SL : Close = ${closeSl.toFixed(3)} Var = ${(closeSl - open).toFixed(3)} (${((closeSl - open) / open * 100).toFixed(3)} %)`, style2)
      text2.x = ((this.annotationCoor.xMax0 + this.annotationCoor.xMin0) / 2)
      text2.anchor.x = 0.5
      text2.y = (this.annotationCoor.yMax1) + (25 / this.chart.bufferCanvasVector.stage.scale.y)

      text2.resolution = 2
      mainDraw.addChild(text2)
      text2.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text2.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y


      const style3 = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#ffffff',
        fontWeight: 'bold',
      });
      const text3 = new PIXI.Text(`Open = ${open.toFixed(3)} Ratio risk/reward = ${Math.abs((closeTp - open) / (closeSl - open)).toFixed(3)}`, style3)
      text3.x = ((this.annotationCoor.xMax0 + this.annotationCoor.xMin0) / 2)
      text3.anchor.x = 0.5
      text3.y = (this.annotationCoor.yMax0) - (50 / this.chart.bufferCanvasVector.stage.scale.y)

      text3.resolution = 2
      mainDraw.addChild(text3)
      text3.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text3.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y
    }


    mainDraw2.addChild(mainDraw3)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  createAnnotation() {
    this.annotation = {}
    this.isSelected = true
    editTrigger$.next(this);
    isCreatingAnnoTrigger$.next(true)
    this.update();
  }

  getPoint(point: string) {
    const { xMin0, yMin0, xMax0, yMax0, xMin1, yMin1, xMax1, yMax1 } = this.annotationCoor;

    if (point === 'topLeft') {
      return { x: xMin0, y: yMax0 };
    } else if (point === 'topRight') {
      return { x: xMax0, y: yMax0 };
    } else if (point === 'bottomLeft') {
      return { x: xMin0, y: yMax1 };
    } else if (point === 'bottomRight') {
      return { x: xMax0, y: yMax1 };
    } else if (point === 'middleTop') {
      return { x: ((xMin1 + xMax1) / 2), y: yMax0 };
    } else if (point === 'middleBottom') {
      return { x: ((xMax0 + xMin0) / 2), y: yMax1 };
    } else if (point === 'middleRight') {
      return { x: xMax0, y: yMin1 };
    } else if (point === 'middleLeft') {
      return { x: xMin0, y: yMin1 };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === 'middleTop') {
      if (y < this.annotationCoor.yMin0) {
        this.annotationCoor.yMax0 = y;
      } else {
        this.annotationCoor.yMax0 = this.annotationCoor.yMin1
      }
    } else if (point === 'middleRight') {
      this.annotationCoor.xMax0 = x;
      this.annotationCoor.xMax1 = x;
    } else if (point === 'middleBottom') {
      if (y > this.annotationCoor.yMin0) {
        this.annotationCoor.yMax1 = y;
      } else {
        this.annotationCoor.yMax1 = this.annotationCoor.yMin1
      }
    } else if (point === 'middleLeft') {
      this.annotationCoor.xMin0 = x;
      this.annotationCoor.xMin1 = x;
    }
    this.isSelected = true
    editTrigger$.next(this);
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin0 += dx;
      this.annotationCoor.xMax0 += dx;
      this.annotationCoor.yMin0 += dy;
      this.annotationCoor.yMax0 += dy;
      this.annotationCoor.xMin1 += dx;
      this.annotationCoor.xMax1 += dx;
      this.annotationCoor.yMin1 += dy;
      this.annotationCoor.yMax1 += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else if (this.isSelected) {
        if (this.isSelected) {
          this.isSelected = false
          editTrigger$.next(null);
          this.update()
        }
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin0 = mouseX
      this.annotationCoor.xMax0 = mouseX + (100 / this.chart.bufferCanvasVector.stage.scale.x)
      this.annotationCoor.yMin0 = mouseY
      this.annotationCoor.yMax0 = mouseY - (80 / this.chart.bufferCanvasVector.stage.scale.y)
      this.annotationCoor.xMin1 = mouseX
      this.annotationCoor.xMax1 = mouseX + (100 / this.chart.bufferCanvasVector.stage.scale.x)
      this.annotationCoor.yMin1 = mouseY
      this.annotationCoor.yMax1 = mouseY + (40 / this.chart.bufferCanvasVector.stage.scale.y)
      this.createAnnotation();
      this.activePoint = 'topRight';
      this.isAnnotationCreated = true;
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;
        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.isDragging = false;
      this.activePoint = null;
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'topLeft', end: 'topRight' },
      { start: 'topLeft', end: 'bottomLeft' },
      { start: 'topRight', end: 'bottomRight' },
      { start: 'bottomLeft', end: 'bottomRight' },
      { start: 'middleLeft', end: 'middleRight' }
    ];

    if (this.annotation != null) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update()
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}

export class ShortAnnotation {
  private chart: any;
  private annotation: any;
  private annotationPixi: any;
  private annotationCoor: any;
  private isAnnotationCreated: boolean;
  private isHover: boolean;
  private isSelected: boolean;
  private isDragging: boolean;
  private activePoint: string | null;
  private type: string = 'Short';

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'percent': any, 'decimal': any } = {
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
  }
  private onMouseDownHandler = (event: MouseEvent) => this.onMouseDown(event);
  private onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private onMouseUpHandler = (event: MouseEvent) => this.onMouseUp(event);
  private onHoverHandler = (event: MouseEvent) => this.onHover(event);
  private onWheelHandler = (event: MouseEvent) => this.onWheel(event);

  constructor(chart: any) {
    this.chart = chart;
    this.chart.chartWrapper.nativeElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.addEventListener('wheel', this.onWheelHandler);

    this.annotation = null;
    this.annotationPixi = new PIXI.Container()
    this.annotationCoor = {xMin0: 0, yMin0: 0, xMax0: 0, yMax0: 0, xMin1: 0, yMin1: 0, xMax1: 0, yMax1: 0}
    this.isAnnotationCreated = false;
    this.isHover = false;
    this.isSelected = false
    editTrigger$.next(null);
    this.isDragging = false;
    this.activePoint = 'topRight';
  }

  private onWheel(event: MouseEvent) {
    if (!this.isDragging && this.isSelected) {
      this.isSelected = false
      editTrigger$.next(null);
      this.update()
    }
    if (this.isSelected || this.isHover) {
      this.update()
    }
  }

  private update() {
    this.annotationPixi.destroy()
    const mainDraw = new PIXI.Graphics()
    const mainDraw2 = new PIXI.Container()
    mainDraw.lineStyle(1, 0xff0059,  1, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin0, this.annotationCoor.yMin0)
    mainDraw.lineTo(this.annotationCoor.xMax0, this.annotationCoor.yMin0)
    mainDraw.lineTo(this.annotationCoor.xMax0, this.annotationCoor.yMax0)
    mainDraw.lineTo(this.annotationCoor.xMin0, this.annotationCoor.yMax0)
    mainDraw.lineTo(this.annotationCoor.xMin0, this.annotationCoor.yMin0)

    mainDraw.lineStyle(1, 0x007bff,  1, 0.5, true)
    mainDraw.moveTo(this.annotationCoor.xMin1, this.annotationCoor.yMin1)
    mainDraw.lineTo(this.annotationCoor.xMax1, this.annotationCoor.yMin1)
    mainDraw.lineTo(this.annotationCoor.xMax1, this.annotationCoor.yMax1)
    mainDraw.lineTo(this.annotationCoor.xMin1, this.annotationCoor.yMax1)
    mainDraw.lineTo(this.annotationCoor.xMin1, this.annotationCoor.yMin1)
    mainDraw2.addChild(mainDraw)

    const mainDraw3 = new PIXI.Graphics()
    mainDraw3.beginFill(0x007bff, 0.1)
    if (this.annotationCoor.xMax1 > this.annotationCoor.xMin1) {
      mainDraw3.drawRect(this.annotationCoor.xMin1, this.annotationCoor.yMin1, this.annotationCoor.xMax1 - this.annotationCoor.xMin1, this.annotationCoor.yMax1 - this.annotationCoor.yMin1)
    } else {
      mainDraw3.drawRect(this.annotationCoor.xMax1, this.annotationCoor.yMin1, this.annotationCoor.xMin1 - this.annotationCoor.xMax1, this.annotationCoor.yMax1 - this.annotationCoor.yMin1)
    }
    mainDraw3.endFill()

    mainDraw3.beginFill(0xff0059, 0.1)
    if (this.annotationCoor.xMax0 > this.annotationCoor.xMin0) {
      mainDraw3.drawRect(this.annotationCoor.xMin0, this.annotationCoor.yMax0, this.annotationCoor.xMax0 - this.annotationCoor.xMin0, this.annotationCoor.yMin0 - this.annotationCoor.yMax0)
    } else {
      mainDraw3.drawRect(this.annotationCoor.xMax0, this.annotationCoor.yMax0, this.annotationCoor.xMin0 - this.annotationCoor.xMax0, this.annotationCoor.yMin0 - this.annotationCoor.yMax0)
    }
    mainDraw3.endFill()

    if (this.isSelected || this.isHover) {
      const xAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.x
      const yAdjusted = 6 / this.chart.bufferCanvasVector.stage.scale.y

      for (const point of ['middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        mainDraw3.lineStyle(1, 0x007bff,  1, 0.5, true)
        mainDraw3.drawRoundedRect(
          (x - xAdjusted),
          y - yAdjusted,
          xAdjusted * 2,
          yAdjusted * 2,
          17)
      }


      let open = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMin1)
      let closeSl = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMax1)
      let closeTp = this.chart.getValueForPixelY(this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y * this.annotationCoor.yMax0)
      if (this.chart.chartType == 'log') {
        open = Math.exp(open)
        closeSl = Math.exp(closeSl)
        closeTp = Math.exp(closeTp)
      }

      const style = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#ff0059',
        fontWeight: 'bold',
      });
      const text = new PIXI.Text(`SL : Close = ${closeTp.toFixed(3)} Var = -${(closeTp - open).toFixed(3)} (-${((closeTp - open) / open * 100).toFixed(3)} %)`, style)
      text.x = ((this.annotationCoor.xMax0 + this.annotationCoor.xMin0) / 2)
      text.anchor.x = 0.5
      text.y = (this.annotationCoor.yMax0) - (25 / this.chart.bufferCanvasVector.stage.scale.y)

      text.resolution = 2
      mainDraw.addChild(text)
      text.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y


      const style2 = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#007bff',
        fontWeight: 'bold',
      });
      const text2 = new PIXI.Text(`TP : Close = ${closeSl.toFixed(3)} Var = +${(-(closeSl - open)).toFixed(3)} (+${(-(closeSl - open) / open * 100).toFixed(3)} %)`, style2)
      text2.x = ((this.annotationCoor.xMax0 + this.annotationCoor.xMin0) / 2)
      text2.anchor.x = 0.5
      text2.y = (this.annotationCoor.yMax1) + (25 / this.chart.bufferCanvasVector.stage.scale.y)

      text2.resolution = 2
      mainDraw.addChild(text2)
      text2.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text2.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y


      const style3 = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fill: '#ffffff',
        fontWeight: 'bold',
      });
      const text3 = new PIXI.Text(`Open = ${open.toFixed(3)} Ratio risk/reward = ${Math.abs((closeSl - open) / (closeTp - open)).toFixed(3)}`, style3)
      text3.x = ((this.annotationCoor.xMax0 + this.annotationCoor.xMin0) / 2)
      text3.anchor.x = 0.5
      text3.y = (this.annotationCoor.yMax0) - (50 / this.chart.bufferCanvasVector.stage.scale.y)

      text3.resolution = 2
      mainDraw.addChild(text3)
      text3.scale.x = 1 / this.chart.bufferCanvasVector.stage.scale.x
      text3.scale.y = 1 / this.chart.bufferCanvasVector.stage.scale.y
    }


    mainDraw2.addChild(mainDraw3)
    this.annotationPixi = mainDraw2
    this.chart.bufferCanvasVector.stage.addChild(this.annotationPixi)
  }

  createAnnotation() {
    this.annotation = {}
    this.isSelected = true
    editTrigger$.next(this);
    isCreatingAnnoTrigger$.next(true)
    this.update();
  }

  getPoint(point: string) {
    const { xMin0, yMin0, xMax0, yMax0, xMin1, yMin1, xMax1, yMax1 } = this.annotationCoor;

    if (point === 'topLeft') {
      return { x: xMin0, y: yMax0 };
    } else if (point === 'topRight') {
      return { x: xMax0, y: yMax0 };
    } else if (point === 'bottomLeft') {
      return { x: xMin0, y: yMax1 };
    } else if (point === 'bottomRight') {
      return { x: xMax0, y: yMax1 };
    } else if (point === 'middleTop') {
      return { x: ((xMin1 + xMax1) / 2), y: yMax0 };
    } else if (point === 'middleBottom') {
      return { x: ((xMax0 + xMin0) / 2), y: yMax1 };
    } else if (point === 'middleRight') {
      return { x: xMax0, y: yMin1 };
    } else if (point === 'middleLeft') {
      return { x: xMin0, y: yMin1 };
    }

    return { x: null, y: null }
  }

  setPoint(point: string, x: number, y: number) {
    if (point === 'middleTop') {
      if (y < this.annotationCoor.yMin0) {
        this.annotationCoor.yMax0 = y;
      } else {
        this.annotationCoor.yMax0 = this.annotationCoor.yMin1
      }
    } else if (point === 'middleRight') {
      this.annotationCoor.xMax0 = x;
      this.annotationCoor.xMax1 = x;
    } else if (point === 'middleBottom') {
      if (y > this.annotationCoor.yMin0) {
        this.annotationCoor.yMax1 = y;
      } else {
        this.annotationCoor.yMax1 = this.annotationCoor.yMin1
      }
    } else if (point === 'middleLeft') {
      this.annotationCoor.xMin0 = x;
      this.annotationCoor.xMin1 = x;
    }
    this.isSelected = true
    editTrigger$.next(this);
  }

  dragAnnotation(dx: number, dy: number) {
    if (this.isAnnotationCreated) {
      this.annotationCoor.xMin0 += dx;
      this.annotationCoor.xMax0 += dx;
      this.annotationCoor.yMin0 += dy;
      this.annotationCoor.yMax0 += dy;
      this.annotationCoor.xMin1 += dx;
      this.annotationCoor.xMax1 += dx;
      this.annotationCoor.yMin1 += dy;
      this.annotationCoor.yMax1 += dy;
      this.update();
    }
  }

  dragPoint(point: string, x: number, y: number) {
    if (this.annotation) {
      this.setPoint(point, x, y);
      this.update();
    }
  }

  deleteAnnotation() {
    this.annotationPixi.destroy()
    this.chart.chartWrapper.nativeElement.removeEventListener('mousedown', this.onMouseDownHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mouseup', this.onMouseUpHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('mousemove', this.onHoverHandler);
    this.chart.chartWrapper.nativeElement.removeEventListener('wheel', this.onWheelHandler);
    this.isSelected = false
    isDragTrigger$.next(false)
    editTrigger$.next(null);
  }

  private onMouseDown(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    if (this.annotation && this.isAnnotationCreated) {
      for (const point of ['middleTop', 'middleRight', "middleBottom", 'middleLeft']) {
        const { x, y } = this.getPoint(point);
        if (this.isHoverPoint(mouseX, mouseY, x, y)) {
          this.isDragging = true;
          this.activePoint = point;
          isDragTrigger$.next(true)
          return;
        }
      }

      if (this.isHover) {
        this.isSelected = true
        editTrigger$.next(this);
        this.isDragging = true;
        isDragTrigger$.next(true)
        this.update()
      } else  {
        if (this.isSelected) {
          this.isSelected = false
          editTrigger$.next(null);
          this.update()
        }
      }
    } else if (!this.annotation && !this.isAnnotationCreated) {
      this.annotationCoor.xMin0 = mouseX
      this.annotationCoor.xMax0 = mouseX + (100 / this.chart.bufferCanvasVector.stage.scale.x)
      this.annotationCoor.yMin0 = mouseY
      this.annotationCoor.yMax0 = mouseY - (80 / this.chart.bufferCanvasVector.stage.scale.y)
      this.annotationCoor.xMin1 = mouseX
      this.annotationCoor.xMax1 = mouseX + (100 / this.chart.bufferCanvasVector.stage.scale.x)
      this.annotationCoor.yMin1 = mouseY
      this.annotationCoor.yMax1 = mouseY + (40 / this.chart.bufferCanvasVector.stage.scale.y)
      this.createAnnotation();
      this.activePoint = 'topRight';
      this.isAnnotationCreated = true;
    } else if (this.annotation && !this.isAnnotationCreated) {
      this.isAnnotationCreated = true;
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.annotation) {
      if (this.activePoint) {
        const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

        const x = mouseX;
        const y = mouseY;

        this.dragPoint(this.activePoint, x, y);
      } else {
        const panFactorX = ((this.chart.view.x2 - this.chart.view.x1) / this.chart.bufferCanvasVector.view.width) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
        const dx = event.movementX * panFactorX;
        const panFactorY = ((this.chart.view.y2 - this.chart.view.y1) / this.chart.bufferCanvasVector.view.height) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)
        const dy = event.movementY * panFactorY;
        this.dragAnnotation(dx, dy);
      }
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (this.isAnnotationCreated) {
      isDragTrigger$.next(false)
      this.isDragging = false;
      this.activePoint = null;
    }
  }

  private onHover(event: MouseEvent) {
    const mouseX = (this.chart.view.x1 + ((event.offsetX / (event.target! as HTMLElement).clientWidth) * (this.chart.view.x2 - this.chart.view.x1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].x)
    const mouseY = (this.chart.view.y1 + ((event.offsetY / (event.target! as HTMLElement).clientHeight) * (this.chart.view.y2 - this.chart.view.y1))) * (1 / this.chart.responsiveScale[0][this.chart.period][this.chart.chartType].y)

    const edgeSegments = [
      { start: 'topLeft', end: 'topRight' },
      { start: 'topLeft', end: 'bottomLeft' },
      { start: 'topRight', end: 'bottomRight' },
      { start: 'bottomLeft', end: 'bottomRight' },
      { start: 'middleLeft', end: 'middleRight' }
    ];

    if (this.annotation != null) {
      for (const segment of edgeSegments) {
        const startEdgePoint = segment.start;
        const endEdgePoint = segment.end;

        if (this.isHoverEdgeSegment(mouseX, mouseY, startEdgePoint, endEdgePoint)) {
          if (!this.isHover) {
            this.isHover = true;
            this.update();
          } else {
            this.update()
          }
          return;
        }
      }
    }
    if (this.isSelected) {
      this.update()
      this.isHover = false
      return;
    }
    if (this.isHover) {
      this.isHover = false;
      this.update();
    }
  }

  private isHoverPoint(x: number, y: number, pointX: number, pointY: number): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;
    return (
      x >= pointX - toleranceX &&
      x <= pointX + toleranceX &&
      y >= pointY - toleranceY &&
      y <= pointY + toleranceY
    );
  }

  private isHoverEdgeSegment(x: number, y: number, startEdgePoint: string, endEdgePoint: string): boolean {
    const toleranceX = 5 / this.chart.bufferCanvasVector.stage.scale.x;
    const toleranceY = 5 / this.chart.bufferCanvasVector.stage.scale.y;

    const startPoint = {
      x: this.getPoint(startEdgePoint).x,
      y: this.getPoint(startEdgePoint).y
    };

    const endPoint = {
      x: this.getPoint(endEdgePoint).x,
      y: this.getPoint(endEdgePoint).y
    };

    const minX = Math.min(startPoint.x, endPoint.x) - toleranceX;
    const maxX = Math.max(startPoint.x, endPoint.x) + toleranceX;
    const minY = Math.min(startPoint.y, endPoint.y) - toleranceY;
    const maxY = Math.max(startPoint.y, endPoint.y) + toleranceY;

    if (
      x >= minX && x <= maxX &&
      y >= minY && y <= maxY
    ) {
      const distance = Math.abs(
        (endPoint.y - startPoint.y) * x - (endPoint.x - startPoint.x) * y +
        endPoint.x * startPoint.y - endPoint.y * startPoint.x
      ) / Math.sqrt(
        Math.pow(endPoint.y - startPoint.y, 2) + Math.pow(endPoint.x - startPoint.x, 2)
      );

      return distance <= Math.max(toleranceX, toleranceY);
    }

    return false;
  }
}
