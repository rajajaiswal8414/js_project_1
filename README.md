import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/doctor-appointment-service.js';
import { MedicalRecordService } from '../../../core/services/medical-record-service';

interface Patient {
  patientId: number;
  name: string;
  age: number;
  gender: string;
  phone: string;
}

interface Doctor {
  doctorId: number;
  doctorName: string;
  specialization: string;
}

interface Appointment {
  appointmentId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  patient: Patient;
  doctor: Doctor;
}

interface ConsultationData {
  diagnosis: string;
  symptoms: string;
  notes: string;
  prescription: string;
  medications?: Array<{
    medicationName: string;
    dosage: string;
    instructions: string;
  }>;
}

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  templateUrl: './doctor-appointments.html',
  imports: [FormsModule, CommonModule, HttpClientModule, RouterLink],
})
export class DoctorAppointments implements OnInit {
  private appointmentService = inject(AppointmentService);
  private medicalRecordService = inject(MedicalRecordService);

  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  currentAppointment: Appointment | null = null;

  // Filters
  searchTerm = '';
  dateFilter = 'all';
  statusFilter = 'all';

  // Stats
  todayCount = signal(0);
  pendingCount = signal(0);
  confirmedCount = signal(0);
  completedCount = signal(0);

  isNotesModalOpen = signal(false);
  consultationNotes = { 
    diagnosis: '', 
    symptoms: '', 
    notes: '', 
    prescription: '',
    medications: [] as Array<{ medicationName: string; dosage: string; instructions: string }>
  };

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getDoctorAppointments('all').subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.updateStats();
        this.filterAppointments();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load appointments:', err);
        this.appointments.set([]);
        this.isLoading.set(false);
        alert('Failed to load appointments. Check your network or API response.');
      },
    });
  }

  updateStats(): void {
    const apps = this.appointments();
    const today = new Date().toISOString().split('T')[0];
    this.todayCount.set(apps.filter((a) => a.appointmentDate === today).length);
    this.pendingCount.set(apps.filter((a) => a.status === 'PENDING').length);
    this.confirmedCount.set(apps.filter((a) => a.status === 'CONFIRMED').length);
    this.completedCount.set(apps.filter((a) => a.status === 'COMPLETED').length);
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  filterAppointments(): void {
    const search = this.searchTerm.toLowerCase();
    const today = new Date();

    const filtered = this.appointments().filter((a) => {
      const matchesSearch = a.patient.name.toLowerCase().includes(search);
      const matchesStatus = this.statusFilter === 'all' || a.status === this.statusFilter;

      const appointmentDate = new Date(a.appointmentDate);
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const appointmentDateOnly = new Date(
        appointmentDate.getFullYear(),
        appointmentDate.getMonth(),
        appointmentDate.getDate()
      );
      let matchesDate = true;

      if (this.dateFilter === 'today') {
        matchesDate = appointmentDateOnly.getTime() === todayDateOnly.getTime();
      } else if (this.dateFilter === 'tomorrow') {
        const tomorrow = new Date(todayDateOnly);
        tomorrow.setDate(todayDateOnly.getDate() + 1);
        matchesDate = appointmentDateOnly.getTime() === tomorrow.getTime();
      } else if (this.dateFilter === 'week') {
        const weekFromNow = new Date(todayDateOnly);
        weekFromNow.setDate(todayDateOnly.getDate() + 7);
        matchesDate =
          appointmentDateOnly.getTime() >= todayDateOnly.getTime() &&
          appointmentDateOnly.getTime() <= weekFromNow.getTime();
      } else if (this.dateFilter === 'month') {
        matchesDate =
          appointmentDate.getFullYear() === today.getFullYear() &&
          appointmentDate.getMonth() === today.getMonth();
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    this.filteredAppointments.set(filtered);
  }

  confirmAppointment(id: number): void {
    const appointment = this.appointments().find((a) => a.appointmentId === id);
    if (!appointment) return;

    if (confirm(`Confirm appointment with ${appointment.patient.name}?`)) {
      this.appointmentService.confirmAppointment(id).subscribe({
        next: () => {
          alert(`✅ Appointment confirmed for ${appointment.patient.name}`);
          this.loadAppointments();
        },
        error: (err) => {
          console.error('Confirm failed:', err);
          alert('Failed to confirm appointment. Try again.');
        },
      });
    }
  }

  cancelAppointment(id: number): void {
    const appointment = this.appointments().find((a) => a.appointmentId === id);
    if (!appointment) return;

    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      this.appointmentService.rejectAppointment(id, reason).subscribe({
        next: () => {
          alert(`❌ Appointment rejected for ${appointment.patient.name}`);
          this.loadAppointments();
        },
        error: (err) => {
          console.error('Reject failed:', err);
          alert('Failed to reject appointment. Try again.');
        },
      });
    }
  }

  startConsultation(appointment: Appointment): void {
    this.currentAppointment = appointment;
    this.consultationNotes = { 
      diagnosis: '', 
      symptoms: '', 
      notes: '', 
      prescription: '',
      medications: []
    };
    this.isNotesModalOpen.set(true);
  }

  addMedication(): void {
    this.consultationNotes.medications.push({
      medicationName: '',
      dosage: '',
      instructions: ''
    });
  }

  removeMedication(index: number): void {
    this.consultationNotes.medications.splice(index, 1);
  }

  saveNotes(): void {
    if (!this.currentAppointment) return;

    // Create medical record payload
    const medicalRecordPayload = {
      appointmentId: this.currentAppointment.appointmentId,
      patientId: this.currentAppointment.patient.patientId,
      doctorId: this.currentAppointment.doctor.doctorId,
      reason: this.currentAppointment.reason,
      diagnosis: this.consultationNotes.diagnosis,
      notes: this.consultationNotes.notes,
      prescriptions: this.consultationNotes.medications.filter(med => 
        med.medicationName && med.dosage
      )
    };

    // Create medical record
    this.medicalRecordService.createMedicalRecord(medicalRecordPayload).subscribe({
      next: (medicalRecord) => {
        // Mark appointment as completed
        this.appointmentService.completeAppointment(this.currentAppointment!.appointmentId).subscribe({
          next: () => {
            alert('Consultation completed and medical record created!');
            this.isNotesModalOpen.set(false);
            this.loadAppointments();
          },
          error: (err) => {
            console.error('Complete appointment failed:', err);
            alert('Medical record created but failed to mark appointment as completed.');
          }
        });
      },
      error: (err) => {
        console.error('Create medical record failed:', err);
        alert('Failed to create medical record. Please try again.');
      }
    });
  }

  viewMedicalRecords(patientId: number): void {
    // Navigate to patient medical records or open in modal
    console.log('View medical records for patient:', patientId);
    // You can implement navigation or modal to show patient's medical history
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}





<!-- In the appointments list section -->
<div class="grid gap-4" id="appointments-list">
  @for (appointment of filteredAppointments(); track appointment.appointmentId) {
  <div
    class="bg-white p-6 rounded-xl shadow flex justify-between items-start transition hover:shadow-md"
  >
    <div class="flex items-center gap-4">
      <div
        class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-lg"
      >
        {{ getInitials(appointment.patient.name) }}
      </div>
      <div>
        <div class="text-lg font-semibold text-gray-800">{{ appointment.patient.name }}</div>
        <div class="text-gray-500 text-sm">
          {{ appointment.appointmentDate }} | {{ formatTime(appointment.startTime) }} -
          {{ formatTime(appointment.endTime) }}
        </div>
        <div class="text-gray-700 text-sm mt-1">**Reason:** {{ appointment.reason }}</div>
        <div class="flex gap-2 mt-2">
          <button
            (click)="viewMedicalRecords(appointment.patient.patientId)"
            class="text-blue-600 text-sm hover:underline"
          >
            View Medical History
          </button>
        </div>
      </div>
    </div>

    <div class="text-right">
      <span
        [ngClass]="{
          'bg-green-100 text-green-800': appointment.status === 'COMPLETED',
          'bg-blue-100 text-blue-800': appointment.status === 'CONFIRMED',
          'bg-yellow-100 text-yellow-800': appointment.status === 'PENDING',
          'bg-red-100 text-red-800':
            appointment.status === 'REJECTED' || appointment.status === 'CANCELLED'
        }"
        class="px-3 py-1 rounded-full text-xs font-semibold uppercase block mb-3"
      >
        {{ appointment.status }}
      </span>
      <div class="flex gap-2 justify-end">
        @if (appointment.status === 'PENDING') {
        <button
          (click)="confirmAppointment(appointment.appointmentId)"
          class="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600 transition"
        >
          Accept
        </button>
        <button
          (click)="cancelAppointment(appointment.appointmentId)"
          class="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600 transition"
        >
          Decline
        </button>
        } @else if (appointment.status === 'CONFIRMED') {
        <button
          (click)="startConsultation(appointment)"
          class="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition"
        >
          Start Consultation
        </button>
        <button
          (click)="cancelAppointment(appointment.appointmentId)"
          class="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600 transition"
        >
          Cancel
        </button>
        } @else if (appointment.status === 'COMPLETED') {
        <button
          (click)="viewMedicalRecords(appointment.patient.patientId)"
          class="bg-gray-200 text-gray-700 px-3 py-1 text-sm rounded hover:bg-gray-300 transition"
        >
          View Records
        </button>
        }
      </div>
    </div>
  </div>
  }
</div>

<!-- Enhanced Consultation Modal -->
<div
  class="fixed inset-0 bg-black/50 items-center justify-center z-50"
  [ngClass]="{ hidden: !isNotesModalOpen(), flex: isNotesModalOpen() }"
  id="consultation-modal"
>
  <div class="bg-white rounded-2xl p-6 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
      <h2 class="text-xl font-bold text-gray-800">
        Consultation with {{ currentAppointment?.patient?.name }}
      </h2>
      <button class="text-gray-500 text-2xl" (click)="isNotesModalOpen.set(false)">×</button>
    </div>
    
    <form (ngSubmit)="saveNotes()" class="space-y-6">
      <!-- Patient Info -->
      <div class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <strong>Patient:</strong> {{ currentAppointment?.patient?.name }}
        </div>
        <div>
          <strong>Appointment Date:</strong> {{ currentAppointment?.appointmentDate }}
        </div>
        <div>
          <strong>Reason:</strong> {{ currentAppointment?.reason }}
        </div>
        <div>
          <strong>Doctor:</strong> Dr. {{ currentAppointment?.doctor?.doctorName }}
        </div>
      </div>

      <!-- Diagnosis -->
      <div>
        <label class="block text-gray-700 font-semibold mb-2">Diagnosis *</label>
        <input
          type="text"
          [(ngModel)]="consultationNotes.diagnosis"
          name="diagnosis"
          required
          placeholder="Enter diagnosis..."
          class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
        />
      </div>

      <!-- Symptoms -->
      <div>
        <label class="block text-gray-700 font-semibold mb-2">Symptoms</label>
        <textarea
          [(ngModel)]="consultationNotes.symptoms"
          name="symptoms"
          placeholder="Describe symptoms..."
          class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[80px]"
        ></textarea>
      </div>

      <!-- Doctor's Notes -->
      <div>
        <label class="block text-gray-700 font-semibold mb-2">Consultation Notes *</label>
        <textarea
          [(ngModel)]="consultationNotes.notes"
          name="notes"
          required
          placeholder="Enter detailed consultation notes..."
          class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[120px]"
        ></textarea>
      </div>

      <!-- Prescriptions Section -->
      <div>
        <div class="flex justify-between items-center mb-3">
          <label class="block text-gray-700 font-semibold">Prescriptions</label>
          <button
            type="button"
            (click)="addMedication()"
            class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
          >
            + Add Medication
          </button>
        </div>
        
        <div class="space-y-3">
          @for (med of consultationNotes.medications; track $index; let i = $index) {
          <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold text-gray-700">Medication {{ i + 1 }}</h4>
              <button
                type="button"
                (click)="removeMedication(i)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-sm text-gray-600 mb-1">Medication Name *</label>
                <input
                  type="text"
                  [(ngModel)]="med.medicationName"
                  [name]="'medName' + i"
                  placeholder="e.g., Paracetamol"
                  class="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Dosage *</label>
                <input
                  type="text"
                  [(ngModel)]="med.dosage"
                  [name]="'dosage' + i"
                  placeholder="e.g., 500mg"
                  class="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Instructions</label>
                <input
                  type="text"
                  [(ngModel)]="med.instructions"
                  [name]="'instructions' + i"
                  placeholder="e.g., Twice daily after meals"
                  class="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
            </div>
          </div>
          }
          @if (consultationNotes.medications.length === 0) {
          <div class="text-center text-gray-500 py-4 border-2 border-dashed border-gray-300 rounded-lg">
            No medications added. Click "Add Medication" to prescribe.
          </div>
          }
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 pt-4 border-t border-gray-200">
        <button
          type="submit"
          class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition"
        >
          Complete Consultation
        </button>
        <button
          type="button"
          (click)="isNotesModalOpen.set(false)"
          class="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>







// medical-record-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicalRecordRequest {
  appointmentId: number;
  patientId: number;
  doctorId: number;
  reason: string;
  diagnosis: string;
  notes: string;
  prescriptions: Array<{
    medicationName: string;
    dosage: string;
    instructions: string;
  }>;
}

export interface MedicalRecordResponse {
  recordId: number;
  patientId: number;
  doctorId: number;
  patientName: string;
  doctorName: string;
  reason: string;
  diagnosis: string;
  notes: string;
  prescriptions: Array<{
    prescriptionId: number;
    medicationName: string;
    dosage: string;
    instructions: string;
    prescribedAt: string;
  }>;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  createMedicalRecord(record: MedicalRecordRequest): Observable<MedicalRecordResponse> {
    return this.http.post<MedicalRecordResponse>(`${this.apiUrl}/doctors/me/medical-records`, record);
  }

  getRecordsForPatient(): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(`${this.apiUrl}/patients/me/medical-records`);
  }

  getRecordsForDoctor(doctorId: number): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(`${this.apiUrl}/doctors/${doctorId}/medical-records`);
  }
}

