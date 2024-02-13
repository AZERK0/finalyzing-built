import {Component, OnInit, Renderer2} from '@angular/core';
import {AccountApiService} from "../services/account-api.service";
import {AppComponent} from "../app.component";
import {Subscription} from "rxjs";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  listenerFn: (() => void) | undefined;

  isCooldown = false;
  remainingTime = 0;

  email: string = ''
  password: string = ''
  loginPanel: number = 1
  verification_code: string = ''
  error: string | undefined

  closeLoginSubscription: Subscription | undefined

  constructor(private service: AccountApiService, private renderer: Renderer2, public app: AppComponent) { }

  ngOnInit(): void {
    this.listenerFn = this.renderer.listen('window', 'mousedown',(e:any)=>{
      if (e.target.localName == "app-login" && this.loginPanel != 2) {
        this.app.toggleLoginDialog()
      }
    });

    if (!this.app.isLoggedIn) {
      this.closeLoginSubscription = this.app.closeLoginTrigger$.subscribe(() => {
        for (let tab of ['general', 'technical', 'financials', 'earnings', 'news']) {
          const quoteContent: any = document.getElementById(tab)
          if (quoteContent && quoteContent.style.overflowY == 'hidden') {
            quoteContent.style.overflowY = 'auto'
          }
        }
      })
    }
  }

  ngAfterViewInit() {
    // @ts-ignore
    google.accounts.id.initialize({
      client_id: "56911299669-8jrt297tk2nri31vdu5dnb0jl24jj0d3.apps.googleusercontent.com",
      callback: this.googleSign
    });
    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("g-login"),
      { type:"standard", theme: "outline", size: "large", shape: "pill", text:"signin_with", locale:"en" }
    );
  }

  ngOnDestroy() {
    if (this.listenerFn) {
      this.listenerFn();
    }

    if (this.closeLoginSubscription) {
      this.closeLoginSubscription!.unsubscribe()
    }
  }

  startCooldown() {

    const cooldownTime = 30000;
    const interval = 1000;
    const intervalNumber = cooldownTime / interval;

    let intervalCount = 0;

    this.isCooldown = true;
    this.remainingTime = cooldownTime / 1000;

    const intervalId = setInterval(() => {
      this.remainingTime = Math.ceil((cooldownTime - intervalCount * interval) / 1000);

      if (intervalCount >= intervalNumber) {
        this.isCooldown = false;
        this.remainingTime = 0;
        clearInterval(intervalId);
      }

      intervalCount++;
    }, interval);
  }

  login() {
    this.startCooldown()
    this.service.login(this.email, this.password).subscribe(
      (response) => {
        this.loginPanel = 2
        this.error = undefined
      },
      (error) => {
        console.error('Login failed:', error);
        this.error = error.error.error
      }
    )
  }

  verify_2fa() {
    this.service.verify_2fa(this.email, this.password, this.verification_code).subscribe(
      (response) => {
        localStorage.setItem('access_token', response['access_token']);
        this.service.getUserInfo().subscribe(
          (response) => {
            this.app.isLoggedIn = true
            this.app.user = response
            this.app.loginTrigger.next()
            this.app.router.navigateByUrl(`/`)
              .then(() => {
                location.reload();
              });
          },
          (error) => {
            console.error('Login failed:', error);
            this.error = error.error.error
          }
        );
        this.app.loginCancelable = true
        this.app.toggleLoginDialog()
      },
      (error) => {
        console.error('Login failed:', error);
        this.error = error.error.error
      }
    )
  }

  async googleSign(credentials: any) {
      let response: any = await fetch("https://accounts.finalyzing.com/api/v1/google_sign", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials['credential']),
      });
      response = await response.json();

      if (response['error']) {
        this.error = response['error']
        return
      }

      localStorage.setItem('access_token', response['access_token']);
      window.location.href = '/';
      location.reload();
      this.app.loginCancelable = true
      this.app.toggleLoginDialog()
  }

  passwordResetRequest() {
    this.service.passwordResetRequest(this.email).subscribe(
      (response) => {
        this.loginPanel = 4
      },
      (error) => {
        console.error('Password reset request failed:', error);
        this.error = error.error.error
      }
    )
  }
}
