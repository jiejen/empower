// Layout Component (combines Sidebar and Navbar)
import { Sidebar } from './sidebar';
import { Navbar } from './sidebar';

// Layout Component (remove onNavigate prop)
export const Layout = ({ children, activePage, userName }) => {
  return (
    <div className="layout">
      <Sidebar activePage={activePage} />
      <div className="main-container">
        <Navbar userName={userName} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};
