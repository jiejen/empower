import { Navbar } from './sidebar';

export const Layout = ({ children, activePage, userName, onLogout }) => {
  return (
    <div className="layout">
      <Navbar userName={userName} onLogout={onLogout} activePage={activePage} />
      <main className="content">
        {children}
      </main>
    </div>
  );
};
