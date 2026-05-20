import { useState, useEffect } from 'react';
import '../styles/Dob.css';

const months = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

export default function DateOfBirthSelect({ value, onChange, name = 'dob', error }) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Parse incoming value (e.g. "1995-06-15") into dropdowns
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setYear(y || '');
      setMonth(months[parseInt(m) - 1] || '');
      setDay(parseInt(d) || '');
    }
  }, []);

  // Emit combined value upward whenever any dropdown changes
  useEffect(() => {
    if (day && month && year) {
      const m = String(months.indexOf(month) + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      onChange({ target: { name, value: `${year}-${m}-${d}` } });
    }
  }, [day, month, year]);

  return (
    <div className="dob-selects">
      <select
        className={`auth-input ${error ? 'error' : ''}`}
        value={day}
        onChange={e => setDay(e.target.value)}
      >
        <option value="">Day</option>
        {days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select
        className={`auth-input ${error ? 'error' : ''}`}
        value={month}
        onChange={e => setMonth(e.target.value)}
      >
        <option value="">Month</option>
        {months.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select
        className={`auth-input ${error ? 'error' : ''}`}
        value={year}
        onChange={e => setYear(e.target.value)}
      >
        <option value="">Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}