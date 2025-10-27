import { Layout } from '../components/layout';
import '../components/Layout.css';

function AddAppliance() {
  return (
    <Layout activePage="Add Appliance" userName="John Doe">
      <div style={{ padding: '32px' }}>
        <h2>Add Appliance</h2>
      </div>
    </Layout>
  );
}

export default AddAppliance;