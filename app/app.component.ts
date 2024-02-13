import {Component} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {AccountApiService} from "./services/account-api.service";
import {Subject} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  showLoginPopup: boolean = false
  showRegisterPopup: boolean = false
  showSearch: boolean = false
  showPremiumPopup: string | false = false

  isLoggedIn: boolean | undefined = undefined
  user: any = null

  toggleWatchlistTrigger = new Subject<any>()
  toggleWatchlistTrigger$ = this.toggleWatchlistTrigger.asObservable()
  loginTrigger = new Subject<void>()
  loginTrigger$ = this.loginTrigger.asObservable()
  closeLoginTrigger = new Subject<void>()
  closeLoginTrigger$ = this.closeLoginTrigger.asObservable()

  loginCancelable: boolean = true

  constructor(public accountService: AccountApiService, private httpClient: HttpClient, public router: Router) {
  }

  ngOnInit(): void {
    this.accountService.getUserInfo().subscribe(
      (response) => {
        this.isLoggedIn = true
        this.user = response
        this.loginTrigger.next()
      },
      () => {
        this.isLoggedIn = false
        this.loginTrigger.next()
      }
    );
  }

  toggleLoginDialog(): void {
    if (!this.showLoginPopup || this.loginCancelable) {
      this.showLoginPopup = !this.showLoginPopup
    }

    if (this.showLoginPopup) {
      document.body.style.overflowY = 'hidden';
    }
    else {
      document.body.style.overflowY = 'overlay';
      this.closeLoginTrigger.next()
    }
  }

  toggleRegisterDialog(): void {
    this.showRegisterPopup = !this.showRegisterPopup
    if (this.showRegisterPopup) {
      document.body.style.overflowY = 'hidden';
    }
    else {
      document.body.style.overflowY = 'overlay';
    }
  }

  logout() {
    localStorage.removeItem('access_token')
    this.isLoggedIn = false
    this.user = null
    this.router.navigateByUrl('/')
      .then(() => {
        location.reload();
      })
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch
    if (this.showSearch) {
      document.body.style.overflowY = 'hidden';
    }
    else {
      document.body.style.overflowY = 'overlay';
    }
  }

  toggleWatchlist(ticker: string) {
    if (this.isLoggedIn && ((this.user['premium'] || this.user['watchlist'].length < 3) || this.user['watchlist'].includes(ticker))) {
      const isTickerInWatchlist = this.user && this.user['watchlist'].includes(ticker);

      this.toggleWatchlistTrigger.next({'ticker': ticker, 'delete': isTickerInWatchlist});

      if (isTickerInWatchlist) {
        const index = this.user['watchlist'].indexOf(ticker);
        if (index > -1) {
          this.user['watchlist'].splice(index, 1);
        }
      } else {
        this.user['watchlist'].push(ticker);
      }

      this.accountService.toggleWatchlist(ticker).subscribe(
        () => {
        },
        (error) => {
          console.error('Error during the update of the watchlist :', error);
        }
      );
    }
    else if (!this.isLoggedIn) {
      this.toggleLoginDialog()
    }
    else {
      this.showPremiumPopup = 'watchlist'
    }
  }

  closePremiumPopup() {
    this.showPremiumPopup = false
  }
}