// In your appointment service
completeAppointment(appointmentId: number): Observable<any> {
  return this.http.patch(`${this.apiUrl}/appointments/${appointmentId}/complete`, {});
}






<!-- medical-record.html -->
<div class="flex min-h-screen">
  <app-sidebar></app-sidebar>

  <!-- Main Content -->
  <main class="flex-1 p-8 bg-gray-100 overflow-y-auto">
    <app-header [patient]="patient"></app-header>

    <div class="bg-white p-6 rounded-xl shadow">
      <div class="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <h2 class="text-2xl font-bold text-gray-800">Medical Records</h2>
        <div class="text-sm text-gray-500">{{ medicalRecords.length }} record(s) found</div>
      </div>

      <!-- Medical Records List -->
      <div class="space-y-6">
        @for (record of medicalRecords; track record.recordId) {
        <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-4 mb-3">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold"
                >
                  🏥
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 text-lg">
                    Consultation with Dr. {{ record.doctorName }}
                  </h3>
                  <p class="text-gray-500 text-sm">
                    {{ record.createdAt | date : 'fullDate' }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                @if (record.reason) {
                <div>
                  <h4 class="font-medium text-gray-700 mb-1">Reason for Visit</h4>
                  <p class="text-gray-600">{{ record.reason }}</p>
                </div>
                }
                @if (record.diagnosis) {
                <div>
                  <h4 class="font-medium text-gray-700 mb-1">Diagnosis</h4>
                  <p class="text-gray-600">{{ record.diagnosis }}</p>
                </div>
                }
              </div>

              @if (record.notes) {
              <div class="mb-4">
                <h4 class="font-medium text-gray-700 mb-1">Doctor's Notes</h4>
                <p class="text-gray-600">{{ record.notes }}</p>
              </div>
              }
              
              @if (hasPrescriptions(record)) {
              <div class="border-t border-gray-200 pt-4">
                <h4 class="font-medium text-gray-700 mb-3">Prescriptions</h4>
                <div class="space-y-2">
                  @for (prescription of record.prescriptions; track prescription.prescriptionId) {
                  <div class="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <div>
                      <p class="font-semibold text-gray-800">{{ prescription.medicationName }}</p>
                      <p class="text-sm text-gray-600">
                        {{ prescription.dosage }} • {{ prescription.instructions }}
                      </p>
                    </div>
                    <span class="text-xs text-gray-500">
                      {{ prescription.prescribedAt | date : 'shortDate' }}
                    </span>
                  </div>
                  }
                </div>
              </div>
              }
            </div>
          </div>

          <div class="flex gap-2 pt-4 border-t border-gray-200">
            <button
              (click)="viewRecordDetails(record)"
              class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition text-sm"
            >
              View Details
            </button>

            @if (hasPrescriptions(record)) {
            <button
              (click)="downloadPrescription(record)"
              class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition text-sm"
            >
              Download Prescription
            </button>
            }
          </div>
        </div>
        }
        @if (medicalRecords.length === 0) {
        <div class="text-center py-12 text-gray-500">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-semibold mb-2">No medical records found</h3>
          <p>Your medical records will appear here after your appointments.</p>
        </div>
        }
      </div>
    </div>
  </main>
</div>

<!-- Medical Record Details Modal -->
@if (showRecordModal && selectedRecord) {
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
    <div class="p-6 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-semibold text-gray-800">Medical Record Details</h3>
        <button (click)="closeRecordModal()" class="text-gray-500 hover:text-gray-700 text-2xl">
          ×
        </button>
      </div>
      <p class="text-gray-600 mt-1">
        Consultation with Dr. {{ selectedRecord.doctorName }} on
        {{ selectedRecord.createdAt | date : 'fullDate' }}
      </p>
    </div>

    <div class="p-6 space-y-6">
      <!-- Basic Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-semibold text-gray-700 mb-2">Patient Information</h4>
          <div class="space-y-1 text-sm">
            <p><span class="font-medium">Name:</span> {{ selectedRecord.patientName }}</p>
            <p><span class="font-medium">Doctor:</span> Dr. {{ selectedRecord.doctorName }}</p>
            <p>
              <span class="font-medium">Date:</span>
              {{ selectedRecord.createdAt | date : 'fullDate' }}
            </p>
          </div>
        </div>

        <div>
          <h4 class="font-semibold text-gray-700 mb-2">Visit Information</h4>
          <div class="space-y-1 text-sm">
            @if (selectedRecord.reason) {
            <p><span class="font-medium">Reason:</span> {{ selectedRecord.reason }}</p>
            }
            @if (selectedRecord.diagnosis) {
            <p><span class="font-medium">Diagnosis:</span> {{ selectedRecord.diagnosis }}</p>
            }
          </div>
        </div>
      </div>

      <!-- Doctor's Notes -->
      @if (selectedRecord.notes) {
      <div>
        <h4 class="font-semibold text-gray-700 mb-2">Doctor's Notes</h4>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-gray-700">{{ selectedRecord.notes }}</p>
        </div>
      </div>
      }

      <!-- Prescriptions -->
      @if (hasPrescriptions(selectedRecord)) {
      <div>
        <h4 class="font-semibold text-gray-700 mb-3">Prescriptions</h4>
        <div class="space-y-3">
          @for (prescription of selectedRecord.prescriptions; track prescription.prescriptionId) {
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-semibold text-lg text-gray-800">{{ prescription.medicationName }}</h5>
              <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {{ prescription.prescribedAt | date : 'shortDate' }}
              </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Dosage:</span>
                <span class="text-gray-600 ml-2">{{ prescription.dosage }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Instructions:</span>
                <span class="text-gray-600 ml-2">{{
                  prescription.instructions || 'As directed'
                }}</span>
              </div>
            </div>
          </div>
          }
        </div>
      </div>
      }
    </div>

    <div class="p-6 border-t border-gray-200 flex gap-3">
      <button
        (click)="closeRecordModal()"
        class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
      >
        Close
      </button>
      @if (hasPrescriptions(selectedRecord)) {
      <button
        (click)="downloadPrescription(selectedRecord)"
        class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition font-medium"
      >
        Download All Prescriptions
      </button>
      }
    </div>
  </div>
</div>
}







import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalRecordResponseDTO } from '../../../models/medicalrecord-interface';
import { MedicalRecordService } from '../../../core/services/medical-record-service';
import { DoctorService } from '../../../core/services/doctor-service';
import { Doctor } from '../../../models/doctor-interface';

@Component({
  selector: 'app-doctor-medical-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-medical-records.html',
  styleUrls: ['./doctor-medical-records.css'],
})
export class DoctorMedicalRecords implements OnInit {
  medicalRecords: MedicalRecordResponseDTO[] = [];
  filteredRecords: MedicalRecordResponseDTO[] = [];
  doctor: Doctor | null = null;
  selectedRecord: MedicalRecordResponseDTO | null = null;
  showRecordModal: boolean = false;
  isLoading: boolean = true;
  
  // Search and filter properties
  searchTerm: string = '';
  patientFilter: string = '';
  dateFilter: string = 'all';
  
  // Unique patients for filter
  uniquePatients: string[] = [];

  constructor(
    private medicalRecordService: MedicalRecordService,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadDoctorData();
    this.loadMedicalRecords();
  }

  loadDoctorData(): void {
    this.doctorService.getCurrentDoctor().subscribe({
      next: (doctor) => {
        this.doctor = doctor;
      },
      error: (error) => {
        console.error('Error loading doctor data:', error);
      },
    });
  }

  loadMedicalRecords(): void {
    if (!this.doctor) return;
    
    this.isLoading = true;
    this.medicalRecordService.getRecordsForDoctor(this.doctor.doctorId).subscribe({
      next: (records) => {
        this.medicalRecords = records;
        this.filteredRecords = records;
        this.extractUniquePatients();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading medical records:', error);
        this.isLoading = false;
      },
    });
  }

  extractUniquePatients(): void {
    const patients = this.medicalRecords.map(record => record.patientName);
    this.uniquePatients = [...new Set(patients)].sort();
  }

  filterRecords(): void {
    let filtered = this.medicalRecords;

    // Filter by patient name
    if (this.patientFilter) {
      filtered = filtered.filter(record => 
        record.patientName === this.patientFilter
      );
    }

    // Filter by search term (patient name or diagnosis)
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.patientName.toLowerCase().includes(search) ||
        (record.diagnosis && record.diagnosis.toLowerCase().includes(search)) ||
        (record.reason && record.reason.toLowerCase().includes(search))
      );
    }

    // Filter by date
    if (this.dateFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.createdAt);
        
        switch (this.dateFilter) {
          case 'today':
            return recordDate.toDateString() === today.toDateString();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return recordDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return recordDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            return recordDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    this.filteredRecords = filtered;
  }

  viewRecordDetails(record: MedicalRecordResponseDTO): void {
    this.selectedRecord = record;
    this.showRecordModal = true;
  }

  closeRecordModal(): void {
    this.showRecordModal = false;
    this.selectedRecord = null;
  }

  downloadPrescription(record: MedicalRecordResponseDTO): void {
    console.log('Downloading prescription for record:', record.recordId);
    // Implement prescription download logic
  }

  hasPrescriptions(record: MedicalRecordResponseDTO): boolean {
    return record.prescriptions && record.prescriptions.length > 0;
  }

  getPatientInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.patientFilter = '';
    this.dateFilter = 'all';
    this.filterRecords();
  }
}







