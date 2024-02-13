import {Component, OnInit, Renderer2} from '@angular/core';
import { AppComponent } from '../app.component';
import {AccountApiService} from "../services/account-api.service";


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  openMenu: boolean = false
  userOpenMenu: boolean = false

  listenerFn: (() => void) | undefined;

  constructor(public app: AppComponent, private renderer: Renderer2, private accountService: AccountApiService) { }

  ngOnInit(): void {
    this.listenerFn = this.renderer.listen('window', 'click', (e: any) => {
      const isNavbarElement = e.target.closest('.navbar');
      const isUserMenuElement = e.target.closest('.user-menu');

      if (!isNavbarElement && !isUserMenuElement && e.target.localName !== 'i' && e.target.localName !== 'button') {
        this.openMenu = false;
        this.userOpenMenu = false;
      }
    });
  }

  createBillingPortalSession() {
    this.accountService.createBillingPortalSession().subscribe((response: any) => {
      window.location.href = response['billing_portal_session']
    })
  }
}
