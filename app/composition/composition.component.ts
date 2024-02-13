import {Component, HostListener, Input, OnInit} from '@angular/core';
import {QuoteComponent} from "../quote/quote.component";

@Component({
  selector: 'app-composition',
  templateUrl: './composition.component.html',
  styleUrls: ['./composition.component.scss']
})
export class CompositionComponent implements OnInit {

  @Input() data: any = {'General' : {}, 'Highlights': {}, 'Technicals': {}}

  selectedData: any[] = [];
  @Input() ticker: string = 'AAPL.US'

  offset: number = 30

  constructor(public quoteComponent: QuoteComponent) { }

  ngOnInit(): void {
        if (this.data["ETF_Data"]) {
      this.data["ETF_Data"]["Holdings"] = Object.values(this.data["ETF_Data"]["Holdings"]).sort((a: any, b: any) => {
        const percentageA = a["Assets_%"];
        const percentageB = b["Assets_%"];
        return percentageB - percentageA;
      });


      if (Object.values(this.data["ETF_Data"]["Holdings"]).length - 1 > this.offset) {
        const newData = Object.values(this.data["ETF_Data"]["Holdings"]).slice(0, this.offset);
        this.selectedData = this.selectedData.concat(newData);
      } else {
        const newData = Object.values(this.data["ETF_Data"]["Holdings"]).slice(0, Object.values(this.data["ETF_Data"]["Holdings"]).length - 1);
        this.selectedData = this.selectedData.concat(newData);
      }
    } else {
      this.selectedData =  Object.values(this.data["Components"])
    }
  }

  @HostListener('scroll', ['$event'])
  onScroll(event: any) {
    if (this.data["ETF_Data"]) {
            if (event.target.scrollHeight - event.target.scrollTop - event.target.clientHeight < 100) {
        if (Object.values(this.data["ETF_Data"]["Holdings"]).length > this.offset) {
          const newData = Object.values(this.data["ETF_Data"]["Holdings"]).slice(this.offset, this.offset + 30);
          this.offset += 30
          this.selectedData = this.selectedData.concat(newData);
        } else {
          const newData = Object.values(this.data["ETF_Data"]["Holdings"]).slice(this.offset, -1);
          this.selectedData = this.selectedData.concat(newData);
        }
      }
    }
  }

  print(a: any) {
      }

}
