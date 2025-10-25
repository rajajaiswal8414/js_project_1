<div id="doctor-dashboard" class="flex min-h-screen bg-gray-100">
  <app-sidebar [doctor]="doctor"></app-sidebar>

  <main class="flex-1 p-8 overflow-y-auto">
    <app-doctor-header
      [doctor]="doctor"
      [notificationCount]="stats.notifications"
    ></app-doctor-header>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div
        class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
      >
        <div>
          <h3 class="text-gray-500 text-sm font-medium mb-1">Today's Appointments</h3>
          <p class="text-2xl font-bold text-gray-800">{{ AppointmentCount }}</p>
        </div>
        <div class="text-3xl">📅</div>
      </div>

      <div
        class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
      >
        <div>
          <h3 class="text-gray-500 text-sm font-medium mb-1">Total Patients</h3>
          <p class="text-2xl font-bold text-gray-800">{{ totalPatientCount }}</p>
        </div>
        <div class="text-3xl">👥</div>
      </div>

      <div
        class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
      >
        <div>
          <h3 class="text-sm text-gray-500 font-medium mb-1">Pending Reviews</h3>
          <p class="text-2xl font-bold text-gray-800">{{ pendingReviewsCount }}</p>
        </div>
        <div class="text-3xl">📝</div>
      </div>

      <div
        class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
      >
        <div>
          <h3 class="text-gray-500 text-sm font-medium mb-1">Avg. Rating</h3>
          <p class="text-2xl font-bold text-gray-800">4.8 ⭐</p>
        </div>
        <div class="text-3xl">⭐</div>
      </div>
    </div>

    <!-- Today's Appointments Section -->
    <div class="bg-white p-6 rounded-xl shadow mb-6">
      <div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
        <h2 class="text-xl font-semibold text-gray-800">Today's Appointments</h2>
        <button 
          (click)="viewAllAppointments()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition font-medium"
        >
          View All
        </button>
      </div>

      <!-- Loading State -->
      @if (isLoading) {
        <div class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="text-gray-600 mt-2">Loading appointments...</p>
        </div>
      }

      <!-- Appointments List -->
      @if (!isLoading && todayAppointments.length > 0) {
        @for (appointment of todayAppointments; track appointment.appointmentId) {
          <div 
            class="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-5 rounded-lg mb-4 hover:shadow-md transition"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {{ generateInitials(appointment.patient.name) }}
                </div>
                <div>
                  <div class="font-semibold text-gray-800 text-lg">
                    {{ appointment.patient.name }}
                  </div>
                  <div class="text-gray-600 text-sm mt-1 flex items-center gap-2">
                    <span>🕐</span>
                    <span>{{ appointment.startTime }} - {{ appointment.endTime }}</span>
                  </div>
                  @if (appointment.reason) {
                    <div class="text-gray-500 text-sm mt-1">
                      <strong>Reason:</strong> {{ appointment.reason }}
                    </div>
                  }
                </div>
              </div>

              <!-- Status Badge -->
              <span
                [ngClass]="{
                  'bg-green-100 text-green-800': appointment.status === 'COMPLETED',
                  'bg-blue-100 text-blue-800': appointment.status === 'CONFIRMED',
                  'bg-yellow-100 text-yellow-800': appointment.status === 'PENDING',
                  'bg-red-100 text-red-800': appointment.status === 'REJECTED'
                }"
                class="px-3 py-1 rounded-full text-sm font-semibold"
              >
                {{ appointment.status }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-2 mt-4">
              @if (appointment.status === 'COMPLETED') {
                <button 
                  (click)="addPrescription(appointment)"
                  class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                >
                  📝 Add Prescription
                </button>
              }

              @if (appointment.status === 'CONFIRMED') {
                <button
                  (click)="viewAppointmentDetails(appointment)"
                  class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium"
                >
                  👁️ View Details
                </button>
                <button
                  (click)="rescheduleAppointment(appointment)"
                  class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  🔄 Reschedule
                </button>
              }

              @if (appointment.status === 'PENDING') {
                <button
                  (click)="confirmAppointment(appointment.appointmentId)"
                  class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                >
                  ✅ Accept
                </button>
                <button
                  (click)="rejectAppointment(appointment.appointmentId)"
                  class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
                >
                  ❌ Decline
                </button>
              }

              <button
                (click)="viewPatientRecords(appointment)"
                class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                📋 View Records
              </button>
            </div>
          </div>
        }
      }

      <!-- Empty State -->
      @if (!isLoading && todayAppointments.length === 0) {
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📅</div>
          <p class="text-gray-500 text-lg font-medium">No appointments scheduled for today</p>
          <p class="text-gray-400 text-sm mt-2">Check back later or view all appointments</p>
        </div>
      }
    </div>
  </main>
</div>


