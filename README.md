// ============================================
// Update MedicalRecordServiceImpl.java
// ============================================

package com.cognizant.hams.service.impl;

import com.cognizant.hams.dto.request.MedicalRecordDTO;
import com.cognizant.hams.dto.response.MedicalRecordResponseDTO;
import com.cognizant.hams.dto.response.PrescriptionResponseDTO;
import com.cognizant.hams.service.MedicalRecordService;
import com.cognizant.hams.entity.*;
import com.cognizant.hams.exception.APIException;
import com.cognizant.hams.exception.ResourceNotFoundException;
import com.cognizant.hams.repository.*;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicalRecordServiceImpl implements MedicalRecordService {
    private final MedicalRecordRepository medicalRecordRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final ModelMapper modelMapper;

    @Override
    @Transactional
    public MedicalRecordResponseDTO createRecord(MedicalRecordDTO dto) {
        // Get logged-in doctor
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();
        Doctor loggedInDoctor = (Doctor) doctorRepository.findByUser_Username(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "username", currentUsername));

        // Validate Appointment
        Appointment appointment = appointmentRepository.findById(dto.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "Id", dto.getAppointmentId()));
        
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "Id", dto.getPatientId()));
        
        // Verify the appointment belongs to this doctor
        if (!appointment.getDoctor().getDoctorId().equals(loggedInDoctor.getDoctorId())) {
            throw new AccessDeniedException("You can only create records for your own appointments");
        }

        // Verify appointment matches patient and doctor
        if (!appointment.getPatient().getPatientId().equals(patient.getPatientId())) {
            throw new APIException("Appointment does not belong to the specified patient");
        }

        // Check if appointment is confirmed (can only complete confirmed appointments)
        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new APIException("Only CONFIRMED appointments can be completed. Current status: " + appointment.getStatus());
        }

        // Create Medical Record
        MedicalRecord record = new MedicalRecord();
        record.setPatient(patient);
        record.setDoctor(loggedInDoctor);
        record.setReason(dto.getReason());
        record.setDiagnosis(dto.getDiagnosis());
        record.setNotes(dto.getNotes());

        // Add prescriptions if provided
        if (dto.getPrescriptions() != null && !dto.getPrescriptions().isEmpty()) {
            List<Prescription> prescriptions = dto.getPrescriptions().stream()
                    .map(pDto -> {
                        Prescription p = modelMapper.map(pDto, Prescription.class);
                        p.setMedicalRecord(record);
                        return p;
                    }).collect(Collectors.toList());
            record.setPrescriptions(prescriptions);
        }

        // Save medical record
        MedicalRecord saved = medicalRecordRepository.save(record);

        // Mark appointment as COMPLETED
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);

        System.out.println("Medical record created with ID: " + saved.getRecordId());
        System.out.println("Appointment " + appointment.getAppointmentId() + " marked as COMPLETED");

        return toDto(saved);
    }

    @Override
    public List<MedicalRecordResponseDTO> getRecordsForPatient() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();

        Patient patient = (Patient) patientRepository.findByUser_Username(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "username", currentUsername));

        List<MedicalRecord> medicalRecords = medicalRecordRepository
            .findByPatient_PatientIdOrderByCreatedAtDesc(patient.getPatientId());

        return medicalRecords.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MedicalRecordResponseDTO> getRecordsForDoctor(Long doctorId) {
        // Get logged-in doctor
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();
        Doctor loggedInDoctor = (Doctor) doctorRepository.findByUser_Username(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "username", currentUsername));

        // Verify doctor can only view their own records
        if (!loggedInDoctor.getDoctorId().equals(doctorId)) {
            throw new AccessDeniedException("You can only view your own medical records");
        }

        List<MedicalRecord> records = medicalRecordRepository
            .findByDoctor_DoctorIdOrderByCreatedAtDesc(doctorId);
        
        return records.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    private MedicalRecordResponseDTO toDto(MedicalRecord record) {
        MedicalRecordResponseDTO resp = new MedicalRecordResponseDTO();
        resp.setRecordId(record.getRecordId());
        resp.setPatientId(record.getPatient().getPatientId());
        resp.setDoctorId(record.getDoctor().getDoctorId());
        resp.setPatientName(record.getPatient().getName());
        resp.setDoctorName(record.getDoctor().getDoctorName());
        resp.setReason(record.getReason());
        resp.setDiagnosis(record.getDiagnosis());
        resp.setNotes(record.getNotes());
        resp.setCreatedAt(record.getCreatedAt());

        if (record.getPrescriptions() != null) {
            List<PrescriptionResponseDTO> prescriptionDTOs = record.getPrescriptions().stream()
                    .map(p -> modelMapper.map(p, PrescriptionResponseDTO.class))
                    .collect(Collectors.toList());
            resp.setPrescriptions(prescriptionDTOs);
        }
        return resp;
    }
}

