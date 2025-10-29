import { Sidebar } from './sidebar';
import { Navbar } from './sidebar';

export const Layout = ({ children, activePage, userName, onLogout }) => {
  return (
    <div className="layout">
      <Sidebar activePage={activePage} />
      <div className="main-container">
        <Navbar userName={userName} onLogout={onLogout} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};
