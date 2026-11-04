export default function Badge({ color = "green", children }) {
  return <span className={`badge ${color}`}>{children}</span>;
}
