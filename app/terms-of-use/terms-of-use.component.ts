import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-terms-of-use',
  templateUrl: './terms-of-use.component.html',
  styleUrls: ['./terms-of-use.component.scss']
})
export class TermsOfUseComponent {
  inViewId: string | undefined;

  ngAfterViewInit() {
    this.inViewId = document.getElementsByClassName('paragraphs')[0].id

    window.addEventListener('scroll', () => {
      const elementsArray = Array.from(document.getElementsByClassName('paragraphs'));
      const filteredElements = elementsArray.filter((el: any) => el.getBoundingClientRect().top > 120);

      this.inViewId = filteredElements[0].id;
    });
  }
}
