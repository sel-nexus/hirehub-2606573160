import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { deleteSubmission, readSubmissions, updateSubmission } from '../storage/submissions.js';
import SubmissionEditor from './SubmissionEditor.jsx';

const DELETE_CONFIRMATION = 'Are you sure you want to delete this submission?';

/** Format an ISO date using the dashboard's month-day-year display contract. */
function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/** Show browser-local submissions and permit confirmed, validated changes. */
export default function SubmissionDashboard({ storageApi = { readSubmissions, updateSubmission, deleteSubmission }, confirmDelete = (message) => window.confirm(message) }) {
  const [snapshot, setSnapshot] = useState(() => storageApi.readSubmissions());
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [notice, setNotice] = useState('');

  const summary = useMemo(() => {
    const departments = new Set(snapshot.records.map((record) => record.department).filter(Boolean));
    const latestTimestamp = snapshot.records.reduce((latest, record) => {
      const timestamp = Date.parse(record.submittedAt);
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, Number.NEGATIVE_INFINITY);
    return {
      total: snapshot.records.length,
      departments: departments.size,
      latest: Number.isFinite(latestTimestamp) ? formatDate(latestTimestamp) : 'N/A',
    };
  }, [snapshot.records]);

  /** Reload persisted values only after an operation succeeds. */
  function refresh() {
    setSnapshot(storageApi.readSubmissions());
  }

  /** Persist a validated edit and keep the previous view on storage failure. */
  function handleSave(patch) {
    const result = storageApi.updateSubmission(editing.id, patch);
    if (!result.ok) {
      setNotice(result.code === 'STORAGE_WRITE_FAILED'
        ? 'Changes could not be saved in this browser. Your record is unchanged.'
        : 'This record is no longer available. Refresh the dashboard and try again.');
      return;
    }
    setEditing(null);
    setNotice('Submission updated.');
    refresh();
  }

  /** Delete only after the user confirms the exact required prompt. */
  function handleDelete(record) {
    if (!confirmDelete(DELETE_CONFIRMATION)) return;
    const result = storageApi.deleteSubmission(record.id);
    if (!result.ok) {
      setNotice(result.code === 'STORAGE_WRITE_FAILED'
        ? 'This browser could not save the deletion. The record remains unchanged.'
        : 'This record is no longer available. Refresh the dashboard and try again.');
      return;
    }
    setViewingId(null);
    setNotice('Submission deleted.');
    refresh();
  }

  return (
    <section className="admin-page" aria-labelledby="admin-dashboard-title">
      <div className="admin-page__intro">
        <p className="admin-page__eyebrow">Browser-local demo</p>
        <h1 id="admin-dashboard-title">Submissions Dashboard</h1>
        <p>Candidate records shown here are stored only in this browser.</p>
      </div>
      <div className="summary-grid" aria-label="Submission statistics">
        <article className="summary-card summary-card--total"><p>Total Submissions</p><strong>{summary.total}</strong></article>
        <article className="summary-card summary-card--departments"><p>Unique Departments</p><strong>{summary.departments}</strong></article>
        <article className="summary-card summary-card--latest"><p>Latest Submission</p><strong>{summary.latest}</strong></article>
      </div>
      {snapshot.warnings?.some((warning) => warning.code === 'INVALID_ROW_FILTERED') && (
        <p className="dashboard-notice dashboard-notice--warning" role="status">{snapshot.warnings.find((warning) => warning.code === 'INVALID_ROW_FILTERED').count} invalid stored record(s) were skipped.</p>
      )}
      {(snapshot.error || snapshot.warnings?.some((warning) => warning.code === 'INVALID_STORED_DATA')) && (
        <p className="dashboard-notice dashboard-notice--warning" role="status">Browser data could not be fully read. The dashboard is showing a safe empty or filtered view.</p>
      )}
      {notice && <p className="dashboard-notice" role="status">{notice}</p>}
      <div className="submissions-table-card">
        <div className="table-scroll" role="region" aria-label="Candidate submissions" tabIndex="0">
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Full Name</th>
                <th scope="col">Email</th>
                <th scope="col">Mobile</th>
                <th scope="col">Department</th>
                <th scope="col">Submitted On</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.records.length === 0 ? (
                <tr><td className="empty-table-cell" colSpan="7">No submissions yet.</td></tr>
              ) : snapshot.records.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td>{record.fullName}</td>
                  <td>{record.email}</td>
                  <td>{record.mobile}</td>
                  <td><span className="department-badge">{record.department}</span></td>
                  <td>{formatDate(record.submittedAt)}</td>
                  <td className="row-actions">
                    <button className="table-action" type="button" aria-expanded={viewingId === record.id} onClick={() => setViewingId((current) => current === record.id ? null : record.id)}>
                      {viewingId === record.id ? 'Hide details' : 'View details'}
                    </button>
                    <button className="table-action" type="button" onClick={() => setEditing(record)}>Edit</button>
                    <button className="table-action table-action--delete" type="button" onClick={() => handleDelete(record)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {viewingId && snapshot.records.some((record) => record.id === viewingId) && (
          <section className="submission-details" aria-label="Submission details">
            <h2>Submission details</h2>
            {Object.entries(snapshot.records.find((record) => record.id === viewingId)).map(([key, value]) => (
              <p key={key}><strong>{key === 'fullName' ? 'Full Name' : key === 'submittedAt' ? 'Submitted On' : key[0].toUpperCase() + key.slice(1)}:</strong> {key === 'submittedAt' ? formatDate(value) : value}</p>
            ))}
          </section>
        )}
      </div>
      {editing && <SubmissionEditor submission={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}
    </section>
  );
}

SubmissionDashboard.propTypes = {
  storageApi: PropTypes.shape({
    readSubmissions: PropTypes.func,
    updateSubmission: PropTypes.func,
    deleteSubmission: PropTypes.func,
  }),
  confirmDelete: PropTypes.func,
};
