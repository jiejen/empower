// Layout Component (combines Sidebar and Navbar)
import { Sidebar } from './sidebar';
import { Navbar } from './sidebar';

export const Layout = ({ children, activePage, userName, onNavigate }) => {
  return (
    <div className="layout">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="main-container">
        <Navbar userName={userName} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};
