import { describe, expect, it } from 'vitest';
import { evaluateSafety, detectUrgentComplaintText } from './safetyEngine';

describe('safety engine — core evaluation', () => {
  it('flags breathing difficulty', () => expect(evaluateSafety({ breathingDifficulty: 'yes' })).toHaveLength(1));
  it('flags blood in cough', () => expect(evaluateSafety({ bloodInCough: 'yes' })).toHaveLength(1));
  it('flags severe pain', () => expect(evaluateSafety({ severity: 8 })).toHaveLength(1));
  it('does not diagnose', () => expect(evaluateSafety({ cough: 'yes' })).toHaveLength(0));
});

describe('safety engine — standalone severe chest pain / urgent breathing difficulty', () => {
  it('flags standalone severe chest pain in free text (English)', () => {
    const flag = detectUrgentComplaintText('I have severe chest pain');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
  });

  it('flags standalone severe chest pain in free text (Hindi/Hinglish)', () => {
    const flag = detectUrgentComplaintText('Seene mein bahut tez dard ho raha hai');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
  });

  it('flags standalone breathing difficulty in free text (English)', () => {
    const flag = detectUrgentComplaintText('I have severe difficulty breathing');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
  });

  it('flags standalone breathing difficulty in free text (Hindi/Hinglish)', () => {
    const flag = detectUrgentComplaintText('Saans lene mein bahut dikkat ho rahi hai');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
  });

  it('flags standalone chest pain in structured history answers', () => {
    const flags = evaluateSafety({ chestPain: 'yes' });
    expect(flags.some((f) => f.severity === 'urgent' && f.field === 'chestPain')).toBe(true);
  });

  it('flags standalone breathlessness in structured history answers', () => {
    const flags = evaluateSafety({ breathlessness: 'yes' });
    expect(flags.some((f) => f.severity === 'urgent' && f.field === 'breathingDifficulty')).toBe(true);
  });
});

describe('safety engine — bleeding emergencies', () => {
  it('flags hemoptysis in free text (coughing blood)', () => {
    const flag = detectUrgentComplaintText('I am coughing up blood');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
    expect(flag?.id).toBe('blood-in-cough');
  });

  it('flags hemoptysis in Hinglish (khansi mein khoon)', () => {
    const flag = detectUrgentComplaintText('khansi mein khoon aa raha hai');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
  });

  it('flags GI bleeding in free text (vomiting blood)', () => {
    const flag = detectUrgentComplaintText('There is blood in my vomit');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
    expect(flag?.id).toBe('gi-bleeding');
  });

  it('flags GI bleeding in free text (blood in stool)', () => {
    const flag = detectUrgentComplaintText('I noticed blood in my stool');
    expect(flag).not.toBeNull();
    expect(flag?.severity).toBe('urgent');
    expect(flag?.id).toBe('gi-bleeding');
  });

  it('flags blood in stool and black tarry stool in history answers', () => {
    const redStool = evaluateSafety({ bowelChange: 'blood_in_stool' });
    expect(redStool.some((f) => f.severity === 'urgent' && f.id === 'gi-bleeding')).toBe(true);

    const blackStool = evaluateSafety({ bowelChanges: 'black_tarry_stool' });
    expect(blackStool.some((f) => f.severity === 'urgent' && f.id === 'gi-bleeding')).toBe(true);
  });
});

describe('safety engine — urgent flag after answer editing', () => {
  it('detects urgent flag immediately when previous benign answer is edited to red-flag value', () => {
    const answersBeforeEdit: Record<string, any> = {
      duration: '3 days',
      cough: 'yes',
      breathingDifficulty: 'no',
      fever: 'no',
    };
    expect(evaluateSafety(answersBeforeEdit).some((f) => f.severity === 'urgent')).toBe(false);

    // Patient edits answer: breathingDifficulty becomes 'yes'
    const answersAfterEdit = {
      ...answersBeforeEdit,
      breathingDifficulty: 'yes',
    };
    const flagsAfterEdit = evaluateSafety(answersAfterEdit);
    expect(flagsAfterEdit.some((f) => f.severity === 'urgent' && f.field === 'breathingDifficulty')).toBe(true);
  });

  it('detects GI bleeding flag when bowel change is edited to blood_in_stool', () => {
    const initialAnswers: Record<string, any> = {
      location: 'lower abdomen',
      bowelChange: 'no_change',
    };
    expect(evaluateSafety(initialAnswers).some((f) => f.severity === 'urgent')).toBe(false);

    const editedAnswers = {
      ...initialAnswers,
      bowelChange: 'blood_in_stool',
    };
    const flags = evaluateSafety(editedAnswers);
    expect(flags.some((f) => f.severity === 'urgent' && f.id === 'gi-bleeding')).toBe(true);
  });
});

describe('safety engine — browser-back protection & severity distinctions', () => {
  it('urgent flags satisfy safety lock guard condition', () => {
    const flags = evaluateSafety({ breathingDifficulty: 'yes' });
    const isLocked = flags.some((f) => f.severity === 'urgent');
    expect(isLocked).toBe(true);
  });

  it('attention-level flags do NOT trigger urgent safety lockout', () => {
    // Severe pain alone is an 'attention' flag, not 'urgent'
    const flags = evaluateSafety({ severity: 8 });
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('attention');
    expect(flags.some((f) => f.severity === 'urgent')).toBe(false);
  });
});

describe('safety engine — normal non-urgent symptoms remain normal', () => {
  it('does not flag routine non-urgent chief complaints', () => {
    expect(detectUrgentComplaintText('I have fever')).toBeNull();
    expect(detectUrgentComplaintText('I have a cough')).toBeNull();
    expect(detectUrgentComplaintText('My stomach is hurting')).toBeNull();
    expect(detectUrgentComplaintText('My eyes are hurting')).toBeNull();
    expect(detectUrgentComplaintText('I have a headache')).toBeNull();
    expect(detectUrgentComplaintText('My back is hurting')).toBeNull();
    expect(detectUrgentComplaintText('My knee is hurting')).toBeNull();
    expect(detectUrgentComplaintText('I have burning when I urinate')).toBeNull();
    expect(detectUrgentComplaintText('Mere sar mein dard hai')).toBeNull();
    expect(detectUrgentComplaintText('Meri kamar mein dard ho raha hai')).toBeNull();
    expect(detectUrgentComplaintText('Peshab karte waqt jalan hoti hai')).toBeNull();
    expect(detectUrgentComplaintText('I feel tired all the time')).toBeNull();
  });

  it('does not flag routine history questionnaire answers', () => {
    const routineAnswers = {
      duration: '2 days',
      cough: 'yes',
      fever: 'yes',
      breathingDifficulty: 'no',
      bloodInCough: 'no',
      chestPain: 'no',
      severity: 4,
    };
    expect(evaluateSafety(routineAnswers)).toHaveLength(0);
  });
});
