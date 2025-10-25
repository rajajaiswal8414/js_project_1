import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Header } from '../../../shared/patient/header/header';
import { Patient } from '../../../models/patient-interface';
import { AppointmentDTO } from '../../../models/appointment-interface';
import { PatientService } from '../../../core/services/patient-service';
import { Sidebar } from '../../../shared/patient/sidebar/sidebar';
import { DoctorResponseDTO } from '../../../models/doctor-interface';
import { AppointmentService } from '../../../core/services/patient-appointment-service';

interface DoctorAvailabilitySlot {
  availabilityId: number;
  availableDate: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-find-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, Header],
  templateUrl: './find-doctor.html',
  styleUrls: ['./find-doctor.css'],
})
export class FindDoctorComponent implements OnInit {
  doctors: DoctorResponseDTO[] = [];
  filteredDoctors: DoctorResponseDTO[] = [];
  patient: Patient | null = null;
  searchTerm: string = '';
  searchType: 'name' | 'specialization' = 'name';
  showBookingModal: boolean = false;
  selectedDoctor: DoctorResponseDTO | null = null;
  selectedDate: string = '';
  availableSlots: DoctorAvailabilitySlot[] = [];
  selectedSlot: DoctorAvailabilitySlot | null = null;
  isLoadingSlots: boolean = false;

  appointmentData: AppointmentDTO = {
    doctorId: 0,
    appointmentDate: '',
    startTime: '',
    endTime: '',
    reason: '',
  };

  constructor(
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPatientData();
    this.loadAllDoctors();
  }

  loadPatientData(): void {
    this.patientService.getPatient().subscribe({
      next: (patient) => {
        this.patient = patient;
      },
      error: (error) => {
        console.error('Error loading patient data:', error);
      },
    });
  }

  loadAllDoctors(): void {
    this.patientService.getAllDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        this.filteredDoctors = doctors;
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
      },
    });
  }

  searchDoctors(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDoctors = this.doctors;
      return;
    }

    if (this.searchType === 'name') {
      this.patientService.searchDoctorByName(this.searchTerm).subscribe({
        next: (doctors) => {
          this.filteredDoctors = doctors;
        },
        error: (error) => {
          console.error('Error searching doctors by name:', error);
        },
      });
    } else {
      this.patientService.searchDoctorBySpecialization(this.searchTerm).subscribe({
        next: (doctors) => {
          this.filteredDoctors = doctors;
        },
        error: (error) => {
          console.error('Error searching doctors by specialization:', error);
        },
      });
    }
  }

  openBookingModal(doctor: DoctorResponseDTO): void {
    this.selectedDoctor = doctor;
    this.appointmentData.doctorId = doctor.doctorId;
    this.showBookingModal = true;
    this.selectedDate = '';
    this.availableSlots = [];
    this.selectedSlot = null;
  }

  onDateChange(): void {
    if (this.selectedDate && this.selectedDoctor) {
      this.loadAvailableSlots();
    } else {
      this.availableSlots = [];
      this.selectedSlot = null;
    }
  }

  loadAvailableSlots(): void {
    if (!this.selectedDoctor || !this.selectedDate) return;

    this.isLoadingSlots = true;
    // You need to add this method to your PatientService
    this.patientService.getDoctorAvailabilityByDate(this.selectedDoctor.doctorId, this.selectedDate).subscribe({
      next: (slots) => {
        this.availableSlots = slots;
        this.selectedSlot = null;
        this.isLoadingSlots = false;
      },
      error: (error) => {
        console.error('Error loading available slots:', error);
        this.availableSlots = [];
        this.isLoadingSlots = false;
      },
    });
  }

  selectSlot(slot: DoctorAvailabilitySlot): void {
    this.selectedSlot = slot;
    this.appointmentData.appointmentDate = slot.availableDate;
    this.appointmentData.startTime = slot.startTime;
    this.appointmentData.endTime = slot.endTime;
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    this.selectedDoctor = null;
    this.selectedDate = '';
    this.availableSlots = [];
    this.selectedSlot = null;
    this.appointmentData = {
      doctorId: 0,
      appointmentDate: '',
      startTime: '',
      endTime: '',
      reason: '',
    };
  }

  bookAppointment(): void {
    if (
      this.appointmentData.doctorId &&
      this.appointmentData.appointmentDate &&
      this.appointmentData.startTime &&
      this.appointmentData.endTime
    ) {
      this.appointmentService.bookAppointment(this.appointmentData).subscribe({
        next: (appointment) => {
          console.log('Appointment booked successfully:', appointment);
          alert('Appointment booked successfully!');
          this.closeBookingModal();
          this.router.navigate(['/patient/my-appointments']);
        },
        error: (error) => {
          console.error('Error booking appointment:', error);
          alert('Failed to book appointment. Please try again.');
        },
      });
    } else {
      alert('Please select a date and time slot.');
    }
  }

  getDoctorInitials(doctorName: string): string {
    return doctorName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
}




