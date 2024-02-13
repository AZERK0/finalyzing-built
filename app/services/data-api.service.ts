import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import * as JSZip from 'jszip';
import * as csvtojson from 'csvtojson';

@Injectable({
  providedIn: 'root'
})
export class DataApiService {
  errorMessage: string | undefined;

  private url = 'https://app.finalyzing.com/api/v1';
  results:any;

  constructor(private httpClient: HttpClient) { }

  getSearch(query: string, type: string, exchange: string): Observable<any> {
    const params = new URLSearchParams();
    params.set('q', query)
    if (type != 'all') {
      params.set('type', type);
    }
    if (exchange != 'all') {
      params.set('exchange', exchange);
    }

    const url = `${this.url}/search?${params.toString()}`;

    return this.httpClient.get(url);
  }

  getExchanges() {
    return this.httpClient.get(this.url + '/exchanges')
  }

  getExchangeCurrencyVal(exchange: string) {
    return this.httpClient.get(this.url + `/exchange-currency-val?q=${exchange}`)
  }

  getBulk(exchange: string, tickers_list: string[], update: string = 'false'): Observable<any> {
    const tickers: string = tickers_list.join(',')

    return this.httpClient.get(this.url + `/bulk?exchange=${exchange}&tickers=${tickers}&update=${update}`);
  }

  getScreener(filters: string, sort: string, limit: number, offset: number): Observable<any> {
        return this.httpClient.get(this.url + `/screener?filters=${filters}&sort=${sort}&limit=${limit}&offset=${offset}`);
  }

  getHistorical(ticker: string, period: string, start?: string): Observable<any> {
    return this.httpClient.get(this.url + `/historical?q=${ticker}&period=${period}` + (start ? `&start=${start}` : ''));
  }

  getHistorical_portfolio(ticker: any): Observable<any> {
    return this.httpClient.get(this.url + `/historical_portfolio?q=${ticker}`, { responseType: 'arraybuffer' }).pipe(
      map(zipData => {
        return new Promise<{ [key: string]: any[] }>((resolve, reject) => {
          const zip = new JSZip();
          zip.loadAsync(zipData).then((zipFile) => {
            const csvPromises: any[] = [];
            const csvDataDict: { [key: string]: any[] } = {};
            zipFile.forEach((relativePath, zipEntry) => {
              csvPromises.push(zipEntry.async('text').then(csvText => {
                return csvtojson().fromString(csvText).then(csvData => {
                  csvDataDict[zipEntry.name.replace('.csv', '')] = csvData.map((a: any) => ({
                    x: new Date(a['Date']),
                    y: parseFloat(a['Close'])
                  }));
                });
              }));
            });
            Promise.all(csvPromises).then(() => {
              resolve(csvDataDict);
            }).catch(err => reject(err));
          }).catch(err => reject(err));
        });
      })
    );
  }

  getIndicator(urlPath: string, historical: any): Observable<any> {
    const headers = { 'content-type': 'application/json'}
    const body = JSON.stringify(historical);
    return this.httpClient.post(this.url + urlPath, body,{'headers':headers});
  }

  getFundamental(ticker: string) {
    return this.httpClient.get(this.url + `/fundamental?q=${ticker}`)
  }

  getFundamentalFiltered(ticker: string, filters: string) {
    return this.httpClient.get(this.url + `/fundamental_filtered?q=${ticker}&f=${filters}`)
  }

  getNews(ticker: string, offset: number) {
    return this.httpClient.get(this.url + `/news?q=${ticker}&offset=${offset}`)
  }

  getExchangeDetails(exchange: string) {
    return this.httpClient.get(this.url + `/exchange_details?q=${exchange}`)
  }

  getCalendar({ from, to, country, offset }: { from?: string, to?: string, country?: string, offset?: number }) {
    const params = new URLSearchParams();

    if (from) {
      params.set('from', from);
    }
    if (to) {
      params.set('to', to);
    }
    if (country) {
      params.set('country', country);
    }
    if (offset !== undefined) {
      params.set('offset', String(offset));
    }

    const url = `${this.url}/calendar?${params.toString()}`;
    return this.httpClient.get(url);
  }

  getMacroIndicator(country: string, indicator: string) {
    return this.httpClient.get(this.url + `/macro_indicator?country=${country}&indicator=${indicator}`)
  }

  getHomeNews() {
    return this.httpClient.get(this.url + `/home_news`)
  }

  getRealTime(ticker: string) {
    return this.httpClient.get(this.url + `/real-time?q=${ticker}`);
  }

  getDividend(ticker: string) {
    return this.httpClient.get(this.url + `/dividend?q=${ticker}`);
  }
}
