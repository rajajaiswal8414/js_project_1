// Add these endpoints to your AppointmentController or DoctorController

package com.cognizant.hams.controller;

import com.cognizant.hams.dto.request.RescheduleAppointmentDTO;
import com.cognizant.hams.dto.response.AppointmentResponseDTO;
import com.cognizant.hams.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorAppointmentController {

    private final AppointmentService appointmentService;

    // Reschedule an appointment
    @PutMapping("/appointments/{appointmentId}/reschedule")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponseDTO> rescheduleAppointment(
            @PathVariable("appointmentId") Long appointmentId,
            @Valid @RequestBody RescheduleAppointmentDTO rescheduleDTO) {
        AppointmentResponseDTO updatedAppointment = 
            appointmentService.rescheduleAppointment(appointmentId, rescheduleDTO);
        return new ResponseEntity<>(updatedAppointment, HttpStatus.OK);
    }
}

// ============================================
// Create RescheduleAppointmentDTO.java
// ============================================

package com.cognizant.hams.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleAppointmentDTO {
    
    @NotNull(message = "Appointment date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate appointmentDate;
    
    @NotNull(message = "Start time is required")
    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime startTime;
    
    @NotNull(message = "End time is required")
    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime endTime;
}

// ============================================
// Add this method to AppointmentService interface
// ============================================

AppointmentResponseDTO rescheduleAppointment(Long appointmentId, RescheduleAppointmentDTO rescheduleDTO);

// ============================================
// Add this implementation to AppointmentServiceImpl
// ============================================

@Override
@Transactional
public AppointmentResponseDTO rescheduleAppointment(Long appointmentId, RescheduleAppointmentDTO rescheduleDTO) {
    // Get the logged-in doctor
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String currentUsername = authentication.getName();
    
    Doctor loggedInDoctor = (Doctor) doctorRepository.findByUser_Username(currentUsername)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "username", currentUsername));
    
    // Get the appointment
    Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment", "appointmentId", appointmentId));
    
    // Verify this appointment belongs to the logged-in doctor
    if (!appointment.getDoctor().getDoctorId().equals(loggedInDoctor.getDoctorId())) {
        throw new AccessDeniedException("You can only reschedule your own appointments");
    }
    
    // Verify appointment is in CONFIRMED or PENDING status (can't reschedule completed/cancelled)
    if (appointment.getStatus() != AppointmentStatus.CONFIRMED && 
        appointment.getStatus() != AppointmentStatus.PENDING) {
        throw new APIException("Only CONFIRMED or PENDING appointments can be rescheduled");
    }
    
    // Check if the new time slot is available for this doctor
    boolean hasAvailability = doctorAvailabilityRepository.existsByDoctorDoctorIdAndAvailableDateAndStartTimeAndEndTime(
        loggedInDoctor.getDoctorId(),
        rescheduleDTO.getAppointmentDate().toString(),
        rescheduleDTO.getStartTime().toString(),
        rescheduleDTO.getEndTime().toString()
    );
    
    if (!hasAvailability) {
        throw new APIException("The selected time slot is not available");
    }
    
    // Check if the new slot is already booked
    boolean isSlotBooked = appointmentRepository.existsByDoctorDoctorIdAndAppointmentDateAndStartTimeAndStatusNot(
        loggedInDoctor.getDoctorId(),
        rescheduleDTO.getAppointmentDate(),
        rescheduleDTO.getStartTime(),
        AppointmentStatus.REJECTED,
        appointmentId // Exclude current appointment
    );
    
    if (isSlotBooked) {
        throw new APIException("This time slot has already been booked");
    }
    
    // Update the appointment
    appointment.setAppointmentDate(rescheduleDTO.getAppointmentDate());
    appointment.setStartTime(rescheduleDTO.getStartTime());
    appointment.setEndTime(rescheduleDTO.getEndTime());
    
    Appointment updatedAppointment = appointmentRepository.save(appointment);
    
    // Optional: Send notification to patient about reschedule
    // notificationService.notifyPatientOnReschedule(updatedAppointment);
    
    return modelMapper.map(updatedAppointment, AppointmentResponseDTO.class);
}

