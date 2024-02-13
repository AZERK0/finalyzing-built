import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MacroIndicatorComponent } from './macro-indicator.component';

describe('MacroIndicatorComponent', () => {
  let component: MacroIndicatorComponent;
  let fixture: ComponentFixture<MacroIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MacroIndicatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MacroIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
