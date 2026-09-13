import { describe, it, expect } from 'vitest';
import type { PatientProfile, EmergencyContact } from './state/PatientSessionContext';
import { getStoredPatientRecords } from '../doctor/patientRecords';

describe('Emergency Parent/Guardian Contact', () => {
  it('allows PatientProfile without emergency contact (optional field)', () => {
    const profile: PatientProfile = {
      name: 'Sunita Devi',
      age: '36',
      sex: 'Female',
      identifier: 'DEMO-88219',
      identifierType: 'demo',
      language: 'hi',
    };

    expect(profile.emergencyContact).toBeUndefined();
  });

  it('correctly stores EmergencyContact in PatientProfile when provided', () => {
    const contact: EmergencyContact = {
      guardianName: 'Ramesh Patel',
      relationship: 'Father',
      phoneNumber: '9876543210',
    };

    const profile: PatientProfile = {
      name: 'Aarav Patel',
      age: '12',
      sex: 'Male',
      identifier: 'DEMO-12345',
      identifierType: 'demo',
      language: 'en',
      emergencyContact: contact,
    };

    expect(profile.emergencyContact).toBeDefined();
    expect(profile.emergencyContact?.guardianName).toBe('Ramesh Patel');
    expect(profile.emergencyContact?.relationship).toBe('Father');
    expect(profile.emergencyContact?.phoneNumber).toBe('9876543210');
  });

  it('validates 10-digit Indian phone format for emergency contact', () => {
    const validatePhone = (raw: string) => {
      const digits = raw.replace(/\D/g, '');
      return digits.length === 10;
    };

    expect(validatePhone('9876543210')).toBe(true);
    expect(validatePhone('98765 43210')).toBe(true);
    expect(validatePhone('+91 9876543210')).toBe(false); // clean 10-digit check
    expect(validatePhone('12345')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });

  it('formats tel: protocol link properly for one-click calling by hospital devices', () => {
    const rawNumber = '98765 43210';
    const telLink = `tel:${rawNumber.replace(/\s+/g, '')}`;
    expect(telLink).toBe('tel:9876543210');
  });

  it('verifies DEMO-REC-001 has emergency contact while DEMO-REC-002 does not', () => {
    const records = getStoredPatientRecords();
    const ramesh = records.find((r) => r.id === 'DEMO-REC-001');
    const sunita = records.find((r) => r.id === 'DEMO-REC-002');

    expect(ramesh?.patientProfile.emergencyContact).toBeDefined();
    expect(ramesh?.patientProfile.emergencyContact?.guardianName).toBe('Sunita Patel');
    expect(ramesh?.patientProfile.emergencyContact?.relationship).toBe('Mother');

    expect(sunita?.patientProfile.emergencyContact).toBeUndefined();
  });
});