// ============================================
// Ensure AppointmentStatus enum has COMPLETED
// ============================================

package com.cognizant.hams.entity;

public enum AppointmentStatus {
    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED,
    REJECTED
}

// ============================================
// Update MedicalRecordController.java (optional enhancement)
// ============================================

@PostMapping("/doctors/me/medical-records")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<MedicalRecordResponseDTO> createRecord(@Valid @RequestBody MedicalRecordDTO dto) {
    System.out.println("=== CREATE MEDICAL RECORD REQUEST ===");
    System.out.println("Appointment ID: " + dto.getAppointmentId());
    System.out.println("Patient ID: " + dto.getPatientId());
    System.out.println("Doctor ID: " + dto.getDoctorId());
    System.out.println("Diagnosis: " + dto.getDiagnosis());
    System.out.println("Prescriptions: " + (dto.getPrescriptions() != null ? dto.getPrescriptions().size() : 0));
    
    MedicalRecordResponseDTO saved = medicalRecordService.createRecord(dto);
    
    System.out.println("Medical record created successfully with ID: " + saved.getRecordId());
    return new ResponseEntity<>(saved, HttpStatus.CREATED);
}

// ============================================
// Alternative: Get doctor's own medical records
// ============================================

@GetMapping("/doctors/me/medical-records")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<List<MedicalRecordResponseDTO>> getMyMedicalRecords() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String currentUsername = authentication.getName();
    
    Doctor doctor = (Doctor) doctorRepository.findByUser_Username(currentUsername)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "username", currentUsername));
    
    return ResponseEntity.ok(medicalRecordService.getRecordsForDoctor(doctor.getDoctorId()));
}



