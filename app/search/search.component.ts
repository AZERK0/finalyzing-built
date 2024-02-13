import {Component, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {FormControl} from "@angular/forms";
import {DataApiService} from "../services/data-api.service";
import {AppComponent} from "../app.component";
import {Subject} from "rxjs";
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {Router} from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})

export class SearchComponent implements OnInit {
  listenerFn: (() => void) | undefined;

  displayedColumns: string[] = ['watchlist', 'code', 'name', 'exchange'];
  control = new FormControl('');

  @Input() redirect: boolean = true
  @Input() host: any

  submitSearchTrigger = new Subject<any>()
  submitSearchTrigger$ = this.submitSearchTrigger.asObservable();

  results:any;
  search_term: any;
  search_query: string = '';
  type: string = 'all';
  exchange: string = 'all';
  codes: any;
  searchUpdate = new Subject<string>();
  selectedRowIndex: any = 0;
  row: any;
  @ViewChild('searchbar') searchbar: any;
  @ViewChild('search') search: any;

  exchanges: any

  constructor(private router: Router, private service:DataApiService, public app: AppComponent, private renderer: Renderer2) {
    this.searchUpdate.pipe(
      debounceTime(400),
      distinctUntilChanged())
      .subscribe(value => {
        this.onSearchChange(value)
      });
  }

  ngOnInit(): void {
    this.listenerFn = this.renderer.listen('window', 'mousedown',(e:any)=>{
      if (e.target.localName == "app-search" && this.host.showSearch) {
        this.host.toggleSearch()
      }
    });

    this.service.getSearch(this.search_query, this.type, this.exchange)
      .subscribe(response => {
        this.results = response;
        this.codes = [];
        for (let i=0;i<this.results.length;i++) {
          this.codes.push(this.results[i].code+'.'+this.results[i].exchange);
        }
      });

    this.service.getExchanges()
      .subscribe((response: any) => {
        response.unshift({'Code': 'all', 'Name': 'All Exchanges'})
        this.exchanges = response;
      });
  }

  ngAfterViewInit(): void {
    this.searchbar.nativeElement.focus()
  }

  ngOnDestroy() {
    if (this.listenerFn) {
      this.listenerFn();
    }
  }

  submitSearch(searchValue: string): void {
    if (this.codes.includes(searchValue.toUpperCase())) {
      this.search_term = searchValue.toUpperCase();
    } else {
      this.search_term = this.codes[0];
    }

    this.submitSearchTrigger.next(this.search_term)

    if (this.redirect) {
      this.router.navigateByUrl(`/quote/${this.search_term}`)
        .then(() => {
          this.host.toggleSearch();
          location.reload();
        });
    }
  }

  onSearchChange(searchValue: string): void {
    this.search_query = searchValue

    if (this.type == "crypto" || this.type == "index") {
      this.exchange = "all"
    }
    this.service.getSearch(this.search_query, this.type, this.exchange)
      .subscribe(response => {
        this.results = response;
        this.codes = [];
        for (let i=0;i<this.results.length;i++) {
          this.codes.push(this.results[i].code+'.'+this.results[i].exchange);
        }
      });
  }

  highlight(row: any){
    (<HTMLInputElement>document.getElementById("search-bar")).value = row.code+'.'+row.exchange;
    this.selectedRowIndex = row.index;
    (<HTMLInputElement>document.getElementById("result."+this.selectedRowIndex)).scrollIntoView({block: 'end'});
  }

  arrowUpEvent(row: object, index: number){
    if (index > 0) {
      let nextRow = this.results[index - 1];
      this.highlight(nextRow);
    }
    else {
      let nextRow = this.results[this.results.length - 1];
      this.highlight(nextRow)
    }
  }

  arrowDownEvent(row: object, index: number){
    if (index < this.results.length - 1) {
      let nextRow = this.results[index + 1];
      this.highlight(nextRow);
    }
    else {
      let nextRow = this.results[0];
      this.highlight(nextRow)
    }
  }

  formatLengthName(name: string) {
    if (name.length > 50) {
      return name.slice(0, 50) + "..."
    } else {
      return name
    }
  }

  print(text:any) {
      }
}
