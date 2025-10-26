import { Layout } from '../components/layout';
import '../components/Layout.css'; // Import the CSS

function createReport() {
  return (
    <Layout activePage="Dashboard" userName="John Doe">
      <div style={{ padding: '32px' }}>
        <h2>Create Report</h2>
      </div>
    </Layout>
  );
}

export default createReport;