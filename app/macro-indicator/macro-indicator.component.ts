import {Component, OnInit, ViewChild} from '@angular/core';
import {DataApiService} from "../services/data-api.service";
import { lastValueFrom } from 'rxjs';
import {AppComponent} from "../app.component";
import {Router} from "@angular/router";
import * as XLSX from "xlsx";
import {BaseChartDirective} from "ng2-charts";
import 'chartjs-adapter-date-fns'

@Component({
  selector: 'app-macro-indicator',
  templateUrl: './macro-indicator.component.html',
  styleUrls: ['./macro-indicator.component.scss']
})
export class MacroIndicatorComponent implements OnInit {

  showSearch: boolean = false

  @ViewChild(BaseChartDirective) chart: any;

  indiData: { code: string; countries: { data: any; name: string, color: () => string }[] }[] = [{
    'code': 'gdp_current_usd',
    'countries': [
      {
        'name': 'USA',
        'color': () => {
          return this.HSLToHex(260 - (360 * (Math.floor(260 / 360))), 100, 50)
        },
        'data': undefined
      }
    ]
  }]
  optionsConfig: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    fill: 'start',

    scales: {
      x: {
        display: true,
        type: "time",
        grid: {
          display: false,
          borderColor: '#4e4e4e'
        },
        ticks: {
          source: 'auto',
          display: true,
          minRotation: 0,
          maxRotation: 0,
        }
      },
      y: {
        display: true,
        beginAtZero: false,
        position: 'right',
        grid: {
          display: false,
          borderColor: '#4e4e4e'
        },
        grace: 1,
        ticks: {
          source: 'auto',
          display: true,
          minRotation: 0,
          maxRotation: 0,
        }
      }
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: false
      },
      tooltip: {
        intersect: false,
        mode: 'index',
        displayColors: false,
        backgroundColor: '#202020'
      }
    },
  }

  indicators: string[] = ["gdp_current_usd"]
  searchIndicators: string[] = []
  countries: string[] = ["USA"]
  searchCountries: string[] = []

  selectedTab: string = 'chart'
  selectedIndi: number = 0
  searchTab: string = 'indicators'

  indiDict: any = [
    { 'code': 'gdp_current_usd', 'name': 'GDP (current US$)' },
    { 'code': 'real_interest_rate', 'name': 'Real interest rate (%)' },
    { 'code': 'population_total', 'name': 'Population, total' },
    { 'code': 'population_growth_annual', 'name': 'Population growth (annual %)' },
    { 'code': 'inflation_consumer_prices_annual', 'name': 'Inflation, consumer prices (annual %)' },
    { 'code': 'consumer_price_index', 'name': 'Consumer Price Index (2010 = 100)' },
    { 'code': 'gdp_per_capita_usd', 'name': 'GDP per capita (current US$)' },
    { 'code': 'gdp_growth_annual', 'name': 'GDP growth (annual %)' },
    { 'code': 'debt_percent_gdp', 'name': 'Debt in percent of GDP (annual %)' },
    { 'code': 'net_trades_goods_services', 'name': 'Net trades in goods and services (current US$)' },
    { 'code': 'inflation_gdp_deflator_annual', 'name': 'Inflation, GDP deflator (annual %)' },
    { 'code': 'agriculture_value_added_percent_gdp', 'name': 'Agriculture, value added (% of GDP)' },
    { 'code': 'industry_value_added_percent_gdp', 'name': 'Industry, value added (% of GDP)' },
    { 'code': 'services_value_added_percent_gdp', 'name': 'Services, etc., value added (% of GDP)' },
    { 'code': 'exports_of_goods_services_percent_gdp', 'name': 'Exports of goods and services (% of GDP)' },
    { 'code': 'imports_of_goods_services_percent_gdp', 'name': 'Imports of goods and services (% of GDP)' },
    { 'code': 'gross_capital_formation_percent_gdp', 'name': 'Gross capital formation (% of GDP)' },
    { 'code': 'net_migration', 'name': 'Net migration (absolute value)' },
    { 'code': 'gni_usd', 'name': 'GNI, Atlas method (current US$)' },
    { 'code': 'gni_per_capita_usd', 'name': 'GNI per capita, Atlas method (current US$)' },
    { 'code': 'gni_ppp_usd', 'name': 'GNI, PPP (current international $)' },
    { 'code': 'gni_per_capita_ppp_usd', 'name': 'GNI per capita, PPP (current international $)' },
    { 'code': 'income_share_lowest_twenty', 'name': 'Income share held by lowest 20% (in %)' },
    { 'code': 'life_expectancy', 'name': 'Life expectancy at birth, total (years)' },
    { 'code': 'fertility_rate', 'name': 'Fertility rate, total (births per woman)' },
    { 'code': 'prevalence_hiv_total', 'name': 'Prevalence of HIV, total (% of population ages 15-49)' },
    { 'code': 'co2_emissions_tons_per_capita', 'name': 'CO2 emissions (metric tons per capita)' },
    { 'code': 'surface_area_km', 'name': 'Surface area (sq. km)' },
    { 'code': 'poverty_poverty_lines_percent_population', 'name': 'Poverty headcount ratio at national poverty lines (% of population)' },
    { 'code': 'revenue_excluding_grants_percent_gdp', 'name': 'Revenue, excluding grants (% of GDP)' },
    { 'code': 'cash_surplus_deficit_percent_gdp', 'name': 'Cash surplus/deficit (% of GDP)' },
    { 'code': 'startup_procedures_register', 'name': 'Start-up procedures to register a business (number)' },
    { 'code': 'market_cap_domestic_companies_percent_gdp', 'name': 'Market capitalization of listed domestic companies (% of GDP)' },
    { 'code': 'mobile_subscriptions_per_hundred', 'name': 'Mobile cellular subscriptions (per 100 people)' },
    { 'code': 'internet_users_per_hundred', 'name': 'Internet users (per 100 people)' },
    { 'code': 'high_technology_exports_percent_total', 'name': 'High-technology exports (% of manufactured exports)' },
    { 'code': 'merchandise_trade_percent_gdp', 'name': 'Merchandise trade (% of GDP)' },
    { 'code': 'total_debt_service_percent_gni', 'name': 'ReveTotal debt service (% of GNI)' },
    { 'code': 'unemployment_total_percent', 'name': 'Unemployment total (% of labor force)' }
  ]
  countriesDict: any[] = [{'code': 'ABW', 'name': 'Aruba'}, {'code': 'AFG', 'name': 'Afghanistan'}, {'code': 'AGO', 'name': 'Angola'}, {'code': 'ALB', 'name': 'Albania'}, {'code': 'AND', 'name': 'Andorra'}, {'code': 'ARE', 'name': 'United Arab Emirates'}, {'code': 'ARG', 'name': 'Argentina'}, {'code': 'ARM', 'name': 'Armenia'}, {'code': 'ASM', 'name': 'American Samoa'}, {'code': 'ATG', 'name': 'Antigua and Barbuda'}, {'code': 'AUS', 'name': 'Australia'}, {'code': 'AUT', 'name': 'Austria'}, {'code': 'AZE', 'name': 'Azerbaijan'}, {'code': 'BDI', 'name': 'Burundi'}, {'code': 'BEL', 'name': 'Belgium'}, {'code': 'BEN', 'name': 'Benin'}, {'code': 'BFA', 'name': 'Burkina Faso'}, {'code': 'BGD', 'name': 'Bangladesh'}, {'code': 'BGR', 'name': 'Bulgaria'}, {'code': 'BHR', 'name': 'Bahrain'}, {'code': 'BHS', 'name': 'Bahamas'}, {'code': 'BIH', 'name': 'Bosnia and Herzegovina'}, {'code': 'BLR', 'name': 'Belarus'}, {'code': 'BLZ', 'name': 'Belize'}, {'code': 'BMU', 'name': 'Bermuda'}, {'code': 'BOL', 'name': 'Bolivia (Plurinational State of)'}, {'code': 'BRA', 'name': 'Brazil'}, {'code': 'BRB', 'name': 'Barbados'}, {'code': 'BRN', 'name': 'Brunei Darussalam'}, {'code': 'BTN', 'name': 'Bhutan'}, {'code': 'BWA', 'name': 'Botswana'}, {'code': 'CAF', 'name': 'Central African Republic'}, {'code': 'CAN', 'name': 'Canada'}, {'code': 'CHE', 'name': 'Switzerland'}, {'code': 'CHL', 'name': 'Chile'}, {'code': 'CHN', 'name': 'China'}, {'code': 'CIV', 'name': "Ivory Coast"}, {'code': 'CMR', 'name': 'Cameroon'}, {'code': 'COD', 'name': 'Congo, Democratic Republic of the'}, {'code': 'COG', 'name': 'Congo'}, {'code': 'COL', 'name': 'Colombia'}, {'code': 'COM', 'name': 'Comoros'}, {'code': 'CPV', 'name': 'Cabo Verde'}, {'code': 'CRI', 'name': 'Costa Rica'}, {'code': 'CUB', 'name': 'Cuba'}, {'code': 'CUW', 'name': 'CuraÃ§ao'}, {'code': 'CYM', 'name': 'Cayman Islands'}, {'code': 'CYP', 'name': 'Cyprus'}, {'code': 'CZE', 'name': 'Czechia'}, {'code': 'DEU', 'name': 'Germany'}, {'code': 'DJI', 'name': 'Djibouti'}, {'code': 'DMA', 'name': 'Dominica'}, {'code': 'DNK', 'name': 'Denmark'}, {'code': 'DOM', 'name': 'Dominican Republic'}, {'code': 'DZA', 'name': 'Algeria'}, {'code': 'ECU', 'name': 'Ecuador'}, {'code': 'EGY', 'name': 'Egypt'}, {'code': 'ERI', 'name': 'Eritrea'}, {'code': 'ESP', 'name': 'Spain'}, {'code': 'EST', 'name': 'Estonia'}, {'code': 'ETH', 'name': 'Ethiopia'}, {'code': 'FIN', 'name': 'Finland'}, {'code': 'FJI', 'name': 'Fiji'}, {'code': 'FRA', 'name': 'France'}, {'code': 'FRO', 'name': 'Faroe Islands'}, {'code': 'FSM', 'name': 'Micronesia (Federated States of)'}, {'code': 'GAB', 'name': 'Gabon'}, {'code': 'GBR', 'name': 'United Kingdom of Great Britain and Northern Ireland'}, {'code': 'GEO', 'name': 'Georgia'}, {'code': 'GHA', 'name': 'Ghana'}, {'code': 'GIB', 'name': 'Gibraltar'}, {'code': 'GIN', 'name': 'Guinea'}, {'code': 'GMB', 'name': 'Gambia'}, {'code': 'GNB', 'name': 'Guinea-Bissau'}, {'code': 'GNQ', 'name': 'Equatorial Guinea'}, {'code': 'GRC', 'name': 'Greece'}, {'code': 'GRD', 'name': 'Grenada'}, {'code': 'GRL', 'name': 'Greenland'}, {'code': 'GTM', 'name': 'Guatemala'}, {'code': 'GUM', 'name': 'Guam'}, {'code': 'GUY', 'name': 'Guyana'}, {'code': 'HKG', 'name': 'Hong Kong'}, {'code': 'HND', 'name': 'Honduras'}, {'code': 'HRV', 'name': 'Croatia'}, {'code': 'HTI', 'name': 'Haiti'}, {'code': 'HUN', 'name': 'Hungary'}, {'code': 'IDN', 'name': 'Indonesia'}, {'code': 'IMN', 'name': 'Isle of Man'}, {'code': 'IND', 'name': 'India'}, {'code': 'IRL', 'name': 'Ireland'}, {'code': 'IRN', 'name': 'Iran (Islamic Republic of)'}, {'code': 'IRQ', 'name': 'Iraq'}, {'code': 'ISL', 'name': 'Iceland'}, {'code': 'ISR', 'name': 'Israel'}, {'code': 'ITA', 'name': 'Italy'}, {'code': 'JAM', 'name': 'Jamaica'}, {'code': 'JOR', 'name': 'Jordan'}, {'code': 'JPN', 'name': 'Japan'}, {'code': 'KAZ', 'name': 'Kazakhstan'}, {'code': 'KEN', 'name': 'Kenya'}, {'code': 'KGZ', 'name': 'Kyrgyzstan'}, {'code': 'KHM', 'name': 'Cambodia'}, {'code': 'KIR', 'name': 'Kiribati'}, {'code': 'KNA', 'name': 'Saint Kitts and Nevis'}, {'code': 'KOR', 'name': 'Korea, Republic of'}, {'code': 'KWT', 'name': 'Kuwait'}, {'code': 'LAO', 'name': "Lao People's Democratic Republic"}, {'code': 'LBN', 'name': 'Lebanon'}, {'code': 'LBR', 'name': 'Liberia'}, {'code': 'LBY', 'name': 'Libya'}, {'code': 'LCA', 'name': 'Saint Lucia'}, {'code': 'LIE', 'name': 'Liechtenstein'}, {'code': 'LKA', 'name': 'Sri Lanka'}, {'code': 'LSO', 'name': 'Lesotho'}, {'code': 'LTU', 'name': 'Lithuania'}, {'code': 'LUX', 'name': 'Luxembourg'}, {'code': 'LVA', 'name': 'Latvia'}, {'code': 'MAC', 'name': 'Macao'}, {'code': 'MAF', 'name': 'Saint Martin (French part)'}, {'code': 'MAR', 'name': 'Morocco'}, {'code': 'MCO', 'name': 'Monaco'}, {'code': 'MDA', 'name': 'Moldova, Republic of'}, {'code': 'MDG', 'name': 'Madagascar'}, {'code': 'MDV', 'name': 'Maldives'}, {'code': 'MEX', 'name': 'Mexico'}, {'code': 'MHL', 'name': 'Marshall Islands'}, {'code': 'MKD', 'name': 'North Macedonia'}, {'code': 'MLI', 'name': 'Mali'}, {'code': 'MLT', 'name': 'Malta'}, {'code': 'MMR', 'name': 'Myanmar'}, {'code': 'MNE', 'name': 'Montenegro'}, {'code': 'MNG', 'name': 'Mongolia'}, {'code': 'MNP', 'name': 'Northern Mariana Islands'}, {'code': 'MOZ', 'name': 'Mozambique'}, {'code': 'MRT', 'name': 'Mauritania'}, {'code': 'MUS', 'name': 'Mauritius'}, {'code': 'MWI', 'name': 'Malawi'}, {'code': 'MYS', 'name': 'Malaysia'}, {'code': 'NAM', 'name': 'Namibia'}, {'code': 'NCL', 'name': 'New Caledonia'}, {'code': 'NER', 'name': 'Niger'}, {'code': 'NGA', 'name': 'Nigeria'}, {'code': 'NIC', 'name': 'Nicaragua'}, {'code': 'NLD', 'name': 'Netherlands'}, {'code': 'NOR', 'name': 'Norway'}, {'code': 'NPL', 'name': 'Nepal'}, {'code': 'NRU', 'name': 'Nauru'}, {'code': 'NZL', 'name': 'New Zealand'}, {'code': 'OMN', 'name': 'Oman'}, {'code': 'PAK', 'name': 'Pakistan'}, {'code': 'PAN', 'name': 'Panama'}, {'code': 'PER', 'name': 'Peru'}, {'code': 'PHL', 'name': 'Philippines'}, {'code': 'PLW', 'name': 'Palau'}, {'code': 'PNG', 'name': 'Papua New Guinea'}, {'code': 'POL', 'name': 'Poland'}, {'code': 'PRI', 'name': 'Puerto Rico'}, {'code': 'PRK', 'name': "Korea (Democratic People's Republic of)"}, {'code': 'PRT', 'name': 'Portugal'}, {'code': 'PRY', 'name': 'Paraguay'}, {'code': 'PSE', 'name': 'Palestine, State of'}, {'code': 'PYF', 'name': 'French Polynesia'}, {'code': 'QAT', 'name': 'Qatar'}, {'code': 'ROU', 'name': 'Romania'}, {'code': 'RUS', 'name': 'Russian Federation'}, {'code': 'RWA', 'name': 'Rwanda'}, {'code': 'SAU', 'name': 'Saudi Arabia'}, {'code': 'SDN', 'name': 'Sudan'}, {'code': 'SEN', 'name': 'Senegal'}, {'code': 'SGP', 'name': 'Singapore'}, {'code': 'SLB', 'name': 'Solomon Islands'}, {'code': 'SLE', 'name': 'Sierra Leone'}, {'code': 'SLV', 'name': 'El Salvador'}, {'code': 'SMR', 'name': 'San Marino'}, {'code': 'SOM', 'name': 'Somalia'}, {'code': 'SRB', 'name': 'Serbia'}, {'code': 'SSD', 'name': 'South Sudan'}, {'code': 'STP', 'name': 'Sao Tome and Principe'}, {'code': 'SUR', 'name': 'Suriname'}, {'code': 'SVK', 'name': 'Slovakia'}, {'code': 'SVN', 'name': 'Slovenia'}, {'code': 'SWE', 'name': 'Sweden'}, {'code': 'SWZ', 'name': 'Eswatini'}, {'code': 'SXM', 'name': 'Sint Maarten (Dutch part)'}, {'code': 'SYC', 'name': 'Seychelles'}, {'code': 'SYR', 'name': 'Syrian Arab Republic'}, {'code': 'TCA', 'name': 'Turks and Caicos Islands'}, {'code': 'TCD', 'name': 'Chad'}, {'code': 'TGO', 'name': 'Togo'}, {'code': 'THA', 'name': 'Thailand'}, {'code': 'TJK', 'name': 'Tajikistan'}, {'code': 'TKM', 'name': 'Turkmenistan'}, {'code': 'TLS', 'name': 'Timor-Leste'}, {'code': 'TON', 'name': 'Tonga'}, {'code': 'TTO', 'name': 'Trinidad and Tobago'}, {'code': 'TUN', 'name': 'Tunisia'}, {'code': 'TUR', 'name': 'Turkey'}, {'code': 'TUV', 'name': 'Tuvalu'}, {'code': 'TZA', 'name': 'Tanzania, United Republic of'}, {'code': 'UGA', 'name': 'Uganda'}, {'code': 'UKR', 'name': 'Ukraine'}, {'code': 'URY', 'name': 'Uruguay'}, {'code': 'USA', 'name': 'United States of America'}, {'code': 'UZB', 'name': 'Uzbekistan'}, {'code': 'VCT', 'name': 'Saint Vincent and the Grenadines'}, {'code': 'VEN', 'name': 'Venezuela (Bolivarian Republic of)'}, {'code': 'VGB', 'name': 'Virgin Islands (British)'}, {'code': 'VIR', 'name': 'Virgin Islands (U.S.)'}, {'code': 'VNM', 'name': 'Viet Nam'}, {'code': 'VUT', 'name': 'Vanuatu'}, {'code': 'WSM', 'name': 'Samoa'}, {'code': 'YEM', 'name': 'Yemen'}, {'code': 'ZAF', 'name': 'South Africa'}, {'code': 'ZMB', 'name': 'Zambia'}, {'code': 'ZWE', 'name': 'Zimbabwe'}]
  indiSearchResults = this.indiDict
  countriesSearchResults = this.countriesDict

  getNavigatorLanguage = () => (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language || 'en'
  intlFormatObjs: { 'decimal': any, 'currency': any, 'percent': any, 'compact': any } = {
    'decimal': Intl.NumberFormat(this.getNavigatorLanguage()),
    'currency': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'currency', 'currency': 'USD', 'minimumFractionDigits': 0}),
    'percent': Intl.NumberFormat(this.getNavigatorLanguage(), {'style': 'percent', 'maximumFractionDigits': 2}),
    'compact': Intl.NumberFormat(this.getNavigatorLanguage(), {'notation': 'compact'})
  }

  constructor(private service: DataApiService, public app: AppComponent, private router: Router) {
    this.service.getMacroIndicator(this.countries[0], this.indicators[0]).subscribe((response: any) => {
      this.indiData[0]['countries'][0]['data'] = response.map((a: any) => ({x: a['Date'], y: a['Value']}))
    })
  }

  ngOnInit(): void {
  }

  updateChartBackground(data: any, color: string, height?: number) {
    if (this.chart && data['data'][0]) {
      const ctx = document.createElement('canvas').getContext('2d');
      let gradient

      if (height) {
        gradient = ctx!.createLinearGradient(0, -(height * 0.1), 0, height * 0.9);
      }
      else {
        gradient = ctx!.createLinearGradient(0, -(this.chart.ctx.canvas.height * 0.1), 0, this.chart.ctx.canvas.height * 0.9);
      }

      gradient.addColorStop(0, color);
      gradient.addColorStop(1, '#0000');

      data['borderColor'] = color
      data['backgroundColor'] = gradient
    }
  }

  getNameFromCode(code: string, type: 'indi' | 'country'): string | undefined {
    let match
    if (type == 'indi') {
      match = this.indiDict.find((item: { code: string, name: string }) => item.code === code)
    }
    else {
      match = this.countriesDict.find((item: { code: string, name: string }) => item.code === code)
    }
    return match ? match.name : undefined
  }

  changeIndi(n: number) {
    if (this.selectedIndi + n > this.indicators.length - 1) {
      this.selectedIndi = 0
    }
    else if (this.selectedIndi + n < 0) {
      this.selectedIndi = this.indicators.length - 1
    }
    else {
      this.selectedIndi += n
    }
  }

  HSLToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c: number = (1 - Math.abs(2 * l - 1)) * s;
    const x: number = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m: number = l - c / 2;
    let r: number = 0, g: number = 0, b: number = 0;

    if (0 <= h && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
      [r, g, b] = [x, 0, c];
    } else if (300 <= h && h < 360) {
      [r, g, b] = [c, 0, x];
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    const hexR: string = r.toString(16).padStart(2, '0');
    const hexG: string = g.toString(16).padStart(2, '0');
    const hexB: string = b.toString(16).padStart(2, '0');

    return `#${hexR}${hexG}${hexB}`;
  }

  getDataConfig(data: any) {
    let dataConfig: any = {
      'datasets': []
    }

    data.forEach((d: any) => {
      dataConfig['datasets'].push({
        'label': '',
        'data': d['data'],
        'borderColor': d['color'],
        'pointBackgroundColor': d['color'],
        'pointBorderColor': d['color'],
        'tension': 0.2,
        'backgroundColor': 'white'
      })

      if (d['data'] && d['data'].length > 0) {
        let color: string

        if (d['data'][0]['y'] < d['data'].slice(-1)[0]['y']) {
          color = '#1aff7e'
        } else if (d['data'][0]['y'] > d['data'].slice(-1)[0]['y']) {
          color = '#ff1a45'
        } else {
          color = 'white'
        }

        this.updateChartBackground(dataConfig['datasets'].slice(-1)[0], d['color']())
      }
    })

    return dataConfig
  }

  searchIndicator(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    let results: any[] = [];
    if (search.length == 0) {
      results = this.indiDict
    }
    else {
      for (const indicator of this.indiDict) {
        if (
          indicator.code.toLowerCase().includes(search.toLowerCase()) ||
          indicator.name.toLowerCase().includes(search.toLowerCase())
        ) {
          results.push(indicator);
        }
      }
    }
    this.indiSearchResults = results;
  }

  searchCountry(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    let results: any[] = [];
    if (search.length == 0) {
      results = this.countriesDict
    }
    else {
      for (const country of this.countriesDict) {
        if (
          country.code.toLowerCase().includes(search.toLowerCase()) ||
          country.name.toLowerCase().includes(search.toLowerCase())
        ) {
          results.push(country);
        }
      }
    }
    this.countriesSearchResults = results;
  }

  toggleSearch() {
    this.showSearch = !this.showSearch

    if (this.showSearch) {
      this.indiSearchResults = this.indiDict
      this.countriesSearchResults = this.countriesDict
      this.searchIndicators = this.indicators.slice()
      this.searchCountries = this.countries.slice()
    }
  }

  clickOnIndi(indi: string) {
    if (!this.searchIndicators.includes(indi) && this.searchIndicators.length < 4) {
      this.searchIndicators.push(indi)
    }
    else if (this.searchIndicators.includes(indi) && this.searchIndicators.length > 1) {
      this.searchIndicators.splice(this.searchIndicators.indexOf(indi), 1)
    }
  }

  clickOnCountry(country: string) {
    if (!this.searchCountries.includes(country) && this.searchCountries.length < 3) {
      this.searchCountries.push(country)
    }
    else if (this.searchCountries.includes(country) && this.searchCountries.length > 1) {
      this.searchCountries.splice(this.searchCountries.indexOf(country), 1)
    }
  }

  async apply() {
    const newIndicators = this.searchIndicators.filter(indi => !this.indicators.includes(indi));
    const removedIndicators = this.indicators.filter(indi => !this.searchIndicators.includes(indi));

    for (const indi of newIndicators) {
      this.indicators.push(indi);
      this.indiData.push({
        'code': indi,
        'countries': []
      });
    }

    for (const indi of removedIndicators) {
      const index = this.indicators.indexOf(indi);
      this.indicators.splice(index, 1);
      this.indiData.splice(index, 1);
    }

    for (const country of this.searchCountries) {
      if (!this.countries.includes(country)) {
        this.countries.push(country);
      }
      for (const indi of this.indiData) {
        if (!indi['countries'].some((c: any) => c['name'] === country)) {
          const response: any = await lastValueFrom(this.service.getMacroIndicator(country, indi['code']));
          indi['countries'].push({
            'name': country,
            'data': response.map((a: any) => ({ x: a['Date'], y: a['Value'] })),
            'color': () => {
              return this.HSLToHex((72 * this.countries.indexOf(country) + 260) - (360 * (Math.floor((72 * this.countries.indexOf(country) + 260) / 360))), 100, 50)
            }
          });
        }
      }
    }

    for (const indi of this.indiData) {
      indi['countries'] = indi['countries'].filter((c: any) => this.searchCountries.includes(c['name']));
    }

    this.indiData = this.indiData.filter(indi => indi['countries'].length > 0);
    this.indicators = this.indiData.map(indi => indi['code']);

    this.countries = this.countries.filter(country => this.searchCountries.includes(country));

    if (this.selectedIndi > this.indicators.length - 1) {
      this.selectedIndi = this.indicators.length - 1
    }
  }

  deleteIndicator(index: number) {
    this.indicators.splice(index, 1)
    this.indiData.splice(index, 1)

    if (this.selectedIndi > this.indicators.length - 1) {
      this.selectedIndi = this.indicators.length - 1
    }
  }

  deleteCountry(index: number) {
    if (this.countries.length > 1) {
      this.countries.splice(index, 1)

      for (const indi of this.indiData) {
        indi['countries'].splice(index, 1)
      }
    }
  }

  getFileName(name: string | undefined){
    let timeSpan = new Date().toISOString();
    let sheetName = name || "ExportResult";
    let fileName = `${sheetName}-${timeSpan}`;
    return {
      sheetName,
      fileName
    };
  };

  exportArrayToExcel() {
    let wb = XLSX.utils.book_new();
    const allData: { sheetName: string; dataToExport: { date: string; value: number; }[]; }[] = [];

    this.indiData[this.selectedIndi].countries.forEach((country: { name: string, data: { x: string, y: number }[] }) => {
      const sheetName = country.name;
      const dataToExport = country.data.map(item => {
        return { date: item.x, value: item.y };
      });
      allData.push({ sheetName, dataToExport });
    });

    allData.forEach(({ sheetName, dataToExport }) => {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    let { fileName } = this.getFileName(this.getNameFromCode(this.indicators[this.selectedIndi], 'indi'));
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  closePremiumPopup() {
    this.router.navigateByUrl(`/`)
      .then(() => {
        location.reload();
      });
  }
}
