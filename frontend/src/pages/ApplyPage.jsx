import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEPARTMENTS, validateSubmission } from '../validation/submission.js';
import { createSubmission, readSubmissions } from '../storage/submissions.js';

const SUCCESS_MESSAGE = 'Thank you! Your interest has been submitted successfully.';
const DUPLICATE_MESSAGE = 'This email has already been submitted.';
const STORAGE_MESSAGE = 'Your application could not be saved. Check your browser storage and try again.';
const fieldDefinitions = [
  { name: 'fullName', label: 'Full Name', type: 'text', autoComplete: 'name', maxLength: 100 },
  { name: 'email', label: 'Email Address', type: 'email', autoComplete: 'email' },
  { name: 'mobile', label: 'Mobile Number', type: 'tel', autoComplete: 'tel', inputMode: 'numeric', maxLength: 10 },
];

const emptyDraft = { fullName: '', email: '', mobile: '', department: '' };

/** Provide a labeled and error-associated control for a candidate field. */
function FormField({ definition, value, error, onChange }) {
  const { name, label, type, autoComplete, inputMode, maxLength } = definition;
  const errorId = `${name}-error`;
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

/** Collect candidate interest with validation and browser-local persistence. */
export default function ApplyPage() {
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [storageState, setStorageState] = useState(() => readSubmissions());
  const successTimer = useRef(null);

  useEffect(() => () => {
    if (successTimer.current) {
      window.clearTimeout(successTimer.current);
    }
  }, []);

  /** Keep the candidate's latest edit and clear only that field's stale error. */
  function handleChange(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setMessage(null);
  }

  /** Validate, persist one candidate record, and announce the result. */
  function handleSubmit(event) {
    event.preventDefault();
    if (successTimer.current) {
      window.clearTimeout(successTimer.current);
      successTimer.current = null;
    }
    setMessage(null);
    const validation = validateSubmission(draft, 'create');
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstInvalidField = Object.keys(validation.errors)[0];
      document.getElementById(firstInvalidField)?.focus();
      return;
    }

    const result = createSubmission(draft);
    setStorageState(readSubmissions());
    if (!result.ok) {
      if (result.code === 'DUPLICATE_EMAIL') {
        setErrors({ email: DUPLICATE_MESSAGE });
        document.getElementById('email')?.focus();
        return;
      }
      setMessage({ kind: 'error', text: STORAGE_MESSAGE });
      return;
    }

    setDraft(emptyDraft);
    setErrors({});
    setMessage({ kind: 'success', text: SUCCESS_MESSAGE });
    successTimer.current = window.setTimeout(() => {
      setMessage(null);
      successTimer.current = null;
    }, 4000);
  }

  const invalidStoredData = storageState.warnings.some((warning) => warning.code === 'INVALID_STORED_DATA');
  const warningText = storageState.error
    ? storageState.error === 'STORAGE_WRITE_FAILED' && invalidStoredData
      ? 'Existing browser data is unreadable and could not be reset because browser storage is unavailable. Your details will not be submitted.'
      : 'Browser storage is unavailable. Your details will not be submitted.'
    : storageState.reset || invalidStoredData
      ? 'Existing browser data was unreadable and has been reset. You can submit again.'
      : null;

  return (
    <section className="apply-page" aria-labelledby="apply-title">
      <div className="apply-card">
        <Link className="back-link" to="/">← Back to Home</Link>
        <h1 id="apply-title">Join Our Team</h1>
        <p className="apply-subtitle">Express your interest in working with us.</p>
        {warningText && <p className="form-notice form-notice--warning" role="status">{warningText}</p>}
        {message && (
          <p
            className={`form-notice form-notice--${message.kind}`}
            role={message.kind === 'error' ? 'alert' : 'status'}
            aria-live={message.kind === 'error' ? 'assertive' : 'polite'}
          >
            {message.text}
          </p>
        )}
        <form onSubmit={handleSubmit} noValidate>
          {fieldDefinitions.map((definition) => (
            <FormField
              key={definition.name}
              definition={definition}
              value={draft[definition.name]}
              error={errors[definition.name]}
              onChange={handleChange}
            />
          ))}
          <div className="form-field">
            <label htmlFor="department">Department of Interest</label>
            <select
              id="department"
              name="department"
              value={draft.department}
              onChange={handleChange}
              aria-required="true"
              aria-invalid={Boolean(errors.department)}
              aria-describedby={errors.department ? 'department-error' : undefined}
            >
              <option value="">Select a department</option>
              {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            {errors.department && <p className="field-error" id="department-error" role="alert">{errors.department}</p>}
          </div>
          <button className="button button--primary apply-submit" type="submit">Submit Application</button>
        </form>
        <p className="local-data-note">Submissions are saved only in this browser for demonstration purposes.</p>
      </div>
    </section>
  );
}


