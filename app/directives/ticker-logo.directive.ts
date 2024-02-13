import { Directive, ElementRef, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[appTickerLogo]',
})
export class TickerLogoDirective {
  @Input() ticker: string = 'AAPL.US';
  @HostBinding('src') srcAttr: string = '';

  constructor(private el: ElementRef) {}

  async ngOnInit() {
    try {
      await this.loadImage();
    } catch (error) {
      this.el.nativeElement.innerText = this.ticker[0];
    }
  }

  async ngOnChanges() {
    try {
      await this.loadImage();
      this.el.nativeElement.innerText = ''
    } catch (error) {
      this.el.nativeElement.style.backgroundImage = ''
      this.el.nativeElement.innerText = this.ticker[0];
    }
  }

  loadImage() {
    return new Promise<void>(async (resolve, reject) => {
      const tickerParts = this.ticker.split('.');
      const tickerName = tickerParts[0];
      const tickerType = tickerParts[1];

      let imageSources: string[] | [] = [];

      if (tickerType === 'FOREX') {
        imageSources = [
          `https://www.spectre.ai/assets/images/assets/${tickerName}-top.svg?v=2.13`,
        ];
      } else if (tickerType === 'CC') {
        imageSources = [
          `https://app.finalyzing.com/assets/logos/crypto/${tickerName
            .split('-')[0]
            .toLowerCase()}.png`,
        ];
        this.el.nativeElement.style.backgroundSize = '110%';
        this.el.nativeElement.style.backgroundPosition = '50% 40%';
      } else if (tickerType === 'US') {
        imageSources = [
          `https://app.finalyzing.com/assets/logos/stock/${tickerName.toUpperCase()}.png`,
          `https://eodhistoricaldata.com/img/logos/US/${tickerName.toUpperCase()}.png`,
          `https://eodhistoricaldata.com/img/logos/US/${tickerName.toLowerCase()}.png`,
        ];
      }
      else {
        imageSources = [
          `https://eodhistoricaldata.com/img/logos/${tickerType}/${tickerName.toUpperCase()}.png`,
          `https://eodhistoricaldata.com/img/logos/${tickerType}/${tickerName.toLowerCase()}.png`,
        ];
      }

      let imageLoaded = false;

      for (let i = 0; i < imageSources.length; i++) {
        try {
          await this.loadImageSource(imageSources[i]);
          imageLoaded = true;
          resolve();
          break;
        } catch (error) {
          if (i === imageSources.length - 1 && !imageLoaded) {
            reject('Failed to load image');
          }
        }
      }
    });
  }

  private loadImageSource(source: string) {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = source;

      img.onload = () => {
        this.el.nativeElement.style.backgroundImage = `url(${source})`;
        resolve();
      };

      img.onerror = () => {
        reject('Failed to load image');
      };
    });
  }
}
