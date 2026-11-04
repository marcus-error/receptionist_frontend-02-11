import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="page active">
      <div className="card" style={{ textAlign: "center", padding: "60px" }}>
        <h1 className="title">404</h1>
        <p className="subtitle" style={{ marginBottom: "20px" }}>
          Page not found
        </p>
        <Link to="/" className="btn primary" style={{ textDecoration: "none" }}>
          Back to Home Page
        </Link>
      </div>
    </section>
  );
}
