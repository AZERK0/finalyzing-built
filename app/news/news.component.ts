import {Component, HostListener, Input, OnInit} from '@angular/core';
import {QuoteComponent} from "../quote/quote.component";
import {DataApiService} from "../services/data-api.service";
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {

  @Input() data: any = {'News': undefined}
  @Input() ticker: string = 'AAPL.US'

  now: number
  period: number = 7
  offset: number = 0
  loadingScroll: boolean = false

  showPremiumPopup: boolean = false

  @HostListener('scroll', ['$event'])
  onScroll(event: any) {
    if (event.target.scrollHeight - event.target.scrollTop - event.target.clientHeight < 100 && !this.loadingScroll) {
      this.loadingScroll = true
      this.offset += 50
      this.service.getNews(this.ticker, this.offset).subscribe((response: any) => {
        this.data['News']["News"] = this.data['News']["News"].concat(response['News'])
        this.loadingScroll = false
      })
    }
  }

  constructor(private service: DataApiService, public app: AppComponent, public quoteComponent: QuoteComponent) {
    this.now = Date.now()
  }

  ngOnInit(): void {
  }

  getSentimentsValues(type: string) {
        if (this.data['News'][type + 'Sentiments']) {
      if (type == 'News') {
        return this.data['News'][type + 'Sentiments'][0].slice(0, this.period).map((item: {
          count: number,
          date: string,
          normalized: number
        }) => item.normalized).reduce((acc: number, val: number) => acc + val, 0) / this.period
      } else {
        return this.data['News'][type + 'Sentiments'].slice(0, this.period).map((item: {
          count: number,
          date: string,
          normalized: number
        }) => item.normalized).reduce((acc: number, val: number) => acc + val, 0) / this.period
      }
    }
    else return 0
  }

  getSentimentTransform(value: number): string {
    return `--value: ${value / 2};`;
  }

  getSentimentText(value: number): string {
    const steps: {[key: number]: string} = {0: 'Very Negative', 0.4: 'Negative', 0.8: 'Neutral', 1.2: 'Positive', 1.6: 'Very Positive'}

    let i = -1
    while (value > i + 0.4) {
      i = Math.round((i + 0.4) * 100) / 100
    }
    return steps[i + 1]
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

  closePremiumPopup() {
    this.showPremiumPopup = false
  }
}
