import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuoteComponent } from './quote/quote.component';
import { HomeComponent } from './home/home.component';
import { ChartEmbedComponent } from './chart-embed/chart-embed.component';
import { TechnicalComponent } from './technical/technical.component';
import {CalendarComponent} from "./calendar/calendar.component";
import {MacroIndicatorComponent} from "./macro-indicator/macro-indicator.component";
import {TermsOfUseComponent} from "./terms-of-use/terms-of-use.component";
import {PrivacyPolicyComponent} from "./privacy-policy/privacy-policy.component";
import {QaComponent} from "./qa/qa.component";
import {ProfileComponent} from "./profile/profile.component";
import {PortfolioComponent} from "./portfolio/portfolio.component";
import {PricingComponent} from "./pricing/pricing.component"

const routes: Routes = [
  {
    path: '',
    component:HomeComponent
  },
  {
    path: 'terms-of-use',
    component:TermsOfUseComponent,
    title: 'Terms Of Use - Finalyzing'
  },
  {
    path: 'privacy-policy',
    component:PrivacyPolicyComponent,
    title: 'Privacy Policy - Finalyzing'
  },
  {
    path: 'Q&A',
    component:QaComponent,
    title: 'Q&A - Finalyzing'
  },
  {
    path: 'profile/:username',
    component:ProfileComponent
  },
  {
    path: 'profile',
    component:ProfileComponent,
    title: 'Profile - Finalyzing'
  },
  {
    path: 'pricing',
    component:PricingComponent,
    title: 'Pricing - Finalyzing'
  },
  {
    path: 'portfolio',
    component:PortfolioComponent,
    title: 'Portfolio - Finalyzing'
  },
  {
    path: 'portfolio/:username/:group_id',
    component:PortfolioComponent
  },
  {
    path:'quote/:ticker',
    component:QuoteComponent
  },
  {
    path:'chart-embed',
    component:ChartEmbedComponent,
    title: 'Embed - Finalyzing'
  },
  {
    path:'economic-calendar',
    component:CalendarComponent,
    title: 'Economic Calendar - Finalyzing'
  },
  {
    path:'macro-indicators',
    component:MacroIndicatorComponent,
    title: 'Macro Indicators - Finalyzing'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {anchorScrolling: 'enabled', scrollOffset: [0, 130]})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
