// Add this validation to your bookAppointment method in AppointmentServiceImpl

@Override
public AppointmentResponseDTO bookAppointment(AppointmentDTO appointmentDTO) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String currentUsername = authentication.getName();

    Patient patient = (Patient) patientRepository.findByUser_Username(currentUsername)
            .orElseThrow(() -> new ResourceNotFoundException("Patient", "username", currentUsername));

    Doctor doctor = doctorRepository.findById(appointmentDTO.getDoctorId())
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "Id", appointmentDTO.getDoctorId()));

    // VALIDATION 1: Check if doctor has availability for this slot
    boolean hasAvailability = doctorAvailabilityRepository.existsByDoctorDoctorIdAndAvailableDateAndStartTimeAndEndTime(
        appointmentDTO.getDoctorId(),
        appointmentDTO.getAppointmentDate().toString(),
        appointmentDTO.getStartTime().toString(),
        appointmentDTO.getEndTime().toString()
    );
    
    if (!hasAvailability) {
        throw new APIException("This time slot is not available for the selected doctor.");
    }

    // VALIDATION 2: Check if slot is already booked
    boolean isSlotBooked = appointmentRepository.existsByDoctorDoctorIdAndAppointmentDateAndStartTimeAndStatus(
        appointmentDTO.getDoctorId(),
        appointmentDTO.getAppointmentDate(),
        appointmentDTO.getStartTime(),
        AppointmentStatus.APPROVED // or check for PENDING as well
    );
    
    if (isSlotBooked) {
        throw new APIException("This time slot has already been booked.");
    }

    Appointment appointment = modelMapper.map(appointmentDTO, Appointment.class);
    appointment.setAppointmentId(null);
    appointment.setVersion(null);
    appointment.setStatus(AppointmentStatus.PENDING);
    appointment.setPatient(patient);
    appointment.setDoctor(doctor);

    Appointment savedAppointment = appointmentRepository.save(appointment);
    notificationService.notifyDoctorOnAppointmentRequest(savedAppointment);

    return modelMapper.map(savedAppointment, AppointmentResponseDTO.class);
}

// Add these methods to your repositories if they don't exist:

// In DoctorAvailabilityRepository:
boolean existsByDoctorDoctorIdAndAvailableDateAndStartTimeAndEndTime(
    Long doctorId, String availableDate, String startTime, String endTime);

// In AppointmentRepository:
boolean existsByDoctorDoctorIdAndAppointmentDateAndStartTimeAndStatus(
    Long doctorId, LocalDate appointmentDate, LocalTime startTime, AppointmentStatus status);