// ============================================
// Add this method to AppointmentRepository
// ============================================

boolean existsByDoctorDoctorIdAndAppointmentDateAndStartTimeAndStatusNot(
    Long doctorId, 
    LocalDate appointmentDate, 
    LocalTime startTime, 
    AppointmentStatus status,
    Long excludeAppointmentId
);

// Or use a custom query:
@Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Appointment a " +
       "WHERE a.doctor.doctorId = :doctorId " +
       "AND a.appointmentDate = :appointmentDate " +
       "AND a.startTime = :startTime " +
       "AND a.status != :status " +
       "AND a.appointmentId != :excludeAppointmentId")
boolean existsByDoctorAndDateAndTimeExcludingAppointment(
    @Param("doctorId") Long doctorId,
    @Param("appointmentDate") LocalDate appointmentDate,
    @Param("startTime") LocalTime startTime,
    @Param("status") AppointmentStatus status,
    @Param("excludeAppointmentId") Long excludeAppointmentId
);

// ============================================
// Update DoctorAvailabilityController to support date filtering
// ============================================

@GetMapping("/availability")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<List<DoctorAvailabilityResponseDTO>> getDoctorAvailability(
        @RequestParam(required = false) String date) {
    
    if (date != null && !date.isEmpty()) {
        // Filter by date
        List<DoctorAvailabilityResponseDTO> availability = 
            doctorAvailabilityService.getDoctorAvailabilityByDate(date);
        return new ResponseEntity<>(availability, HttpStatus.OK);
    } else {
        // Get all availability
        List<DoctorAvailabilityResponseDTO> availability = 
            doctorAvailabilityService.getDoctorAvailability();
        return new ResponseEntity<>(availability, HttpStatus.OK);
    }
}

// Add this method to DoctorAvailabilityService interface
List<DoctorAvailabilityResponseDTO> getDoctorAvailabilityByDate(String date);

// Add this implementation to DoctorAvailabilityServiceImpl
@Override
public List<DoctorAvailabilityResponseDTO> getDoctorAvailabilityByDate(String date) {
    Doctor loggedInDoctor = getDoctorFromSecurityContext();
    
    List<DoctorAvailability> availabilities = 
        doctorAvailabilityRepository.findByDoctorDoctorIdAndAvailableDate(
            loggedInDoctor.getDoctorId(), 
            date
        );
    
    return availabilities.stream()
            .map(availability -> modelMapper.map(availability, DoctorAvailabilityResponseDTO.class))
            .collect(Collectors.toList());
}

// Add this method to DoctorAvailabilityRepository
List<DoctorAvailability> findByDoctorDoctorIdAndAvailableDate(Long doctorId, String availableDate);





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
    <div class="bg-white rounded-2xl p-6 max-w-lg w-11/12 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Add Consultation Notes</h2>
        <button class="text-gray-500 text-2xl" (click)="isNotesModalOpen.set(false)">×</button>
      </div>
      <form (ngSubmit)="saveNotes()" class="space-y-4">
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Diagnosis</label>
          <input
            type="text"
            [(ngModel)]="consultationNotes.diagnosis"
            name="diagnosis"
            required
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Symptoms</label>
          <input
            type="text"
            [(ngModel)]="consultationNotes.symptoms"
            name="symptoms"
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Notes</label>
          <textarea
            [(ngModel)]="consultationNotes.notes"
            name="notes"
            placeholder="Enter consultation notes..."
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[100px]"
          ></textarea>
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Prescription</label>
          <textarea
            [(ngModel)]="consultationNotes.prescription"
            name="prescription"
            placeholder="Enter prescribed medications..."
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[100px]"
          ></textarea>
        </div>
        <div class="flex gap-4">
          <button
            type="submit"
            class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg hover:-translate-y-1 transition"
          >
            Save Notes
          </button>
          <button
            type="button"
            (click)="isNotesModalOpen.set(false)"
            class="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
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
