import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { TicketItem } from '../../../models/ticket.model';

@Component({
  selector: 'app-ticket-card',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatRadioModule,
    MatSelectModule,
  ],
  templateUrl: './ticket-card.component.html',
  styleUrl: './ticket-card.component.scss',
})
export class TicketCardComponent {
  @Input({ required: true }) ticket!: TicketItem;
  @Input() isOpen = false;
  @Input() selectedRecommendation = 0;
  @Input() isRejectOpen = false;

  @Output() openToggle = new EventEmitter<void>();
  @Output() recommendationChange = new EventEmitter<number>();
  @Output() approve = new EventEmitter<void>();
  @Output() reject = new EventEmitter<string>();
  @Output() rejectToggle = new EventEmitter<void>();
  @Output() takeOwnership = new EventEmitter<void>();
  @Output() markResolved = new EventEmitter<void>();

  formatSla(minutes: number): string {
    return minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes}m`;
  }
}
