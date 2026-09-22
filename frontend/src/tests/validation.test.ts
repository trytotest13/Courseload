import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  passwordStrength,
  validateEmail,
  validateLink,
  validateName,
  validatePassword,
  validateSubmission,
} from '../lib/validation';

describe('form validation', () => {
  it('accepts a normal email and rejects a malformed one', () => {
    expect(validateEmail('aarav.sharma@campus.edu')).toBeNull();
    expect(validateEmail('aarav.sharma@campus')).toMatch(/does not look right/i);
    expect(validateEmail('   ')).toBe('Enter your email.');
  });

  it('asks for a name of at least two characters', () => {
    expect(validateName('A')).toMatch(/full name/i);
    expect(validateName('Aarav Sharma')).toBeNull();
  });

  it('keeps the password inside what bcrypt can use', () => {
    expect(validatePassword('short')).toMatch(/8 characters/i);
    expect(validatePassword('a'.repeat(80))).toMatch(/72 characters/i);
    expect(validatePassword('a-good-password')).toBeNull();
  });

  it('scores password strength in four steps', () => {
    expect(passwordStrength('abc').score).toBe(0);
    expect(passwordStrength('abcdefgh').score).toBe(1);
    expect(passwordStrength('Abcdefgh1').score).toBeGreaterThanOrEqual(3);
    expect(passwordStrength('Abcdefgh1!').label).toBe('Very strong');
  });

  it('only accepts http and https links', () => {
    expect(validateLink('')).toBeNull();
    expect(validateLink('github.com/me/work')).toMatch(/start with http/i);
    expect(validateLink('https://github.com/me/work')).toBeNull();
  });

  it('wants a note or a link before a submission', () => {
    expect(validateSubmission('', '').content).toMatch(/note or a link/i);
    expect(hasErrors(validateSubmission('My writeup is attached.', ''))).toBe(false);
    expect(hasErrors(validateSubmission('', 'https://example.com/work'))).toBe(false);
  });

  it('flags a broken link next to a valid note', () => {
    const errors = validateSubmission('Done', 'not-a-link');
    expect(errors.linkUrl).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });
});
