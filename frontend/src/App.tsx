import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

/**
 * Minimal home page — will be replaced with the full
 * file explorer UI in Module 9.
 */
function HomePage() {
  return (
    <div className="home">
      <div className="home__container">
        <div className="home__icon">📁</div>
        <h1 className="home__title">FileManager</h1>
        <p className="home__subtitle">Secure File Storage & Management System</p>
        <div className="home__status">
          <StatusCard
            title="Architecture"
            status="Active"
            description="Microservices with API Gateway"
          />
          <StatusCard
            title="Backend"
            status="Running"
            description="4 services on Express.js"
          />
          <StatusCard
            title="Frontend"
            status="Connected"
            description="React + TypeScript + Vite"
          />
        </div>
        <div className="home__services">
          <h2>Service Health</h2>
          <ServiceLink name="Auth Service" port={3001} path="/health" />
          <ServiceLink name="File Service" port={3002} path="/health" />
          <ServiceLink name="Metadata Service" port={3003} path="/health" />
          <ServiceLink name="Search Service" port={3004} path="/health" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, status, description }: {
  title: string;
  status: string;
  description: string;
}) {
  return (
    <div className="status-card">
      <div className="status-card__header">
        <span className="status-card__title">{title}</span>
        <span className="status-card__badge">{status}</span>
      </div>
      <p className="status-card__desc">{description}</p>
    </div>
  );
}

function ServiceLink({ name, port, path }: {
  name: string;
  port: number;
  path: string;
}) {
  return (
    <a
      href={`http://localhost:${port}${path}`}
      target="_blank"
      rel="noopener noreferrer"
      className="service-link"
    >
      <span className="service-link__dot" />
      <span className="service-link__name">{name}</span>
      <span className="service-link__port">:{port}</span>
    </a>
  );
}

export default App;