<div class="flex min-h-screen">
  <app-sidebar></app-sidebar>

  <!-- Main Content -->
  <main class="flex-1 p-8 bg-gray-100 overflow-y-auto">
    <app-header [patient]="patient"></app-header>

    <!-- Search Section -->
    <div class="bg-white p-6 rounded-xl shadow mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Find Doctors</h2>

      <div class="flex gap-4 mb-6">
        <div class="flex-1">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (input)="searchDoctors()"
            placeholder="Search doctors..."
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          [(ngModel)]="searchType"
          (change)="searchDoctors()"
          class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">By Name</option>
          <option value="specialization">By Specialization</option>
        </select>
      </div>

      <!-- Doctors Grid -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        @for (doctor of filteredDoctors; track doctor.doctorId) {
        <div
          class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
        >
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg"
            >
              {{ getDoctorInitials(doctor.doctorName) }}
            </div>
            <div>
              <h3 class="font-semibold text-gray-800 text-lg">{{ doctor.doctorName }}</h3>
              <p class="text-blue-600 font-medium">{{ doctor.specialization }}</p>
            </div>
          </div>

          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-gray-600">
              <span>📞</span>
              <span>{{ doctor.contactNumber }}</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <span>✉️</span>
              <span class="text-sm">{{ doctor.email }}</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <span>🎓</span>
              <span>{{ doctor.qualification }}</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <span>⭐</span>
              <span>{{ doctor.yearOfExperience }} years experience</span>
            </div>
          </div>

          <button
            (click)="openBookingModal(doctor)"
            class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition font-medium"
          >
            Book Appointment
          </button>
        </div>
        } @if (filteredDoctors.length === 0) {
        <div class="col-span-3 text-center py-12 text-gray-500">
          No doctors found matching your search criteria.
        </div>
        }
      </div>
    </div>
  </main>
</div>

<!-- Enhanced Booking Modal -->
@if (showBookingModal && selectedDoctor) {
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
  <div class="bg-white rounded-xl w-full max-w-2xl my-8">
    <div class="p-6 border-b border-gray-200">
      <h3 class="text-xl font-semibold text-gray-800">Book Appointment</h3>
      <p class="text-gray-600">with Dr. {{ selectedDoctor.doctorName }}</p>
      <p class="text-sm text-gray-500 mt-1">{{ selectedDoctor.specialization }}</p>
    </div>

    <div class="p-6 space-y-6">
      <!-- Date Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select Appointment Date
        </label>
        <input
          type="date"
          [(ngModel)]="selectedDate"
          (change)="onDateChange()"
          [min]="getMinDate()"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Available Slots -->
      @if (selectedDate) {
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
                  (click)="selectSlot(slot)"
                  [class.bg-blue-600]="selectedSlot?.availabilityId === slot.availabilityId"
                  [class.text-white]="selectedSlot?.availabilityId === slot.availabilityId"
                  [class.bg-white]="selectedSlot?.availabilityId !== slot.availabilityId"
                  [class.text-gray-700]="selectedSlot?.availabilityId !== slot.availabilityId"
                  class="p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition font-medium text-sm"
                >
                  <div class="flex items-center justify-center gap-1">
                    <span>🕐</span>
                    <span>{{ slot.startTime }} - {{ slot.endTime }}</span>
                  </div>
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Reason -->
      @if (selectedSlot) {
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Reason for Visit (Optional)
          </label>
          <textarea
            [(ngModel)]="appointmentData.reason"
            rows="3"
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of your health concern..."
          ></textarea>
        </div>

        <!-- Selected Slot Summary -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-medium text-gray-800 mb-2">Appointment Summary</h4>
          <div class="space-y-1 text-sm text-gray-600">
            <p><strong>Doctor:</strong> Dr. {{ selectedDoctor.doctorName }}</p>
            <p><strong>Date:</strong> {{ selectedDate }}</p>
            <p><strong>Time:</strong> {{ selectedSlot.startTime }} - {{ selectedSlot.endTime }}</p>
          </div>
        </div>
      }
    </div>

    <div class="p-6 border-t border-gray-200 flex gap-3">
      <button
        (click)="closeBookingModal()"
        class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
      >
        Cancel
      </button>
      <button
        (click)="bookAppointment()"
        [disabled]="!selectedSlot"
        [class.opacity-50]="!selectedSlot"
        [class.cursor-not-allowed]="!selectedSlot"
        class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition font-medium disabled:hover:bg-blue-600"
      >
        Confirm Booking
      </button>
    </div>
  </div>
</div>
}



// Add this method to your PatientService class

getDoctorAvailabilityByDate(doctorId: number, date: string): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.baseUrl}/patients/doctor-availability/${doctorId}?date=${date}`
  );
}




// Add this to DoctorAvailabilityController.java

@GetMapping("/patients/doctor-availability/{doctorId}")
public ResponseEntity<List<DoctorAvailabilityResponseDTO>> getDoctorAvailabilityByDate(
        @PathVariable("doctorId") Long doctorId,
        @RequestParam("date") String date) {
    List<DoctorAvailabilityResponseDTO> availability = 
        doctorAvailabilityService.getDoctorAvailabilityByDate(doctorId, date);
    return new ResponseEntity<>(availability, HttpStatus.OK);
}

// Add this method to DoctorAvailabilityService interface
List<DoctorAvailabilityResponseDTO> getDoctorAvailabilityByDate(Long doctorId, String date);

// Add this implementation to DoctorAvailabilityServiceImpl
@Override
public List<DoctorAvailabilityResponseDTO> getDoctorAvailabilityByDate(Long doctorId, String date) {
    List<DoctorAvailability> availabilities = 
        doctorAvailabilityRepository.findByDoctorDoctorIdAndAvailableDate(doctorId, date);
    
    return availabilities.stream()
            .map(availability -> modelMapper.map(availability, DoctorAvailabilityResponseDTO.class))
            .collect(Collectors.toList());
}

// Add this method to DoctorAvailabilityRepository interface
List<DoctorAvailability> findByDoctorDoctorIdAndAvailableDate(Long doctorId, String availableDate);
