import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartEmbedComponent } from './chart-embed.component';

describe('ChartEmbedComponent', () => {
  let component: ChartEmbedComponent;
  let fixture: ComponentFixture<ChartEmbedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChartEmbedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartEmbedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
