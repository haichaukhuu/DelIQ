import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TicketPath, TicketSort, TicketStatus } from '../../../models/ticket.model';

@Component({
  selector: 'app-dashboard-filters',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './dashboard-filters.component.html',
  styleUrl: './dashboard-filters.component.scss',
})
export class DashboardFiltersComponent {
  @Input() query = '';
  @Input() filterPath: TicketPath | '' = '';
  @Input() filterStatus: TicketStatus | '' = '';
  @Input() filterType = '';
  @Input() sort: TicketSort = 'default';
  @Input() statuses: TicketStatus[] = [];
  @Input() issueTypes: string[] = [];

  @Output() queryChange = new EventEmitter<string>();
  @Output() filterPathChange = new EventEmitter<TicketPath | ''>();
  @Output() filterStatusChange = new EventEmitter<TicketStatus | ''>();
  @Output() filterTypeChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<TicketSort>();
}
