export default function PrivateCalendar() {
  return (
    <section id="privatecalendar" className="page active">
      <div className="header">
        <div>
          <h1 className="title">Private Calendar Configuration</h1>
          <p className="subtitle">Connect your own calendar API</p>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="group full">
            <label>Calendar Name</label>
            <input placeholder="Company Appointment Calendar" />
          </div>

          <div className="group full">
            <label>Calendar API URL</label>
            <input placeholder="https://api.company.com/calendar" />
          </div>

          <div className="group">
            <label>API Key</label>
            <input type="password" />
          </div>

          <div className="group">
            <label>API Secret</label>
            <input type="password" />
          </div>

          <div className="group">
            <label>Timezone</label>
            <select defaultValue="Asia/Kolkata">
              <option>Asia/Kolkata</option>
              <option>Asia/Singapore</option>
              <option>UTC</option>
            </select>
          </div>

          <div className="group">
            <label>Default Appointment Duration</label>
            <select defaultValue="30 Minutes">
              <option>30 Minutes</option>
              <option>45 Minutes</option>
              <option>60 Minutes</option>
            </select>
          </div>
        </div>

        <button className="btn primary">Test & Save Calendar</button>
      </div>
    </section>
  );
}
