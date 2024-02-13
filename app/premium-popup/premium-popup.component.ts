import {Component, Input, Renderer2} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-premium-popup',
  templateUrl: './premium-popup.component.html',
  styleUrls: ['./premium-popup.component.scss']
})
export class PremiumPopupComponent {
  @Input() src: string = 'default';
  @Input() host: any | undefined

  listenerFn: (() => void) | undefined;

  constructor(private renderer: Renderer2, public app: AppComponent) {}

  ngOnInit() {
    if (this.host) {
      this.listenerFn = this.renderer.listen('window', 'mousedown', (e: any) => {
        if (e.target.localName == "app-premium-popup") {
          this.host.closePremiumPopup()
        }
      })
    }
  }

  ngOnDestroy() {
    if (this.listenerFn) {
      this.listenerFn()
    }
  }
}
