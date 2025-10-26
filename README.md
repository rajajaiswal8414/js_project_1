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
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate appointmentDate;
    
    @NotNull(message = "Start time is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    private LocalTime startTime;
    
    @NotNull(message = "End time is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
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





import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/doctor-appointment-service.js';

interface Patient {
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

    const payload = { ...this.consultationNotes };

    this.appointmentService.saveConsultationNotes(this.currentAppointmentId, payload).subscribe({
      next: () => {
        alert('Consultation notes saved and appointment marked as COMPLETED!');
        this.isNotesModalOpen.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Save notes failed:', err);
        alert('Failed to save notes. Check your API configuration.');
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