import { NotificationService } from './../../../core/services/patient-notification-service';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../../core/services/doctor-appointment-service.js';
import { Appointment } from '../../../models/doctor-appointment-interface';
import { DoctorHeader } from '../../../shared/doctor/header/header.js';
import { NotificationResponseDTO } from '../../../models/notification-interface.js';
import { DoctorResponseDTO } from '../../../models/doctor-interface.js';
import { DoctorService } from '../../../core/services/doctor-service.js';
import { DoctorNotificationService } from '../../../core/services/doctor-notification-service';
import { Sidebar } from '@shared/doctor/sidebar/sidebar';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorHeader, Sidebar],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.css',
})
export class DoctorDashboard implements OnInit {
  AppointmentCount: number = 0;
  totalPatientCount: number = 0;
  pendingReviewsCount: number = 0;
  doctor: DoctorResponseDTO | null = null;
  notifications: NotificationResponseDTO[] = [];
  stats = {
    upcomingAppointments: 0,
    activePrescriptions: 0,
    medicalRecords: 0,
    notifications: 0,
  };

  todayAppointments: Appointment[] = [];
  isLoading: boolean = false;

  constructor(
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private notificationService: DoctorNotificationService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.fetchDoctorProfile();
    this.fetchNotificationCount();
    this.fetchAppointmentCount();
    this.fetchTotalPatientCount();
    this.fetchPendingReviewsCount();
    this.fetchTodayAppointments();
  }

  fetchAppointmentCount(): void {
    this.appointmentService.getTodayAppointmentCount().subscribe({
      next: (count: number) => {
        this.AppointmentCount = count;
      },
      error: (err: any) => {
        console.error('Failed to fetch today appointment count:', err);
      },
    });
  }

  fetchTotalPatientCount(): void {
    this.appointmentService.getTotalPatientCount().subscribe({
      next: (count: number) => {
        this.totalPatientCount = count;
      },
      error: (err: any) => {
        console.error('Failed to fetch total patient count:', err);
        this.totalPatientCount = 0;
      },
    });
  }

  fetchPendingReviewsCount(): void {
    this.appointmentService.getPendingReviewsCount().subscribe({
      next: (count: number) => {
        this.pendingReviewsCount = count;
      },
      error: (err: any) => {
        console.error('Failed to fetch pending reviews count:', err);
        this.pendingReviewsCount = 0;
      },
    });
  }

  fetchDoctorProfile(): void {
    this.doctorService.getLoggedInDoctorProfile().subscribe({
      next: (profile: DoctorResponseDTO) => {
        this.doctor = profile;
      },
      error: (err: any) => {
        console.error('Failed to fetch doctor profile:', err);
      },
    });
  }

  fetchNotificationCount(): void {
    this.notificationService.getUnreadNotificationCount().subscribe({
      next: (count: number) => {
        this.stats.notifications = count;
      },
      error: (err: any) => {
        console.error('Failed to fetch notification count:', err);
        this.stats.notifications = 0;
      },
    });
  }

  fetchTodayAppointments(): void {
    this.isLoading = true;
    this.appointmentService.getTodayAppointmentsForDoctor().subscribe({
      next: (appointments: Appointment[]) => {
        this.todayAppointments = appointments;
        this.isLoading = false;
        console.log('Today appointments loaded:', appointments);
      },
      error: (err: any) => {
        console.error('Failed to fetch today appointments:', err);
        this.todayAppointments = [];
        this.isLoading = false;
      },
    });
  }

  confirmAppointment(appointmentId: number): void {
    if (!confirm('Are you sure you want to confirm this appointment?')) {
      return;
    }

    this.appointmentService.confirmAppointment(appointmentId).subscribe({
      next: () => {
        alert('Appointment confirmed successfully!');
        this.fetchTodayAppointments(); // Refresh the list
        this.fetchAppointmentCount(); // Update count
      },
      error: (err: any) => {
        console.error('Failed to confirm appointment:', err);
        alert('Failed to confirm appointment. Please try again.');
      },
    });
  }

  rejectAppointment(appointmentId: number): void {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    if (reason === null) {
      // User cancelled
      return;
    }

    this.appointmentService.rejectAppointment(appointmentId, reason || undefined).subscribe({
      next: () => {
        alert('Appointment rejected successfully!');
        this.fetchTodayAppointments(); // Refresh the list
        this.fetchAppointmentCount(); // Update count
      },
      error: (err: any) => {
        console.error('Failed to reject appointment:', err);
        alert('Failed to reject appointment. Please try again.');
      },
    });
  }

  viewAllAppointments(): void {
    this.router.navigate(['/doctor/appointments']);
  }

  viewAppointmentDetails(appointment: Appointment): void {
    console.log('Viewing appointment details:', appointment);
    // Navigate to appointment details page or open a modal
    this.router.navigate(['/doctor/appointments', appointment.appointmentId]);
  }

  rescheduleAppointment(appointment: Appointment): void {
    console.log('Rescheduling appointment:', appointment);
    // Implement reschedule logic
    alert('Reschedule functionality coming soon!');
  }

  viewPatientRecords(appointment: Appointment): void {
    console.log('Viewing patient records:', appointment);
    // Navigate to patient records
    this.router.navigate(['/doctor/patients', appointment.patient.patientId]);
  }

  addPrescription(appointment: Appointment): void {
    console.log('Adding prescription for:', appointment);
    // Navigate to prescription page
    this.router.navigate(['/doctor/prescriptions/new'], {
      queryParams: { appointmentId: appointment.appointmentId }
    });
  }

  generateInitials(fullName: string): string {
    if (!fullName) return 'SB';

    const nameParts = fullName
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    if (nameParts.length < 2) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }

    const firstInitial = nameParts[0].charAt(0).toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();

    return firstInitial + lastInitial;
  }
}

