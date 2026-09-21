import React, { useState } from 'react';
import { Building2, Database, Code, CheckCircle, ArrowRight, ArrowLeft, Loader2, Copy, Check, Server, Sparkles } from 'lucide-react';

export default function CampusWizard({ close, api, notify, onSuccess }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: 'Miami Tech Campus',
    code: 'MIA',
    city: 'Miami',
    db_type: 'PostgreSQL',
    port: 5434,
  });
  const [loading, setLoading] = useState(false);
  const [provisionProgress, setProvisionProgress] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value, 10) || 5432 : value,
    }));
  };

  const copyText = (text, sectionKey) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const connectorConfig = {
    name: `${formData.code.toLowerCase()}-${formData.db_type.toLowerCase()}-cdc`,
    config: {
      "connector.class": formData.db_type === 'PostgreSQL' 
        ? "io.debezium.connector.postgresql.PostgresConnector" 
        : "io.debezium.connector.mysql.MySqlConnector",
      "tasks.max": "1",
      "database.hostname": `${formData.code.toLowerCase()}-${formData.db_type.toLowerCase()}`,
      "database.port": String(formData.port),
      "database.user": "university",
      "database.password": "university123",
      "database.dbname": `${formData.city.toLowerCase()}_campus`,
      "topic.prefix": `unisphere_${formData.code.toLowerCase()}`
    }
  };

  const dockerSnippet = `  ${formData.code.toLowerCase()}-${formData.db_type.toLowerCase()}:
    image: ${formData.db_type === 'PostgreSQL' ? 'postgres:16-alpine' : 'mysql:8.4'}
    container_name: unibase-${formData.code.toLowerCase()}-db
    environment:
      ${formData.db_type === 'PostgreSQL' ? 'POSTGRES_DB' : 'MYSQL_DATABASE'}: ${formData.city.toLowerCase()}_campus
      ${formData.db_type === 'PostgreSQL' ? 'POSTGRES_USER' : 'MYSQL_USER'}: university
      ${formData.db_type === 'PostgreSQL' ? 'POSTGRES_PASSWORD' : 'MYSQL_PASSWORD'}: university123
    ports:
      - "${formData.port}:${formData.db_type === 'PostgreSQL' ? 5432 : 3306}"`;

  const sqlSnippet = `-- Initial Schema Setup for ${formData.name} (${formData.code})
CREATE DATABASE IF NOT EXISTS ${formData.city.toLowerCase()}_campus;

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  roll_no VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(50) NOT NULL,
  attendance NUMERIC(5,2) DEFAULT 100.0,
  cgpa NUMERIC(3,2) DEFAULT 0.0
);`;

  const handleDeploy = async () => {
    setLoading(true);
    setError('');
    setProvisionProgress('Initializing database container & schema...');
    
    try {
      await new Promise((r) => setTimeout(r, 600));
      setProvisionProgress('Configuring Debezium CDC pipe & topic routing...');
      
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        city: formData.city,
        db_type: formData.db_type,
        port: formData.port
      };

      await new Promise((r) => setTimeout(r, 600));
      setProvisionProgress('Connecting WebSocket real-time event pipeline...');
      
      const res = await api('/api/campuses/onboard', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await new Promise((r) => setTimeout(r, 500));
      setProvisionProgress('Campus provisioned successfully!');
      
      if (notify) notify(`Campus ${res.name} (${res.code}) onboarded & CDC linked!`);
      if (onSuccess) onSuccess();
      setTimeout(() => close(), 800);
    } catch (err) {
      setError(err.message || 'Failed to onboard campus.');
      setProvisionProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fade-in">
      <div className="modal-content wizard-modal scale-in">
        <div className="modal-header">
          <div className="flex-align gap-8">
            <Sparkles size={20} className="text-accent" />
            <div>
              <h3>1-Click Campus Onboarding Wizard</h3>
              <small className="muted">Provision new OLTP stores & Debezium CDC pipeline in 4 steps</small>
            </div>
          </div>
          <button className="close-btn" onClick={close}>×</button>
        </div>

        {/* Wizard Stepper Header */}
        <div className="wizard-steps-nav">
          <div className={`wizard-step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">Identity</span>
          </div>
          <div className="step-connector" />
          <div className={`wizard-step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Database</span>
          </div>
          <div className="step-connector" />
          <div className={`wizard-step-item ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">CDC & Artifacts</span>
          </div>
          <div className="step-connector" />
          <div className={`wizard-step-item ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
            <span className="step-num">4</span>
            <span className="step-label">Provision</span>
          </div>
        </div>

        {/* Step 1: Campus Identity */}
        {step === 1 && (
          <div className="wizard-step-body fade-in">
            <h4>Campus Identity & Location</h4>
            <p className="muted margin-bottom-16">Enter basic metadata for the incoming campus node.</p>
            <div className="form-grid">
              <label>
                Campus Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Chicago Tech Campus"
                  required
                />
              </label>
              <label>
                Campus Code (3-4 Letters)
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. CHI"
                  maxLength={5}
                  required
                />
              </label>
              <label>
                City / Location
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Chicago"
                  required
                />
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Database Configuration */}
        {step === 2 && (
          <div className="wizard-step-body fade-in">
            <h4>Database Engine Configuration</h4>
            <p className="muted margin-bottom-16">Specify the primary transactional OLTP database parameters.</p>
            <div className="form-grid">
              <label>
                Database Engine
                <select name="db_type" value={formData.db_type} onChange={handleChange}>
                  <option value="PostgreSQL">PostgreSQL 16 (Recommended)</option>
                  <option value="MySQL">MySQL 8.4 LTS</option>
                </select>
              </label>
              <label>
                Exposed Port
                <input
                  type="number"
                  name="port"
                  value={formData.port}
                  onChange={handleChange}
                  placeholder="5434"
                  required
                />
              </label>
              <label>
                Target Database Name
                <input
                  type="text"
                  value={`${formData.city.toLowerCase()}_campus`}
                  disabled
                  className="input-disabled"
                />
              </label>
              <label>
                CDC Host Alias
                <input
                  type="text"
                  value={`${formData.code.toLowerCase()}-${formData.db_type.toLowerCase()}`}
                  disabled
                  className="input-disabled"
                />
              </label>
            </div>
          </div>
        )}

        {/* Step 3: CDC Artifacts Preview */}
        {step === 3 && (
          <div className="wizard-step-body fade-in">
            <h4>Auto-Generated Integration Artifacts</h4>
            <p className="muted margin-bottom-16">
              UniBase automatically synthesizes Debezium CDC configs & Docker Compose service definitions.
            </p>

            <div className="artifacts-preview-tabs">
              <div className="artifact-box">
                <div className="artifact-header">
                  <span><Code size={14} /> Debezium Connector JSON</span>
                  <button
                    className="icon-btn"
                    onClick={() => copyText(JSON.stringify(connectorConfig, null, 2), 'cdc')}
                  >
                    {copiedSection === 'cdc' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  </button>
                </div>
                <pre className="code-snippet">{JSON.stringify(connectorConfig, null, 2)}</pre>
              </div>

              <div className="artifact-box">
                <div className="artifact-header">
                  <span><Server size={14} /> Docker Compose Snippet</span>
                  <button
                    className="icon-btn"
                    onClick={() => copyText(dockerSnippet, 'docker')}
                  >
                    {copiedSection === 'docker' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  </button>
                </div>
                <pre className="code-snippet">{dockerSnippet}</pre>
              </div>

              <div className="artifact-box">
                <div className="artifact-header">
                  <span><Database size={14} /> Initial Schema SQL</span>
                  <button
                    className="icon-btn"
                    onClick={() => copyText(sqlSnippet, 'sql')}
                  >
                    {copiedSection === 'sql' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  </button>
                </div>
                <pre className="code-snippet">{sqlSnippet}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Provisioning */}
        {step === 4 && (
          <div className="wizard-step-body fade-in">
            <h4>Provision & Link Campus</h4>
            <p className="muted margin-bottom-16">Confirm details below to launch container and begin CDC ingestion.</p>

            <div className="summary-card-grid">
              <div className="summary-item">
                <small>CAMPUS NAME</small>
                <strong>{formData.name} ({formData.code})</strong>
              </div>
              <div className="summary-item">
                <small>LOCATION</small>
                <strong>{formData.city}</strong>
              </div>
              <div className="summary-item">
                <small>DATABASE ENGINE</small>
                <strong>{formData.db_type} on Port {formData.port}</strong>
              </div>
              <div className="summary-item">
                <small>CDC CONNECTOR TOPIC</small>
                <strong>unisphere_{formData.code.toLowerCase()}</strong>
              </div>
            </div>

            {provisionProgress && (
              <div className="provision-progress-card scale-in margin-top-16">
                <div className="flex-align gap-8">
                  <Loader2 className="animate-spin text-accent" size={18} />
                  <span>{provisionProgress}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill animate-progress" />
                </div>
              </div>
            )}

            {error && <div className="error-alert margin-top-16">{error}</div>}
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="modal-actions flex-between margin-top-24">
          {step > 1 ? (
            <button className="secondary flex-align" onClick={() => setStep(step - 1)} disabled={loading}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button className="primary flex-align" onClick={() => setStep(step + 1)}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button className="primary flex-align btn-success" onClick={handleDeploy} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
              {loading ? 'Provisioning...' : 'Provision Campus Node'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