<div class="flex min-h-screen">
  <!-- Doctor Sidebar (similar to your appointments page) -->
  <aside class="w-64 bg-white shadow-lg fixed h-full overflow-y-auto">
    <div class="px-6 py-8 border-b border-gray-200">
      <div class="text-2xl font-bold text-blue-600 flex items-center gap-2">⚕ MediCare</div>
    </div>
    <ul class="mt-6 space-y-1">
      <li>
        <a
          [routerLink]="['/doctor/dashboard']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📊 Dashboard</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/appointments']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📅 Appointments</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/patients']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >👥 Patients</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/medical-records']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-blue-600 bg-blue-50 border-l-4 border-blue-600"
          >📋 Medical Records</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/availability']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >⏰ Availability</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/settings']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >⚙️ Settings</a
        >
      </li>
    </ul>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 ml-64 p-6">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow p-6 mb-6">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Patient Medical Records</h1>
          <div class="text-gray-500 text-sm mt-1">
            <a [routerLink]="['/doctor/dashboard']" class="text-blue-600">Dashboard</a> / 
            Medical Records
          </div>
        </div>
        <div class="text-right">
          <p class="text-gray-600">Dr. {{ doctor?.doctorName }}</p>
          <p class="text-sm text-gray-500">{{ doctor?.specialization }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-4">
        <div class="relative flex-1 min-w-[250px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by patient name, diagnosis, or reason..."
            [(ngModel)]="searchTerm"
            (input)="filterRecords()"
            class="w-full border-2 border-gray-300 rounded-lg py-2 px-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          />
        </div>

        <!-- Patient Filter -->
        <select
          [(ngModel)]="patientFilter"
          (change)="filterRecords()"
          class="border-2 border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
        >
          <option value="">All Patients</option>
          <option *ngFor="let patient of uniquePatients" [value]="patient">
            {{ patient }}
          </option>
        </select>

        <!-- Date Filter -->
        <select
          [(ngModel)]="dateFilter"
          (change)="filterRecords()"
          class="border-2 border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="year">Past Year</option>
        </select>

        <button
          (click)="clearFilters()"
          class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
        >
          Clear Filters
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="text-blue-600 text-sm font-semibold">Total Records</div>
          <div class="text-2xl font-bold text-blue-700">{{ medicalRecords.length }}</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <div class="text-green-600 text-sm font-semibold">Unique Patients</div>
          <div class="text-2xl font-bold text-green-700">{{ uniquePatients.length }}</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div class="text-purple-600 text-sm font-semibold">Filtered Records</div>
          <div class="text-2xl font-bold text-purple-700">{{ filteredRecords.length }}</div>
        </div>
      </div>
    </div>

    <!-- Medical Records List -->
    <div class="bg-white rounded-xl shadow">
      @if (isLoading) {
      <div class="text-center py-10 text-xl text-gray-500">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-t-blue-600 border-gray-200 rounded-full"></div>
        <p class="mt-2">Loading medical records...</p>
      </div>
      } @else {
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          Consultation History ({{ filteredRecords.length }} records)
        </h2>

        <div class="space-y-6">
          @for (record of filteredRecords; track record.recordId) {
          <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-4 flex-1">
                <div
                  class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg"
                >
                  {{ getPatientInitials(record.patientName) }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="font-semibold text-gray-800 text-lg">{{ record.patientName }}</h3>
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Patient
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div class="text-sm text-gray-600">
                      <span class="font-medium">Date:</span> 
                      {{ record.createdAt | date:'mediumDate' }}
                    </div>
                    <div class="text-sm text-gray-600">
                      <span class="font-medium">Time:</span> 
                      {{ record.createdAt | date:'shortTime' }}
                    </div>
                    <div class="text-sm text-gray-600">
                      <span class="font-medium">Visit Reason:</span> 
                      {{ record.reason || 'Not specified' }}
                    </div>
                  </div>

                  @if (record.diagnosis) {
                  <div class="mb-3">
                    <span class="font-medium text-gray-700 text-sm">Diagnosis:</span>
                    <span class="text-gray-600 text-sm ml-2">{{ record.diagnosis }}</span>
                  </div>
                  }

                  @if (record.notes) {
                  <div class="mb-3">
                    <span class="font-medium text-gray-700 text-sm">Notes:</span>
                    <span class="text-gray-600 text-sm ml-2 line-clamp-2">{{ record.notes }}</span>
                  </div>
                  }
                </div>
              </div>
            </div>

            @if (hasPrescriptions(record)) {
            <div class="border-t border-gray-200 pt-4 mb-4">
              <h4 class="font-medium text-gray-700 mb-2 text-sm">Prescriptions ({{ record.prescriptions.length }})</h4>
              <div class="space-y-1">
                @for (prescription of record.prescriptions; track prescription.prescriptionId) {
                <div class="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                  <div>
                    <span class="font-semibold text-gray-800">{{ prescription.medicationName }}</span>
                    <span class="text-gray-600 ml-2">
                      {{ prescription.dosage }} • {{ prescription.instructions || 'As directed' }}
                    </span>
                  </div>
                </div>
                }
              </div>
            </div>
            }

            <div class="flex gap-2 pt-4 border-t border-gray-200">
              <button
                (click)="viewRecordDetails(record)"
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition text-sm"
              >
                View Full Details
              </button>

              @if (hasPrescriptions(record)) {
              <button
                (click)="downloadPrescription(record)"
                class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 transition text-sm"
              >
                Download Prescription
              </button>
              }
            </div>
          </div>
          }

          @if (filteredRecords.length === 0) {
          <div class="text-center py-12 text-gray-500">
            <div class="text-6xl mb-4">📋</div>
            <h3 class="text-xl font-semibold mb-2">No medical records found</h3>
            <p>Medical records will appear here after you complete consultations with patients.</p>
            @if (searchTerm || patientFilter || dateFilter !== 'all') {
            <p class="mt-2">Try adjusting your filters to see more results.</p>
            }
          </div>
          }
        </div>
      </div>
      }
    </div>
  </main>
</div>

<!-- Medical Record Details Modal (Same as patient version but adapted for doctor) -->
@if (showRecordModal && selectedRecord) {
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
    <div class="p-6 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-semibold text-gray-800">Consultation Details</h3>
        <button (click)="closeRecordModal()" class="text-gray-500 hover:text-gray-700 text-2xl">
          ×
        </button>
      </div>
      <p class="text-gray-600 mt-1">
        Consultation with {{ selectedRecord.patientName }} on 
        {{ selectedRecord.createdAt | date:'fullDate' }} at {{ selectedRecord.createdAt | date:'shortTime' }}
      </p>
    </div>

    <div class="p-6 space-y-6">
      <!-- Patient Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-semibold text-gray-700 mb-2">Patient Information</h4>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {{ getPatientInitials(selectedRecord.patientName) }}
              </div>
              <div>
                <p class="font-medium">{{ selectedRecord.patientName }}</p>
                <p class="text-gray-500">Patient ID: {{ selectedRecord.patientId }}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-semibold text-gray-700 mb-2">Consultation Information</h4>
          <div class="space-y-1 text-sm">
            <p><span class="font-medium">Date & Time:</span> {{ selectedRecord.createdAt | date:'medium' }}</p>
            <p><span class="font-medium">Reason:</span> {{ selectedRecord.reason || 'Not specified' }}</p>
            @if (selectedRecord.diagnosis) {
            <p><span class="font-medium">Diagnosis:</span> {{ selectedRecord.diagnosis }}</p>
            }
          </div>
        </div>
      </div>

      <!-- Doctor's Notes -->
      @if (selectedRecord.notes) {
      <div>
        <h4 class="font-semibold text-gray-700 mb-2">Consultation Notes</h4>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-gray-700 whitespace-pre-line">{{ selectedRecord.notes }}</p>
        </div>
      </div>
      }

      <!-- Prescriptions -->
      @if (hasPrescriptions(selectedRecord)) {
      <div>
        <h4 class="font-semibold text-gray-700 mb-3">Prescriptions</h4>
        <div class="space-y-3">
          @for (prescription of selectedRecord.prescriptions; track prescription.prescriptionId) {
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-semibold text-lg text-gray-800">{{ prescription.medicationName }}</h5>
              <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {{ prescription.prescribedAt | date:'shortDate' }}
              </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Dosage:</span>
                <span class="text-gray-600 ml-2">{{ prescription.dosage }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Instructions:</span>
                <span class="text-gray-600 ml-2">{{ prescription.instructions || 'As directed' }}</span>
              </div>
            </div>
          </div>
          }
        </div>
      </div>
      }
    </div>

    <div class="p-6 border-t border-gray-200 flex gap-3">
      <button
        (click)="closeRecordModal()"
        class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
      >
        Close
      </button>
      @if (hasPrescriptions(selectedRecord)) {
      <button
        (click)="downloadPrescription(selectedRecord)"
        class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition font-medium"
      >
        Download Prescription
      </button>
      }
    </div>
  </div>
</div>
}








import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicalRecordRequest {
  appointmentId: number;
  patientId: number;
  doctorId: number;
  reason: string;
  diagnosis: string;
  notes: string;
  prescriptions: Array<{
    medicationName: string;
    dosage: string;
    instructions: string;
  }>;
}

export interface MedicalRecordResponse {
  recordId: number;
  patientId: number;
  doctorId: number;
  patientName: string;
  doctorName: string;
  reason: string;
  diagnosis: string;
  notes: string;
  prescriptions: Array<{
    prescriptionId: number;
    medicationName: string;
    dosage: string;
    instructions: string;
    prescribedAt: string;
  }>;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // Create medical record (used by doctor after consultation)
  createMedicalRecord(record: MedicalRecordRequest): Observable<MedicalRecordResponse> {
    return this.http.post<MedicalRecordResponse>(
      `${this.apiUrl}/doctors/me/medical-records`, 
      record
    );
  }

  // Get records for current patient (patient view)
  getRecordsForPatient(): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(
      `${this.apiUrl}/patients/me/medical-records`
    );
  }

  // Get records for specific doctor (doctor view - all patients)
  getRecordsForDoctor(doctorId: number): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(
      `${this.apiUrl}/doctors/${doctorId}/medical-records`
    );
  }

  // Get records for current doctor (using me endpoint)
  getRecordsForCurrentDoctor(): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(
      `${this.apiUrl}/doctors/me/medical-records`
    );
  }

  // Get medical record by ID
  getRecordById(recordId: number): Observable<MedicalRecordResponse> {
    return this.http.get<MedicalRecordResponse>(
      `${this.apiUrl}/medical-records/${recordId}`
    );
  }

  // Get records for specific patient by doctor
  getPatientRecordsForDoctor(patientId: number): Observable<MedicalRecordResponse[]> {
    return this.http.get<MedicalRecordResponse[]>(
      `${this.apiUrl}/doctors/me/patients/${patientId}/medical-records`
    );
  }
}
