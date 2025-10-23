import { useLocation } from "react-router-dom";

export default function NotFound() {
  const loc = useLocation();
  return (
    <div style={{padding: 24}}>
      <h2>404 – Route không tồn tại</h2>
      <p>URL: <code>{loc.pathname + loc.search}</code></p>
    </div>
  );
}
