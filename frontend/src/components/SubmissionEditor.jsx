import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DEPARTMENTS, validateSubmission } from '../validation/submission.js';

/** Edit only the candidate fields authorized by the demo contract. */
export default function SubmissionEditor({ submission, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    fullName: submission.fullName,
    mobile: submission.mobile,
    department: submission.department,
  });
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input')?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [onCancel]);

  /** Keep one editable field current and clear its previous validation error. */
  function handleChange(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  /** Validate the permitted edit fields before handing them to the store. */
  function handleSubmit(event) {
    event.preventDefault();
    const validation = validateSubmission(draft, 'edit');
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    onSave(draft);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="submission-editor" role="dialog" aria-modal="true" aria-labelledby="edit-submission-title" ref={dialogRef}>
        <h2 id="edit-submission-title">Edit Submission</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="edit-fullName">Full Name</label>
            <input id="edit-fullName" name="fullName" value={draft.fullName} onChange={handleChange} aria-required="true" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'edit-fullName-error' : undefined} />
            {errors.fullName && <p className="field-error" id="edit-fullName-error" role="alert">{errors.fullName}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="edit-email">Email Address</label>
            <input id="edit-email" name="email" type="email" value={submission.email} readOnly disabled />
          </div>
          <div className="form-field">
            <label htmlFor="edit-mobile">Mobile Number</label>
            <input id="edit-mobile" name="mobile" inputMode="numeric" maxLength={10} value={draft.mobile} onChange={handleChange} aria-required="true" aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? 'edit-mobile-error' : undefined} />
            {errors.mobile && <p className="field-error" id="edit-mobile-error" role="alert">{errors.mobile}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="edit-department">Department</label>
            <select id="edit-department" name="department" value={draft.department} onChange={handleChange} aria-required="true" aria-invalid={Boolean(errors.department)} aria-describedby={errors.department ? 'edit-department-error' : undefined}>
              <option value="">Select a department</option>
              {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            {errors.department && <p className="field-error" id="edit-department-error" role="alert">{errors.department}</p>}
          </div>
          <div className="editor-actions">
            <button className="button button--primary" type="submit">Save Changes</button>
            <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}

SubmissionEditor.propTypes = {
  submission: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    mobile: PropTypes.string.isRequired,
    department: PropTypes.string.isRequired,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