// Add these methods to your AppointmentService (doctor-appointment-service.ts)

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private baseUrl = 'http://localhost:8080/api'; // Adjust based on your backend URL

  constructor(private http: HttpClient) {}

  // Get logged-in doctor's availability by date
  getMyAvailabilityByDate(date: string): Observable<any[]> {
    console.log('Fetching availability for date:', date);
    console.log('API URL:', `${this.baseUrl}/doctors/availability?date=${date}`);
    return this.http.get<any[]>(`${this.baseUrl}/doctors/availability?date=${date}`);
  }

  // Reschedule an appointment
  rescheduleAppointment(appointmentId: number, rescheduleData: any): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/doctors/appointments/${appointmentId}/reschedule`,
      rescheduleData
    );
  }

  // Get all appointments for doctor (already exists, just for reference)
  getDoctorAppointments(status: string): Observable<any[]> {
    const endpoint = status === 'all' 
      ? `${this.baseUrl}/doctors/appointments`
      : `${this.baseUrl}/doctors/appointments?status=${status}`;
    return this.http.get<any[]>(endpoint);
  }

  // Confirm appointment (already exists)
  confirmAppointment(appointmentId: number): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/doctors/appointments/${appointmentId}/confirm`,
      {}
    );
  }

  // Reject appointment (already exists)
  rejectAppointment(appointmentId: number, reason?: string): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/doctors/appointments/${appointmentId}/reject`,
      { reason }
    );
  }

  // Save consultation notes (already exists)
  saveConsultationNotes(appointmentId: number, notes: any): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/doctors/appointments/${appointmentId}/notes`,
      notes
    );
  }

  // Complete medical record (NEW - for consultation completion)
  completeMedicalRecord(medicalRecordData: any): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/doctors/me/medical-records`,
      medicalRecordData
    );
  }

  // Get today's appointment count (already exists)
  getTodayAppointmentCount(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/doctors/appointments/today/count`);
  }

  // Get total patient count (already exists)
  getTotalPatientCount(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/doctors/patients/count`);
  }

  // Get pending reviews count (already exists)
  getPendingReviewsCount(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/doctors/appointments/pending/count`);
  }

  // Get today's appointments for doctor (already exists)
  getTodayAppointmentsForDoctor(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/appointments/today`);
  }
}



<body class="font-sans bg-gray-100 text-gray-800">
  <div class="flex min-h-screen">
    <!-- Sidebar -->
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
            class="flex items-center gap-3 px-6 py-3 font-medium text-blue-600 bg-blue-50 border-l-4 border-blue-600"
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
            [routerLink]="['/doctor/availability']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >⏰ Availability</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/prescriptions']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >💊 Prescriptions</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/medical-records']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >📋 Medical Records</a
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
      <!-- Top Bar -->
      <div class="bg-white rounded-xl shadow p-6 mb-6">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h1 class="text-2xl font-semibold text-gray-800">Appointments</h1>
            <div class="text-gray-500 text-sm mt-1">
              <a [routerLink]="['/doctor/dashboard']" class="text-blue-600">Dashboard</a> /
              Appointments
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-4">
          <div class="relative flex-1 min-w-[250px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by patient name..."
              [(ngModel)]="searchTerm"
              (input)="filterAppointments()"
              class="w-full border-2 border-gray-300 rounded-lg py-2 px-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
            />
          </div>

          <select
            [(ngModel)]="dateFilter"
            (change)="filterAppointments()"
            class="border-2 border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select
            [(ngModel)]="statusFilter"
            (change)="filterAppointments()"
            class="border-2 border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected/Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1">
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Today's Appointments</h3>
            <p class="text-2xl font-bold text-gray-800">{{ todayCount() }}</p>
          </div>
          <div class="text-3xl">📅</div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1">
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Pending</h3>
            <p class="text-2xl font-bold text-gray-800">{{ pendingCount() }}</p>
          </div>
          <div class="text-3xl">⏳</div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1">
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Confirmed</h3>
            <p class="text-2xl font-bold text-gray-800">{{ confirmedCount() }}</p>
          </div>
          <div class="text-3xl">✅</div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1">
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Completed</h3>
            <p class="text-2xl font-bold text-gray-800">{{ completedCount() }}</p>
          </div>
          <div class="text-3xl">✔️</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 border-b-2 border-gray-200 mb-6">
        <button
          (click)="statusFilter = 'all'; filterAppointments()"
          [ngClass]="{
            'border-blue-600 text-blue-600 border-b-2': statusFilter === 'all',
            'text-gray-500 border-b-2 border-transparent': statusFilter !== 'all'
          }"
          class="py-2 px-4 font-semibold hover:text-blue-600 transition"
        >
          All Appointments
        </button>
        <button
          (click)="statusFilter = 'PENDING'; filterAppointments()"
          [ngClass]="{
            'border-blue-600 text-blue-600 border-b-2': statusFilter === 'PENDING',
            'text-gray-500 border-b-2 border-transparent': statusFilter !== 'PENDING'
          }"
          class="py-2 px-4 font-semibold hover:text-blue-600 transition"
        >
          Pending
        </button>
        <button
          (click)="statusFilter = 'CONFIRMED'; filterAppointments()"
          [ngClass]="{
            'border-blue-600 text-blue-600 border-b-2': statusFilter === 'CONFIRMED',
            'text-gray-500 border-b-2 border-transparent': statusFilter !== 'CONFIRMED'
          }"
          class="py-2 px-4 font-semibold hover:text-blue-600 transition"
        >
          Confirmed
        </button>
        <button
          (click)="statusFilter = 'COMPLETED'; filterAppointments()"
          [ngClass]="{
            'border-blue-600 text-blue-600 border-b-2': statusFilter === 'COMPLETED',
            'text-gray-500 border-b-2 border-transparent': statusFilter !== 'COMPLETED'
          }"
          class="py-2 px-4 font-semibold hover:text-blue-600 transition"
        >
          Completed
        </button>
      </div>

      @if (isLoading()) {
      <div class="text-center py-10 text-xl text-gray-500">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-t-blue-600 border-gray-200 rounded-full"></div>
        <p class="mt-2">Loading appointments...</p>
      </div>
      }

      <!-- Appointments List -->
      <div class="grid gap-4">
        @for (appointment of filteredAppointments(); track appointment.appointmentId) {
        <div class="bg-white p-6 rounded-xl shadow flex justify-between items-start transition hover:shadow-md">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-lg">
              {{ getInitials(appointment.patient.name) }}
            </div>
            <div>
              <div class="text-lg font-semibold text-gray-800">{{ appointment.patient.name }}</div>
              <div class="text-gray-500 text-sm">
                {{ appointment.appointmentDate }} | {{ formatTime(appointment.startTime) }} -
                {{ formatTime(appointment.endTime) }}
              </div>
              <div class="text-gray-700 text-sm mt-1">**Reason:** {{ appointment.reason }}</div>
            </div>
          </div>

          <div class="text-right">
            <span
              [ngClass]="{
                'bg-green-100 text-green-800': appointment.status === 'COMPLETED',
                'bg-blue-100 text-blue-800': appointment.status === 'CONFIRMED',
                'bg-yellow-100 text-yellow-800': appointment.status === 'PENDING',
                'bg-red-100 text-red-800': appointment.status === 'REJECTED' || appointment.status === 'CANCELLED'
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
                (click)="startConsultation(appointment.appointmentId)"
                class="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition"
              >
                Start Consultation
              </button>
              <button
                (click)="openRescheduleModal(appointment)"
                class="bg-purple-500 text-white px-3 py-1 text-sm rounded hover:bg-purple-600 transition"
              >
                Reschedule
              </button>
              <button
                (click)="cancelAppointment(appointment.appointmentId)"
                class="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600 transition"
              >
                Cancel
              </button>
              } @else if (appointment.status === 'COMPLETED') {
              <button
                (click)="viewNotes('No notes available')"
                class="bg-gray-200 text-gray-700 px-3 py-1 text-sm rounded hover:bg-gray-300 transition"
              >
                View Notes
              </button>
              }
            </div>
          </div>
        </div>
        } @if (filteredAppointments().length === 0 && !isLoading()) {
        <div class="text-center text-gray-500 py-10 border-t border-gray-200 mt-4">
          No appointments found matching the current filters.
        </div>
        }
      </div>
    </main>
  </div>

  <!-- Consultation Notes Modal -->
  <div
    class="fixed inset-0 bg-black/50 items-center justify-center z-50"
    [ngClass]="{ hidden: !isNotesModalOpen(), flex: isNotesModalOpen() }"
  >
    <div class="bg-white rounded-2xl p-6 max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Complete Consultation</h2>
        <button class="text-gray-500 text-2xl hover:text-gray-700" (click)="isNotesModalOpen.set(false)">×</button>
      </div>
      <form (ngSubmit)="saveNotes()" class="space-y-4">
        <div>
          <label class="block text-gray-700 font-semibold mb-1">
            Diagnosis <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            [(ngModel)]="consultationNotes.diagnosis"
            name="diagnosis"
            required
            placeholder="e.g., Common Cold, Hypertension..."
            class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Symptoms</label>
          <input
            type="text"
            [(ngModel)]="consultationNotes.symptoms"
            name="symptoms"
            placeholder="e.g., Fever, Cough, Headache..."
            class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">Will be used as prescription instructions if medications are prescribed</p>
        </div>
        
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Clinical Notes</label>
          <textarea
            [(ngModel)]="consultationNotes.notes"
            name="notes"
            placeholder="Enter detailed consultation notes, observations, treatment plan..."
            class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
          ></textarea>
        </div>
        
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Prescription / Medications</label>
          <textarea
            [(ngModel)]="consultationNotes.prescription"
            name="prescription"
            placeholder="Enter prescribed medications (e.g., Paracetamol 500mg, Amoxicillin 250mg...)"
            class="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">Optional: Leave empty if no medications prescribed</p>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-gray-700">
            <strong>Note:</strong> Saving this form will:
          </p>
          <ul class="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
            <li>Create a medical record for the patient</li>
            <li>Mark the appointment as COMPLETED</li>
            <li>Make the record visible to both you and the patient</li>
          </ul>
        </div>

        <div class="flex gap-4 pt-4">
          <button
            type="submit"
            [disabled]="!consultationNotes.diagnosis"
            [class.opacity-50]="!consultationNotes.diagnosis"
            [class.cursor-not-allowed]="!consultationNotes.diagnosis"
            class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition disabled:hover:shadow-none disabled:hover:translate-y-0"
          >
            💾 Complete Consultation
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

  <!-- Reschedule Modal -->
  <div
    class="fixed inset-0 bg-black/50 items-center justify-center z-50 overflow-y-auto p-4"
    [ngClass]="{ hidden: !isRescheduleModalOpen(), flex: isRescheduleModalOpen() }"
  >
    <div class="bg-white rounded-2xl w-full max-w-2xl my-8">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-xl font-semibold text-gray-800">Reschedule Appointment</h3>
        @if (selectedAppointmentForReschedule) {
          <p class="text-gray-600 mt-1">
            Patient: {{ selectedAppointmentForReschedule.patient.name }}
          </p>
          <p class="text-sm text-gray-500">
            Current: {{ selectedAppointmentForReschedule.appointmentDate }} | 
            {{ formatTime(selectedAppointmentForReschedule.startTime) }} - 
            {{ formatTime(selectedAppointmentForReschedule.endTime) }}
          </p>
        }
      </div>

      <div class="p-6 space-y-6">
        <!-- Date Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select New Date
          </label>
          <input
            type="date"
            [(ngModel)]="rescheduleDate"
            (change)="onRescheduleDateChange()"
            [min]="getMinDate()"
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Available Slots -->
        @if (rescheduleDate) {
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Available Time Slots
            </label>
            
            @if (isLoadingSlots) {
              <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="text-gray-600 mt-2">Loading available slots...</p>
              </div>
            }
            
            @if (!isLoadingSlots && availableSlots.length === 0) {
              <div class="text-center py-8 bg-gray-50 rounded-lg">
                <p class="text-gray-500">No available slots for this date</p>
                <p class="text-sm text-gray-400 mt-1">Please select another date</p>
              </div>
            }
            
            @if (!isLoadingSlots && availableSlots.length > 0) {
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                @for (slot of availableSlots; track slot.availabilityId) {
                  <button
                    type="button"
                    (click)="selectSlotForReschedule(slot)"
                    [class.bg-blue-600]="selectedSlot?.availabilityId === slot.availabilityId"
                    [class.text-white]="selectedSlot?.availabilityId === slot.availabilityId"
                    [class.bg-white]="selectedSlot?.availabilityId !== slot.availabilityId"
                    [class.text-gray-700]="selectedSlot?.availabilityId !== slot.availabilityId"
                    class="p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition font-medium text-sm"
                  >
                    <div class="flex items-center justify-center gap-1">
                      <span>🕐</span>
                      <span>{{ formatTime(slot.startTime) }} - {{ formatTime(slot.endTime) }}</span>
                    </div>
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Selected Slot Summary -->
        @if (selectedSlot) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 class="font-medium text-gray-800 mb-2">New Appointment Details</h4>
            <div class="space-y-1 text-sm text-gray-600">
              <p><strong>Patient:</strong> {{ selectedAppointmentForReschedule?.patient.name }}</p>
              <p><strong>New Date:</strong> {{ rescheduleDate }}</p>
              <p><strong>New Time:</strong> {{ formatTime(selectedSlot.startTime) }} - {{ formatTime(selectedSlot.endTime) }}</p>
            </div>
          </div>
        }
      </div>

      <div class="p-6 border-t border-gray-200 flex gap-3">
        <button
          (click)="closeRescheduleModal()"
          class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
        >
          Cancel
        </button>
        <button
          (click)="confirmReschedule()"
          [disabled]="!selectedSlot"
          [class.opacity-50]="!selectedSlot"
          [class.cursor-not-allowed]="!selectedSlot"
          class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition font-medium disabled:hover:bg-blue-600"
        >
          Confirm Reschedule
        </button>
      </div>
    </div>
  </div>
</body>




import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/doctor-appointment-service.js';

interface Patient {
  patientId?: number;
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

interface DoctorAvailabilitySlot {
  availabilityId: number;
  availableDate: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  templateUrl: './doctor-appointments.html',
  imports: [FormsModule, CommonModule, HttpClientModule, RouterLink],
})
export class DoctorAppointments implements OnInit {
  private appointmentService = inject(AppointmentService);

  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  currentAppointmentId: number | null = null;

  // Filters
  searchTerm = '';
  dateFilter = 'all';
  statusFilter = 'all';

  // Stats
  todayCount = signal(0);
  pendingCount = signal(0);
  confirmedCount = signal(0);
  completedCount = signal(0);

  // Consultation Modal
  isNotesModalOpen = signal(false);
  consultationNotes = { diagnosis: '', symptoms: '', notes: '', prescription: '' };

  // Reschedule Modal
  isRescheduleModalOpen = signal(false);
  selectedAppointmentForReschedule: Appointment | null = null;
  rescheduleDate: string = '';
  availableSlots: DoctorAvailabilitySlot[] = [];
  selectedSlot: DoctorAvailabilitySlot | null = null;
  isLoadingSlots: boolean = false;

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

  startConsultation(id: number): void {
    this.currentAppointmentId = id;
    this.consultationNotes = { diagnosis: '', symptoms: '', notes: '', prescription: '' };
    this.isNotesModalOpen.set(true);
  }

  saveNotes(): void {
    if (!this.currentAppointmentId) return;

    const appointment = this.appointments().find(a => a.appointmentId === this.currentAppointmentId);
    if (!appointment) {
      alert('Appointment not found');
      return;
    }

    // Prepare medical record data
    const medicalRecordData = {
      appointmentId: this.currentAppointmentId,
      patientId: appointment.patient.patientId || 0, // You'll need to add patientId to Patient interface
      doctorId: appointment.doctor.doctorId,
      reason: appointment.reason || 'Consultation',
      diagnosis: this.consultationNotes.diagnosis,
      notes: this.consultationNotes.notes,
      prescriptions: this.consultationNotes.prescription ? [{
        medicationName: this.consultationNotes.prescription,
        dosage: '', // Can be enhanced to capture separately
        instructions: this.consultationNotes.symptoms || ''
      }] : []
    };

    console.log('Saving medical record:', medicalRecordData);

    this.appointmentService.completeMedicalRecord(medicalRecordData).subscribe({
      next: () => {
        alert('Consultation notes saved and appointment marked as COMPLETED!');
        this.isNotesModalOpen.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Save notes failed:', err);
        console.error('Error details:', err.error);
        alert(`Failed to save notes: ${err.error?.message || 'Check your API configuration.'}`);
      },
    });
  }

  // Reschedule Functions
  openRescheduleModal(appointment: Appointment): void {
    this.selectedAppointmentForReschedule = appointment;
    this.rescheduleDate = '';
    this.availableSlots = [];
    this.selectedSlot = null;
    this.isRescheduleModalOpen.set(true);
  }

  closeRescheduleModal(): void {
    this.isRescheduleModalOpen.set(false);
    this.selectedAppointmentForReschedule = null;
    this.rescheduleDate = '';
    this.availableSlots = [];
    this.selectedSlot = null;
  }

  onRescheduleDateChange(): void {
    if (this.rescheduleDate && this.selectedAppointmentForReschedule) {
      this.loadAvailableSlotsForReschedule();
    } else {
      this.availableSlots = [];
      this.selectedSlot = null;
    }
  }

  loadAvailableSlotsForReschedule(): void {
    if (!this.rescheduleDate) return;

    this.isLoadingSlots = true;
    console.log('Loading slots for date:', this.rescheduleDate);
    
    // You need to add this method to your AppointmentService
    // It should call the backend to get available slots for the logged-in doctor
    this.appointmentService.getMyAvailabilityByDate(this.rescheduleDate).subscribe({
      next: (slots) => {
        console.log('Received slots:', slots);
        this.availableSlots = slots;
        this.selectedSlot = null;
        this.isLoadingSlots = false;
      },
      error: (error) => {
        console.error('Error loading available slots:', error);
        console.error('Error details:', error.error);
        this.availableSlots = [];
        this.isLoadingSlots = false;
        alert('Failed to load available slots. Please check console for details.');
      },
    });
  }

  selectSlotForReschedule(slot: DoctorAvailabilitySlot): void {
    this.selectedSlot = slot;
  }

  confirmReschedule(): void {
    if (!this.selectedSlot || !this.selectedAppointmentForReschedule) {
      alert('Please select a time slot.');
      return;
    }

    const rescheduleData = {
      appointmentDate: this.selectedSlot.availableDate,
      startTime: this.formatTimeToHHMMSS(this.selectedSlot.startTime),
      endTime: this.formatTimeToHHMMSS(this.selectedSlot.endTime),
    };

    console.log('Rescheduling with data:', rescheduleData);

    this.appointmentService.rescheduleAppointment(
      this.selectedAppointmentForReschedule.appointmentId,
      rescheduleData
    ).subscribe({
      next: () => {
        alert('Appointment rescheduled successfully!');
        this.closeRescheduleModal();
        this.loadAppointments();
      },
      error: (error) => {
        console.error('Error rescheduling appointment:', error);
        console.error('Error details:', error.error);
        alert(`Failed to reschedule: ${error.error?.message || 'Please try again.'}`);
      },
    });
  }

  formatTimeToHHMMSS(time: string): string {
    // Convert to HH:mm:ss format
    if (!time) return time;
    const parts = time.split(':');
    if (parts.length === 2) {
      // HH:mm → HH:mm:ss
      return `${parts[0]}:${parts[1]}:00`;
    }
    // Already HH:mm:ss
    return time;
  }

  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  viewNotes(notes: string): void {
    alert(`📝 Consultation Notes:\n\n${notes}`);
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
