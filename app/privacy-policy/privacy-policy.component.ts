import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent {
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
