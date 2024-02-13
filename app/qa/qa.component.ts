import { Component } from '@angular/core';

@Component({
  selector: 'app-qa',
  templateUrl: './qa.component.html',
  styleUrls: ['./qa.component.scss']
})
export class QaComponent {
  inViewId: string | undefined;

  ngAfterViewInit() {
    this.inViewId = document.getElementsByClassName('paragraphs')[0].id

    window.addEventListener('scroll', () => {
      const elementsArray = Array.from(document.getElementsByClassName('paragraphs'));
      const filteredElements = elementsArray.filter((el: any) => (el.getBoundingClientRect().top > 120 || el.getBoundingClientRect().top + el.offsetHeight > window.innerHeight / 2));

      this.inViewId = filteredElements[0].id;
    });
  }
}
