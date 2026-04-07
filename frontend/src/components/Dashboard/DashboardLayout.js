import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  return (
    <div style={s.wrapper}>
      <div className="sidebar"><Sidebar /></div>
      <div className="main-content" style={s.main}>
        <Navbar />
        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { display: "flex", fontFamily: "'Inter', 'Poppins', -apple-system, sans-serif" },
  main:    { marginLeft: "220px", flex: 1, minHeight: "100vh", background: "#f5f3e8" },
  content: { padding: "2rem" },
};
