import {Injectable, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AngularMaterialModule } from '../material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { NgScrollbarModule } from 'ngx-scrollbar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { SearchComponent } from './search/search.component';
import { QuoteComponent } from './quote/quote.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { TechnicalComponent } from './technical/technical.component';
import { GeneralComponent } from './general/general.component';
import { ChartComponent } from './chart/chart.component';
import { NgChartsModule, NgChartsConfiguration } from 'ng2-charts';
//@ts-ignore
import * as Hammer from 'hammerjs';
import {HammerModule, HammerGestureConfig, HAMMER_GESTURE_CONFIG} from '@angular/platform-browser';
import { FinancialsComponent } from './financials/financials.component';
import { CalendarComponent } from './calendar/calendar.component';
import { EarningsComponent } from './earnings/earnings.component';
import { NewsComponent } from './news/news.component';
import { CompositionComponent } from './composition/composition.component';
import { MacroIndicatorComponent } from './macro-indicator/macro-indicator.component';
import { TermsOfUseComponent } from './terms-of-use/terms-of-use.component';
import { ChartEmbedComponent } from './chart-embed/chart-embed.component';
import { TickerLogoDirective } from './directives/ticker-logo.directive';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AuthInterceptor } from './interceptors/auth-interceptor.service';
import { ProfileComponent } from './profile/profile.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { PricingComponent } from './pricing/pricing.component';
import { PremiumPopupComponent } from './premium-popup/premium-popup.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { QaComponent } from './qa/qa.component';

@Injectable()
export class hammerConfig extends HammerGestureConfig {
  override overrides = <any> {
    pan: { direction: Hammer.DIRECTION_ALL, threshold: 5 },
    pinch: { enable: true }
  };
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SearchComponent,
    QuoteComponent,
    FooterComponent,
    HeaderComponent,
    TechnicalComponent,
    GeneralComponent,
    ChartComponent,
    FinancialsComponent,
    CalendarComponent,
    EarningsComponent,
    NewsComponent,
    CompositionComponent,
    MacroIndicatorComponent,
    TermsOfUseComponent,
    ChartEmbedComponent,
    TickerLogoDirective,
    LoginComponent,
    RegisterComponent,
    ProfileComponent,
    PortfolioComponent,
    PricingComponent,
    PremiumPopupComponent,
    PrivacyPolicyComponent,
    QaComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularMaterialModule,
    BrowserAnimationsModule,
    HttpClientModule,
    NgScrollbarModule,
    ReactiveFormsModule,
    FormsModule,
    NgChartsModule,
    HammerModule
  ],
  providers: [
    NgChartsConfiguration,
    {provide: HAMMER_GESTURE_CONFIG, useClass: hammerConfig},
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
