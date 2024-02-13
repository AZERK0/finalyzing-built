import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {AccountApiService} from "../services/account-api.service";
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {
  period: 'm' | 'y' = 'm'

  constructor(private accountService: AccountApiService, public app: AppComponent) {
  }

  createCheckoutSession(lookupKey: string) {
    this.accountService.createCheckoutSession(lookupKey).subscribe((response: any) => {
      window.location.href = response['checkout_session_url']
    })
  }

  createBillingPortalSession() {
    this.accountService.createBillingPortalSession().subscribe((response: any) => {
      window.location.href = response['billing_portal_session']
    })
  }
}
