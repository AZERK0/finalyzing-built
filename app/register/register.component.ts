import {Component, OnInit, Renderer2} from '@angular/core';
import {AccountApiService} from "../services/account-api.service";
import {ActivatedRoute, Router} from '@angular/router';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  listenerFn: (() => void) | undefined;

  username: string = '';
  password: string = '';
  confirmPassword: string = ''
  email: string = ''
  TOSandPP: boolean = false
  registerPanel: number = 1

  registrationConditions: {
    isEmailValid: boolean;
    usernameAvailable: boolean;
    hasDigit: boolean;
    minLength: boolean;
    hasSpecialChar: boolean;
    hasLowerCase: boolean;
    hasUpperCase: boolean;
    isPasswordConfirmed: boolean;
  } = {
    isEmailValid: true,
    usernameAvailable: true,
    hasDigit: false,
    minLength: false,
    hasSpecialChar: false,
    hasLowerCase: false,
    hasUpperCase: false,
    isPasswordConfirmed: true
  }
  isRegisterable: boolean = false
  error: string | undefined

  constructor(private service: AccountApiService, private route: ActivatedRoute, private router: Router, private renderer: Renderer2, public app: AppComponent) { }

  ngOnInit(): void {
    this.listenerFn = this.renderer.listen('window', 'mousedown',(e:any)=>{
      if (e.target.localName == "app-register" && this.registerPanel != 3) {
        this.app.toggleRegisterDialog()
      }
    });

    if (this.route.snapshot.queryParams['account_successfully_verified']) {
      this.registerPanel = 3

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: [],
        replaceUrl: true
      });
    }

    if (this.route.snapshot.queryParams['reset_password_token']) {
      this.registerPanel = 4
    }

    if (this.route.snapshot.queryParams['successful_payment']) {
      this.registerPanel = 5
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
  }

  ngDoCheck(): void {
    this.isRegisterable = Object.values(this.registrationConditions).every(condition => condition) && this.username != '' && this.password != '' && this.confirmPassword != '' && this.email != '' && this.TOSandPP
  }

  checkEmail() {
    this.registrationConditions['isEmailValid'] = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(this.email)
  }

  checkUsername() {
    this.service.checkUsername(this.username).subscribe((response: any) => {
      this.registrationConditions['usernameAvailable'] = !response['exists']
    })
  }

  checkPassword() {
    this.registrationConditions['minLength'] = this.password.length >= 8
    this.registrationConditions['hasSpecialChar'] = /[!@#$%^&*()_+{}\[\]:;<>,.?~]/.test(this.password)
    this.registrationConditions['hasUpperCase'] = /[A-Z]/.test(this.password)
    this.registrationConditions['hasLowerCase'] = /[a-z]/.test(this.password)
    this.registrationConditions['hasDigit'] = /\d/.test(this.password)
  }

  checkPasswordConfirmation() {
    this.registrationConditions['isPasswordConfirmed'] = this.password == this.confirmPassword
  }

  register() {
    this.service.register(this.username, this.password, this.email).subscribe(
      (response) => {
        this.registerPanel = 2
      },
      (error) => {
        this.error = error.error.error
      }
    )
  }

  async googleSign(credentials: any) {
    try {
      let response: any = await fetch("https://accounts.finalyzing.com/api/v1/google_sign", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials['credential']),
      });
      response = await response.json();

      localStorage.setItem('access_token', response['access_token']);
      window.location.href = '/';
      location.reload();
      this.app.loginCancelable = true
      this.app.toggleLoginDialog()
    } catch (error: any) {
      console.error('Login failed:', error)
      this.error = "Google sign in failed"
    }
  }

  resetPassword() {
    this.service.resetPassword(this.route.snapshot.queryParams['reset_password_token'], this.password).subscribe(
      (response) => {
        this.app.toggleRegisterDialog()
        this.app.toggleLoginDialog()
      },
      (error) => {
        console.error('Password reset request failed:', error);
        this.error = error.error.error
      }
    )
  }
}
