import {Component, ElementRef, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {Subject} from "rxjs";
import {throttleTime} from "rxjs/operators";
import * as PIXI from 'pixi.js';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'decimal': any } = {
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
  }

  @Input() data: { 'historical': any[], 'indiOnChart': any[], 'indiOutChart': any[] } = {
    'historical': [],
    'indiOnChart': [],
    'indiOutChart': []
  }
  @Input() period: 'day' | 'week' | 'month' = 'day'
  @Input() chartType: 'normal' | 'log' = 'normal'
  @Input() colorTheme: 'light' | 'dark' = 'dark'
  @Input() panOffset: number = 10
  colorPallet: {'dark': {[key: string]: string}, 'light': {[key: string]: string}} = {
    'dark': {
      'text': '#d9d9d9',
      'background': '#2A2A2A',
      'greenPrimary': '#1aff7e',
      'greenSecondary': '#0a331b',
      'redPrimary': '#ff1a45',
      'redSecondary': '#330a10',
    },
    'light': {
      'text': '#2A2A2A',
      'background': '#dad9d5',
      'greenPrimary': '#12b357',
      'greenSecondary': '#1aff7e',
      'redPrimary': '#b3122f',
      'redSecondary': '#ff1a45',
    }
  }
  xVals: number[] = []

  @ViewChild('chartArea', {static: false}) chartArea: any
  @ViewChild('chartWrapper', { static: true }) chartWrapper!: any;
  view: any = {}
  viewIndex: any = {}
  responsiveScale: any[] = [{
    'day': {
      'normal': {x: 1, y: 1, initWidth: 0, initHeight: 0},
      'log': {x: 1, y: 1, initWidth: 0, initHeight: 0}
    },
    'week': {
      'normal': {x: 1, y: 1, initWidth: 0, initHeight: 0},
      'log': {x: 1, y: 1, initWidth: 0, initHeight: 0}
    },
    'month': {
      'normal': {x: 1, y: 1, initWidth: 0, initHeight: 0},
      'log': {x: 1, y: 1, initWidth: 0, initHeight: 0}
    }
  }]
  candlestickDraws: any = {}
  candlestickDatas: any = {}
  pixiContainerGrids: any = undefined
  minValue: number = 0
  maxValue: number = 0
  maxVolume: number = 0
  minVolume: number = 0
  volumeList: any[] = []
  bufferCanvasVector: any = undefined
  bufferCanvasVectorVolume: any = undefined
  actualData: any[] = []
  actualDataXVals: any[] = []
  indiWrapperHeight: number[] = [0, 0]
  @ViewChild('xAxis', {static: false}) xAxis: any
  xAxisCtx: any

  panEvent = new Subject<Event>();

  isPanning: boolean = false
  isZooming: boolean = false
  isChangingIndiSize: boolean = false
  isDraggingAnno: boolean = false

  isLastCor: boolean = false
  lastCor: number = 0

  text: any = 0
  textWidth: any = 0

  constructor(private elRef: ElementRef, private renderer: Renderer2) {
    this.panEvent.pipe(
      throttleTime(10))
      .subscribe((e: any) => {
        this.pan(e.srcEvent)
      });
  }

  ngOnInit(): void {
    this.xVals = (this.data['historical'].map((a: any) => a['x']))

    this.bufferCanvasVector = new PIXI.Application({width: document.getElementById('chartWrapper')!.offsetWidth, height: document.getElementById('chartWrapper')!.offsetHeight, backgroundAlpha: 0})
    Object.assign(this.bufferCanvasVector.view.style, {position: 'absolute'});
    this.chartWrapper.nativeElement.appendChild(this.bufferCanvasVector.view);
    this.bufferCanvasVectorVolume = new PIXI.Application({width: document.getElementById('chartWrapper')!.offsetWidth, height: document.getElementById('chartWrapper')!.offsetHeight, backgroundAlpha: 0, antialias: true})
    Object.assign(this.bufferCanvasVectorVolume.view.style, {position: 'absolute'});
    this.chartWrapper.nativeElement.appendChild(this.bufferCanvasVectorVolume.view);

    this.actualData = this.data['historical']

    this.actualDataXVals = (this.actualData.map((a: any) => a['x']))

    this.candlestickDraws.body = {
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
    this.candlestickDraws.line = {
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
    this.candlestickDraws.volume = {
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

    this.candlestickDatas = {
      'day': {
        'normal': this.actualData,
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

    let filteredList  = [];
    for (let i = 0; i < this.actualData.length; i += 1) {
      const firstItem = this.actualData[i];
      if (firstItem) {
        const newData = {
          x: firstItem.x,
          o: Math.log(firstItem.o),
          c: Math.log(firstItem.c),
          h: Math.log(firstItem.h),
          l: Math.log(firstItem.l),
          v: firstItem.v
        };
        filteredList.push(newData);
      }
    }
    this.candlestickDatas['day']['log'] = filteredList

    if (this.actualData.length > 2500) {
      this.viewIndex = {
        x1: this.actualData.length - 501,
        x2: this.actualData.length - 1
      }
    } else {
      this.viewIndex = {
        x1: 0,
        x2: this.actualData.length -1
      }
    }

    const lValues = this.actualData.map((item: { l: any; }) => item.l);
    const hValues = this.actualData.map((item: { h: any; }) => item.h);
    this.volumeList = this.actualData.map((item: { v: any; }) => item.v);
    this.minValue = Math.min(...lValues);
    this.maxValue = Math.max(...hValues);
    this.maxVolume = Math.max(...this.volumeList);
    this.minVolume = Math.min(...this.volumeList);
  }

  ngAfterViewInit() {
    this.xAxis = this.xAxis.nativeElement
    this.xAxisCtx = this.xAxis.getContext('2d');

    setTimeout(() => {
      this.drawCandlestick()
      const newWidth = this.chartWrapper.nativeElement.offsetWidth
      const newHeight = this.chartWrapper.nativeElement.offsetHeight - (this.xAxis.height + 1)
      this.view = {
        x1: newWidth - (42 + this.panOffset),
        x2: newWidth + (3 + this.panOffset),
        y1: newHeight - 200,
        y2: newHeight + 10
      }
      this.resize()
    }, 0);
  }

  resize() {
    const newWidth = this.chartWrapper.nativeElement.offsetWidth
    const newHeight = this.chartWrapper.nativeElement.offsetHeight

    this.bufferCanvasVector.renderer.resize(newWidth, newHeight)
    this.bufferCanvasVectorVolume.renderer.resize(newWidth, newHeight)

    for (let period of ['day', 'week', 'month']) {
      for (let type of ['normal', 'log']) {
        if (this.responsiveScale[0][period][type].initWidth && this.responsiveScale[0][period][type].initHeight) {
          this.responsiveScale[0][period][type].x = this.bufferCanvasVector.renderer.width / this.responsiveScale[0][period][type].initWidth
          this.responsiveScale[0][period][type].y = this.bufferCanvasVector.renderer.height / this.responsiveScale[0][period][type].initHeight
        }
      }
    }

    for (let i = 0; i < this.data['indiOutChart'].length; i++) {
      let indicatorContainer = document.getElementById(`pixiIndicatorContainer-${i}`)!

      this.data['indiOutChart'][i].app.renderer.resize(indicatorContainer.offsetWidth, indicatorContainer.offsetHeight)

      let hud: any = document.getElementById(`hud-${i + 1}`)!
      hud.width = indicatorContainer.offsetWidth
      hud.height = indicatorContainer.offsetHeight

      this.responsiveScale[i + 1][this.period].x = this.data['indiOutChart'][i].app.renderer.width / this.responsiveScale[i + 1][this.period].initWidth
      this.responsiveScale[i + 1][this.period].y = this.data['indiOutChart'][i].app.renderer.height / this.responsiveScale[i + 1][this.period].initHeight
    }

    let charts: any = document.querySelector('#charts')!.children
    const yAxis = charts[0].children[1]
    yAxis.height = newHeight

    const YScale = this.updateYScale()
    this.view.y1 = YScale.highestPixel
    this.view.y2 = YScale.lowestPixel
    if (this.bufferCanvasVector.view.height - this.view.y2 < 4) {
      this.view.y2 = this.bufferCanvasVector.view.height
    }
    this.newView()
    this.updateGrid()
  }

  getPixelForValueX(a: any) {
    const firstValue = this.actualData[0]
    const lastValue = this.actualData[this.actualData.length-1]
    const DiffX = lastValue.x - firstValue.x
    return ((a - firstValue.x) / DiffX * this.bufferCanvasVector.view.width)
  }

  getValueForPixelX(a: any) {
    const DiffPixel = a / this.bufferCanvasVector.view.width
    const scaleValueDiff = this.actualData[this.actualData.length-1].x - this.actualData[0].x
    return this.actualData[0].x + (DiffPixel * scaleValueDiff)
  }

  getPixelForValueY(a: any) {
    const DiffY = this.maxValue - this.minValue
    return (this.bufferCanvasVector.view.height)-((a - this.minValue) / DiffY * (this.bufferCanvasVector.view.height))
  }

  getValueForPixelY(a: any) {
    const DiffY = this.maxValue - this.minValue
    return (this.maxValue)-(a / this.bufferCanvasVector.view.height * (DiffY))
  }

  getPixelForValueYIndi(a: any, data: any, height: number) {
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const DiffY = maxValue - minValue
    return (height)-((a - minValue) / DiffY * (height))
  }

  getValueForPixelYIndi(a: any, data: any, height: number) {
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const DiffY = maxValue - minValue
    return (maxValue)-(a / height * (DiffY))
  }

  drawCandlestick() {
    if (this.bufferCanvasVector) {
      const rectWidth = this.bufferCanvasVector.view.width / this.actualData.length / 2;

      this.candlestickDraws.body[this.period][this.chartType] = new PIXI.Container();
      this.candlestickDraws.line[this.period][this.chartType] = new PIXI.Container();
      this.candlestickDraws.volume[this.period][this.chartType] = new PIXI.Container();

      const greenLineStyle = { width: 1, color: this.colorPallet[this.colorTheme]['greenPrimary'], alpha: 1, native: true };
      const redLineStyle = { width: 1, color: this.colorPallet[this.colorTheme]['redPrimary'], alpha: 1, native: true };
      const greyLineStyle = { width: 1, color: "#969696", alpha: 1, native: true };

      const greenLines = new PIXI.Graphics();

      const greenBodies = new PIXI.Container();

      const greenVolume = new PIXI.Container();

      for (let i = 0; i < this.actualData.length; i++) {
        const XPixel = this.getPixelForValueX(this.actualData[i].x)

        // VOLUME
        const volumeBar = new PIXI.Graphics();

        volumeBar.beginFill(0x969696);
        greenVolume.addChild(volumeBar);

        const volumeValue = this.actualData[i].v; // Récupérer la valeur du volume pour cet élément
        const barHeight = (volumeValue / this.maxVolume) * (this.bufferCanvasVectorVolume.view.height);

        volumeBar.drawRect(XPixel + 2, this.bufferCanvasVectorVolume.view.height - barHeight, rectWidth, barHeight);
        volumeBar.endFill();

        //  BODY
        const rectangle = new PIXI.Graphics();

        if (this.actualData[i].c - this.actualData[i].o > 0) {
          rectangle.beginFill(this.colorPallet[this.colorTheme]['greenPrimary']);
          greenBodies.addChild(rectangle);
        } else {
          rectangle.beginFill(this.colorPallet[this.colorTheme]['redPrimary']);
          greenBodies.addChild(rectangle);
        }

        const rectX = XPixel + 2;
        const rectY = this.getPixelForValueY(Math.max(this.actualData[i].o, this.actualData[i].c));
        const rectHeight = Math.abs(this.getPixelForValueY(this.actualData[i].o) - this.getPixelForValueY(this.actualData[i].c));

        rectangle.drawRect(rectX, rectY, rectWidth, rectHeight);
        rectangle.endFill()

        // LINE
        const line = greenLines ;
        let lineStyle = this.actualData[i].c - this.actualData[i].o > 0 ? greenLineStyle : redLineStyle;

        if (this.actualData[i].h - this.actualData[i].l == 0) {
          lineStyle = greyLineStyle

          line.lineStyle(lineStyle.width, lineStyle.color, lineStyle.alpha, 0.5, lineStyle.native);

          line.moveTo(XPixel + 2 , this.getPixelForValueY(this.actualData[i].l));

          line.lineTo(XPixel + 2 + rectWidth , this.getPixelForValueY(this.actualData[i].h));
        }

        line.lineStyle(lineStyle.width, lineStyle.color, lineStyle.alpha, 0.5, lineStyle.native);

        line.moveTo(XPixel + 2 + (rectWidth / 2), this.getPixelForValueY(this.actualData[i].l));

        line.lineTo(XPixel + 2 + (rectWidth / 2), this.getPixelForValueY(this.actualData[i].h));
      }

      this.candlestickDraws.line[this.period][this.chartType].addChild(greenLines);
      this.candlestickDraws.body[this.period][this.chartType].addChild(greenBodies);
      this.candlestickDraws.volume[this.period][this.chartType].addChild(greenVolume);
      this.bufferCanvasVector.stage.addChild(this.candlestickDraws.body[this.period][this.chartType]);
      this.bufferCanvasVector.stage.addChild(this.candlestickDraws.line[this.period][this.chartType]);
      this.bufferCanvasVectorVolume.stage.addChild(this.candlestickDraws.volume[this.period][this.chartType]);

      this.responsiveScale[0][this.period][this.chartType] = {
        x: 1,
        y: 1,
        initWidth: this.bufferCanvasVector.renderer.width,
        initHeight: this.bufferCanvasVector.renderer.height
      }
    }
  }

  drawIndicator(index: number) {
    if (this.data['indiOnChart'][index].view) {
      this.data['indiOnChart'][index].view.destroy()
    }
    const indicatorLineGroup = new PIXI.Container();
    const indicatorLine = new PIXI.Graphics();

    for (let y = 0; y < this.data['indiOnChart'][index]['data'][this.period][this.chartType].length; y++) {
      indicatorLine.lineStyle(
        10, // Largeur de la ligne
        this.data['indiOnChart'][index].params.style.lineStyle[y].borderColor, // Couleur
        1, // Alpha
        0.5, // Alignment
        true // Native
      );
      const dataToDraw = this.data['indiOnChart'][index]['data'][this.period][this.chartType][y].filter((data: any) => {
        return this.actualDataXVals.includes(data['x']);
      })
      let isMovedTo = false
      for (let e = 0; e < dataToDraw.length; e++) {
        const xVal = this.getPixelForValueX(dataToDraw[e].x) + 2;
        let yVal = dataToDraw[e].y

        if (yVal != null) {
          yVal = this.getPixelForValueY(yVal)
          if (!isMovedTo) {
            indicatorLine.moveTo(xVal, yVal);
            isMovedTo = true
          } else {
            indicatorLine.lineTo(xVal, yVal);
          }
        }
      }
    }
    indicatorLineGroup.addChild(indicatorLine); // Ajout de la ligne au groupe
    this.data['indiOnChart'][index].view = indicatorLineGroup;
    this.data['indiOnChart'][index].view.scale.set(1 / this.responsiveScale[0][this.period][this.chartType].x, 1 / this.responsiveScale[0][this.period][this.chartType].y)
    this.bufferCanvasVector.stage.addChild(this.data['indiOnChart'][index].view)
  }

  drawIndicatorOut(index: number) {
    if (this.data['indiOutChart'][index].view) {
      this.data['indiOutChart'][index].view.destroy()
    } else {
      this.data['indiOutChart'][index].app = new PIXI.Application({
        width: this.bufferCanvasVector.view.width,
        height: 150,
        backgroundAlpha: 0
      });
    }

    let newIndicatorContainer = document.getElementById(`pixiIndicatorContainer-${index}`)!

    if (!newIndicatorContainer) {
      const indiChartWrapper = this.renderer.createElement('div');
      this.renderer.addClass(indiChartWrapper, 'indiChartWrapper');

      const separator = this.renderer.createElement('div');
      this.renderer.addClass(separator, 'separator');

      const handle = this.renderer.createElement('div');
      this.renderer.addClass(handle, 'handle');
      this.renderer.listen(handle, 'panstart', () => this.resizeIndiWrapper('start', index + 1));
      this.renderer.listen(handle, 'panmove', (event) => this.resizeIndiWrapper(event, index + 1));
      this.renderer.listen(handle, 'panend', () => this.resizeIndiWrapper('end', index + 1));

      const indiChart = this.renderer.createElement('div');
      this.renderer.addClass(indiChart, 'indiChart');

      newIndicatorContainer = this.renderer.createElement('div');
      this.renderer.setAttribute(newIndicatorContainer, 'id', 'pixiIndicatorContainer-' + index);
      this.renderer.addClass(newIndicatorContainer, 'chartWrapper');
      this.renderer.setStyle(newIndicatorContainer, 'height', '150px');
      this.renderer.listen(newIndicatorContainer, 'mousemove', (event) => this.cursorPosAxis(event, index));
      this.renderer.listen(newIndicatorContainer, 'wheel', (event) => this.zoom(event));
      this.renderer.listen(newIndicatorContainer, 'panmove', (event) => this.pan(event));
      this.renderer.listen(newIndicatorContainer, 'panend', () => {
        this.isLastCor = false;
        this.isPanning = false;
      });

      const hud = this.renderer.createElement('canvas');
      this.renderer.setAttribute(hud, 'id', 'hud-' + (index + 1));
      this.renderer.setAttribute(hud, 'width', String(this.chartWrapper.nativeElement.offsetWidth));
      this.renderer.setAttribute(hud, 'height', String(150));
      this.renderer.setStyle(hud, 'z-index', '1');

      const canvasYAxis = this.renderer.createElement('canvas');
      this.renderer.addClass(canvasYAxis, 'yAxis');
      this.renderer.setAttribute(canvasYAxis, 'width', '70');
      this.renderer.setAttribute(canvasYAxis, 'height', '150');

      this.renderer.appendChild(separator, handle);
      this.renderer.appendChild(indiChartWrapper, separator);
      this.renderer.appendChild(indiChart, newIndicatorContainer);
      this.renderer.appendChild(newIndicatorContainer, hud);
      this.renderer.appendChild(indiChart, canvasYAxis);
      this.renderer.appendChild(indiChartWrapper, indiChart);
      this.renderer.appendChild(this.chartArea.nativeElement, indiChartWrapper);

      this.responsiveScale[index + 1] = {
        'day': {x: 1, y: 1, initWidth: 0, initHeight: 0},
        'week': {x: 1, y: 1, initWidth: 0, initHeight: 0},
        'month': {x: 1, y: 1, initWidth: 0, initHeight: 0}
      }
    }

    this.responsiveScale[index + 1][this.period].initWidth = this.chartWrapper.nativeElement.offsetWidth
    this.responsiveScale[index + 1][this.period].initHeight = newIndicatorContainer.offsetHeight

    Object.assign(this.data['indiOutChart'][index].app.view.style, {position: 'absolute'});
    newIndicatorContainer.appendChild(this.data['indiOutChart'][index].app.view);

    this.resize()

    const indicatorLineGroup = new PIXI.Container();
    const indicatorLine = new PIXI.Graphics();

    for (let y = 0; y < this.data['indiOutChart'][index]['data'][this.period].length; y++) {
      indicatorLine.lineStyle(
        10, // Largeur de la ligne
        this.data['indiOutChart'][index].params.style.lineStyle[y].borderColor, // Couleur
        1, // Alpha
        0.5, // Alignment
        true // Native
      );
      const dataToDraw = this.data['indiOutChart'][index]['data'][this.period][y].filter((data: any) => {
        return this.actualDataXVals.includes(data['x']);
      })
      const dataToDrawMap = dataToDraw.map((item: { y: any; }) => item.y)
      let isMovedTo = false
      for (let e = 0; e < dataToDraw.length; e++) {
        const xVal = this.getPixelForValueX(dataToDraw[e].x) + 2;
        let yVal = dataToDraw[e].y

        if (yVal != null) {
          yVal = this.getPixelForValueYIndi(yVal, dataToDrawMap, this.data['indiOutChart'][index].app.view.height);
          if (!isMovedTo) {
            indicatorLine.moveTo(xVal, yVal);
            isMovedTo = true
          } else {
            indicatorLine.lineTo(xVal, yVal);
          }
        }
      }
    }
    indicatorLineGroup.addChild(indicatorLine); // Ajout de la ligne au groupe
    this.data['indiOutChart'][index].view = indicatorLineGroup;

    this.data['indiOutChart'][index].app.stage.addChild(this.data['indiOutChart'][index].view)
  }

  pan(e: any) {
    if (!this.isChangingIndiSize && !this.isDraggingAnno) {
      if (!this.isLastCor) {
        this.lastCor = e.srcEvent.x
        this.isLastCor = true
      }
      const panFactor = (this.view.x2 - this.view.x1) / this.bufferCanvasVector.view.width
      if (e.srcEvent.x - this.lastCor > 0) {
        this.view.x1 -= (e.srcEvent.x - this.lastCor) * panFactor
        this.view.x2 -= (e.srcEvent.x - this.lastCor) * panFactor

        if ((this.view.x1 + this.view.x2) / 2 < 2) {
          const diffX = this.view.x2 - this.view.x1
          this.view.x1 = 0 - (diffX / 2) + 2
          this.view.x2 = (diffX / 2) + 2
        }

      } else if (e.srcEvent.x - this.lastCor < 0) {
        this.view.x1 -= (e.srcEvent.x - this.lastCor) * panFactor
        this.view.x2 -= (e.srcEvent.x - this.lastCor) * panFactor

        if ((this.view.x1 + this.view.x2) / 2 > this.bufferCanvasVector.view.width + 2) {
          const diffX = this.view.x2 - this.view.x1
          this.view.x1 = this.bufferCanvasVector.view.width - (diffX / 2) + 2
          this.view.x2 = this.bufferCanvasVector.view.width + (diffX / 2) + 2
        }

      }
      const YScale = this.updateYScale()
      if (this.view.y1 == YScale.highestPixel && this.view.y2 == YScale.lowestPixel) {
        upgradeAnnoTrigger$.next(false)
      }

      this.view.y1 = YScale.highestPixel
      this.view.y2 = YScale.lowestPixel

      this.newView()
      this.updateGrid()
    }
    this.lastCor = e.srcEvent.x;
  }

  zoom(e: any) {
    if (!this.isDraggingAnno) {
      e.preventDefault()

      this.isZooming = true

      const zoomSens: number = (this.view.x2 - this.view.x1) * 0.1
      const farFromStart: number = e.x / this.bufferCanvasVector.view.width
      const deltaTime: number = this.getValueForPixelX(this.view.x2) - this.getValueForPixelX(this.view.x1)

      if (e.deltaY > 0) {
        if (deltaTime < 31536000000 * 20) {
          this.view.x1 -= (zoomSens * farFromStart)
          this.view.x2 += (zoomSens * (1 - farFromStart))
        }
      } else if (86400000 * 10 < deltaTime) {
        this.view.x1 += (zoomSens * farFromStart)
        this.view.x2 -= (zoomSens * (1 - farFromStart))
      }

      if (this.period == 'day') {
        this.candlestickDraws.body[this.period][this.chartType].visible = deltaTime < 31536000000 * 5;
      } else {
        this.candlestickDraws.body[this.period][this.chartType].visible = true
      }

      if ((this.view.x1 + this.view.x2) / 2 > this.bufferCanvasVector.view.width + 2) {
        const diffX = this.view.x2 - this.view.x1
        this.view.x1 = this.bufferCanvasVector.view.width - (diffX / 2) + 2
        this.view.x2 = this.bufferCanvasVector.view.width + (diffX / 2) + 2
      }

      if ((this.view.x1 + this.view.x2) / 2 < 2) {
        const diffX = this.view.x2 - this.view.x1
        this.view.x1 = 0 - (diffX / 2) + 2
        this.view.x2 = (diffX / 2) + 2
      }

      const YScale = this.updateYScale()
      upgradeAnnoTrigger$.next(false)

      this.view.y1 = YScale.highestPixel
      this.view.y2 = YScale.lowestPixel
      this.newView()
      this.updateGrid()
      this.isZooming = false
    }
  }

  newView(x1: number = this.view.x1, x2: number = this.view.x2, y1: number = this.view.y1, y2: number = this.view.y2) {
    const scaleX = this.bufferCanvasVector.view.width / (x2 - x1);
    const scaleY = this.bufferCanvasVector.view.height / (y2 - y1);

    this.bufferCanvasVector.stage.scale.set(scaleX * this.responsiveScale[0][this.period][this.chartType].x, scaleY * this.responsiveScale[0][this.period][this.chartType].y);
    this.bufferCanvasVector.stage.position.set(-x1 * scaleX, -y1 * scaleY);

    const YScaleIndicator = this.updateYScaleIndicator(this.volumeList)

    const min = Math.floor(this.getPixelForValueYIndi(YScaleIndicator.lowestValue, this.volumeList, this.bufferCanvasVectorVolume.view.height)) + 1
    const max = Math.floor(this.getPixelForValueYIndi(YScaleIndicator.highestValue, this.volumeList, this.bufferCanvasVectorVolume.view.height)) - 3
    const scaleYVolume = (this.bufferCanvasVectorVolume.view.height * 0.1) / (min - max)

    this.bufferCanvasVectorVolume.stage.scale.set(scaleX * this.responsiveScale[0][this.period][this.chartType].x, scaleYVolume * this.responsiveScale[0][this.period][this.chartType].y)
    this.bufferCanvasVectorVolume.stage.position.set(-x1 * scaleX, this.bufferCanvasVector.view.height - (this.bufferCanvasVectorVolume.view.height * scaleYVolume))

    for (let y = 0; y < this.data['indiOutChart'].length; y++) {
      const scaleYIndi = this.data['indiOutChart'][y].app.view.height / (this.data['indiOutChart'][y].minPx - this.data['indiOutChart'][y].maxPx)
      this.data['indiOutChart'][y].app.stage.scale.set(scaleX * this.responsiveScale[y + 1][this.period].x, scaleYIndi * this.responsiveScale[y + 1][this.period].y)
      this.data['indiOutChart'][y].app.stage.position.set(-x1 * scaleX, -this.data['indiOutChart'][y].maxPx * scaleYIndi)
    }
  }

  updateYScale() {
    let minIndex = Math.floor((this.view.x1 - 2) / this.bufferCanvasVector.view.width * this.actualData.length-1)
    let maxIndex = Math.floor((this.view.x2 - 1) / this.bufferCanvasVector.view.width * this.actualData.length-1)
    if (this.view.x1 < 0) {
      minIndex = 0
    }
    if (this.view.x2 > this.bufferCanvasVector.view.width) {
      maxIndex = this.actualData.length
    }

    if (this.period == 'day') {
      this.updateVisibleData(minIndex, maxIndex)
    }

    const slice = this.actualData.slice(minIndex, maxIndex)
    let lowestValue = Math.min(...slice.map((a: any) => a['l']))
    let highestValue = Math.max(...slice.map((a: any) => a['h']))

    this.updateYAxis()
    let lowestPixel = this.getPixelForValueY(lowestValue)
    let highestPixel = this.getPixelForValueY(highestValue)

    const diffY = lowestPixel - highestPixel

    lowestPixel += (diffY * 0.1)
    highestPixel -= (diffY * 0.07)

    lowestValue = this.getValueForPixelY(lowestPixel)
    highestValue = this.getValueForPixelY(highestPixel)

    return { highestPixel, lowestPixel, highestValue, lowestValue }
  }

  updateYScaleIndicator(data: any) {
    let minIndex = Math.floor((this.view.x1 - 2) / this.bufferCanvasVector.view.width * data.length-1)
    let maxIndex = Math.floor((this.view.x2 - 1) / this.bufferCanvasVector.view.width * data.length-1)
    if (this.view.x1 < 0) {
      minIndex = 0
    }
    if (this.view.x2 > this.bufferCanvasVector.view.width) {
      maxIndex = data.length-1
    }
    const slice = data.slice(minIndex, maxIndex)
    const lowestValue = Math.min(...slice)
    const highestValue = Math.max(...slice)

    return { lowestValue, highestValue }
  }

  updateVisibleData(minIndex: number, maxIndex: number) {
    if (minIndex < this.viewIndex.x1 || maxIndex > this.viewIndex.x2) {
      if (minIndex - 500 >= 0) {
        this.viewIndex.x1 = minIndex - 500
      } else {
        this.viewIndex.x1 = 0
      }
      if (maxIndex + 500 <= this.actualData.length-1) {
        this.viewIndex.x2 = maxIndex + 500
      } else {
        this.viewIndex.x2 = this.actualData.length-1
      }
      for (let i = 0; i < this.candlestickDraws.volume[this.period][this.chartType].children[0].children.length; i++) {
        const child = this.candlestickDraws.volume[this.period][this.chartType].children[0].children[i];
        const child2 = this.candlestickDraws.body[this.period][this.chartType].children[0].children[i];

        child.visible = (i >= this.viewIndex.x1 && i <= this.viewIndex.x2);
        child2.visible = (i >= this.viewIndex.x1 && i <= this.viewIndex.x2);
      }
    }
  }

  updateYAxis() {
    let charts: any = document.querySelector('#charts')!.children

    const yAxis = charts[0].children[1]
    const yAxisCtx = yAxis.getContext('2d');
    yAxisCtx.font = '12px Montserrat';
    yAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['text'];
    yAxisCtx.clearRect(0, 0, yAxis.width, yAxis.height)

    const height = yAxisCtx.canvas.offsetHeight
    const totalY = Math.floor(height / 40)

    const indicesY: any[] = [];
    for (let i = 0; i < totalY; i++) {
      const currentPx = height - ((height / totalY) * i)
      const currentMs = this.getValueForPixelY(this.view.y1 + (this.view.y2 - this.view.y1) * (currentPx / this.bufferCanvasVector.view.height));
      indicesY.push({
        x: currentPx,
        y: currentMs
      });
    }
    indicesY.splice(0, 1)

    indicesY.forEach((indice: any) => {
      let text = (indice.y).toFixed(2).toString()
      if (this.chartType == 'log') {
        text = Math.exp(indice.y).toFixed(2).toString()
      }

      yAxisCtx.fillText(text, 7, indice.x);
    })

    const r = 5;
    const h = 30;
    const w = 70 - 4;
    const x = 2;
    const y = (-this.view.y1 + this.getPixelForValueY(this.actualData[this.actualData.length-1].c)) * (this.bufferCanvasVector.stage.scale.y * (1 / this.responsiveScale[0][this.period][this.chartType].y)) - h / 2

    yAxisCtx.beginPath();
    yAxisCtx.moveTo(x + r, y);
    yAxisCtx.arcTo(x + w, y, x + w, y + h, r);
    yAxisCtx.arcTo(x + w, y + h, x, y + h, r);
    yAxisCtx.arcTo(x, y + h, x, y, r);
    yAxisCtx.arcTo(x, y, x + w, y, r);
    yAxisCtx.closePath();
    yAxisCtx.fillStyle = this.actualData[this.actualData.length-1].c > this.actualData[this.actualData.length-1].o ? this.colorPallet[this.colorTheme]['greenSecondary'] : this.colorPallet[this.colorTheme]['redSecondary']
    yAxisCtx.fill();
    yAxisCtx.strokeStyle = this.actualData[this.actualData.length-1].c > this.actualData[this.actualData.length-1].o ? this.colorPallet[this.colorTheme]['greenPrimary'] : this.colorPallet[this.colorTheme]['redPrimary']
    yAxisCtx.stroke()
    yAxisCtx.fillStyle = this.actualData[this.actualData.length-1].c > this.actualData[this.actualData.length-1].o ? this.colorPallet[this.colorTheme]['greenPrimary'] : this.colorPallet[this.colorTheme]['redPrimary']
    yAxisCtx.font = 'normal 900 12px Montserrat';
    yAxisCtx.fillText(this.candlestickDatas[this.period]['normal'][this.candlestickDatas[this.period]['normal'].length - 1].c.toFixed(2).toString(), 7, y + h / 2)

    this.updateGrid()

    for (let y = 0; y < this.data['indiOutChart'].length; y++) {
      let min = 0
      let max = 0
      let YListMin = []
      let YListMax = []
      for (let e = 0; e < this.data['indiOutChart'][y]['data'][this.period].length; e++) {
        const YList = this.data['indiOutChart'][y]['data'][this.period][e].map((item: { y: any; }) => item.y)
        const YScaleIndicator = this.updateYScaleIndicator(YList)
        if (e == 0) {
          YListMin = YList
          YListMax = YList
          min = YScaleIndicator.lowestValue
          max = YScaleIndicator.highestValue
        } else {
          if (YScaleIndicator.lowestValue < min) {
            YListMin = YList
            min = YScaleIndicator.lowestValue
          }
          if (YScaleIndicator.highestValue > max) {
            YListMax = YList
            max = YScaleIndicator.highestValue
          }
        }
      }

      let chart = charts[y + 1].children[1]
      const yAxis = chart.children[1]
      yAxis.height = this.data['indiOutChart'][y].app.view.height
      const yAxisCtx = yAxis.getContext('2d');
      yAxisCtx.font = '12px Montserrat';
      yAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['text'];
      yAxisCtx.clearRect(0, 0, yAxis.width, yAxis.height)
      const yDiff = max - min
      const totalYAxisText = Math.floor(yAxis.height / 40)
      for (let i = 0; i <= totalYAxisText; i++) {
        const DiffPixel = (yAxis.height / (totalYAxisText + 1) + (yAxis.height / (totalYAxisText + 1) * i)) / yAxis.height
        yAxisCtx.fillText((min + (DiffPixel * yDiff)).toFixed(2).toString(), 7, yAxis.height - (yAxis.height / (totalYAxisText + 1) + (yAxis.height / (totalYAxisText + 1) * i)))
      }

      this.data['indiOutChart'][y].min = min
      this.data['indiOutChart'][y].max = max
      min = Math.floor(this.getPixelForValueYIndi(min, YListMin, this.data['indiOutChart'][y].app.view.height)) + 5
      max = Math.floor(this.getPixelForValueYIndi(max, YListMax, this.data['indiOutChart'][y].app.view.height)) - 5
      this.data['indiOutChart'][y].minPx = min
      this.data['indiOutChart'][y].maxPx = max
    }

    this.xAxis.width = this.xAxis.offsetWidth;
    const width = this.xAxis.width
    const totalX = Math.floor(width / 100)

    const indices: any[] = [];
    for (let i = 0; i < totalX; i++) {
      const currentPx = width - ((width / totalX) * i)
      const currentMs = this.getValueForPixelX(this.view.x1 + (this.view.x2 - this.view.x1) * (currentPx / this.bufferCanvasVector.view.width) - 2);
      indices.push({
        x: currentPx,
        y: currentMs
      });
    }
    indices.splice(0, 1)

    this.xAxisCtx.font = '12px Montserrat';
    this.xAxisCtx.textBaseline = 'middle'
    this.xAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['text'];
    this.xAxisCtx.clearRect(0, 0, this.xAxis.width, this.xAxis.height)
    indices.forEach((indice: any) => {
      const text = new Date(indice.y).toISOString().split('T')[0]
      this.xAxisCtx.fillText(text, indice.x - 22, this.xAxis.height / 2);
    })
  }

  updateGrid() {
    if (this.pixiContainerGrids) {
      this.pixiContainerGrids.destroy()
    }
    const containerGrid = new PIXI.Container()

    const priceLine = this.getPixelForValueY(this.actualData[this.actualData.length-1].c)
    const priceLineDraw = new PIXI.Graphics()
    if (this.actualData[this.actualData.length-1].c > this.actualData[this.actualData.length-1].o) {
      priceLineDraw.lineStyle(
        1, // Largeur de la ligne
        this.colorPallet[this.colorTheme]['greenPrimary'], // Couleur
        0.5, // Alpha
        0.5, // Alignment
        true // Native
      );
    } else {
      priceLineDraw.lineStyle(
        1, // Largeur de la ligne
        this.colorPallet[this.colorTheme]['redPrimary'], // Couleur
        0.5, // Alpha
        0.5, // Alignment
        true // Native
      );
    }

    priceLineDraw.moveTo(this.view.x1, priceLine);
    priceLineDraw.lineTo(this.view.x2, priceLine);
    containerGrid.addChild(priceLineDraw)

    const diffY = this.view.y2 - this.view.y1
    const diffX = this.view.x2 - this.view.x1
    const yTotal = Math.floor(this.bufferCanvasVector.view.height / 40)
    const xTotal = Math.floor(this.bufferCanvasVector.view.width / 100)
    const range = (xTotal > yTotal) ? xTotal : yTotal;

    for (let i = 0; i < range; i++) {
      const gridLine = new PIXI.Graphics()
      gridLine.lineStyle(
        1, // Largeur de la ligne
        '#808080', // Couleur
        0.15, // Alpha
        0.5, // Alignment
        true // Native
      );

      if (i <= yTotal) {
        const y2 = this.view.y2 - (diffY / yTotal + (diffY / yTotal * i))
        gridLine.moveTo(this.view.x1, y2);
        gridLine.lineTo(this.view.x2, y2);
      }

      if (i <= xTotal) {
        const x2 = this.view.x2 - (diffX / xTotal + (diffX / xTotal * i))
        gridLine.moveTo(x2, this.view.y1);
        gridLine.lineTo(x2, this.view.y2);
      }

      containerGrid.addChild(gridLine)
    }
    this.pixiContainerGrids = containerGrid
    this.pixiContainerGrids.scale.set(1 / this.responsiveScale[0][this.period][this.chartType].x, 1 / this.responsiveScale[0][this.period][this.chartType].y)
    this.bufferCanvasVector.stage.addChildAt(this.pixiContainerGrids, 0)

    let charts: any = document.querySelector('#charts')!.children
    for (let y = 0; y < this.data['indiOutChart'].length; y++) {
      if (this.data['indiOutChart'][y].grid) {
        this.data['indiOutChart'][y].grid.destroy()
      }
      const containerGrid2 = new PIXI.Container()
      const diffY = this.data['indiOutChart'][y].maxPx - this.data['indiOutChart'][y].minPx
      const diffX = this.view.x2 - this.view.x1
      const yTotal = Math.floor(this.data['indiOutChart'][y].app.view.height / 40) + 1
      const range = (xTotal > yTotal) ? xTotal : yTotal;

      for (let i = 0; i < range; i++) {
        const gridLine2 = new PIXI.Graphics()
        gridLine2.lineStyle(
          10, // Largeur de la ligne
          0x969696, // Couleur
          0.15, // Alpha
          0.5, // Alignment
          true // Native
        );

        if (i <= yTotal) {
          const y2 = this.data['indiOutChart'][y].maxPx - (diffY / yTotal + (diffY / yTotal * i))
          gridLine2.moveTo(this.view.x1, y2);
          gridLine2.lineTo(this.view.x2, y2);
        }

        if (i <= xTotal) {
          const x2 = this.view.x2 - (diffX / xTotal + (diffX / xTotal * i))
          gridLine2.moveTo(x2, this.data['indiOutChart'][y].minPx);
          gridLine2.lineTo(x2, this.data['indiOutChart'][y].maxPx);
        }

        containerGrid2.addChild(gridLine2)
      }
      this.data['indiOutChart'][y].grid = containerGrid2
      this.data['indiOutChart'][y].grid.scale.set(1 / this.responsiveScale[y + 1][this.period].x, 1 / this.responsiveScale[y + 1][this.period].y)
      this.data['indiOutChart'][y].app.stage.addChild(this.data['indiOutChart'][y].grid)
    }
  }

  cursorPosAxis(e: any, index: number) {
    const YScale = this.updateYScale();
    const r = 5;

    let h: number, w: number, x: number, y: number;
    let charts: any = document.querySelector('#charts')!.children;

    this.getPixelForValueY(this.actualData[this.actualData.length-1].c)

    const drawYAxisCursor = (yAxisCtx: CanvasRenderingContext2D, min: number, max: number, indi: boolean) => {
      yAxisCtx.beginPath();
      yAxisCtx.moveTo(x + r, y);
      yAxisCtx.arcTo(x + w, y, x + w, y + h, r);
      yAxisCtx.arcTo(x + w, y + h, x, y + h, r);
      yAxisCtx.arcTo(x, y + h, x, y, r);
      yAxisCtx.arcTo(x, y, x + w, y, r);
      yAxisCtx.closePath();
      yAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['background'];
      yAxisCtx.fill();

      yAxisCtx.font = '13px Montserrat';
      yAxisCtx.textBaseline = 'middle';
      yAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['text'];

      const YDiff = max - min
      const yAxisValue = (max - YDiff * (e.offsetY / yAxisCtx.canvas.clientHeight)).toFixed(2);
      if (!indi) {
        yAxisCtx.fillText(this.chartType === 'log' ? Math.exp(Number(yAxisValue)).toFixed(2).toString() : yAxisValue, 10, e.offsetY);
      } else {
        yAxisCtx.fillText(Number(yAxisValue).toString(), 10, e.offsetY);
      }
    };

    if (index === -1) {
      const yAxis = charts[0].children[1];
      const yAxisCtx = yAxis.getContext('2d');
      h = 30;
      w = 70 - 4;
      x = 2;
      y = e.offsetY - 15;

      drawYAxisCursor(yAxisCtx, YScale.lowestValue, YScale.highestValue, false);
    } else {
      const chart = charts[index + 1].children[1];
      const yAxis = chart.children[1];
      const yAxisCtx = yAxis.getContext('2d');
      h = 30;
      w = 70 - 4;
      x = 2;
      y = e.offsetY - 15;
      drawYAxisCursor(yAxisCtx, this.data['indiOutChart'][index].min, this.data['indiOutChart'][index].max, true);
    }

    const XValue = this.getValueForPixelX(this.view.x1 + (this.view.x2 - this.view.x1) * (e.offsetX / this.bufferCanvasVector.view.width) - 2);
    let nearestXValIndex = this.actualDataXVals.findIndex((element) => element >= XValue) - 1;
    nearestXValIndex = nearestXValIndex === -2 ? this.actualDataXVals.length - 1 : nearestXValIndex;

    const xAxisText = new Date(XValue).toLocaleDateString(this.getNavigatorLanguage(), { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
    const xAxisTextWidth = this.xAxisCtx.measureText(xAxisText).width;
    h = 25;
    w = xAxisTextWidth + 20;
    x = e.offsetX - w / 2;
    y = 7;

    this.xAxisCtx.beginPath();
    this.xAxisCtx.moveTo(x + r, y);
    this.xAxisCtx.arcTo(x + w, y, x + w, y + h, r);
    this.xAxisCtx.arcTo(x + w, y + h, x, y + h, r);
    this.xAxisCtx.arcTo(x, y + h, x, y, r);
    this.xAxisCtx.arcTo(x, y, x + w, y, r);
    this.xAxisCtx.closePath();
    this.xAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['background'];
    this.xAxisCtx.fill();
    this.xAxisCtx.font = '13px Montserrat';
    this.xAxisCtx.textAlign = 'center';
    this.xAxisCtx.textBaseline = 'middle';
    this.xAxisCtx.fillStyle = this.colorPallet[this.colorTheme]['text'];
    this.xAxisCtx.fillText(xAxisText, e.offsetX, this.xAxis.height / 2);

    for (let i = 0; i <= this.data['indiOutChart'].length; i++) {
      let hudCtx = (document.getElementById(`hud-${i}`) as any).getContext('2d')

      hudCtx.clearRect(0, 0, hudCtx.canvas.clientWidth, hudCtx.canvas.clientHeight);

      hudCtx.lineWidth = 1;
      hudCtx.strokeStyle = 'rgba(128, 128, 128, 0.7)'
      hudCtx.beginPath();
      if (i === index + 1) {
        hudCtx.moveTo(0, e.offsetY);
        hudCtx.lineTo(hudCtx.canvas.clientWidth, e.offsetY);
      }
      hudCtx.moveTo(e.offsetX, 0);
      hudCtx.lineTo(e.offsetX, hudCtx.canvas.clientHeight);
      hudCtx.stroke();
    }

    let hudCtx = (document.getElementById(`hud-0`) as any).getContext('2d')

    hudCtx.font = '15px Montserrat';
    h = 25;
    x = 15;
    y = 15;

    this.text = `open: ${this.intlFormatObjs['decimal'].format(this.data.historical[nearestXValIndex].o)}  high: ${this.intlFormatObjs['decimal'].format(this.data.historical[nearestXValIndex].h)} low: ${this.intlFormatObjs['decimal'].format(this.data.historical[nearestXValIndex].l)}  close: ${this.intlFormatObjs['decimal'].format(this.data.historical[nearestXValIndex].c)}  vol: ${this.intlFormatObjs['decimal'].format(this.data.historical[nearestXValIndex].v)}`;
    this.textWidth = hudCtx.measureText(this.text).width;
    w = this.textWidth + 20;

    hudCtx.beginPath();
    hudCtx.moveTo(x + r, y);
    hudCtx.arcTo(x + w, y, x + w, y + h, r);
    hudCtx.arcTo(x + w, y + h, x, y + h, r);
    hudCtx.arcTo(x, y + h, x, y, r);
    hudCtx.arcTo(x, y, x + w, y, r);
    hudCtx.closePath();
    hudCtx.fillStyle = this.colorPallet[this.colorTheme]['background'];
    hudCtx.fill();
    hudCtx.fillStyle = this.colorPallet[this.colorTheme]['text'];
    hudCtx.fillText(this.text, x + 10, y + h / 1.5);
  }

  changePeriod() {
    const lValues = this.actualData.map((item: { l: any; }) => item.l);
    const hValues = this.actualData.map((item: { h: any; }) => item.h);
    this.volumeList = this.actualData.map((item: { v: any; }) => item.v);
    this.minValue = Math.min(...lValues);
    this.maxValue = Math.max(...hValues);
    this.maxVolume = Math.max(...this.volumeList);
    this.minVolume = Math.min(...this.volumeList);
  }

  resizeIndiWrapper(e: any, index: number) {
    const indiWrapper: any = document.querySelector('#charts')!.children[index].children[1]

    const min = 50
    const max = 100

    if (e == 'start') {
      this.renderer.setStyle(this.elRef.nativeElement, 'cursor', 'row-resize')
      this.indiWrapperHeight = [parseInt(indiWrapper.children[0].style.height.slice(0, -2)), (document.querySelector('#charts')!.children[0].children[0] as any).offsetHeight]
    }
    else if (e == 'end') {
      this.renderer.setStyle(this.elRef.nativeElement, 'cursor', 'default')
      this.isChangingIndiSize=false
    }
    else {
      let indiHeight = this.indiWrapperHeight[0] - Math.round(e.deltaY)
      let mainHeight = this.indiWrapperHeight[1] + Math.round(e.deltaY)

      if (indiHeight < min) {
        indiHeight = min
      } else if (mainHeight < max) {
        indiHeight = indiHeight - (max - mainHeight)
      }

      indiWrapper.children[0].style.height = indiHeight + 'px'
      indiWrapper.children[1].height = indiHeight + 'px'

      this.resize()
    }
  }

  setScaleType(type: string) {
    if (type != this.chartType && type == 'log') {
      this.candlestickDraws.body[this.period][this.chartType].visible = false
      this.candlestickDraws.line[this.period][this.chartType].visible = false
      this.candlestickDraws.volume[this.period][this.chartType].visible = false
      this.chartType = 'log'

      this.actualData = this.candlestickDatas[this.period][this.chartType]

      this.changePeriod()
      if (this.candlestickDraws.body[this.period][this.chartType] == undefined) {
        this.drawCandlestick()
      } else {
        this.candlestickDraws.body[this.period][this.chartType].visible = true
        this.candlestickDraws.line[this.period][this.chartType].visible = true
        this.candlestickDraws.volume[this.period][this.chartType].visible = true
      }

      for (let i = 0; i <= this.data['indiOnChart'].length - 1; i++) {
        this.drawIndicator(i)
      }
      upgradeAnnoTrigger$.next(true)

    } else if (type != this.chartType && type == 'normal') {
      this.candlestickDraws.body[this.period][this.chartType].visible = false
      this.candlestickDraws.line[this.period][this.chartType].visible = false
      this.candlestickDraws.volume[this.period][this.chartType].visible = false
      this.chartType = 'normal'

      this.actualData = this.candlestickDatas[this.period][this.chartType]

      this.changePeriod()
      if (this.candlestickDraws.body[this.period][this.chartType] == undefined) {
        this.drawCandlestick()
      } else {
        this.candlestickDraws.body[this.period][this.chartType].visible = true
        this.candlestickDraws.line[this.period][this.chartType].visible = true
        this.candlestickDraws.volume[this.period][this.chartType].visible = true
      }

      for (let i = 0; i <= this.data['indiOnChart'].length - 1; i++) {
        this.drawIndicator(i)
      }
      upgradeAnnoTrigger$.next(true)
    }
    this.resize()
    for (let i = 0; i < this.data['indiOnChart'].length; i++) {
      this.data['indiOnChart'][i].view.scale.set(1 / this.responsiveScale[0][this.period][this.chartType].x, 1 / this.responsiveScale[0][this.period][this.chartType].y)
    }
    for (let i = 0; i < this.candlestickDraws.volume[this.period][this.chartType].children[0].children.length; i++) {
      const child = this.candlestickDraws.volume[this.period][this.chartType].children[0].children[i];
      const child2 = this.candlestickDraws.body[this.period][this.chartType].children[0].children[i];

      child.visible = true
      child2.visible = true
    }
    if (this.actualData.length > 2500) {
      this.viewIndex = {
        x1: this.actualData.length - 501,
        x2: this.actualData.length - 1
      }
    } else {
      this.viewIndex = {
        x1: 0,
        x2: this.actualData.length -1
      }
    }
    this.updateYScale()
  }
}

export const upgradeAnnoTrigger$ = new Subject<boolean>();
