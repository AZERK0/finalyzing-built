import {Injectable, ViewChild} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import { v4 as uuidv4 } from 'uuid';
import {Observable} from "rxjs";
import { mergeMap } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';


@Injectable({
  providedIn: 'root'
})
export class AccountApiService {

  private url = 'https://accounts.finalyzing.com/api/v1';

  constructor(private httpClient: HttpClient) {
  }

  hashPassword(password: string): string {
    const saltRounds = 10;
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.SHA256(password + salt).toString();

    return salt.toString() + ":" + hash;
  }

  register(username: string, password: string, email: string): Observable<any> {
    const user = {
      username: username,
      password: this.hashPassword(password),
      email: email,
      id: uuidv4(),
      description: ''
    };

    return this.httpClient.post(this.url + `/register`, user);
  }

  getSalt(email: string): Observable<any> {
    const user = {
      email: email
    };

    return this.httpClient.post(this.url + `/get_salt`, user);
  }

  login(email: string, password: string): Observable<any> {
    return this.getSalt(email).pipe(
      mergeMap((response) => {
        const credentials = {
          email: email,
          password: CryptoJS.SHA256(password + response['salt']).toString()
        };

        return this.httpClient.post(this.url + '/login', credentials).pipe();
      })
    );
  }

  verify_2fa(email: string, password: string, verification_code: string): Observable<any> {
    return this.getSalt(email).pipe(
      mergeMap((response) => {
        const credentials = {
          email: email,
          password: CryptoJS.SHA256(password + response['salt']).toString(),
          verification_code: CryptoJS.SHA256(verification_code).toString()
        };

        return this.httpClient.post(this.url + '/verify_2fa', credentials).pipe();
      })
    );
  }

  passwordResetRequest(email: string) {
    return this.httpClient.post(this.url + '/password_reset_request', {'email': email})
  }

  resetPassword(token: string, password: string) {
    const credentials = {
      token: CryptoJS.SHA256(token).toString(),
      password: this.hashPassword(password)
    };

    return this.httpClient.post(this.url + '/reset_password', credentials)
  }

  editUsername(username: string) {
    return this.httpClient.post(this.url + '/edit_username', {'username': username})
  }

  editDescription(description: string) {
    return this.httpClient.post(this.url + '/edit_description', {'description': description})
  }

  checkUsername(username: string) {
    return this.httpClient.get(this.url + `/check_username?username=${username}`);
  }

  getUserInfo(): Observable<any> {
    return this.httpClient.get(this.url + '/user_info')
  }

  getPublicUserInfo(username: string): Observable<any> {
    return this.httpClient.post(this.url + '/public_user_info', {'username': username})
  }

  createCheckoutSession(lookupKey: string) {
    return this.httpClient.post(this.url + '/create_checkout_session', {'lookup_key': lookupKey})
  }

  createBillingPortalSession() {
    return this.httpClient.post(this.url + '/create_billing_portal_session', {})
  }

  createGroup(name: string, visibility: string) {
    return this.httpClient.post(this.url + '/create_group', {'name': name, 'visibility': visibility})
  }

  getGroups() {
    return this.httpClient.post(this.url + '/get_groups', {})
  }

  getPublicGroups(user_id: string) {
        return this.httpClient.post(this.url + '/get_public_groups', {'user_id': user_id})
  }

  editGroup(id: number, name: string, visibility: string) {
    return this.httpClient.post(this.url + '/edit_group', {'id': id, 'name': name, 'visibility': visibility})
  }

  deleteGroup(id: number) {
        return this.httpClient.post(this.url + '/delete_group', {'id': id})
  }

  createPortfolio(name: string, type: string, group_id: number) {
    return this.httpClient.post(this.url + '/create_portfolio', {'name': name, 'type': type, 'group_id': group_id})
  }

  getPortfolios(group_id: number) {
    return this.httpClient.post(this.url + '/get_portfolios', {'group_id': group_id})
  }

  getBoursoramaPortfolio() {
    return this.httpClient.post(this.url + '/get_boursorama_portfolio', {})
  }

  editPortfolio(id: number, name: string) {
    return this.httpClient.post(this.url + '/edit_portfolio', {'id': id, 'name': name})
  }

  deletePortfolio(id: number) {
    return this.httpClient.post(this.url + '/delete_portfolio', {'id': id})
  }

  createPosition(portfolio_id: number, type: 'long' | 'short', ticker: string, enter_price: number, enter_date: string, quantity: number) {
    return this.httpClient.post(this.url + '/create_position', {'portfolio_id': portfolio_id, 'type': type, 'ticker': ticker, 'enter_price': enter_price, 'enter_date': enter_date, 'quantity': quantity})
  }

  closePosition(id: number, close_price: number, close_date: string) {
    return this.httpClient.post(this.url + '/close_position', {'id': id, 'close_price': close_price, 'close_date': close_date})
  }

  getPositions(portfolio_id: number) {
    return this.httpClient.post(this.url + '/get_positions', {'portfolio_id': portfolio_id})
  }

  editPosition(id: number, type: 'long' | 'short', ticker: string, enter_price: number, enter_date: string, quantity: number) {
    return this.httpClient.post(this.url + '/edit_position', {'id': id, 'type': type, 'ticker': ticker, 'enter_price': enter_price, 'enter_date': enter_date, 'quantity': quantity})
  }

  deletePosition(id: number) {
    return this.httpClient.post(this.url + '/delete_position', {'id': id})
  }

  toggleWatchlist(ticker: string) {
    return this.httpClient.post(this.url + '/toggle_watchlist', {'ticker': ticker})
  }

  getData(ticker: string) {
    return this.httpClient.post(this.url + '/get_data', {'ticker': ticker})
  }

  saveData(ticker: string, data: any) {
    const credentials = {
      'ticker': ticker,
      'data': data
    }

    return this.httpClient.post(this.url + '/save_data', credentials)
  }
}
